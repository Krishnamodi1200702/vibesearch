"""Search service — orchestrates CLIP encoding, FAISS retrieval, reranking, and DB lookup."""

from __future__ import annotations

import logging
import time
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Scene, SceneFrame, Video, Favorite, SearchQuery
from app.schemas import SearchResultItem, SearchResponse
from app.services.clip_service import get_clip_service
from app.services.faiss_service import get_faiss_service
from app.services.reranker_service import get_reranker_service

logger = logging.getLogger(__name__)


def _build_scene_text(scene: Scene, video: Video) -> str:
    """Build a textual description for cross-encoder reranking."""
    parts = [video.title]
    if video.description:
        parts.append(video.description)
    if scene.transcript_text:
        parts.append(scene.transcript_text)
    if scene.metadata_json and scene.metadata_json.get("description"):
        parts.append(scene.metadata_json["description"])
    return " — ".join(parts)


def _generate_explanation(query: str, scene: Scene, video: Video, score: float) -> str:
    """Generate a short human-readable explanation of why this scene matched."""
    parts = []
    if score > 0.85:
        parts.append("Very strong visual match")
    elif score > 0.7:
        parts.append("Good visual match")
    else:
        parts.append("Partial match")

    parts.append(f'for "{query}"')
    parts.append(f"in scene {scene.scene_index + 1} of \"{video.title}\"")

    time_range = f"{scene.start_time_sec:.1f}s – {scene.end_time_sec:.1f}s"
    parts.append(f"({time_range})")

    if scene.transcript_text:
        snippet = scene.transcript_text[:80]
        parts.append(f'— transcript: "{snippet}…"')

    return " ".join(parts)


async def search_scenes(
    db: AsyncSession,
    query: str,
    user_id: uuid.UUID | None = None,
    top_k: int = 10,
    faiss_oversample: int = 3,
) -> SearchResponse:
    """Full search pipeline: encode → retrieve → rerank → return."""
    t0 = time.time()

    clip = get_clip_service()
    faiss_svc = get_faiss_service()
    reranker = get_reranker_service()

    # 1. Encode query with CLIP
    query_vec = clip.encode_text(query)

    # 2. FAISS retrieval (oversample for reranker)
    retrieve_k = min(top_k * faiss_oversample, faiss_svc.count) if faiss_svc.count > 0 else 0
    if retrieve_k == 0:
        return SearchResponse(query=query, results=[], total=0, took_ms=0)

    faiss_results = faiss_svc.search(query_vec, top_k=retrieve_k)
    faiss_ids = [fid for fid, _ in faiss_results]
    faiss_score_map = {fid: score for fid, score in faiss_results}

    # 3. Fetch scene + video data from DB
    stmt = (
        select(Scene)
        .where(Scene.faiss_vector_id.in_(faiss_ids))
        .options(selectinload(Scene.frames), selectinload(Scene.video))
    )
    result = await db.execute(stmt)
    scenes = result.scalars().all()
    scene_map = {s.faiss_vector_id: s for s in scenes}

    # 4. Build candidates for reranker
    candidates = []
    for fid in faiss_ids:
        scene = scene_map.get(fid)
        if not scene or not scene.video:
            continue
        candidates.append({
            "faiss_id": fid,
            "scene": scene,
            "video": scene.video,
            "clip_score": faiss_score_map[fid],
            "text": _build_scene_text(scene, scene.video),
        })

    # 5. Rerank
    ranked = reranker.rerank(query, candidates, text_key="text", top_k=top_k)

    # 6. Check favorites if user is authenticated
    favorited_scene_ids: set[uuid.UUID] = set()
    if user_id:
        fav_stmt = select(Favorite.scene_id).where(Favorite.user_id == user_id)
        fav_result = await db.execute(fav_stmt)
        favorited_scene_ids = {row[0] for row in fav_result.fetchall()}

    # 7. Build response
    results: list[SearchResultItem] = []
    for cand in ranked:
        scene: Scene = cand["scene"]
        video: Video = cand["video"]
        score = cand["clip_score"]

        thumbnails = sorted(scene.frames, key=lambda f: f.frame_index)
        thumb_urls = [f.frame_url for f in thumbnails[:4]]

        results.append(SearchResultItem(
            scene_id=scene.id,
            video_id=video.id,
            video_title=video.title,
            video_url=video.file_url,
            scene_index=scene.scene_index,
            start_time_sec=scene.start_time_sec,
            end_time_sec=scene.end_time_sec,
            thumbnails=thumb_urls,
            similarity_score=round(score, 4),
            match_explanation=_generate_explanation(query, scene, video, score),
            transcript_text=scene.transcript_text,
            is_favorited=scene.id in favorited_scene_ids,
        ))

    took_ms = round((time.time() - t0) * 1000, 1)

    # 8. Log query
    if user_id:
        db.add(SearchQuery(user_id=user_id, query_text=query, result_count=len(results)))

    return SearchResponse(query=query, results=results, total=len(results), took_ms=took_ms)

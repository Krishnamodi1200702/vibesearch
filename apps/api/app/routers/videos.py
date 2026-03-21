"""Video routes — upload, list, detail, delete, reindex."""

from __future__ import annotations

import asyncio
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import get_db
from app.models import Video, Scene, SceneFrame, Favorite
from app.schemas import VideoOut, VideoDetailOut, VideoUploadResponse, SceneOut

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/videos", tags=["videos"])

ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"}
MAX_SIZE = settings.max_upload_mb * 1024 * 1024


# ── Upload ────────────────────────────────────────────

@router.post("/upload", response_model=VideoUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(default=""),
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a video file and trigger async ingestion."""
    uid = uuid.UUID(user_id)

    # Validate content type
    ct = file.content_type or ""
    if ct not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {ct}. Allowed: mp4, mov, avi, webm",
        )

    # Validate size (read header to check)
    if file.size and file.size > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {settings.max_upload_mb}MB",
        )

    # Save file to disk with unique name
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "video.mp4").suffix or ".mp4"
    file_id = uuid.uuid4()
    filename = f"{file_id}{ext}"
    filepath = upload_dir / filename

    try:
        with open(filepath, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                f.write(chunk)
                # Check size during write
                if filepath.stat().st_size > MAX_SIZE:
                    filepath.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File too large. Max {settings.max_upload_mb}MB",
                    )
    except HTTPException:
        raise
    except Exception as e:
        filepath.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Create video record
    video = Video(
        user_id=uid,
        title=title.strip() or filename,
        description=description.strip() or None,
        file_url="",  # Will be set after ingestion
        storage_path=str(filepath),
        duration_seconds=0.0,
        status="uploaded",
    )
    db.add(video)
    await db.flush()

    video_id = video.id
    logger.info("Video uploaded: %s (%s) by user %s", title, filename, user_id)

    # Trigger async ingestion (fire-and-forget)
    asyncio.create_task(_ingest_background(video_id))

    return VideoUploadResponse(
        id=video_id,
        title=video.title,
        status="uploaded",
        message="Video uploaded. Processing will begin shortly.",
    )


async def _ingest_background(video_id: uuid.UUID):
    """Run ingestion in background — catch all exceptions to prevent orphan tasks."""
    try:
        from app.services.ingestion_service import process_video
        await process_video(video_id)
    except Exception:
        logger.exception("Background ingestion failed for %s", video_id)


# ── List user videos ─────────────────────────────────

@router.get("", response_model=list[VideoOut])
async def list_videos(
    user_id: str | None = Query(default=None, alias="userId"),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List videos. If userId is provided, return only that user's videos.
    Otherwise return all processed videos (for demo/public browsing).
    """
    stmt = (
    select(Video)
    .options(selectinload(Video.scenes).selectinload(Scene.frames))
    .order_by(Video.created_at.desc())
    .limit(limit)
    .offset(offset)
)

    if user_id:
        uid = uuid.UUID(user_id)
        stmt = stmt.where(Video.user_id == uid)
    else:
        # Public mode: only show processed videos
        stmt = stmt.where(Video.status == "processed")

    if status_filter:
        stmt = stmt.where(Video.status == status_filter)

    result = await db.execute(stmt)
    videos = result.scalars().all()

    items: list[VideoOut] = []
    for video in videos:
        thumbnail_url = None

        scenes_sorted = sorted(video.scenes or [], key=lambda s: s.scene_index)
        for scene in scenes_sorted:
            frames_sorted = sorted(scene.frames or [], key=lambda f: f.frame_index)
            if frames_sorted:
                thumbnail_url = frames_sorted[0].frame_url
                break

        items.append(
            VideoOut(
                id=video.id,
                title=video.title,
                description=video.description,
                file_url=video.file_url,
                duration_seconds=video.duration_seconds,
                scene_count=video.scene_count,
                status=video.status,
                processing_error=video.processing_error,
                created_at=video.created_at,
                processed_at=video.processed_at,
                thumbnail_url=thumbnail_url,
            )
        )

    return items


# ── Video detail ─────────────────────────────────────

@router.get("/{video_id}", response_model=VideoDetailOut)
async def get_video(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single video with all its scenes and frames."""
    stmt = (
        select(Video)
        .where(Video.id == video_id)
        .options(selectinload(Video.scenes).selectinload(Scene.frames))
    )
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Sort scenes by index for the response
    video_dict = VideoOut.model_validate(video).model_dump()
    
    thumbnail_url = None
    scenes_sorted = sorted(video.scenes, key=lambda s: s.scene_index)

    for scene in scenes_sorted:
        frames_sorted = sorted(scene.frames or [], key=lambda f: f.frame_index)
        if frames_sorted:
            thumbnail_url = frames_sorted[0].frame_url
            break

    video_dict["thumbnail_url"] = thumbnail_url
    
    video_dict["scenes"] = [SceneOut.model_validate(s) for s in scenes_sorted]

    return VideoDetailOut(**video_dict)


# ── Video scenes ─────────────────────────────────────

@router.get("/{video_id}/scenes", response_model=list[SceneOut])
async def get_video_scenes(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all scenes for a video, with their frames."""
    stmt = (
        select(Scene)
        .where(Scene.video_id == video_id)
        .options(selectinload(Scene.frames))
        .order_by(Scene.scene_index)
    )
    result = await db.execute(stmt)
    scenes = result.scalars().all()
    return [SceneOut.model_validate(s) for s in scenes]


# ── Single scene ─────────────────────────────────────

@router.get("/scenes/{scene_id}", response_model=SceneOut)
async def get_scene(
    scene_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single scene with frames."""
    stmt = select(Scene).where(Scene.id == scene_id).options(selectinload(Scene.frames))
    result = await db.execute(stmt)
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    return SceneOut.model_validate(scene)


# ── Delete video ─────────────────────────────────────

@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: uuid.UUID,
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Delete a video and all associated data. Rebuilds FAISS index."""
    uid = uuid.UUID(user_id)

    stmt = select(Video).where(Video.id == video_id)
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Only allow owner to delete (or demo videos with null user_id)
    if video.user_id and video.user_id != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your video")

    # Delete favorites that reference this video's scenes
    scene_ids_stmt = select(Scene.id).where(Scene.video_id == video_id)
    await db.execute(delete(Favorite).where(Favorite.scene_id.in_(scene_ids_stmt)))

    # Delete frames on disk
    if video.storage_path:
        video_file = Path(video.storage_path)
        video_file.unlink(missing_ok=True)

    frames_dir = Path(settings.frames_dir) / str(video_id)
    if frames_dir.exists():
        shutil.rmtree(frames_dir, ignore_errors=True)

    # Delete video (cascades to scenes → frames)
    await db.delete(video)
    await db.flush()

    logger.info("Video %s deleted by user %s", video_id, user_id)

    # Rebuild FAISS index in background
    asyncio.create_task(_rebuild_faiss_background())


async def _rebuild_faiss_background():
    """Rebuild FAISS index after deletion."""
    try:
        from app.services.ingestion_service import rebuild_faiss_index
        await rebuild_faiss_index()
    except Exception:
        logger.exception("FAISS rebuild failed")


# ── Reindex video ────────────────────────────────────

@router.post("/{video_id}/reindex", response_model=VideoUploadResponse)
async def reindex_video(
    video_id: uuid.UUID,
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Re-run the ingestion pipeline for a video."""
    uid = uuid.UUID(user_id)

    stmt = select(Video).where(Video.id == video_id)
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    if video.user_id and video.user_id != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your video")
    if not video.storage_path or not Path(video.storage_path).exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source video file not found")

    # Delete existing scenes (cascades to frames)
    scene_ids_stmt = select(Scene.id).where(Scene.video_id == video_id)
    await db.execute(delete(Favorite).where(Favorite.scene_id.in_(scene_ids_stmt)))
    await db.execute(delete(SceneFrame).where(
        SceneFrame.scene_id.in_(select(Scene.id).where(Scene.video_id == video_id))
    ))
    await db.execute(delete(Scene).where(Scene.video_id == video_id))

    video.status = "uploaded"
    video.processing_error = None
    video.scene_count = 0
    await db.flush()

    # Rebuild FAISS to remove old vectors, then re-ingest
    asyncio.create_task(_reindex_background(video_id))

    return VideoUploadResponse(
        id=video_id,
        title=video.title,
        status="uploaded",
        message="Reindexing started.",
    )


async def _reindex_background(video_id: uuid.UUID):
    try:
        from app.services.ingestion_service import rebuild_faiss_index, process_video
        await rebuild_faiss_index()
        await process_video(video_id)
    except Exception:
        logger.exception("Reindex failed for %s", video_id)

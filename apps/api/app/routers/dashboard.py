"""Dashboard routes — aggregated stats for the user dashboard."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Video, Scene, SearchQuery, Favorite
from app.schemas import DashboardStats, SearchHistoryItem, VideoOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated dashboard statistics for the current user."""
    uid = uuid.UUID(user_id)

    # Total videos for this user
    vid_count = await db.execute(
        select(func.count()).select_from(Video).where(Video.user_id == uid)
    )
    total_videos = vid_count.scalar() or 0

    # Videos currently processing
    proc_count = await db.execute(
        select(func.count()).select_from(Video).where(
            Video.user_id == uid, Video.status == "processing"
        )
    )
    videos_processing = proc_count.scalar() or 0

    # Total scenes across user's videos
    scene_count = await db.execute(
        select(func.count()).select_from(Scene).where(
            Scene.video_id.in_(select(Video.id).where(Video.user_id == uid))
        )
    )
    total_scenes = scene_count.scalar() or 0

    # Total searches
    search_count = await db.execute(
        select(func.count()).select_from(SearchQuery).where(SearchQuery.user_id == uid)
    )
    total_searches = search_count.scalar() or 0

    # Total favorites
    fav_count = await db.execute(
        select(func.count()).select_from(Favorite).where(Favorite.user_id == uid)
    )
    total_favorites = fav_count.scalar() or 0

    # Recent searches (last 5)
    recent_searches_result = await db.execute(
        select(SearchQuery)
        .where(SearchQuery.user_id == uid)
        .order_by(SearchQuery.created_at.desc())
        .limit(5)
    )
    recent_searches = [
        SearchHistoryItem.model_validate(r) for r in recent_searches_result.scalars().all()
    ]

    # Recent videos (last 5)
    recent_videos_result = await db.execute(
        select(Video)
        .where(Video.user_id == uid)
        .order_by(Video.created_at.desc())
        .limit(5)
    )
    recent_videos = [
        VideoOut.model_validate(v) for v in recent_videos_result.scalars().all()
    ]

    return DashboardStats(
        total_videos=total_videos,
        total_scenes=total_scenes,
        total_searches=total_searches,
        total_favorites=total_favorites,
        videos_processing=videos_processing,
        recent_searches=recent_searches,
        recent_videos=recent_videos,
    )

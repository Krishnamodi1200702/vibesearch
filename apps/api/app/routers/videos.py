"""Video routes — browse demo library, fetch scenes and frames."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Video, Scene, SceneFrame
from app.schemas import VideoOut, SceneOut, SceneFrameOut

router = APIRouter(prefix="/videos", tags=["videos"])


@router.get("", response_model=list[VideoOut])
async def list_videos(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all videos in the demo library."""
    stmt = (
        select(Video)
        .where(Video.status == "processed")
        .order_by(Video.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return [VideoOut.model_validate(v) for v in result.scalars().all()]


@router.get("/{video_id}", response_model=VideoOut)
async def get_video(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single video by ID."""
    stmt = select(Video).where(Video.id == video_id)
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return VideoOut.model_validate(video)


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

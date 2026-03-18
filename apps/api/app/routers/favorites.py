"""Favorites routes — save and manage favorite scene results."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Favorite, Scene, Video
from app.schemas import FavoriteOut, FavoriteCreate, SceneOut, VideoOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteOut])
async def list_favorites(
    user_id: str = Query(..., alias="userId"),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all favorites for a user, with scene and video data."""
    uid = uuid.UUID(user_id)
    stmt = (
        select(Favorite)
        .where(Favorite.user_id == uid)
        .options(
            selectinload(Favorite.scene).selectinload(Scene.frames),
            selectinload(Favorite.scene).selectinload(Scene.video),
        )
        .order_by(Favorite.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    favs = result.scalars().all()

    out = []
    for f in favs:
        item = FavoriteOut(
            id=f.id,
            scene_id=f.scene_id,
            created_at=f.created_at,
            scene=SceneOut.model_validate(f.scene) if f.scene else None,
            video=VideoOut.model_validate(f.scene.video) if f.scene and f.scene.video else None,
        )
        out.append(item)
    return out


@router.post("", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    body: FavoriteCreate,
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Add a scene to favorites."""
    uid = uuid.UUID(user_id)

    # Check for duplicate
    existing = await db.execute(
        select(Favorite).where(Favorite.user_id == uid, Favorite.scene_id == body.scene_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already favorited")

    fav = Favorite(user_id=uid, scene_id=body.scene_id)
    db.add(fav)
    await db.flush()

    return FavoriteOut(id=fav.id, scene_id=fav.scene_id, created_at=fav.created_at)


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    favorite_id: uuid.UUID,
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Remove a favorite."""
    uid = uuid.UUID(user_id)
    stmt = delete(Favorite).where(Favorite.id == favorite_id, Favorite.user_id == uid)
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")


@router.delete("/scene/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite_by_scene(
    scene_id: uuid.UUID,
    user_id: str = Query(..., alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Remove a favorite by scene ID."""
    uid = uuid.UUID(user_id)
    stmt = delete(Favorite).where(Favorite.scene_id == scene_id, Favorite.user_id == uid)
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")

"""Search API routes — semantic search + history."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import SearchQuery
from app.schemas import SearchRequest, SearchResponse, SearchHistoryItem
from app.services.search_service import search_scenes

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    user_id: str | None = Query(default=None, alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Semantic video scene search with optional video_id filter."""
    uid = uuid.UUID(user_id) if user_id else None
    vid = body.video_id  # Optional: filter to single video
    return await search_scenes(db, body.query, user_id=uid, video_id=vid, top_k=body.top_k)


@router.get("/suggestions")
async def search_suggestions():
    """Return sample search queries for the UI."""
    return {
        "suggestions": [
            "person walking on the beach at sunset",
            "close-up of hands cooking food",
            "city skyline at night with lights",
            "dog playing in a park",
            "rain falling on a window",
            "aerial drone shot of mountains",
            "someone reading a book in a cafe",
            "waves crashing on rocks",
        ]
    }


@router.get("/history", response_model=list[SearchHistoryItem])
async def search_history(
    user_id: str = Query(..., alias="userId"),
    limit: int = Query(default=30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Return recent search history for the current user."""
    uid = uuid.UUID(user_id)
    stmt = (
        select(SearchQuery)
        .where(SearchQuery.user_id == uid)
        .order_by(SearchQuery.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [SearchHistoryItem.model_validate(r) for r in rows]

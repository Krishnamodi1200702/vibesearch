"""Search API routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import SearchRequest, SearchResponse
from app.services.search_service import search_scenes

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    user_id: str | None = Query(default=None, alias="userId"),
    db: AsyncSession = Depends(get_db),
):
    """Semantic video scene search."""
    uid = uuid.UUID(user_id) if user_id else None
    return await search_scenes(db, body.query, user_id=uid, top_k=body.top_k)


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

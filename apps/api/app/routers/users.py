"""User routes — profile, onboarding, search history."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User, OnboardingState, SearchQuery
from app.schemas import OnboardingOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/{user_id}/onboarding/complete", response_model=OnboardingOut)
async def complete_onboarding(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Mark onboarding as completed for a user."""
    stmt = select(OnboardingState).where(OnboardingState.user_id == user_id)
    result = await db.execute(stmt)
    onboarding = result.scalar_one_or_none()

    if onboarding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User onboarding not found")

    onboarding.completed = True
    onboarding.completed_at = datetime.now(timezone.utc)
    await db.flush()

    return OnboardingOut.model_validate(onboarding)


@router.get("/{user_id}/search-history")
async def search_history(
    user_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get recent search history for a user."""
    stmt = (
        select(SearchQuery)
        .where(SearchQuery.user_id == user_id)
        .order_by(SearchQuery.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    queries = result.scalars().all()

    return {
        "queries": [
            {
                "id": str(q.id),
                "query_text": q.query_text,
                "result_count": q.result_count,
                "created_at": q.created_at.isoformat(),
            }
            for q in queries
        ]
    }

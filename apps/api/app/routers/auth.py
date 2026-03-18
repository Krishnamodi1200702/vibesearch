"""Auth routes — Google OAuth token verification and user upsert.

The frontend handles Google sign-in via Auth.js and sends the user's
Google ID token to this endpoint. The backend verifies it, creates or
finds the user in the DB, and returns user data.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User, OnboardingState
from app.schemas import UserOut, OnboardingOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleAuthRequest(BaseModel):
    """Payload from the frontend after Google sign-in."""
    email: str
    name: str
    image: str | None = None


class AuthResponse(BaseModel):
    user: UserOut
    onboarding: OnboardingOut
    is_new_user: bool


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate via Google — upsert user and return session data.

    In production you'd verify the Google ID token here. For the MVP,
    the frontend Auth.js session is the source of truth and this endpoint
    syncs user data to our DB.
    """
    # Find existing user
    stmt = select(User).where(User.email == body.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    is_new = False

    if user is None:
        # Create new user
        user = User(name=body.name, email=body.email, image=body.image)
        db.add(user)
        await db.flush()

        # Create onboarding record
        onboarding = OnboardingState(user_id=user.id, completed=False)
        db.add(onboarding)
        await db.flush()
        is_new = True
        logger.info("New user created: %s (%s)", user.name, user.email)
    else:
        # Update profile fields if changed
        if body.name and user.name != body.name:
            user.name = body.name
        if body.image and user.image != body.image:
            user.image = body.image
        await db.flush()

    # Fetch onboarding state
    ob_stmt = select(OnboardingState).where(OnboardingState.user_id == user.id)
    ob_result = await db.execute(ob_stmt)
    onboarding = ob_result.scalar_one_or_none()

    if onboarding is None:
        onboarding = OnboardingState(user_id=user.id, completed=False)
        db.add(onboarding)
        await db.flush()

    return AuthResponse(
        user=UserOut.model_validate(user),
        onboarding=OnboardingOut.model_validate(onboarding),
        is_new_user=is_new,
    )


@router.get("/me", response_model=AuthResponse)
async def get_me(
    email: str,
    db: AsyncSession = Depends(get_db),
):
    """Get current user by email (called from frontend with session email)."""
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    ob_stmt = select(OnboardingState).where(OnboardingState.user_id == user.id)
    ob_result = await db.execute(ob_stmt)
    onboarding = ob_result.scalar_one_or_none()

    if onboarding is None:
        onboarding = OnboardingState(user_id=user.id, completed=False)
        db.add(onboarding)
        await db.flush()

    return AuthResponse(
        user=UserOut.model_validate(user),
        onboarding=OnboardingOut.model_validate(onboarding),
        is_new_user=False,
    )

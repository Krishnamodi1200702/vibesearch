"""Pydantic schemas — API request/response contracts."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Users ──────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    image: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    name: str
    email: str
    image: str | None = None


# ── Scenes / Frames ───────────────────────────

class SceneFrameOut(BaseModel):
    id: uuid.UUID
    frame_url: str
    frame_index: int
    timestamp_sec: float

    model_config = {"from_attributes": True}


class SceneOut(BaseModel):
    id: uuid.UUID
    video_id: uuid.UUID
    scene_index: int
    start_time_sec: float
    end_time_sec: float
    transcript_text: str | None = None
    metadata_json: dict | None = None
    frames: list[SceneFrameOut] = []

    model_config = {"from_attributes": True}


# ── Videos ─────────────────────────────────────

class VideoOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    file_url: str
    duration_seconds: float
    scene_count: int = 0
    status: str
    processing_error: str | None = None
    created_at: datetime
    processed_at: datetime | None = None
    thumbnail_url: str | None = None

    model_config = {"from_attributes": True}


class VideoDetailOut(VideoOut):
    """Extended video response with scenes included."""
    scenes: list[SceneOut] = []

    model_config = {"from_attributes": True}


class VideoUploadResponse(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    message: str


# ── Search ─────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    top_k: int = Field(default=10, ge=1, le=50)
    video_id: uuid.UUID | None = None


class SearchResultItem(BaseModel):
    scene_id: uuid.UUID
    video_id: uuid.UUID
    video_title: str
    video_url: str
    scene_index: int
    start_time_sec: float
    end_time_sec: float
    thumbnails: list[str]
    similarity_score: float
    match_explanation: str
    transcript_text: str | None = None
    is_favorited: bool = False


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int
    took_ms: float


class SearchHistoryItem(BaseModel):
    id: uuid.UUID
    query_text: str
    result_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Onboarding ─────────────────────────────────

class OnboardingOut(BaseModel):
    completed: bool
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Favorites ──────────────────────────────────

class FavoriteOut(BaseModel):
    id: uuid.UUID
    scene_id: uuid.UUID
    created_at: datetime
    scene: SceneOut | None = None
    video: VideoOut | None = None

    model_config = {"from_attributes": True}


class FavoriteCreate(BaseModel):
    scene_id: uuid.UUID


# ── Dashboard ──────────────────────────────────

class DashboardStats(BaseModel):
    total_videos: int
    total_scenes: int
    total_searches: int
    total_favorites: int
    videos_processing: int
    recent_searches: list[SearchHistoryItem]
    recent_videos: list[VideoOut]

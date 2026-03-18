"""VibeSearch API — FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, search, users, videos, favorites

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: pre-load ML models and FAISS index. Shutdown: cleanup."""
    logger.info("Starting VibeSearch API (env=%s)", settings.env)

    # Pre-load FAISS index (safe if file doesn't exist yet)
    from app.services.faiss_service import get_faiss_service
    faiss_svc = get_faiss_service()
    logger.info("FAISS index ready — %d vectors loaded", faiss_svc.count)

    # Pre-load CLIP only in production (in dev, lazy-load on first request to speed up restarts)
    if settings.is_production:
        from app.services.clip_service import get_clip_service
        get_clip_service()

        from app.services.reranker_service import get_reranker_service
        get_reranker_service()

    yield

    logger.info("Shutting down VibeSearch API")


app = FastAPI(
    title="VibeSearch API",
    description="AI-powered semantic video scene search",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(videos.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")


@app.get("/api/health")
async def health():
    from app.services.faiss_service import get_faiss_service
    faiss_svc = get_faiss_service()
    return {
        "status": "ok",
        "env": settings.env,
        "faiss_vectors": faiss_svc.count,
    }

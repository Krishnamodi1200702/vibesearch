"""Seed script — populates the database with demo videos, scenes, and frames.

Usage:
    cd apps/api
    python scripts/seed_demo.py

This creates realistic demo data with synthetic CLIP embeddings for testing
the search pipeline without needing actual video files or Cloudinary uploads.
Placeholder frame URLs use picsum.photos for free stock thumbnails.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import uuid
from pathlib import Path

import numpy as np

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, engine, Base
from app.models import Video, Scene, SceneFrame, User, OnboardingState
from app.services.faiss_service import get_faiss_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Demo data ──────────────────────────────────────────────

DEMO_VIDEOS = [
    {
        "title": "Sunset Beach Walk",
        "description": "A person walking along a sandy beach during golden hour sunset with waves and warm light",
        "file_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "duration_seconds": 45.0,
        "scenes": [
            {
                "start": 0.0, "end": 8.0,
                "transcript": "Wide establishing shot of the beach with the sun low on the horizon",
                "meta": {"description": "Wide shot of beach with golden sunset, waves rolling, warm orange and pink sky"},
            },
            {
                "start": 8.0, "end": 18.0,
                "transcript": "Person walking barefoot along the shoreline as waves lap at their feet",
                "meta": {"description": "Person walking on wet sand at sunset, footprints in sand, calm ocean waves"},
            },
            {
                "start": 18.0, "end": 30.0,
                "transcript": "Close-up of waves crashing on the shore with sun reflecting off the water",
                "meta": {"description": "Close-up ocean waves crashing, sun reflection on water, foam and spray"},
            },
            {
                "start": 30.0, "end": 45.0,
                "transcript": "Drone pulling back to reveal the full coastline at dusk",
                "meta": {"description": "Aerial drone shot coastline at dusk, wide panoramic beach view from above"},
            },
        ],
    },
    {
        "title": "City Night Timelapse",
        "description": "Stunning timelapse of a metropolitan city skyline transitioning from dusk to night with lights",
        "file_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "duration_seconds": 60.0,
        "scenes": [
            {
                "start": 0.0, "end": 15.0,
                "transcript": "City skyline during blue hour as building lights begin to turn on",
                "meta": {"description": "City skyline at blue hour, skyscrapers, building lights turning on, dusk"},
            },
            {
                "start": 15.0, "end": 30.0,
                "transcript": "Traffic flowing through downtown streets with headlights creating light trails",
                "meta": {"description": "Night city traffic, car headlight trails, busy downtown intersection from above"},
            },
            {
                "start": 30.0, "end": 45.0,
                "transcript": "Neon signs and billboards lighting up across the entertainment district",
                "meta": {"description": "Neon signs billboards at night, colorful city lights, entertainment district"},
            },
            {
                "start": 45.0, "end": 60.0,
                "transcript": "Full night skyline with all buildings illuminated against dark sky",
                "meta": {"description": "Full city skyline at night, all buildings illuminated, stars above, panoramic"},
            },
        ],
    },
    {
        "title": "Cooking Pasta from Scratch",
        "description": "Close-up shots of hands making fresh pasta from flour and eggs in a rustic kitchen",
        "file_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "duration_seconds": 50.0,
        "scenes": [
            {
                "start": 0.0, "end": 12.0,
                "transcript": "Hands pouring flour onto a wooden board and creating a well for eggs",
                "meta": {"description": "Close-up hands with flour on wooden board, making pasta dough, eggs in well"},
            },
            {
                "start": 12.0, "end": 24.0,
                "transcript": "Kneading the dough with both hands, folding and pressing on a floured surface",
                "meta": {"description": "Hands kneading pasta dough, close-up cooking, rustic kitchen, floured surface"},
            },
            {
                "start": 24.0, "end": 36.0,
                "transcript": "Rolling out thin sheets of pasta dough using a wooden rolling pin",
                "meta": {"description": "Rolling pasta dough thin sheets, wooden rolling pin, hand-made pasta process"},
            },
            {
                "start": 36.0, "end": 50.0,
                "transcript": "Cutting the pasta into fresh fettuccine strips and tossing with flour",
                "meta": {"description": "Cutting fresh fettuccine pasta strips, tossing with flour, hand-made noodles"},
            },
        ],
    },
    {
        "title": "Mountain Hiking Adventure",
        "description": "Hikers ascending a mountain trail through forests, meadows, and rocky terrain to a summit",
        "file_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        "duration_seconds": 55.0,
        "scenes": [
            {
                "start": 0.0, "end": 14.0,
                "transcript": "Trail head entrance with hikers starting their ascent through dense forest",
                "meta": {"description": "Mountain trail entrance, dense forest, hikers with backpacks starting trek"},
            },
            {
                "start": 14.0, "end": 28.0,
                "transcript": "Open alpine meadow with wildflowers and mountain peaks visible in background",
                "meta": {"description": "Alpine meadow wildflowers, mountain peaks background, green grass, blue sky"},
            },
            {
                "start": 28.0, "end": 42.0,
                "transcript": "Rocky scramble section with hands reaching for holds on steep terrain",
                "meta": {"description": "Rocky mountain scramble, hands climbing rocks, steep terrain, adventure hiking"},
            },
            {
                "start": 42.0, "end": 55.0,
                "transcript": "Summit reached with 360 degree panoramic mountain view and celebration",
                "meta": {"description": "Mountain summit panoramic view, hiker celebrating on peak, vast landscape below"},
            },
        ],
    },
    {
        "title": "Rainy Day in Tokyo",
        "description": "Atmospheric footage of Tokyo streets during rain, with neon reflections and umbrellas",
        "file_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "duration_seconds": 40.0,
        "scenes": [
            {
                "start": 0.0, "end": 10.0,
                "transcript": "Rain falling on a Tokyo street with neon signs reflecting off the wet pavement",
                "meta": {"description": "Tokyo street rain, neon sign reflections on wet pavement, atmospheric night"},
            },
            {
                "start": 10.0, "end": 20.0,
                "transcript": "Crowd of people with colorful umbrellas at a busy Shibuya-style crossing",
                "meta": {"description": "Busy crossing people with umbrellas, rain, colorful crowd, Tokyo Shibuya style"},
            },
            {
                "start": 20.0, "end": 30.0,
                "transcript": "Close-up of rain drops on a window with blurred city lights behind",
                "meta": {"description": "Rain drops on window, blurred city lights bokeh behind, atmospheric moody"},
            },
            {
                "start": 30.0, "end": 40.0,
                "transcript": "Person sitting alone in a cafe looking out at the rain through glass",
                "meta": {"description": "Person in cafe window, looking at rain outside, cozy interior, reflective mood"},
            },
        ],
    },
    {
        "title": "Dog Park Adventures",
        "description": "Playful dogs running, fetching, and socializing at a sunny park",
        "file_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "duration_seconds": 35.0,
        "scenes": [
            {
                "start": 0.0, "end": 9.0,
                "transcript": "Golden retriever sprinting across green field chasing a tennis ball",
                "meta": {"description": "Golden retriever dog running fast, chasing tennis ball, green grass, sunny park"},
            },
            {
                "start": 9.0, "end": 18.0,
                "transcript": "Two dogs playing together, jumping and tumbling on the grass",
                "meta": {"description": "Two dogs playing wrestling, jumping on grass, playful pets, sunny outdoor"},
            },
            {
                "start": 18.0, "end": 27.0,
                "transcript": "Small puppy learning to fetch, running clumsily back with a stick",
                "meta": {"description": "Small puppy fetching stick, clumsy run, cute young dog, green park"},
            },
            {
                "start": 27.0, "end": 35.0,
                "transcript": "Owner petting tired happy dog lying in the shade of a tree",
                "meta": {"description": "Person petting dog under tree shade, tired happy dog, resting in park"},
            },
        ],
    },
]


def _generate_scene_embedding(description: str, dim: int = 512) -> np.ndarray:
    """Generate a synthetic but deterministic embedding from text.

    In production this would use CLIP. For seeding we create a reproducible
    vector so that FAISS search still returns reasonable-looking results
    during demos (text queries will use real CLIP at search time).
    """
    rng = np.random.RandomState(hash(description) % 2**31)
    vec = rng.randn(dim).astype(np.float32)
    vec /= np.linalg.norm(vec)
    return vec


def _frame_url(video_idx: int, scene_idx: int, frame_idx: int) -> str:
    """Generate a deterministic placeholder thumbnail URL using picsum."""
    seed = video_idx * 100 + scene_idx * 10 + frame_idx
    return f"https://picsum.photos/seed/{seed}/640/360"


async def seed():
    logger.info("Starting demo data seed…")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tables created/verified")

    faiss_svc = get_faiss_service()
    faiss_svc.reset()

    all_embeddings = []

    async with async_session() as db:
        # Create demo user
        demo_user = User(
            name="Demo User",
            email="demo@vibesearch.app",
            image="https://picsum.photos/seed/demouser/200/200",
        )
        db.add(demo_user)
        await db.flush()

        demo_onboarding = OnboardingState(user_id=demo_user.id, completed=False)
        db.add(demo_onboarding)

        faiss_id_counter = 0

        for v_idx, v_data in enumerate(DEMO_VIDEOS):
            video = Video(
                title=v_data["title"],
                description=v_data["description"],
                file_url=v_data["file_url"],
                duration_seconds=v_data["duration_seconds"],
                status="processed",
            )
            db.add(video)
            await db.flush()
            logger.info("  Video: %s (id=%s)", video.title, video.id)

            for s_idx, s_data in enumerate(v_data["scenes"]):
                scene_desc = s_data["meta"]["description"]
                embedding = _generate_scene_embedding(scene_desc)
                all_embeddings.append(embedding)

                scene = Scene(
                    video_id=video.id,
                    scene_index=s_idx,
                    start_time_sec=s_data["start"],
                    end_time_sec=s_data["end"],
                    transcript_text=s_data["transcript"],
                    metadata_json=s_data["meta"],
                    faiss_vector_id=faiss_id_counter,
                )
                db.add(scene)
                await db.flush()

                # 3 frames per scene
                for f_idx in range(3):
                    t = s_data["start"] + (s_data["end"] - s_data["start"]) * (f_idx / 2)
                    frame = SceneFrame(
                        scene_id=scene.id,
                        frame_url=_frame_url(v_idx, s_idx, f_idx),
                        frame_index=f_idx,
                        timestamp_sec=round(t, 2),
                    )
                    db.add(frame)

                faiss_id_counter += 1

        await db.commit()

    # Build FAISS index
    if all_embeddings:
        matrix = np.stack(all_embeddings)
        faiss_svc.add(matrix)
        faiss_svc.save()
        logger.info("FAISS index built with %d vectors", faiss_svc.count)

    logger.info("Seed complete — %d videos, %d scenes", len(DEMO_VIDEOS), faiss_id_counter)


if __name__ == "__main__":
    asyncio.run(seed())

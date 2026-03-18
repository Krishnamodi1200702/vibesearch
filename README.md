# VibeSearch

**AI-powered short-form video search engine** — find specific moments inside videos using natural language.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688)
![CLIP](https://img.shields.io/badge/OpenAI_CLIP-ViT--B/32-orange)
![FAISS](https://img.shields.io/badge/FAISS-Vector_Search-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## What is VibeSearch?

VibeSearch lets users search for **specific moments** inside short-form videos using natural language queries like:

- *"person laughing near a campfire"*
- *"aerial drone shot of a coastline"*
- *"cat jumping off a table"*

Results show matching scenes with timestamps, frame thumbnails, similarity scores, and explanation text — all rendered in a polished, consumer-grade UI.

---

## Architecture

```
vibesearch/
├── apps/
│   ├── web/          # Next.js 15 frontend (App Router, TypeScript, Tailwind, Framer Motion)
│   └── api/          # FastAPI backend (CLIP, FAISS, Postgres, local reranker)
├── packages/
│   └── shared/       # Shared types and constants
├── scripts/          # Dev utilities
└── worker/           # Offline video ingestion pipeline
```

### System Flow

```
User Query ──► Next.js Frontend ──► FastAPI Backend
                                        │
                                  CLIP Encode Query
                                        │
                                  FAISS Top-K Retrieval
                                        │
                                  Local Reranker (cross-encoder)
                                        │
                                  Postgres Metadata Lookup
                                        │
                                  ◄── Ranked Results JSON
```

### Ingestion Pipeline (offline/admin)

```
Video File ──► FFmpeg Scene Split ──► Frame Extraction
                                          │
                                    CLIP Embedding per Scene
                                          │
                                    Postgres Insert + FAISS Index Build
```

---

## Tech Stack

| Layer       | Technology                                           |
|-------------|------------------------------------------------------|
| Frontend    | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui |
| Auth        | Auth.js v5 with Google OAuth                         |
| Backend     | FastAPI, Python 3.11+                                |
| Database    | PostgreSQL (Neon free tier)                          |
| Vectors     | FAISS (local, no paid vector DB)                     |
| Embeddings  | OpenAI CLIP ViT-B/32 (local, no API cost)           |
| Reranker    | cross-encoder/ms-marco-MiniLM-L-6-v2 (local)        |
| Storage     | Cloudinary free tier (video/image hosting)           |
| Deploy      | Vercel (frontend) + Render (backend) + Neon (DB)     |

**Total monthly cost: $0** on free tiers.

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL (local or Neon)
- FFmpeg installed (`brew install ffmpeg` / `apt install ffmpeg`)

### 1. Clone and install

```bash
git clone https://github.com/yourname/vibesearch.git
cd vibesearch

# Frontend
cd apps/web
cp .env.example .env.local
npm install

# Backend
cd ../api
cp .env.example .env
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Set up environment variables

See `apps/web/.env.example` and `apps/api/.env.example` for all required values.

### 3. Initialize database

```bash
cd apps/api
alembic upgrade head
python scripts/seed_demo.py
```

### 4. Run development servers

```bash
# Terminal 1 — Frontend
cd apps/web && npm run dev

# Terminal 2 — Backend
cd apps/api && uvicorn app.main:app --reload --port 8000
```

Frontend: http://localhost:3000
Backend: http://localhost:8000
API Docs: http://localhost:8000/docs

---

## Ingestion (Admin/Dev only)

Process a video for the demo library:

```bash
cd apps/api
python scripts/ingest_video.py \
  --input /path/to/video.mp4 \
  --title "Beach Sunset Drone" \
  --description "Aerial drone footage of sunset over ocean"
```

This splits the video into scenes, extracts frames, generates CLIP embeddings, and updates the FAISS index.

---

## Database Schema

**Users** — Google OAuth profiles
**Videos** — Curated demo video library
**Scenes** — Temporal segments within videos, each with a CLIP embedding
**SceneFrames** — Representative keyframes per scene
**SearchQueries** — User search history
**OnboardingState** — First-time user onboarding tracking
**Favorites** — Saved scene results

---

## Deployment

### Frontend (Vercel)
```bash
cd apps/web
vercel --prod
```

### Backend (Render)
Use the included `Dockerfile` in `apps/api/`. Set environment variables in the Render dashboard.

### Database (Neon)
Create a free Postgres database at neon.tech. Use the connection string in both frontend and backend env files.

---

## Sample Queries

Try these after seeding the demo data:

- "person walking on the beach at sunset"
- "close-up of hands cooking"
- "city skyline at night with lights"
- "dog playing fetch in a park"
- "rain falling on a window"

---

## License

MIT

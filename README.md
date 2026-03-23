<div align="center">

# VibeSearch

**AI-powered video moment search engine** — upload videos, and find any scene using natural language.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![CLIP](https://img.shields.io/badge/CLIP-ViT--B%2F32-FF6F00)](https://github.com/mlfoundations/open_clip)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_Search-3B5998)](https://github.com/facebookresearch/faiss)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

[Live Demo](#demo) · [Architecture](#system-architecture) · [Local Setup](#local-development) · [Deploy](#deployment)

</div>

---

## Demo

| Layer | URL |
|-------|-----|
| **Frontend** | `https://vibesearch.vercel.app` |
| **Backend API** | `https://vibesearch-api.onrender.com/docs` |

**Try it:** Sign in with Google → upload an MP4 → wait for processing → search for `"person walking at sunset"` or `"close-up of hands cooking"`.

---

## What It Does

VibeSearch converts raw video files into a searchable index of visual moments. Users describe what they're looking for in plain English, and the system returns the exact scene — with timestamps, thumbnails, similarity scores, and an explanation of why it matched.

No keywords. No manual tagging. The system understands visual meaning through CLIP embeddings and retrieves results via FAISS vector search, then re-ranks with a cross-encoder — all running locally with zero paid API dependencies.

---

## Features

**Core**
- Upload MP4/MOV/WebM videos (up to 100 MB)
- Automatic scene segmentation (5-second chunks via OpenCV)
- Frame extraction (3 keyframes per scene)
- CLIP embedding generation (ViT-B/32 on LAION-2B)
- FAISS inner-product vector search
- Cross-encoder reranking (ms-marco-MiniLM-L-6-v2)
- Query normalization with synonym expansion and typo correction

**Product**
- Natural language scene search with scored results
- Video detail page with scene-level navigation
- Scene preview playback at exact timestamps
- Save/favorite scenes for later
- Search history with one-click rerun
- Dashboard with aggregated stats
- First-time user onboarding flow

**Auth & UX**
- Google OAuth via Auth.js v5
- Protected routes with session gating
- Dark premium UI with gradient accents and Framer Motion
- Responsive across mobile and desktop
- Loading skeletons, empty states, error boundaries

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SEARCH PIPELINE                            │
│                                                                     │
│  User Query ──► Next.js ──► FastAPI ──► Query Normalization         │
│                                │         (lowercase, synonyms,      │
│                                │          typo correction)          │
│                                ▼                                    │
│                          CLIP Encode ──► 512-dim vector             │
│                                │                                    │
│                                ▼                                    │
│                     FAISS Top-K Retrieval (cosine sim)              │
│                                │                                    │
│                                ▼                                    │
│                    Cross-Encoder Reranking                          │
│                     (ms-marco-MiniLM)                               │
│                                │                                    │
│                                ▼                                    │
│                     Postgres Metadata Lookup                        │
│                     (scenes, frames, videos)                        │
│                                │                                    │
│                                ▼                                    │
│                   ◄── Ranked JSON Response ──►                      │
│                   (thumbnails, timestamps, scores, explanations)     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        UPLOAD PIPELINE                              │
│                                                                     │
│  MP4 File ──► FastAPI Upload ──► Save to /data/uploads/             │
│                                      │                              │
│                              [background task]                      │
│                                      │                              │
│                                      ▼                              │
│                    FFprobe Duration ──► OpenCV Frame Extract         │
│                                             │                       │
│                              5-sec scene chunks                     │
│                              3 frames per scene                     │
│                                             │                       │
│                                             ▼                       │
│                              CLIP Encode (avg frame embeddings)     │
│                                             │                       │
│                                             ▼                       │
│                    Insert Scenes + Frames ──► FAISS Index Add       │
│                    Video status = "processed"                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
vibesearch/
├── apps/
│   ├── api/                          # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/                 # Config, database engine, session
│   │   │   ├── models/               # SQLAlchemy models (7 tables)
│   │   │   ├── schemas/              # Pydantic request/response contracts
│   │   │   ├── routers/              # API route handlers
│   │   │   │   ├── auth.py           # Google OAuth sync
│   │   │   │   ├── search.py         # Search + history
│   │   │   │   ├── videos.py         # Upload, list, detail, delete, reindex
│   │   │   │   ├── favorites.py      # Save/remove scenes
│   │   │   │   ├── dashboard.py      # Aggregated stats
│   │   │   │   └── users.py          # Onboarding, profile
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── clip_service.py   # CLIP text/image encoding
│   │   │   │   ├── faiss_service.py  # Vector index (add, search, persist)
│   │   │   │   ├── search_service.py # Full search orchestration
│   │   │   │   ├── reranker_service.py # Cross-encoder reranking
│   │   │   │   ├── ingestion_service.py # Video processing pipeline
│   │   │   │   └── query_service.py  # Normalization + synonyms
│   │   │   └── main.py              # App entrypoint, CORS, static mounts
│   │   ├── scripts/
│   │   │   ├── seed_demo.py          # Seed demo data + synthetic embeddings
│   │   │   └── ingest_video.py       # CLI video ingestion tool
│   │   ├── data/                     # Runtime data (gitignored)
│   │   │   ├── uploads/              # Uploaded video files
│   │   │   ├── frames/               # Extracted JPEG frames
│   │   │   └── index/                # FAISS index file
│   │   ├── alembic/                  # Database migrations
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── web/                          # Next.js 15 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx           # Landing page
│       │   │   ├── (app)/             # Protected route group
│       │   │   │   ├── layout.tsx     # Auth gate + onboarding + context
│       │   │   │   ├── dashboard/     # Dashboard with stats
│       │   │   │   ├── search/        # Semantic search UI
│       │   │   │   ├── videos/        # Video library + upload
│       │   │   │   ├── videos/[id]/   # Video detail + scene nav
│       │   │   │   ├── history/       # Search history
│       │   │   │   └── favorites/     # Saved scenes
│       │   │   └── api/auth/          # Auth.js route handler
│       │   ├── components/
│       │   │   ├── landing/           # Hero, HowItWorks, DemoQueries, Footer
│       │   │   ├── search/            # SearchBar, ResultCard, ResultGrid, VideoPreview
│       │   │   ├── videos/            # VideoCard, UploadModal, ProcessingBadge
│       │   │   ├── history/           # SearchHistoryList
│       │   │   ├── onboarding/        # OnboardingModal
│       │   │   ├── layout/            # Navbar
│       │   │   ├── auth/              # AuthButton, Providers
│       │   │   └── ui/                # Skeleton
│       │   ├── hooks/
│       │   │   └── useSearch.ts       # Search state management
│       │   ├── lib/
│       │   │   ├── api.ts             # Typed HTTP client
│       │   │   ├── auth.ts            # Auth.js config
│       │   │   └── utils.ts           # cn, formatTimestamp, formatScore
│       │   └── types/
│       │       └── index.ts           # Shared TypeScript interfaces
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       └── .env.example
│
└── package.json                      # Monorepo root
```

---

## Backend Deep Dive

### Data Models

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Google OAuth profiles | id, name, email, image |
| `videos` | Uploaded video records | id, user_id, title, file_url, storage_path, status, duration_seconds, scene_count, processing_error |
| `scenes` | Temporal segments within videos | id, video_id, scene_index, start_time_sec, end_time_sec, faiss_vector_id, metadata_json |
| `scene_frames` | Keyframe images per scene | id, scene_id, frame_url, frame_index, timestamp_sec |
| `search_queries` | Search history log | id, user_id, query_text, result_count |
| `favorites` | Saved scene bookmarks | id, user_id, scene_id |
| `onboarding_state` | First-time user tracking | id, user_id, completed |

### Video Processing Pipeline

`ingestion_service.py` handles the full upload-to-searchable flow:

1. **Duration detection** — `ffprobe` with OpenCV fallback
2. **Scene splitting** — Fixed 5-second chunks (production-safe; shot detection can be swapped in)
3. **Frame extraction** — 3 frames per scene via `cv2.VideoCapture` at evenly spaced timestamps
4. **Frame persistence** — Saved as JPEG to `data/frames/{video_id}/s{scene}_f{frame}.jpg`
5. **CLIP encoding** — Each scene's frames are encoded, averaged, and L2-normalized to a 512-dim vector
6. **FAISS insertion** — Vectors added to a flat inner-product index; sequential IDs mapped to `Scene.faiss_vector_id`
7. **DB commit** — Scene + SceneFrame records written; video status set to `processed`

Processing runs as an `asyncio.create_task` background task to avoid blocking the upload response.

### Search Pipeline

`search_service.py` orchestrates the full query flow:

1. **Query normalization** — Lowercasing, whitespace collapse, typo correction, synonym expansion (`dog → puppy, canine`)
2. **CLIP encoding** — Query text encoded to 512-dim vector
3. **FAISS retrieval** — Top-K × 3 oversampled candidates (Top-K × 9 when filtering by `video_id`)
4. **DB lookup** — Scene + Video + Frame records fetched with eager loading
5. **Cross-encoder reranking** — `ms-marco-MiniLM-L-6-v2` scores `(query, scene_text)` pairs
6. **Response assembly** — Thumbnails, timestamps, similarity scores, human-readable match explanations, favorite status

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/google` | Upsert user from Google session |
| `GET` | `/api/auth/me` | Get current user + onboarding state |
| `POST` | `/api/videos/upload` | Upload video + trigger processing |
| `GET` | `/api/videos` | List user's videos |
| `GET` | `/api/videos/{id}` | Video detail with scenes |
| `DELETE` | `/api/videos/{id}` | Delete video + rebuild FAISS |
| `POST` | `/api/videos/{id}/reindex` | Re-run ingestion |
| `POST` | `/api/search` | Semantic scene search |
| `GET` | `/api/search/suggestions` | Sample query prompts |
| `GET` | `/api/search/history` | User's past queries |
| `GET` | `/api/dashboard/stats` | Aggregated user stats |
| `GET/POST/DELETE` | `/api/favorites` | Manage saved scenes |
| `POST` | `/api/users/{id}/onboarding/complete` | Mark onboarding done |

---

## Frontend Deep Dive

### Tech

- **Next.js 15** with App Router and route groups (`(app)` for protected pages)
- **Auth.js v5** with Google OAuth; session synced to backend on sign-in
- **Tailwind CSS** with custom design tokens — Syne (display), DM Sans (body), JetBrains Mono (mono)
- **Framer Motion** for page transitions, staggered reveals, hover states, modal animations
- **Custom design system**: dark base (`#0a0a0f`), violet/coral/cyan gradients, glassmorphism cards, noise textures

### Key Components

| Component | Purpose |
|-----------|---------|
| `SearchBar` | Input with keyboard shortcut (`/`), suggestion chips, loading state |
| `ResultCard` | Thumbnail strip, score badge, timestamp, expandable preview, favorite toggle |
| `ResultGrid` | Handles loading/empty/error/populated states with skeletons |
| `VideoPreview` | Inline video player scoped to scene timestamps |
| `UploadModal` | Drag-and-drop with XHR progress bar |
| `VideoCard` | Video grid card with status badge, confirm-to-delete, reindex action |
| `OnboardingModal` | 3-step guided tour explaining search, results, and favorites |
| `ProcessingBadge` | Color-coded status indicator (queued → processing → ready → failed) |

### State Management

- **`useAppContext`** — React Context providing `userId` from the auth-gated layout
- **`useSearch`** — Custom hook managing query, results, loading, error, suggestions, and `videoId` filter
- **API client** (`lib/api.ts`) — Typed fetch wrapper with error class; XHR for uploads with progress callbacks

### Media URL Resolution

Frame URLs in the database are stored as relative paths (`/static/frames/...`). The frontend resolves them by prepending the backend origin:

```typescript
const resolveUrl = (url: string) => {
  if (url.startsWith("/static")) {
    const apiBase = API_BASE.replace("/api", "");
    return `${apiBase}${url}`;
  }
  return url;
};
```

`next.config.ts` whitelists remote image patterns for `picsum.photos`, `lh3.googleusercontent.com`, `res.cloudinary.com`, and `storage.googleapis.com`.

---

## Media Handling

### Storage Layout

```
data/
├── uploads/          # Raw video files (UUID-named)
│   └── a1b2c3d4.mp4
├── frames/           # Extracted keyframes (organized by video ID)
│   └── {video_uuid}/
│       ├── s000_f00.jpg
│       ├── s000_f01.jpg
│       └── s001_f00.jpg
└── index/
    └── scenes.index  # FAISS binary index file
```

### Static Serving

FastAPI mounts two `StaticFiles` directories:
- `/static/uploads` → `data/uploads/`
- `/static/frames` → `data/frames/`

### Tradeoffs

**Current**: Local filesystem storage. Simple, zero-cost, works for development and single-server deployment.

**Limitation**: On Render free tier, filesystem storage is ephemeral — data lost on redeploy.

**Future**: Swap to Cloudinary (free tier: 25 credits/month) or S3. The `storage_path` and `frame_url` fields are already decoupled from serving logic, making migration straightforward.

---

## Authentication

1. User clicks "Sign in with Google" → Auth.js handles the OAuth redirect
2. On success, Auth.js `signIn` callback POSTs user data to `POST /api/auth/google`
3. Backend upserts the user in Postgres and creates an `OnboardingState` record if new
4. Frontend `(app)/layout.tsx` calls `GET /api/auth/me?email=...` on mount to load user ID and onboarding status
5. If onboarding is incomplete, `OnboardingModal` is shown
6. `userId` is provided to all child pages via React Context

The `(app)` route group layout checks `useSession()`. Unauthenticated users are redirected to `/`.

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Async Postgres connection (asyncpg) | `postgresql+asyncpg://user:pass@host/db` |
| `DATABASE_URL_SYNC` | Sync connection (for Alembic) | `postgresql://user:pass@host/db` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000,https://vibesearch.vercel.app` |
| `FAISS_INDEX_PATH` | Path to FAISS index file | `./data/index/scenes.index` |
| `UPLOAD_DIR` | Video upload directory | `./data/uploads` |
| `FRAMES_DIR` | Extracted frames directory | `./data/frames` |
| `MAX_UPLOAD_MB` | Max upload size in megabytes | `100` |
| `AUTH_SECRET` | Shared secret with frontend | (generate a random string) |
| `ENV` | `development` or `production` | `development` |

### Frontend (`apps/web/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | Must match backend | (same as backend) |
| `AUTH_URL` | Canonical app URL | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | `GOCSPX-xxx` |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api` |

---

## Local Development

### Prerequisites

- **Node.js 20+**
- **Python 3.11+**
- **FFmpeg** — `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Ubuntu)
- **PostgreSQL** — local install or [Neon](https://neon.tech) free tier

### Backend

```bash
cd apps/api

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your DATABASE_URL and other values

# Create tables
alembic upgrade head

# Seed demo data (optional — creates 6 demo videos with synthetic embeddings)
python scripts/seed_demo.py

# Run server
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd apps/web

npm install

cp .env.example .env.local
# Edit .env.local with Google OAuth credentials and API URL

npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Backend → Render

1. Create a new **Web Service** from the `apps/api` directory
2. **Build**: `pip install -r requirements.txt`
3. **Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables
5. Set `ENV=production` to pre-load ML models at startup

> Render free tier has ephemeral storage. Uploaded files and FAISS index are lost on redeploy. Use a paid instance or external storage for persistence.

### Frontend → Vercel

1. Import repo, set **Root Directory** to `apps/web`
2. Framework: Next.js (auto-detected)
3. Add environment variables: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_API_URL`
4. Point `NEXT_PUBLIC_API_URL` to your Render backend

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://vibesearch.vercel.app/api/auth/callback/google`
4. Copy Client ID + Secret to both env files

---

## Known Limitations

| Area | Limitation | Impact |
|------|-----------|--------|
| **Storage** | Local filesystem; ephemeral on Render free tier | Uploads and index lost on redeploy |
| **FAISS** | Flat index with sequential IDs; full rebuild on deletion | O(n) rebuild; fine for <10K scenes |
| **Scene detection** | Fixed 5-second chunks, not content-aware | May split mid-action |
| **Processing** | In-process background task, not a queue | No retry on crash; single worker |
| **Scale** | CLIP + reranker in-memory on one process | Not horizontally scalable |
| **Transcripts** | Field exists but not yet populated | `transcript_text` is unused |

---

## Future Improvements

- [ ] Cloud storage (Cloudinary or S3) for persistent video/frame hosting
- [ ] Task queue (Celery / Dramatiq) for reliable background processing
- [ ] Content-aware shot detection (PySceneDetect / TransNetV2)
- [ ] Whisper transcription for speech-to-text indexing
- [ ] GPU-accelerated CLIP encoding
- [ ] Scalable vector DB (Qdrant / Milvus / pgvector)
- [ ] Embedding cache to avoid recompute on FAISS rebuild
- [ ] Multi-modal search (visual + text + audio embeddings)
- [ ] Per-user storage quotas and rate limiting
- [ ] Admin panel for moderation and system health

---

## Screenshots

> *Replace placeholders with actual screenshots after deployment.*

| Screen | Description |
|--------|-------------|
| ![Landing](docs/screenshots/landing.png) | Cinematic landing page with animated pipeline explanation |
| ![Search](docs/screenshots/search.png) | Semantic search results with thumbnails, scores, and explanations |
| ![Upload](docs/screenshots/upload.png) | Drag-and-drop upload modal with progress bar |
| ![Video Detail](docs/screenshots/detail.png) | Video player with scene-level navigation sidebar |
| ![Dashboard](docs/screenshots/dashboard.png) | User dashboard with stats and recent activity |
| ![Favorites](docs/screenshots/favorites.png) | Saved moments with scene metadata |

---

## Author

**Krishna Modi**
University of Florida

Built as a portfolio project demonstrating full-stack AI engineering — from ML model integration and vector search to production frontend design and deployment infrastructure.

---

## License

MIT

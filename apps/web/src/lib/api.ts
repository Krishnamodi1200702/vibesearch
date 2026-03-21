/**
 * Typed API client — talks to the FastAPI backend.
 * All functions return typed data matching our schema definitions.
 */

import type {
  AuthResponse,
  SearchResponse,
  SearchSuggestions,
  Video,
  VideoDetail,
  VideoUploadResponse,
  Favorite,
  OnboardingState,
  HealthCheck,
  DashboardStats,
  SearchHistoryItem,
} from "@/types";

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_BASE = API.replace(/\/api$/, "");

export { API_BASE };

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new ApiError(body, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────

export async function syncUser(email: string, name: string, image?: string | null): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ email, name, image }),
  });
}

export async function getMe(email: string): Promise<AuthResponse> {
  return request<AuthResponse>(`/auth/me?email=${encodeURIComponent(email)}`);
}

// ── Search ────────────────────────────────────────

export async function search(
  query: string,
  userId?: string,
  topK = 10,
  videoId?: string,
): Promise<SearchResponse> {
  const params = userId ? `?userId=${userId}` : "";
  return request<SearchResponse>(`/search${params}`, {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK, video_id: videoId || null }),
  });
}

export async function getSuggestions(): Promise<SearchSuggestions> {
  return request<SearchSuggestions>("/search/suggestions");
}

export async function getSearchHistory(userId: string, limit = 30): Promise<SearchHistoryItem[]> {
  return request<SearchHistoryItem[]>(`/search/history?userId=${userId}&limit=${limit}`);
}

// ── Videos ────────────────────────────────────────

export async function listVideos(userId?: string): Promise<Video[]> {
  const params = userId ? `?userId=${userId}` : "";
  return request<Video[]>(`/videos${params}`);
}

export async function getVideoDetail(videoId: string): Promise<VideoDetail> {
  return request<VideoDetail>(`/videos/${videoId}`);
}

export async function uploadVideo(
  file: File,
  title: string,
  userId: string,
  description = "",
  onProgress?: (pct: number) => void,
): Promise<VideoUploadResponse> {
  const url = `${API}/videos/upload?userId=${userId}`;
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("description", description);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new ApiError(xhr.responseText || "Upload failed", xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error", 0));
    xhr.send(form);
  });
}

export async function deleteVideo(videoId: string, userId: string): Promise<void> {
  return request<void>(`/videos/${videoId}?userId=${userId}`, {
    method: "DELETE",
  });
}

export async function reindexVideo(videoId: string, userId: string): Promise<VideoUploadResponse> {
  return request<VideoUploadResponse>(`/videos/${videoId}/reindex?userId=${userId}`, {
    method: "POST",
  });
}

// ── Favorites ─────────────────────────────────────

export async function listFavorites(userId: string): Promise<Favorite[]> {
  return request<Favorite[]>(`/favorites?userId=${userId}`);
}

export async function addFavorite(userId: string, sceneId: string): Promise<Favorite> {
  return request<Favorite>(`/favorites?userId=${userId}`, {
    method: "POST",
    body: JSON.stringify({ scene_id: sceneId }),
  });
}

export async function removeFavorite(favoriteId: string, userId: string): Promise<void> {
  return request<void>(`/favorites/${favoriteId}?userId=${userId}`, {
    method: "DELETE",
  });
}

export async function removeFavoriteByScene(sceneId: string, userId: string): Promise<void> {
  return request<void>(`/favorites/scene/${sceneId}?userId=${userId}`, {
    method: "DELETE",
  });
}

// ── Dashboard ─────────────────────────────────────

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  return request<DashboardStats>(`/dashboard/stats?userId=${userId}`);
}

// ── Onboarding ────────────────────────────────────

export async function completeOnboarding(userId: string): Promise<OnboardingState> {
  return request<OnboardingState>(`/users/${userId}/onboarding/complete`, {
    method: "POST",
  });
}

// ── Health ────────────────────────────────────────

export async function healthCheck(): Promise<HealthCheck> {
  return request<HealthCheck>("/health");
}

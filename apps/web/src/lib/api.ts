/**
 * Typed API client — talks to the FastAPI backend.
 * All functions return typed data matching our schema definitions.
 */

import type {
  AuthResponse,
  SearchResponse,
  SearchSuggestions,
  Video,
  Favorite,
  OnboardingState,
  HealthCheck,
} from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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

export async function search(query: string, userId?: string, topK = 10): Promise<SearchResponse> {
  const params = userId ? `?userId=${userId}` : "";
  return request<SearchResponse>(`/search${params}`, {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK }),
  });
}

export async function getSuggestions(): Promise<SearchSuggestions> {
  return request<SearchSuggestions>("/search/suggestions");
}

// ── Videos ────────────────────────────────────────

export async function listVideos(): Promise<Video[]> {
  return request<Video[]>("/videos");
}

export async function getVideo(videoId: string): Promise<Video> {
  return request<Video>(`/videos/${videoId}`);
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

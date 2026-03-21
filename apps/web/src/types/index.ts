/** API response types — mirrors the FastAPI Pydantic schemas. */

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  created_at: string;
}

export interface OnboardingState {
  completed: boolean;
  completed_at: string | null;
}

export interface AuthResponse {
  user: User;
  onboarding: OnboardingState;
  is_new_user: boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  duration_seconds: number;
  scene_count: number;
  status: string;
  processing_error: string | null;
  created_at: string;
  processed_at: string | null;
  thumbnail_url?: string;
}

export interface VideoDetail extends Video {
  scenes: Scene[];
}

export interface VideoUploadResponse {
  id: string;
  title: string;
  status: string;
  message: string;
}

export interface SceneFrame {
  id: string;
  frame_url: string;
  frame_index: number;
  timestamp_sec: number;
}

export interface Scene {
  id: string;
  video_id: string;
  scene_index: number;
  start_time_sec: number;
  end_time_sec: number;
  transcript_text: string | null;
  metadata_json: Record<string, unknown> | null;
  frames: SceneFrame[];
}

export interface SearchResultItem {
  scene_id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  scene_index: number;
  start_time_sec: number;
  end_time_sec: number;
  thumbnails: string[];
  similarity_score: number;
  match_explanation: string;
  transcript_text: string | null;
  is_favorited: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took_ms: number;
}

export interface SearchHistoryItem {
  id: string;
  query_text: string;
  result_count: number;
  created_at: string;
}

export interface Favorite {
  id: string;
  scene_id: string;
  created_at: string;
  scene: Scene | null;
  video: Video | null;
}

export interface SearchSuggestions {
  suggestions: string[];
}

export interface HealthCheck {
  status: string;
  env: string;
  faiss_vectors: number;
}

export interface DashboardStats {
  total_videos: number;
  total_scenes: number;
  total_searches: number;
  total_favorites: number;
  videos_processing: number;
  recent_searches: SearchHistoryItem[];
  recent_videos: Video[];
}

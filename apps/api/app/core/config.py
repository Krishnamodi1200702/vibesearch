"""Application configuration — loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://localhost/vibesearch"
    database_url_sync: str = "postgresql://localhost/vibesearch"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # FAISS
    faiss_index_path: str = "./data/index/scenes.index"

    # Cloudinary (optional for MVP)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Auth
    auth_secret: str = "dev-secret"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    env: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()

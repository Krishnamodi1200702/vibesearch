"""FAISS index service — stores and queries scene embeddings.

Uses a flat inner-product index (cosine similarity on L2-normed vectors).
Index is persisted to disk and loaded at startup.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import faiss
import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


class FAISSService:
    """Manages the FAISS index for scene vectors."""

    def __init__(self, dim: int = 512):
        self.dim = dim
        self.index_path = Path(settings.faiss_index_path)
        self.index: faiss.IndexFlatIP | None = None
        self._load_or_create()

    def _load_or_create(self):
        if self.index_path.exists():
            logger.info("Loading FAISS index from %s", self.index_path)
            self.index = faiss.read_index(str(self.index_path))
            logger.info("FAISS index loaded — %d vectors", self.index.ntotal)
        else:
            logger.info("Creating new FAISS index (dim=%d)", self.dim)
            self.index = faiss.IndexFlatIP(self.dim)

    def add(self, vectors: np.ndarray) -> list[int]:
        """Add vectors to the index. Returns the assigned IDs (sequential from current ntotal)."""
        assert vectors.ndim == 2 and vectors.shape[1] == self.dim
        start_id = self.index.ntotal
        self.index.add(vectors.astype(np.float32))
        ids = list(range(start_id, start_id + len(vectors)))
        logger.info("Added %d vectors to FAISS (total: %d)", len(vectors), self.index.ntotal)
        return ids

    def search(self, query_vector: np.ndarray, top_k: int = 10) -> list[tuple[int, float]]:
        """Search for top-K nearest vectors. Returns [(faiss_id, score), ...]."""
        if self.index.ntotal == 0:
            return []
        q = query_vector.reshape(1, -1).astype(np.float32)
        k = min(top_k, self.index.ntotal)
        scores, ids = self.index.search(q, k)
        results = [(int(ids[0][i]), float(scores[0][i])) for i in range(k) if ids[0][i] != -1]
        return results

    def save(self):
        """Persist index to disk."""
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_path))
        logger.info("FAISS index saved to %s (%d vectors)", self.index_path, self.index.ntotal)

    def reset(self):
        """Clear the index entirely."""
        self.index = faiss.IndexFlatIP(self.dim)
        logger.info("FAISS index reset")

    @property
    def count(self) -> int:
        return self.index.ntotal if self.index else 0


_instance: FAISSService | None = None


def get_faiss_service() -> FAISSService:
    global _instance
    if _instance is None:
        _instance = FAISSService()
    return _instance

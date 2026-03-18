"""Local reranker service using a cross-encoder model.

Uses sentence-transformers cross-encoder (ms-marco-MiniLM-L-6-v2) —
free, fast, and good enough for re-ranking CLIP retrieval results.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)

_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"


class RerankerService:
    """Re-ranks candidate scenes using a cross-encoder on query vs scene text."""

    def __init__(self):
        logger.info("Loading reranker model: %s", _MODEL_NAME)
        self.model = CrossEncoder(_MODEL_NAME, max_length=256)
        logger.info("Reranker loaded.")

    def rerank(
        self,
        query: str,
        candidates: list[dict],
        text_key: str = "text",
        top_k: int = 10,
    ) -> list[dict]:
        """Re-rank candidates by cross-encoder score.

        Each candidate dict should have `text_key` containing scene description text.
        Returns candidates sorted by reranker score, with `rerank_score` added.
        """
        if not candidates:
            return []

        pairs = [(query, c.get(text_key, "") or "") for c in candidates]
        scores = self.model.predict(pairs)

        for cand, score in zip(candidates, scores):
            cand["rerank_score"] = float(score)

        ranked = sorted(candidates, key=lambda c: c["rerank_score"], reverse=True)
        return ranked[:top_k]


@lru_cache(maxsize=1)
def get_reranker_service() -> RerankerService:
    return RerankerService()

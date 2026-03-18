"""CLIP embedding service — encodes text and images into vectors.

Uses open_clip (ViT-B-32 trained on LAION-2B) so there's zero API cost.
Model is loaded once at startup and kept in memory.
"""

from __future__ import annotations

import logging
from functools import lru_cache

import numpy as np
import open_clip
import torch
from PIL import Image

logger = logging.getLogger(__name__)

_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
_MODEL_NAME = "ViT-B-32"
_PRETRAINED = "laion2b_s34b_b79k"


class CLIPService:
    """Singleton-style CLIP encoder."""

    def __init__(self):
        logger.info("Loading CLIP model %s (%s) on %s…", _MODEL_NAME, _PRETRAINED, _DEVICE)
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            _MODEL_NAME, pretrained=_PRETRAINED, device=_DEVICE
        )
        self.tokenizer = open_clip.get_tokenizer(_MODEL_NAME)
        self.model.eval()
        self.dim = 512  # ViT-B-32 output dimension
        logger.info("CLIP model loaded — embedding dim=%d", self.dim)

    @torch.no_grad()
    def encode_text(self, text: str) -> np.ndarray:
        """Encode a single text string → (512,) float32 numpy vector."""
        tokens = self.tokenizer([text]).to(_DEVICE)
        features = self.model.encode_text(tokens)
        features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().astype(np.float32).flatten()

    @torch.no_grad()
    def encode_texts(self, texts: list[str]) -> np.ndarray:
        """Encode multiple texts → (N, 512) float32 numpy array."""
        tokens = self.tokenizer(texts).to(_DEVICE)
        features = self.model.encode_text(tokens)
        features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().astype(np.float32)

    @torch.no_grad()
    def encode_image(self, image: Image.Image) -> np.ndarray:
        """Encode a PIL image → (512,) float32 numpy vector."""
        tensor = self.preprocess(image).unsqueeze(0).to(_DEVICE)
        features = self.model.encode_image(tensor)
        features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().astype(np.float32).flatten()

    @torch.no_grad()
    def encode_images(self, images: list[Image.Image]) -> np.ndarray:
        """Encode multiple PIL images → (N, 512) float32 numpy array."""
        tensors = torch.stack([self.preprocess(img) for img in images]).to(_DEVICE)
        features = self.model.encode_image(tensors)
        features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().astype(np.float32)


@lru_cache(maxsize=1)
def get_clip_service() -> CLIPService:
    return CLIPService()

"""Query normalization service — improves search quality without paid APIs.

Applies:
1. Lowercasing + whitespace normalization
2. Basic synonym expansion (dictionary-based)
3. Common typo correction patterns

Keeps CLIP as the primary engine — this just makes the text input cleaner.
"""

from __future__ import annotations

import re

# ── Synonym map: query term → expanded terms appended ──
# Only expand when the synonym adds meaningful visual context for CLIP
_SYNONYMS: dict[str, list[str]] = {
    "dog": ["puppy", "canine", "pet"],
    "puppy": ["dog", "pet"],
    "cat": ["kitten", "feline"],
    "kitten": ["cat", "feline"],
    "car": ["automobile", "vehicle"],
    "automobile": ["car", "vehicle"],
    "food": ["cooking", "meal", "dish"],
    "cooking": ["food", "kitchen", "chef"],
    "ocean": ["sea", "water", "waves"],
    "sea": ["ocean", "water"],
    "beach": ["shore", "coast", "sand"],
    "sunset": ["dusk", "golden hour", "evening sky"],
    "sunrise": ["dawn", "morning sky"],
    "night": ["dark", "nighttime", "evening"],
    "city": ["urban", "downtown", "metropolitan"],
    "mountain": ["peak", "summit", "hills"],
    "forest": ["woods", "trees", "woodland"],
    "rain": ["rainfall", "raining", "storm"],
    "snow": ["winter", "snowy", "frost"],
    "person": ["human", "people", "someone"],
    "child": ["kid", "children", "toddler"],
    "baby": ["infant", "newborn"],
    "running": ["jogging", "sprinting"],
    "walking": ["strolling", "hiking"],
    "dancing": ["dance", "choreography"],
    "laughing": ["smiling", "happy", "joy"],
    "crying": ["sad", "tears"],
    "drone": ["aerial", "bird's eye", "overhead"],
    "aerial": ["drone", "overhead", "bird's eye view"],
    "closeup": ["close-up", "macro", "detail"],
    "close-up": ["closeup", "macro", "detail"],
}

# ── Common typo corrections ──
_TYPO_CORRECTIONS: dict[str, str] = {
    "beech": "beach",
    "bech": "beach",
    "mountian": "mountain",
    "mountin": "mountain",
    "sunet": "sunset",
    "sunest": "sunset",
    "occean": "ocean",
    "forrest": "forest",
    "citty": "city",
    "raing": "rain",
    "runing": "running",
    "walkign": "walking",
    "cookign": "cooking",
    "danceing": "dancing",
    "perosn": "person",
    "poeple": "people",
}


def normalize_query(query: str) -> str:
    """Full query normalization pipeline.

    Returns a cleaned, optionally synonym-expanded query string
    that should produce better CLIP embeddings.
    """
    # 1. Lowercase + strip
    q = query.lower().strip()

    # 2. Collapse whitespace
    q = re.sub(r"\s+", " ", q)

    # 3. Remove excess punctuation (keep hyphens and apostrophes)
    q = re.sub(r"[^\w\s\-']", " ", q)
    q = re.sub(r"\s+", " ", q).strip()

    # 4. Apply typo corrections
    words = q.split()
    corrected = [_TYPO_CORRECTIONS.get(w, w) for w in words]
    q = " ".join(corrected)

    # 5. Synonym expansion — append a few related terms
    # Only add 1-2 synonyms to avoid diluting the query
    expansions = set()
    for word in corrected:
        syns = _SYNONYMS.get(word, [])
        for s in syns[:2]:  # Max 2 synonyms per word
            if s not in corrected:
                expansions.add(s)

    if expansions:
        # Append synonyms as a soft hint, separated by comma
        expansion_str = ", ".join(list(expansions)[:3])
        q = f"{q}, {expansion_str}"

    return q

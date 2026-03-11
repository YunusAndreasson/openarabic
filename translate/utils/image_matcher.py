"""Match articles to catalog images based on category, topics, and aqeedah safety."""

import json
import logging
import re
import secrets
from pathlib import Path

logger = logging.getLogger(__name__)

CATALOG_PATH = Path(__file__).parent.parent / "data" / "image_catalog.json"

# Title-keyword overrides — when ANY of the keywords appear in the article title,
# the paired image is used directly, bypassing the scoring algorithm.
# Keywords are matched against the lowercased title only (not summary), so they
# must be specific enough to avoid false positives.
# Order matters: first match wins.
_TITLE_OVERRIDES: list[tuple[list[str], str]] = [
    # Quran / Scripture — open Quran on wooden rehal
    (["scripture", "quran", "qur'an", "quranic"], "shutterstock_1178327119.webp"),
    # Ablution / Purification — brass faucet with water droplet
    (["ablution", "wudu", "wuḍū", "tayammum", "purification"], "shutterstock_1981671665.webp"),
    # Prophet's Mosque / Medina — Al-Masjid an-Nabawi courtyard
    (["prophet's household", "wives of the prophet", "raised in the prophet",
      "household of the prophet", "medina"], "haidan-RhkbHU14MoA-unsplash.webp"),
    # Mecca / Hajj / Pilgrimage — aerial Masjid al-Haram at night
    (["mecca", "makkah", "hajj", "pilgrimage", "kaaba", "ka'ba"], "shutterstock_660976327.webp"),
    # Adam / Creation — moonlit desert dunes
    (["adam's", "adam and", "lessons from adam", "story of adam"], "175df9b2.webp"),
    # Angels at sacred sites — ornate mosque interior
    (["bayt al-maqdis", "al-aqsa", "angels at", "angels of"], "4a0b8963.webp"),
    # Cave — underground cave with river and light
    (["in the cave", "supplication in cave", "cave of", "men in cave", "in cave",
      "three men in", "sincere deeds rescue", "deeds rescue three"], "pexels-6877001.webp"),
    # Mother / Parents — serene courtyard with olive trees
    (["mother's feet", "mothers' feet", "mothers feet", "honor your mother",
      "rights of parents", "rights of the mother"], "5a8bd377.webp"),
    # Battle / Ghazwa — dramatic canyon (majestic, no humans)
    (["battle of", "ghazwa", "expedition of"], "598afaec.webp"),
    # Heart / Shaytan / Spiritual battle — Milky Way starry night sky
    (["heart against", "heart that repels", "guarding the heart", "repels the devil",
      "repels satan", "heart against satan", "heart against shaytan",
      "armor against satan", "armor against shaytan", "repel the devil"], "milky-way-984050_1920.webp"),
    # Scholarly disputation / debate — illuminated Arabic manuscript
    (["scholarly disputation", "avoiding disputation", "scholarly debate",
      "disputation in", "forbidden disputation"], "pexels-29342494.webp"),
    # Islamic science / dialectic / jurisprudence methodology — library shelves
    (["science of islamic", "islamic dialectic", "usul al-fiqh", "principles of fiqh",
      "jurisprudence methodology", "islamic logic"], "pexels-19369819.webp"),
    # Night prayer / Tahajjud — dark mosque interior
    (["tahajjud", "night prayer", "qiyam al-layl", "qiyam", "night vigil"], "pexels-19657344.webp"),
    # Fasting / Suhoor / Ramadan — predawn starry horizon
    (["suhoor", "ramadan fast", "breaking fast", "iftar", "fasting dawn"], "pexels-35223929.webp"),
    # Death / Funeral / Grave — solemn gravestone with rose
    (["funeral prayer", "janazah", "death and burial", "visiting graves",
      "burial rites", "washing the dead"], "pexels-6841117.webp"),
    # Trade / Wealth / Zakat — coins on wooden surface
    (["zakat on wealth", "trade and commerce", "lawful earnings", "wealth and poverty",
      "prohibition of usury", "riba"], "pexels-35431751.webp"),
    # Journey / Migration / Camel — camel caravan over dunes
    (["camel", "desert journey", "hijra route", "trade route", "caravan"], "pexels-34239912.webp"),
    # Storm / Trial at sea — lighthouse in storm waves
    (["trial of", "storm of", "hardship of faith", "steadfast in trial"], "pexels-3722772.webp"),
    # Paradise / Garden / Rivers — serene riverside garden with palms
    (["rivers of paradise", "gardens of paradise", "paradise beneath",
      "enter paradise", "keys to paradise"], "pexels-6416136.webp"),
    # Mosque reflection / evening worship — illuminated mosque in still water
    (["evening prayer", "isha prayer", "maghrib prayer", "mosque at night",
      "night at the mosque"], "pexels-20512957.webp"),
]

# Keywords in the article title/summary that imply a specific sacred person
# (prophet, angel, divine being). When found, we exclude 'avoid' images to
# prevent implying a visual depiction of that person.
_SACRED_PERSON_KEYWORDS = {
    "prophet", "messenger", "angel", "jibril", "gabriel", "allah", "divine",
    "revelation", "prophethood", "muhammad", "ibrahim", "musa", "isa",
    "nuh", "adam", "jibreel", "michael", "mikail", "israfil", "azrael",
    "attributes of allah", "names of allah", "throne", "preserved tablet",
}

# Maps article keywords → image mood. Used to infer the intended mood of an
# article from its title/summary and reward matching image moods.
_MOOD_KEYWORDS: dict[str, str] = {
    # dramatic / intense
    "battle": "dramatic", "war": "dramatic", "conflict": "dramatic",
    "struggle": "dramatic", "trial": "dramatic", "punishment": "dramatic",
    "hellfire": "dramatic", "warning": "dramatic", "fear": "dramatic",
    # solemn
    "death": "solemn", "grief": "solemn", "mourning": "solemn",
    "judgment": "solemn", "accountability": "solemn", "grave": "solemn",
    "resurrection": "solemn", "hell": "solemn",
    # majestic
    "glory": "majestic", "greatness": "majestic", "magnificence": "majestic",
    "creation": "majestic", "universe": "majestic", "throne": "majestic",
    "paradise": "majestic", "heaven": "majestic",
    # scholarly
    "knowledge": "scholarly", "scholar": "scholarly", "learning": "scholarly",
    "study": "scholarly", "science": "scholarly", "wisdom": "scholarly",
    "evidence": "scholarly", "proof": "scholarly",
    # contemplative / default spiritual
    "patience": "contemplative", "repentance": "contemplative",
    "sincerity": "contemplative", "gratitude": "contemplative",
    "heart": "contemplative", "soul": "contemplative", "remembrance": "contemplative",
    "prayer": "contemplative", "worship": "contemplative",
    # serene / peaceful
    "peace": "serene", "tranquility": "serene", "serenity": "serene",
    "blessings": "serene", "mercy": "serene", "forgiveness": "serene",
    "love": "serene", "hope": "serene",
    # warm
    "family": "warm", "marriage": "warm", "children": "warm",
    "community": "warm", "charity": "warm", "generosity": "warm",
}

# Common English stop words to skip when extracting keywords from text
_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to",
    "for", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "this", "that", "it", "its", "as", "not", "no",
    "he", "she", "they", "we", "his", "her", "their", "our", "about",
    "which", "who", "what", "how", "when", "where", "why", "all", "each",
}

_catalog_cache: dict | None = None
_usage_cache: dict[str, int] | None = None
_session_usage: dict[str, int] = {}  # tracks assignments made in the current run


def _load_catalog() -> dict:
    global _catalog_cache
    if _catalog_cache is None:
        if not CATALOG_PATH.exists():
            logger.warning(f"Image catalog not found at {CATALOG_PATH}")
            return {}
        _catalog_cache = json.loads(CATALOG_PATH.read_text())
    return _catalog_cache


def _load_usage_counts() -> dict[str, int]:
    """Query Supabase for how many articles currently use each image filename.

    Handles both bare filenames ('25.webp') and legacy full Supabase URLs.
    Returns a dict mapping filename → article count.
    """
    global _usage_cache
    if _usage_cache is not None:
        return _usage_cache

    try:
        from utils.config_common import get_supabase_client

        result = get_supabase_client().table("articles").select("image_url").execute()
        counts: dict[str, int] = {}
        for row in result.data or []:
            raw = row.get("image_url") or ""
            # Normalise full URLs → bare filename
            filename = raw.split("/")[-1] if "/" in raw else raw
            if filename:
                counts[filename] = counts.get(filename, 0) + 1
        _usage_cache = counts
        logger.info(f"Loaded usage counts for {len(counts)} images from DB")
    except Exception as e:
        logger.warning(f"Could not load image usage counts from DB: {e} — usage penalty disabled")
        _usage_cache = {}

    return _usage_cache


def _keywords(text: str) -> set[str]:
    """Extract meaningful lowercase words from text."""
    words = re.findall(r"[a-zA-Z]+", text.lower())
    return {w for w in words if w not in _STOP_WORDS and len(w) > 2}


def match_image(category: str, title: str = "", summary: str = "") -> str | None:
    """Return the filename of the best matching image for an article.

    Matching priority:
    1. Category filter — prefer images tagged for this category
    2. Aqeedah safety — exclude 'avoid' images when article references a
       sacred person (prophet, angel, divine attribute)
    3. Topic overlap — score by shared keywords between article text and
       suitable_topics + tags
    4. Usage penalty — penalise images already used by many articles so the
       same image doesn't appear repeatedly across the app
    5. Random tie-break among top scorers

    Returns the image filename (e.g. "25.webp") or None if catalog is empty.
    """
    catalog = _load_catalog()
    if not catalog:
        logger.warning("Image catalog is empty — falling back to None")
        return None

    usage = _load_usage_counts()

    # Title-keyword overrides — check before scoring
    title_lower = title.lower()
    for keywords, override_image in _TITLE_OVERRIDES:
        if any(kw in title_lower for kw in keywords):
            if override_image in catalog:
                logger.info(f"Title override → '{override_image}' for '{title}'")
                _session_usage[override_image] = _session_usage.get(override_image, 0) + 1
                return override_image
            logger.warning(f"Override image '{override_image}' not in catalog, falling through")

    article_keywords = _keywords(f"{title} {summary}")
    full_text = f"{title} {summary}".lower()

    # Infer article mood from keywords — first match wins
    inferred_mood = next(
        (mood for kw, mood in _MOOD_KEYWORDS.items() if kw in full_text),
        "contemplative",  # default
    )

    # Only exclude human-figure images when the article explicitly references
    # a sacred person (prophet, angel, divine attribute) — not for all aqeedah.
    references_sacred_person = any(kw in full_text for kw in _SACRED_PERSON_KEYWORDS)

    # seerah and hadith almost always reference the Prophet, so always strict
    if category in {"seerah", "hadith"}:
        references_sacred_person = True

    # aqeedah and fiqh default to safe imagery — no human figures
    prefer_safe = category in {"aqeedah", "fiqh"}

    # Score each image
    scored: list[tuple[float, str]] = []

    for filename, data in catalog.items():
        img_categories = set(data.get("suitable_categories", []))
        img_topics = set(data.get("suitable_topics", []))
        img_tags = set(data.get("tags", []))
        risk = data.get("aqeedah_risk", "safe")
        img_mood = data.get("mood", "")

        # Hard filter: only exclude 'avoid' images when the article references
        # a sacred person (prophet, angel, divine attributes)
        if references_sacred_person and risk == "avoid":
            continue

        # Hard filter: aqeedah articles strongly prefer safe/caution images
        # unless the article is clearly about knowledge/worship (not sacred persons)
        if prefer_safe and risk == "avoid":
            continue

        # Category match bonus
        category_score = 2.0 if category in img_categories else 0.0

        # Topic overlap: match article keywords against suitable_topics and tags
        topic_score = len(article_keywords & img_topics)
        tag_score = len(article_keywords & {t.replace("-", " ").split()[0] for t in img_tags}) * 0.5

        # Mood match bonus — reward images whose mood fits the article tone
        mood_bonus = 0.5 if img_mood == inferred_mood else 0.0

        # Safety bonus/penalty — safe images are preferred across all categories;
        # aqeedah gets an even stronger nudge. 'avoid' images get a small penalty
        # to stop them winning by default when a safe alternative is close.
        if risk == "safe":
            safety_bonus = 0.6 if prefer_safe else 0.5
        elif risk == "caution":
            safety_bonus = 0.0
        else:  # avoid
            safety_bonus = -0.4

        # Usage penalty: DB usage gets 0.5 per use; in-session assignments
        # get a much steeper 2.0 penalty to strongly discourage reuse within
        # a single pipeline run
        db_uses = usage.get(filename, 0)
        session_uses = _session_usage.get(filename, 0)
        usage_penalty = db_uses * 0.5 + session_uses * 2.0

        total = category_score + topic_score + tag_score + mood_bonus + safety_bonus - usage_penalty
        scored.append((total, filename))

    if not scored:
        # Fallback: drop strict filter and pick any safe image
        logger.warning(f"No images passed filter for category='{category}', relaxing to safe-only")
        scored = [(0.0, fn) for fn, d in catalog.items() if d.get("aqeedah_risk") == "safe"]

    if not scored:
        logger.error("No images available in catalog")
        return None

    # Pick randomly among the top-scoring images (within 0.5 of the max score)
    max_score = max(s for s, _ in scored)
    top = [fn for s, fn in scored if s >= max_score - 0.5]
    chosen = secrets.choice(top)

    _session_usage[chosen] = _session_usage.get(chosen, 0) + 1

    logger.info(
        f"Matched image '{chosen}' for category='{category}' "
        f"(score={max_score:.1f}, pool={len(top)}, uses={usage.get(chosen, 0) + _session_usage.get(chosen, 0)})"
    )
    return chosen


def invalidate_usage_cache() -> None:
    """Call after inserting an article to force a fresh usage count next time."""
    global _usage_cache, _session_usage
    _usage_cache = None
    _session_usage = {}

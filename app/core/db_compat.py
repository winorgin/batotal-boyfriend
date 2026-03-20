from typing import Dict, Iterable, List, Optional, Set


DEFAULT_PERSONALITY_TRAITS = {
    "cheerful": 0.5,
    "caring": 0.5,
    "playful": 0.5,
    "serious": 0.5,
    "romantic": 0.5,
}

RELATIONSHIP_STAGE_MAP = {
    "stranger": "密友",
    "friend": "密友",
    "close_friend": "密友",
    "lover": "恋人",
    "soulmate": "灵魂伴侣",
    "密友": "密友",
    "恋人": "恋人",
    "灵魂伴侣": "灵魂伴侣",
}


def normalize_relationship_stage(stage: Optional[str]) -> str:
    return RELATIONSHIP_STAGE_MAP.get(stage or "", "密友")


def normalize_user_record(user: Optional[dict], fallback_platform: str = "web") -> dict:
    if not user:
        return {}

    preferences = user.get("preferences")
    if not isinstance(preferences, dict):
        preferences = {}

    personality_traits = user.get("personality_traits")
    if not isinstance(personality_traits, dict):
        personality_traits = preferences.get("personality_traits")
    if not isinstance(personality_traits, dict):
        personality_traits = DEFAULT_PERSONALITY_TRAITS.copy()

    preferred_language = user.get("preferred_language")
    if not preferred_language:
        preferred_language = preferences.get("preferred_language", "zh")

    intimacy = user.get("intimacy")
    if intimacy is None:
        intimacy = user.get("intimacy_level", 0)

    normalized = dict(user)
    normalized.pop("password_hash", None)
    normalized.update({
        "platform": user.get("platform") or fallback_platform or "web",
        "intimacy": intimacy or 0,
        "dol_balance": user.get("dol_balance", 0) or 0,
        "relationship_stage": normalize_relationship_stage(user.get("relationship_stage")),
        "current_mood": user.get("current_mood") or user.get("mood_state") or "happy",
        "personality_traits": personality_traits,
        "preferred_language": preferred_language or "zh",
        "last_message_at": user.get("last_message_at"),
    })
    return normalized


def load_user_platforms(supabase, user_ids: Iterable[str]) -> Dict[str, Set[str]]:
    ids = list({user_id for user_id in user_ids if user_id})
    if not ids:
        return {}

    try:
        result = supabase.table("user_platforms") \
            .select("user_id, platform") \
            .in_("user_id", ids) \
            .execute()
    except Exception:
        return {}

    platform_map: Dict[str, Set[str]] = {}
    for row in result.data or []:
        user_id = row.get("user_id")
        platform = row.get("platform")
        if not user_id or not platform:
            continue
        platform_map.setdefault(user_id, set()).add(platform)

    return platform_map


def resolve_user_platform(supabase, user: Optional[dict], fallback_platform: str = "web") -> str:
    if not user:
        return fallback_platform

    direct_platform = user.get("platform")
    if direct_platform:
        return direct_platform

    user_id = user.get("id")
    if not user_id:
        return fallback_platform

    platform_map = load_user_platforms(supabase, [user_id])
    platforms = platform_map.get(user_id)
    if platforms:
        return sorted(platforms)[0]

    return fallback_platform


def filter_users_by_platform(supabase, users: List[dict], platform: str) -> List[dict]:
    if not users:
        return []

    platform_map = load_user_platforms(supabase, [user.get("id") for user in users])
    matched = []

    for user in users:
        direct_platform = user.get("platform")
        if direct_platform:
            if direct_platform == platform:
                matched.append(user)
            continue

        known_platforms = platform_map.get(user.get("id"), set())
        if known_platforms:
            if platform in known_platforms:
                matched.append(user)
            continue

        if platform == "web":
            matched.append(user)

    return matched


def ensure_platform_binding(
    supabase,
    user_id: str,
    platform: str,
    platform_user_id: Optional[str] = None,
    platform_username: Optional[str] = None,
) -> None:
    try:
        existing = supabase.table("user_platforms") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("platform", platform) \
            .limit(1) \
            .execute()

        if existing.data:
            return

        supabase.table("user_platforms").insert({
            "user_id": user_id,
            "platform": platform,
            "platform_user_id": platform_user_id or user_id,
            "platform_username": platform_username,
            "is_primary": True,
        }).execute()
    except Exception:
        return
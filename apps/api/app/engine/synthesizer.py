"""
Synthesizer module for NIVARAN.
Re-exports the core clinical prescription synthesis logic from app.services.synthesizer.
"""

from app.services.synthesizer import (
    generate_daily_prescription,
    _generate_fallback_prescription,
    _build_deterministic_diet,
    _build_deterministic_exercise,
    _build_deterministic_mental,
    _build_deterministic_missions,
    MEDIA_RESOURCES,
)

__all__ = [
    "generate_daily_prescription",
    "_generate_fallback_prescription",
    "_build_deterministic_diet",
    "_build_deterministic_exercise",
    "_build_deterministic_mental",
    "_build_deterministic_missions",
    "MEDIA_RESOURCES",
]

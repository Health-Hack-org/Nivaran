import logging
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from app.schemas.prescription import (
    BiometricInput,
    PrescriptionResponse,
    DietProtocol,
    ExerciseProtocol,
    MentalProtocol,
)
from app.services.synthesizer import generate_daily_prescription
from app.engine.metrics import compute_all_metrics
from app.core.database import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


def _is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


@router.post("/generate", response_model=PrescriptionResponse, status_code=status.HTTP_200_OK)
async def generate_prescription(biometrics: BiometricInput):
    """
    Generates or retrieves a personalized clinical daily prescription:
    1. If a valid user_id, track, and day are provided, queries Supabase daily_prescriptions first.
    2. If a cached prescription exists, returns it directly (avoids redundant Gemini calls).
    3. If not cached, generates via Gemini AI synthesizer pipeline (with deterministic fallback).
    4. Upserts the generated prescription into Supabase daily_prescriptions.
    """
    try:
        supabase = get_supabase_client()
        has_valid_user = _is_valid_uuid(biometrics.user_id)

        # 1. Check cache in Supabase daily_prescriptions
        if supabase and has_valid_user:
            try:
                cached = (
                    supabase.table("daily_prescriptions")
                    .select("*")
                    .eq("user_id", biometrics.user_id)
                    .eq("track", biometrics.track)
                    .eq("day_number", biometrics.day_number)
                    .limit(1)
                    .execute()
                )
                if cached.data and len(cached.data) > 0:
                    row = cached.data[0]
                    logger.info(
                        f"Cache hit: returning cached prescription for user {biometrics.user_id}, "
                        f"track {biometrics.track}, day {biometrics.day_number}"
                    )
                    metrics = compute_all_metrics(biometrics)
                    return PrescriptionResponse(
                        track=row["track"],
                        day_number=row["day_number"],
                        phase=row["phase"],
                        phase_name=metrics.phase_name,
                        computed_metrics=metrics,
                        special_mission=row["special_mission"],
                        routine_tasks=row["routine_tasks"],
                        diet_protocol=DietProtocol(**row["diet_protocol"]),
                        exercise_protocol=ExerciseProtocol(**row["exercise_protocol"]),
                        mental_protocol=MentalProtocol(**row["mental_protocol"]),
                        why_this_works=row.get("why_this_works") or (
                            f"In {metrics.phase_name} (Day {row['day_number']}), structured routine "
                            f"and metabolic balance stimulate neuroplastic dopamine normalization."
                        ),
                    )
            except Exception as cache_err:
                logger.warning(f"Failed to query daily_prescriptions cache: {cache_err}")

        # 2. Generate prescription via Gemini AI synthesizer (or deterministic clinical fallback)
        prescription = generate_daily_prescription(biometrics)

        # 3. Persist prescription to Supabase daily_prescriptions
        if supabase and has_valid_user:
            try:
                supabase.table("daily_prescriptions").upsert(
                    {
                        "user_id": biometrics.user_id,
                        "track": prescription.track,
                        "day_number": prescription.day_number,
                        "phase": prescription.phase,
                        "special_mission": prescription.special_mission,
                        "routine_tasks": prescription.routine_tasks,
                        "diet_protocol": prescription.diet_protocol.model_dump(),
                        "exercise_protocol": prescription.exercise_protocol.model_dump(),
                        "mental_protocol": prescription.mental_protocol.model_dump(),
                    },
                    on_conflict="user_id,track,day_number"
                ).execute()
                logger.info(f"Persisted daily prescription for user {biometrics.user_id}, day {prescription.day_number} to Supabase")
            except Exception as db_err:
                logger.warning(f"Failed to upsert prescription to Supabase: {db_err}")

        return prescription

    except Exception as e:
        logger.error(f"Error generating prescription: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate clinical prescription: {str(e)}"
        )


@router.post("/recalculate-profile", response_model=PrescriptionResponse, status_code=status.HTTP_200_OK)
async def recalculate_profile(biometrics: BiometricInput):
    """
    Accepts updated biometrics/medical flags, syncs updates to profiles in Supabase if configured,
    and returns a refreshed daily prescription.
    """
    try:
        supabase = get_supabase_client()
        has_valid_user = _is_valid_uuid(biometrics.user_id)

        if supabase and has_valid_user:
            try:
                update_data = {
                    "age": biometrics.age,
                    "gender": biometrics.gender,
                    "height_cm": biometrics.height_cm,
                    "weight_kg": biometrics.weight_kg,
                    "activity_level": biometrics.activity_level,
                    "active_track": biometrics.track,
                    "medical_flags": biometrics.medical_flags,
                    "medical_notes": biometrics.medical_notes,
                    "dietary_preference": biometrics.dietary_preference,
                }
                supabase.table("profiles").update(update_data).eq("id", biometrics.user_id).execute()
                logger.info(f"Updated profile for user {biometrics.user_id}")
            except Exception as db_err:
                logger.warning(f"Failed to update profile in Supabase: {db_err}")

        # Regenerate updated prescription
        prescription = generate_daily_prescription(biometrics)

        # Upsert refreshed prescription
        if supabase and has_valid_user:
            try:
                supabase.table("daily_prescriptions").upsert(
                    {
                        "user_id": biometrics.user_id,
                        "track": prescription.track,
                        "day_number": prescription.day_number,
                        "phase": prescription.phase,
                        "special_mission": prescription.special_mission,
                        "routine_tasks": prescription.routine_tasks,
                        "diet_protocol": prescription.diet_protocol.model_dump(),
                        "exercise_protocol": prescription.exercise_protocol.model_dump(),
                        "mental_protocol": prescription.mental_protocol.model_dump(),
                    },
                    on_conflict="user_id,track,day_number"
                ).execute()
            except Exception as db_err:
                logger.warning(f"Failed to upsert updated prescription to Supabase: {db_err}")

        return prescription

    except Exception as e:
        logger.error(f"Error recalculating profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate profile prescription: {str(e)}"
        )

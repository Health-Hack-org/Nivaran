import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.prescription import BiometricInput, PrescriptionResponse
from app.engine.synthesizer import generate_daily_prescription
from app.core.database import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=PrescriptionResponse, status_code=status.HTTP_200_OK)
async def generate_prescription(biometrics: BiometricInput):
    """
    Generates a personalized clinical daily prescription based on user biometrics,
    track, recovery phase, and clinical guardrails.
    If Supabase is configured and user_id is provided, automatically saves/upserts to daily_prescriptions.
    """
    try:
        prescription = generate_daily_prescription(biometrics)

        supabase = get_supabase_client()
        if supabase and biometrics.user_id:
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
                logger.info(f"Upserted daily prescription for user {biometrics.user_id}, day {prescription.day_number}")
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
        if supabase and biometrics.user_id:
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
        return prescription

    except Exception as e:
        logger.error(f"Error recalculating profile: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate profile prescription: {str(e)}"
        )

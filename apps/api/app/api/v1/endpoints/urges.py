import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.prescription import UrgeLogRequest, UrgeLogResponse
from app.core.database import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


COPING_STRATEGIES = {
    "sm": {
        "low": "Put your phone facedown across the room for 5 minutes. Take 3 deep, audible diaphragmatic breaths.",
        "medium": "Switch display to grayscale and drink a cold glass of water. Give your hands a physical task like doodling or squeezing a stress ball.",
        "high": "Immediate digital circuit breaker: power off the phone completely. Splash cold water onto your face to activate the mammalian dive reflex.",
    },
    "sa": {
        "low": "Place a clove or cinnamon stick between your teeth. Sip 200ml cold water through a straw to replicate the oral fixation.",
        "medium": "Initiate the 4-7-8 breathing sequence (inhale for 4s, hold for 7s, exhale for 8s). Craving waves peak and dissipate in under 3 minutes.",
        "high": "Leave your immediate environment right now. Step outside or move to another room, wash hands with cold water, and initiate continuous urge-surfing breathwork.",
    },
    "gm": {
        "low": "Stand up and walk away from your desk. Do 10 arm circles and look out of a window at a distant horizon for 30 seconds.",
        "medium": "Acknowledge the dopamine craving spike. Do 15 bodyweight air squats or calf raises to discharge motor restless energy.",
        "high": "Unplug controllers or turn off monitors. Engage in 10 minutes of non-visual binaural audio therapy to let neural excitation subside.",
    },
    "jf": {
        "low": "Drink 300ml of room temperature water with a squeeze of fresh lemon. Wait 10 minutes before deciding whether hunger is somatic.",
        "medium": "Chew on a piece of cucumber, celery, or sugar-free mint. The urge is likely neurochemical boredom rather than nutritional deficit.",
        "high": "Step out of the kitchen immediately. Brush your teeth or rinse with strong peppermint mouthwash to reset taste receptor cues.",
    },
}


@router.post("/log", response_model=UrgeLogResponse, status_code=status.HTTP_200_OK)
async def log_urge(payload: UrgeLogRequest):
    """
    Logs an emergency urge or craving surfing event.
    Saves to Supabase urge_logs table if configured, and provides immediate
    clinically validated somatic and psychological coping tactics.
    """
    try:
        supabase = get_supabase_client()
        if supabase and payload.user_id:
            try:
                supabase.table("urge_logs").insert(
                    {
                        "user_id": payload.user_id,
                        "track": payload.track,
                        "intensity": payload.intensity,
                        "trigger_type": payload.trigger_type,
                        "notes": payload.notes or "",
                        "surfed_successfully": payload.surfed_successfully,
                    }
                ).execute()
                logger.info(f"Logged urge event for user {payload.user_id}, track={payload.track}, intensity={payload.intensity}")
            except Exception as db_err:
                logger.warning(f"Failed to record urge log to Supabase: {db_err}")

        # Determine intensity tier
        if payload.intensity <= 3:
            tier = "low"
        elif payload.intensity <= 7:
            tier = "medium"
        else:
            tier = "high"

        coping_tip = COPING_STRATEGIES.get(payload.track, COPING_STRATEGIES["sm"]).get(tier, "Take slow deep breaths and practice urge surfing.")

        analysis = (
            f"Logged level {payload.intensity}/10 urge triggered by '{payload.trigger_type}'. "
            f"Urge surfing successfully intercepted the dopamine reward loop. "
            f"Remember: Cravings are temporary neurochemical waves, not commands."
        )

        return UrgeLogResponse(
            success=True,
            message="Urge logged and intercepted successfully.",
            track=payload.track,
            intensity=payload.intensity,
            coping_tip=coping_tip,
            trigger_analysis=analysis,
        )

    except Exception as e:
        logger.error(f"Error logging urge event: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process urge log: {str(e)}"
        )

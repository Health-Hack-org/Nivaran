import json
import logging
from typing import Dict, Any, List
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.prescription import (
    BiometricInput,
    ComputedMetrics,
    DietProtocol,
    ExerciseProtocol,
    ExerciseRoutineItem,
    MentalProtocol,
    PrescriptionResponse,
)
from app.engine.metrics import compute_all_metrics
from app.engine.guardrails import evaluate_clinical_guardrails

logger = logging.getLogger(__name__)


# Curated clinical resource URLs
MEDIA_RESOURCES = {
    "walking_low_impact": "https://www.youtube.com/watch?v=enYITYwvPAQ",
    "joint_mobility": "https://www.youtube.com/watch?v=g_tea8ZNk5A",
    "breathing_asthma": "https://www.youtube.com/watch?v=inpok4MKVLM",
    "strength_progressive": "https://www.youtube.com/watch?v=IODxDxX7oi4",
    "craving_meditation": "https://www.youtube.com/watch?v=6p_yaNFSYao",
    "box_breathing": "https://www.youtube.com/watch?v=tEmt1Znux58",
    "binaural_dopamine": "https://www.youtube.com/watch?v=1ZYbU82GVz4",
    "calm_lofi": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
}


def _build_deterministic_diet(
    biometrics: BiometricInput,
    metrics: ComputedMetrics,
    guardrails: Dict[str, Any]
) -> DietProtocol:
    """Builds an adaptive clinical meal plan respecting medical constraints and dietary preference."""
    is_vegan = biometrics.dietary_preference == "vegan" or any("lactose" in r.lower() or "dairy" in r.lower() for r in guardrails["dietary_restrictions"])
    is_diabetic = any("glycemic" in r.lower() or "diabetes" in r.lower() for r in guardrails["dietary_restrictions"])
    is_hypertensive = any("sodium" in r.lower() or "hypertension" in r.lower() for r in guardrails["dietary_restrictions"])
    pref = biometrics.dietary_preference

    # 1. Breakfast options
    if is_vegan:
        breakfast = "Sprouted moong & vegetable cheela with mint-coriander dip, paired with warm almond milk and pumpkin seeds."
    elif pref == "non_vegetarian" or pref == "eggetarian":
        breakfast = "2 boiled or poached eggs on 100% whole grain sourdough toast with sautéed spinach and cherry tomatoes."
    elif is_diabetic:
        breakfast = "Steel-cut rolled oats with roasted walnuts, chia seeds, cinnamon dust, and unsweetened Greek yogurt."
    else:
        breakfast = "High-protein paneer bhurji with bell peppers, 1 multigrain roti, and a side of mixed berry curd."

    # 2. Lunch options
    if is_vegan:
        lunch = "Warm chickpea (chole) & baby spinach bowl over brown basmati rice, fortified with roasted sesame and flaxseed dust."
    elif pref == "non_vegetarian":
        lunch = "Herbed grilled chicken breast / fish fillet with lemon-drizzle, steamed broccoli, and quinoa or millet pilaf."
    elif is_diabetic:
        lunch = "Double-portion yellow dal tadka, roasted cumin cucumber salad, and 1 jowar (sorghum) flatbread with steamed greens."
    else:
        lunch = "Spiced organic tofu or paneer curry with yellow lentil dal, warm zucchini salad, and brown rice."

    # 3. Dinner options
    if is_hypertensive:
        dinner = "Steamed vegetable medley (carrot, french beans, bottle gourd) cooked in zero-added-salt broth with red lentil soup and 1 millet chapati."
    elif is_vegan:
        dinner = "Tofu and stir-fry bok choy with ginger-garlic dressing, accompanied by hearty moong dal soup and roasted seeds."
    elif pref == "non_vegetarian":
        dinner = "Pan-seared egg-white scramble or light fish stew with asparagus, avocado slices, and clear vegetable broth."
    else:
        dinner = "Light vegetable khichdi made with equal parts split yellow moong dal and oats, served with homemade cucumber raita."

    # 4. Avoid list
    avoid = [
        "Ultra-processed packaged snacks and refined flour (maida)",
        "Sugary soda, energy drinks, and artificial syrups",
        "Deep-fried trans-fats that cause neuro-inflammation",
    ]
    if is_hypertensive:
        avoid.append("High-sodium papad, pickles, processed cheeses, and table salt")
    if is_diabetic:
        avoid.append("Refined table sugar, white bread, and concentrated fruit juice")
    if is_vegan:
        avoid.append("Cow/buffalo dairy, whey isolate, clarified butter (ghee), and honey")

    # 5. Clinical rationale
    rationale = (
        f"Calorie target set at {metrics.target_calories} kcal (TDEE: {metrics.tdee} kcal). "
        f"Micronutrient-dense complex carbohydrates stabilize baseline dopamine production and "
        f"prevent post-prandial blood sugar crashes that trigger addictive craving spikes."
    )

    return DietProtocol(
        short_summary=f"{pref.replace('_', ' ').title()} Neuro-Recovery Nutrition ({metrics.target_calories} kcal, {metrics.hydration_liters}L water)",
        calorie_target=metrics.target_calories,
        hydration_liters=metrics.hydration_liters,
        breakfast=breakfast,
        lunch=lunch,
        dinner=dinner,
        avoid_list=avoid,
        clinical_rationale=rationale,
    )


def _build_deterministic_exercise(
    biometrics: BiometricInput,
    metrics: ComputedMetrics,
    guardrails: Dict[str, Any]
) -> ExerciseProtocol:
    """Builds a physical recovery routine adhering to joint, cardio, and respiratory limits."""
    intensity = guardrails["allowed_intensity"]
    duration = guardrails["recommended_workout_duration"]

    routines: List[ExerciseRoutineItem] = []
    has_asthma = any("asthma" in w.lower() for w in guardrails["safety_warnings"])
    has_joint = any("joint" in w.lower() for w in guardrails["safety_warnings"])

    if intensity == "low_impact" or has_joint or has_asthma:
        summary = f"{duration}-Minute Low-Impact Joint & Cardio Alignment"
        routines.append(ExerciseRoutineItem(
            title="15-Min Low-Impact Calming Walking Session",
            url=MEDIA_RESOURCES["walking_low_impact"]
        ))
        routines.append(ExerciseRoutineItem(
            title="10-Min Gentle Joint Mobility & Postural Alignment",
            url=MEDIA_RESOURCES["joint_mobility"]
        ))
        safety_note = (
            "Safety Guardrail: Perform strictly on a flat surface with shock-absorbing footwear. "
            "Maintain steady diaphragmatic nasal breathing; discontinue if acute discomfort or chest tightness occurs."
        )
    elif intensity == "progressive_strength":
        summary = f"{duration}-Minute Progressive Neuro-Strength Routine"
        routines.append(ExerciseRoutineItem(
            title="20-Min Calisthenics & Progressive Bodyweight Routine",
            url=MEDIA_RESOURCES["strength_progressive"]
        ))
        routines.append(ExerciseRoutineItem(
            title="10-Min Post-Workout Mobility & Fascial Release",
            url=MEDIA_RESOURCES["joint_mobility"]
        ))
        safety_note = "Maintain neutral spine alignment during all reps. Stay well hydrated between sets."
    else:
        summary = f"{duration}-Minute Moderate Aerobic Conditioning & Core Stability"
        routines.append(ExerciseRoutineItem(
            title="20-Min Brisk Rhythm Walk & Dynamic Range of Motion",
            url=MEDIA_RESOURCES["walking_low_impact"]
        ))
        routines.append(ExerciseRoutineItem(
            title="10-Min Core Stabilization & Spinal Decompression",
            url=MEDIA_RESOURCES["joint_mobility"]
        ))
        safety_note = "Monitor pacing; keep your perceived exertion rating below 6/10 to support autonomic recovery."

    return ExerciseProtocol(
        summary=summary,
        duration_mins=duration,
        intensity=intensity,
        routines=routines,
        safety_note=safety_note,
    )


def _build_deterministic_mental(
    biometrics: BiometricInput,
    metrics: ComputedMetrics
) -> MentalProtocol:
    """Builds mindfulness and neurological regulation protocol."""
    track_tips = {
        "sm": "When reaching for your phone compulsively, practice the '10-Second Physical Touch Rule': touch a solid physical object and take 3 conscious breaths.",
        "sa": "Craving waves peak within 3 to 5 minutes before dissipating. Practice 'Urge Surfing': observe the physical craving in your throat or hands without reacting.",
        "gm": "Reward anticipation in gaming hyper-stimulates dopamine D2 receptors. Reset your sensory baseline with 10 minutes of non-visual audio therapy.",
        "jf": "Distinguish between emotional hunger (instant, specific craving) and somatic hunger (gradual, satisfied by whole foods). Drink 300ml water and wait 10 minutes."
    }

    lifestyle_tips = {
        1: "Phase 1 Neuro-Rule: Keep your bedroom entirely device-free 45 minutes prior to sleep to enable REM delta-wave repair.",
        2: "Phase 2 Neuro-Rule: Replace each impulse loop with an immediate kinetic substitute (e.g., sip cold water, 10 deep belly breaths, or stretch).",
        3: "Phase 3 Neuro-Rule: Perform pre-mortem trigger mapping: anticipate high-stress environments and prepare explicit 'If-Then' coping responses.",
        4: "Phase 4 Neuro-Rule: Cultivate your recovery identity: reinforce healthy habits as permanent lifestyle standards rather than temporary restrictions."
    }

    return MentalProtocol(
        summary="Autonomic Nervous System De-escalation & Neuroplastic Regulation",
        duration_mins=15,
        mindfulness_tip=track_tips.get(biometrics.track, "Observe internal impulses non-judgmentally without taking automatic kinetic action."),
        meditation_url=MEDIA_RESOURCES["craving_meditation"],
        music_type="Binaural 432Hz Calm Mind Recovery",
        music_url=MEDIA_RESOURCES["binaural_dopamine"],
        lifestyle_tip=lifestyle_tips.get(metrics.phase, lifestyle_tips[1])
    )


def _build_deterministic_missions(
    biometrics: BiometricInput,
    metrics: ComputedMetrics
) -> tuple[str, List[str], str]:
    """Generates track-specific and phase-specific daily missions, tasks, and scientific rationale."""
    day = biometrics.day_number
    phase = metrics.phase
    track = biometrics.track

    mission_map = {
        "sm": {
            1: "The Sensory Sunset: Enforce zero non-work screen time after 9:00 PM and place phone in another room.",
            2: "Friction Engineering: Convert phone display to Grayscale and remove social apps from the primary home screen.",
            3: "Deep Flow Block: Complete a 90-minute uninterrupted work or reading block with zero digital notifications.",
            4: "Digital Minimalism Mastery: Conduct a full digital clutter audit and establish permanent sacred offline hours."
        },
        "sa": {
            1: "The Oral Anchor: Replace every cigarette or drink urge with 5 slow sips of ice-cold water or a cinnamon stick.",
            2: "Trigger Circuit Breaker: Alter your typical evening habit loop; substitute post-dinner routine with a 15-minute brisk walk.",
            3: "Social Shield Inoculation: Practice saying 'I am in physiological training right now' when offered substances in social settings.",
            4: "Identity Re-architecture: Celebrate your pulmonary and metabolic renewal; write a 1-page reflection on your reclaimed vitality."
        },
        "gm": {
            1: "The Console Lockout: Power down gaming rigs completely and store controllers out of immediate arm's reach.",
            2: "Tactile Reality Quest: Dedicate 30 minutes to a real-world physical hobby, instrument, or hands-on craftsmanship.",
            3: "Dopamine Recalibration: Complete your daily physical and dietary tasks before any leisure electronics are powered.",
            4: "Master of Reality: Mentor or inspire another individual embarking on screen habit recalibration."
        },
        "jf": {
            1: "The Pantry Purge: Clear all ultra-processed snacks from your immediate workspace and prep fresh cucumber/carrot sticks.",
            2: "Pre-Meal Hydration Protocol: Drink 400ml of water 15 minutes before lunch and dinner; chew each bite 20 times.",
            3: "Glycemic Shielding: Balance every carbohydrate serving with equal portions of fiber and protein to prevent craving dips.",
            4: "Nutritional Intuition: Prepare an entire whole-food dinner from scratch, savoring each sensory aroma mindfully."
        }
    }

    special_mission = mission_map.get(track, {}).get(phase, f"Complete your Day {day} recovery protocols with full clinical compliance.")

    routine_tasks = [
        f"Hydration Check: Complete {metrics.hydration_liters} Liters of water with pinch of electrolytes.",
        f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise session.",
        f"Mindfulness Routine: 10 minutes of urge-surfing meditation & audio therapy.",
        f"Special Track Mission: {special_mission[:60]}..."
    ]

    why_this_works = (
        f"In {metrics.phase_name} (Day {day}), your mesolimbic dopamine pathways are undergoing "
        f"homeostatic recalibration. Combining structured caloric intake ({metrics.target_calories} kcal), "
        f"steady hydration, and deliberate cue-replacement creates new inhibitory neural pathways in the prefrontal cortex, "
        f"permanently reducing craving intensity."
    )

    return special_mission, routine_tasks, why_this_works


def _generate_fallback_prescription(biometrics: BiometricInput) -> PrescriptionResponse:
    """Deterministic, clinical-grade fallback generator when AI engine is offline or API key is absent."""
    metrics = compute_all_metrics(biometrics)
    guardrails = evaluate_clinical_guardrails(biometrics, metrics)

    diet = _build_deterministic_diet(biometrics, metrics, guardrails)
    exercise = _build_deterministic_exercise(biometrics, metrics, guardrails)
    mental = _build_deterministic_mental(biometrics, metrics)
    mission, tasks, why = _build_deterministic_missions(biometrics, metrics)

    return PrescriptionResponse(
        track=biometrics.track,
        day_number=biometrics.day_number,
        phase=metrics.phase,
        phase_name=metrics.phase_name,
        computed_metrics=metrics,
        special_mission=mission,
        routine_tasks=tasks,
        diet_protocol=diet,
        exercise_protocol=exercise,
        mental_protocol=mental,
        why_this_works=why
    )


def generate_daily_prescription(biometrics: BiometricInput) -> PrescriptionResponse:
    """
    Main entry point for prescription synthesis:
    1. Runs deterministic biometric math & clinical guardrails.
    2. If Gemini API key is configured, uses Gemini 2.5 Flash to synthesize personalized protocol.
    3. Gracefully falls back to deterministic clinical prescription if offline or error occurs.
    """
    metrics = compute_all_metrics(biometrics)
    guardrails = evaluate_clinical_guardrails(biometrics, metrics)

    # Check if Gemini API is available
    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY is not set; utilizing deterministic clinical engine.")
        return _generate_fallback_prescription(biometrics)

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""
You are the Chief Clinical Officer of NIVARAN, a medical-grade mind-growth and addiction recovery platform.
Generate a comprehensive, scientifically rigorous daily prescription for this user based on their exact metrics and clinical guardrails.

USER PROFILE:
- Username: {biometrics.username}
- Track: {biometrics.track} (sm=Social Media, sa=Smoking/Alcohol, gm=Gaming, jf=Junk Food)
- Day Number: {biometrics.day_number}
- Recovery Phase: Phase {metrics.phase} ({metrics.phase_name})
- Age: {biometrics.age}, Gender: {biometrics.gender}
- Height: {biometrics.height_cm} cm, Weight: {biometrics.weight_kg} kg
- BMI: {metrics.bmi} ({metrics.bmi_category})
- BMR: {metrics.bmr} kcal, TDEE: {metrics.tdee} kcal
- Calculated Calorie Target: {metrics.target_calories} kcal
- Calculated Hydration Target: {metrics.hydration_liters} Liters
- Dietary Preference: {biometrics.dietary_preference}
- Medical Flags: {biometrics.medical_flags}
- Medical Notes: {biometrics.medical_notes}
- Recent Urge Triggers: {biometrics.recent_urge_triggers}

CLINICAL GUARDRAILS (STRICT COMPLIANCE MANDATORY):
- Allowed Physical Intensity: {guardrails['allowed_intensity']}
- Exercise Restrictions: {json.dumps(guardrails['exercise_restrictions'])}
- Dietary Restrictions: {json.dumps(guardrails['dietary_restrictions'])}
- Safety Warnings: {json.dumps(guardrails['safety_warnings'])}
- Recommended Workout Duration: {guardrails['recommended_workout_duration']} mins

OUTPUT REQUIREMENTS:
Output a single valid JSON object matching this exact schema:
{{
  "special_mission": "A powerful, actionable, phase-appropriate daily mission addressing the recovery track",
  "routine_tasks": ["3 to 4 daily actionable checklist items"],
  "diet_protocol": {{
    "short_summary": "Summary of today's nutrition plan",
    "calorie_target": {metrics.target_calories},
    "hydration_liters": {metrics.hydration_liters},
    "breakfast": "Detailed breakfast description respecting dietary preference and medical flags",
    "lunch": "Detailed lunch description respecting dietary preference and medical flags",
    "dinner": "Detailed dinner description respecting dietary preference and medical flags",
    "avoid_list": ["Items strictly to avoid"],
    "clinical_rationale": "Medical/neurochemical explanation for this nutritional strategy"
  }},
  "exercise_protocol": {{
    "summary": "Summary of physical protocol",
    "duration_mins": {guardrails['recommended_workout_duration']},
    "intensity": "{guardrails['allowed_intensity']}",
    "routines": [
      {{ "title": "Routine 1 title", "url": "{MEDIA_RESOURCES['walking_low_impact']}" }},
      {{ "title": "Routine 2 title", "url": "{MEDIA_RESOURCES['joint_mobility']}" }}
    ],
    "safety_note": "Crucial clinical safety guidance"
  }},
  "mental_protocol": {{
    "summary": "Mindfulness & mental recovery summary",
    "duration_mins": 15,
    "mindfulness_tip": "Specific urge surfing or cognitive reframing tip for track '{biometrics.track}'",
    "meditation_url": "{MEDIA_RESOURCES['craving_meditation']}",
    "music_type": "Binaural 432Hz Calm Mind Recovery",
    "music_url": "{MEDIA_RESOURCES['binaural_dopamine']}",
    "lifestyle_tip": "Actionable neuroplastic habit cue for Phase {metrics.phase}"
  }},
  "why_this_works": "Neurochemical and psychological explanation of how today's protocol rewires dopamine and prefrontal executive control"
}}
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )

        if response.text:
            data = json.loads(response.text)

            diet = DietProtocol(**data["diet_protocol"])
            exercise = ExerciseProtocol(**data["exercise_protocol"])
            mental = MentalProtocol(**data["mental_protocol"])

            return PrescriptionResponse(
                track=biometrics.track,
                day_number=biometrics.day_number,
                phase=metrics.phase,
                phase_name=metrics.phase_name,
                computed_metrics=metrics,
                special_mission=data.get("special_mission", f"Day {biometrics.day_number} Recovery Mission"),
                routine_tasks=data.get("routine_tasks", []),
                diet_protocol=diet,
                exercise_protocol=exercise,
                mental_protocol=mental,
                why_this_works=data.get("why_this_works", "Clinical behavioral activation protocol.")
            )

    except Exception as e:
        logger.error(f"Gemini API generation error: {e}. Falling back to deterministic clinical engine.")

    return _generate_fallback_prescription(biometrics)

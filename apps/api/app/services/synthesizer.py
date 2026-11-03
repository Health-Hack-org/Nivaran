import json
import logging
import os
import uuid
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.database import get_supabase_client
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


def _is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def fetch_recent_urge_triggers_from_db(user_id: Optional[str], track: str) -> List[str]:
    """Fetches up to 5 recent craving triggers from urge_logs if user exists in Supabase."""
    if not _is_valid_uuid(user_id):
        return []
    try:
        supabase = get_supabase_client()
        if supabase:
            res = (
                supabase.table("urge_logs")
                .select("trigger_type,intensity,notes,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(5)
                .execute()
            )
            if res.data:
                triggers = []
                for row in res.data:
                    trigger_str = row.get("trigger_type", "Unknown")
                    intensity = row.get("intensity")
                    if intensity:
                        triggers.append(f"{trigger_str} (intensity {intensity}/10)")
                    else:
                        triggers.append(trigger_str)
                return triggers
    except Exception as e:
        logger.warning(f"Failed to query recent urge logs from Supabase: {e}")
    return []


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
        breakfast = "Sprouted moong & vegetable cheela with mint-coriander dip, warm almond milk and pumpkin seeds."
    elif pref in ["non_vegetarian", "eggetarian"]:
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
    """Generates track-specific and day-progressive daily missions, tasks, and scientific rationale."""
    day = biometrics.get_effective_day()
    target_days = getattr(biometrics, "target_days", 28) or 28
    phase = metrics.phase
    track = biometrics.track

    # Day-progressive rotating cycle (Days 1 to 7, rotating mod 7 for subsequent days so tasks never stagnate)
    day_cycle = ((day - 1) % 7) + 1

    missions_by_track_and_day = {
        "sm": {
            1: "The Sensory Sunset: Enforce zero non-work screen time after 9:00 PM and place phone in another room.",
            2: "Friction Engineering: Convert phone display to Grayscale and remove social apps from the primary home screen.",
            3: "Deep Flow Block: Complete a 90-minute uninterrupted work or reading block with zero digital notifications.",
            4: "Social Cue & Notification Quarantine: Batch all messaging into two 20-minute daily windows; disable all lock-screen previews.",
            5: "Sensory Realignment: Take a 45-minute outdoor walk without headphones or device checks; practice somatic audio observation.",
            6: "Digital Declutter Audit: Delete 5 unnecessary apps, unfollow dopamine-triggering accounts, and clear all browser tabs.",
            7: "Weekly Milestone Reflection: Keep device in another room during all meals today; write a 1-page paper reflection on your cognitive clarity.",
        },
        "sa": {
            1: "The Oral Anchor: Replace every cigarette or drink urge with 5 slow sips of ice-cold water or a cinnamon stick.",
            2: "Trigger Circuit Breaker: Alter your typical evening habit loop; substitute post-dinner routine with a 15-minute brisk walk.",
            3: "Social Shield Inoculation: Practice saying 'I am in physiological training right now' when offered substances in social settings.",
            4: "Vagus Nerve & Urge Surfing: When peak evening craving spikes, set a 5-minute timer and surf the urge with 4-7-8 diaphragmatic breathing.",
            5: "Environment Purge: Remove all residual sensory triggers (ashtrays, lighters, bottles, bar glassware) completely from living spaces.",
            6: "Endorphin Restoration: Complete a 30-minute steady-state cardiovascular session to stimulate natural endogenous dopamine.",
            7: "Pulmonary Renewal Milestone: Take 10 deep belly breaths outdoors, noticing clean airway expansion; journal your physical vitality shifts.",
        },
        "gm": {
            1: "The Console Lockout: Power down gaming rigs completely and store controllers out of immediate arm's reach.",
            2: "Tactile Reality Quest: Dedicate 30 minutes to a real-world physical hobby, instrument, or hands-on craftsmanship.",
            3: "Dopamine Threshold Reset: Zero gaming streaming content, gameplay videos, or forum browsing during work or study hours.",
            4: "Friction Multiplier: Unplug gaming peripherals after each session and store them in a closed closet or distinct container.",
            5: "Real-World Fellowship: Spend 45 minutes connecting with family or friends in person or via telephone outside of any virtual games.",
            6: "Physical Exertion Quest: Channel hyper-focus into 40 minutes of rigorous athletic movement or functional resistance training.",
            7: "Master of Reality Review: Audit your reclaimed hours from this week and allocate them toward a concrete real-world pursuit.",
        },
        "jf": {
            1: "The Pantry Purge: Clear all ultra-processed snacks from your immediate workspace and prep fresh cucumber/carrot sticks.",
            2: "Pre-Meal Hydration Protocol: Drink 400ml of water 15 minutes before lunch and dinner; chew each bite 20 times.",
            3: "Glycemic Shielding: Balance every carbohydrate serving with equal portions of fiber and protein to prevent craving dips.",
            4: "Craving Deconstruction: When sugar cravings hit, drink 250ml water and wait 10 minutes; identify the underlying emotional fatigue trigger.",
            5: "Whole-Food Culinary Art: Cook dinner completely from whole, unrefined ingredients with zero added industrial sugars or trans-fats.",
            6: "Evening Sweet Tooth Extinction: Replace post-dinner snacking with a hot cup of spiced cinnamon-chamomile tea and 10 pages of reading.",
            7: "Metabolic Autonomy Milestone: Notice the elimination of 3:00 PM energy crashes; write down your baseline digestive improvements.",
        },
    }

    track_missions = missions_by_track_and_day.get(track, {})
    special_mission = track_missions.get(day_cycle, f"Day {day} Milestone: Complete your Phase {phase} recovery protocols with full clinical compliance.")

    # Day-progressive rotating tasks (6 distinct tasks per day, evolving across the 7-day cycle)
    tasks_by_track_and_day = {
        "sm": {
            1: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with morning electrolytes.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise session ({metrics.target_calories} kcal fuel target).",
                "Friction Setup: Turn off all non-human push notifications for social media applications.",
                "Display Calibration: Switch mobile screen color profile to high-contrast Grayscale.",
                "Circadian Sleep Hygiene: Place phone charging station completely outside the bedroom.",
                "Neuro-Reset: 10 minutes of box-breathing & binaural audio therapy before evening rest.",
            ],
            2: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water throughout the day.",
                f"Circadian Morning Light: 20-minute morning outdoor walk without looking at any screens.",
                "Urge Touch Pause: Touch a physical object for 10 seconds before unlocking your device.",
                "Home Screen Defense: Move communication apps to secondary folders off the home dock.",
                "Digital Sunset Initiation: Power off or dock mobile phone 45 minutes prior to bedtime.",
                "Neuro-Reset: 10 minutes of somatic nervous system down-regulation audio.",
            ],
            3: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with balanced meals.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} movement protocol ({metrics.target_calories} kcal target).",
                "Deep Flow Block: Complete a 90-minute focused task with all notifications muted and phone in another room.",
                "Notification Quarantine: Check messages only during two scheduled 15-minute daytime batches.",
                "Evening Environment Friction: Read an analog book under warm light instead of scrolling.",
                "Neuro-Reset: 12 minutes of 4-7-8 breathwork and calming 432Hz auditory stimulation.",
            ],
            4: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water across the day.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} cardiovascular/mobility session.",
                "Friction Barrier: Log out of desktop social media portals and clear cached passwords.",
                "Trigger Substitution: When reaching for phone out of boredom, do 10 deep diaphragmatic breaths.",
                "Sacred Meal Space: Keep breakfast, lunch, and dinner entirely screen-free.",
                "Neuro-Reset: 10 minutes of parasympathetic recovery breathing.",
            ],
            5: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with clean nutrition.",
                f"Physical Movement: 30 minutes of low-impact walking or Zone 2 recovery.",
                "Sensory Immersion: Spend 30 minutes in nature or physical contemplation without audio devices.",
                "Micro-Break Hygiene: Replace screen checking between tasks with 2 minutes of spinal stretching.",
                "Bedroom Sanctuary: Keep sleeping quarters 100% free of tablets, phones, and laptops.",
                "Neuro-Reset: 10 minutes of vagus nerve decompression audio.",
            ],
            6: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with morning mineral pinch.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise session.",
                "App Quarantine Audit: Uninstall 3 non-essential entertainment or infinite-scroll apps.",
                "Dopamine Cue Neutralization: Turn off auto-play on video and streaming platforms.",
                "Evening Wind-Down: Replace pre-sleep phone browsing with 15 minutes of relaxing stretching.",
                "Neuro-Reset: 10 minutes of guided craving mindfulness meditation.",
            ],
            7: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water throughout the day.",
                f"Physical Movement: 25 minutes of restorative mobility and core stabilization.",
                "Weekly Digital Audit: Review screen-time analytics and celebrate your reduced pickups.",
                "Identity Anchoring: Write down 3 real-world goals achieved during this week's reclaimed hours.",
                "Social Presence: Enjoy an uninterrupted conversation with a loved one with devices put away.",
                "Neuro-Reset: 15 minutes of gratitude contemplation and deep rest binaural frequency.",
            ],
        },
        "sa": {
            1: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with morning electrolytes.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} aerobic exercise session.",
                "Oral Substitution: Keep cold water, oral mints, or cinnamon sticks within immediate reach.",
                "Trigger Circuit Breaker: Replace usual post-meal smoking/drinking cue with a 10-minute walk.",
                "Craving Inoculation: Practice 5 minutes of mindful urge-surfing during peak evening craving spike.",
                "Neuro-Reset: 10 minutes of vagus nerve decompression & non-visual relaxation audio.",
            ],
            2: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water to accelerate detoxification.",
                f"Physical Movement: 20-minute morning light brisk walk to stimulate endogenous energy.",
                "Kinetic Substitution: Squeeze a stress ball or use tactile hand fidgets when urge spikes.",
                "Environment Quarantine: Avoid places or establishments associated with substance usage.",
                "Evening Ritual Shift: Replace alcoholic drinks with sparkling mineral water with fresh lemon.",
                "Neuro-Reset: 10 minutes of box-breathing to deactivate acute craving anxiety.",
            ],
            3: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with electrolyte replenishment.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise protocol.",
                "Social Boundary Practice: Rehearse refusing offers with 'I am taking a health reset break'.",
                "Trigger Mapping: Write down the 2 most dangerous emotional triggers (stress/fatigue).",
                "Caffeine Moderation: Cut caffeine after 2:00 PM to eliminate jitters that trigger craving loops.",
                "Neuro-Reset: 12 minutes of autonomic calm meditation.",
            ],
            4: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with nutrient-dense meals.",
                f"Physical Movement: 30 minutes of progressive aerobic activity.",
                "Sensory Barrier: Thoroughly wash clothes and air out rooms previously exposed to smoke.",
                "Urge Delay Rule: When an urge strikes, force a 15-minute delay and drink 300ml cold water.",
                "Somatic Anchor: Rub an ice cube on your wrist during severe acute cravings to reset attention.",
                "Neuro-Reset: 10 minutes of parasympathetic down-regulation audio.",
            ],
            5: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water across the day.",
                f"Physical Movement: Strength and mobility session to build neuromuscular vitality.",
                "Emergency Contact Check: Check in with a supportive friend or recovery partner.",
                "Dopamine Nutrition: Eat meals rich in L-tyrosine (beans, nuts, whole oats) for dopamine support.",
                "Evening Wind-Down: Take a warm shower followed by cold facial splash to soothe cravings.",
                "Neuro-Reset: 10 minutes of alpha-wave binaural audio.",
            ],
            6: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with balanced meals.",
                f"Physical Movement: 30 minutes of brisk outdoor walking or cycling.",
                "Environment Defense: Remove all remaining alcohol, ashtrays, or paraphernalia from home.",
                "Craving Observation: Journal the exact duration of any urge wave without giving in.",
                "Evening Routine Substitution: Drink hot herbal tea while listening to soothing music.",
                "Neuro-Reset: 10 minutes of physiological sigh breathwork.",
            ],
            7: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water to maintain cellular hydration.",
                f"Physical Movement: 25 minutes of full-body restorative stretching and core work.",
                "Milestone Assessment: Calculate financial savings and pulmonary capacity improvements.",
                "Reward Reinforcement: Treat yourself to a non-substance healthy reward or special meal.",
                "Affirmation Practice: Reaffirm your identity as a clean, healthy, and autonomous individual.",
                "Neuro-Reset: 15 minutes of restful evening meditation.",
            ],
        },
        "gm": {
            1: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with morning electrolytes.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise session.",
                "Hardware Lockout: Disconnect gaming rigs and store controllers in a closed drawer.",
                "Kinetic Substitution: Engage in 30 minutes of hands-on physical activity or analog reading.",
                "Sensory Recalibration: No gaming streaming content or forums during daytime flow blocks.",
                "Neuro-Reset: 10 minutes of nervous system down-regulation & binaural sound therapy.",
            ],
            2: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water throughout the day.",
                f"Physical Movement: 25 minutes of outdoor walking or jogging to burn excess nervous energy.",
                "Tactile Anchor: Spend 20 minutes learning an instrument, drawing, or solving physical puzzles.",
                "Account Friction: Log out of gaming stores and disable promotional deal alerts.",
                "Circadian Reset: Shut off computer displays 1 hour before sleep to restore melatonin.",
                "Neuro-Reset: 10 minutes of box-breathing to soothe dopamine agitation.",
            ],
            3: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with balanced meals.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} workout protocol.",
                "Real-World Level-Up: Complete 2 critical tasks on your work/study backlog before 4:00 PM.",
                "Content Quarantine: Unsubscribe from gaming highlight channels and community discords.",
                "Social Reconnection: Spend 30 minutes talking with friends or family outside gaming contexts.",
                "Neuro-Reset: 12 minutes of calming 432Hz auditory meditation.",
            ],
            4: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water across the day.",
                f"Physical Movement: 30 minutes of functional resistance training.",
                "Spatial Separation: Relocate your desk so your computer is not associated with gaming posture.",
                "Sensory Substitution: Listen to an audiobook or educational podcast during free time.",
                "Urge Wave Surfing: When the desire to grind strikes, do 20 pushups and drink cold water.",
                "Neuro-Reset: 10 minutes of guided vagus nerve stimulation audio.",
            ],
            5: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with nutritious meals.",
                f"Physical Movement: 30 minutes of low-impact walking or cycling in fresh air.",
                "Creative Quest: Write, sketch, or design something tangible for 30 minutes.",
                "Digital Friction: Put parental/screen time lock on gaming apps with a random difficult password.",
                "Evening Relaxation: Read 15 pages of fiction before sleep without any screens nearby.",
                "Neuro-Reset: 10 minutes of mindfulness breathing meditation.",
            ],
            6: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water throughout the day.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} cardio session.",
                "Desk Declutter: Organize your physical workspace, removing all gaming accessories.",
                "Cognitive Reframe: Recognize gaming achievements as virtual pixels, redirecting drive to real life.",
                "Sleep Sanctuary: Keep all monitors and bright LEDs turned off in your sleeping room.",
                "Neuro-Reset: 10 minutes of progressive muscle relaxation.",
            ],
            7: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water to support nervous recovery.",
                f"Physical Movement: 25 minutes of restorative mobility and stretching.",
                "Milestone Review: Count how many real-world hours you reclaimed and invested this week.",
                "Tangible Reward: Celebrate completing 7 days by engaging in a healthy outdoor activity.",
                "Identity Strengthening: Reaffirm your mastery over your time and digital habits.",
                "Neuro-Reset: 15 minutes of restful calm contemplation.",
            ],
        },
        "jf": {
            1: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water, with 300ml taken 15 mins before meals.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise session to stabilize glucose.",
                "Pantry Defense: Remove ultra-processed trigger foods from immediate desk and living space.",
                "Glycemic Shielding: Pair any complex carbohydrates with high-fiber greens and lean protein.",
                "Mindful Ingestion: Chew each mouthful 20 times and pause halfway through every meal.",
                "Neuro-Reset: 10 minutes of parasympathetic breathwork to neutralize emotional cravings.",
            ],
            2: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with a pinch of salt in morning.",
                f"Physical Movement: 20-minute post-meal walk to prevent blood glucose spikes.",
                "Trigger Food Replacement: Stock fridge with sliced bell peppers, carrots, and roasted almonds.",
                "Sugar Urge Pause: When craving sweets, drink 300ml water and wait 10 full minutes.",
                "Nighttime Kitchen Curfew: Close the kitchen 2 hours prior to sleep; drink warm water.",
                "Neuro-Reset: 10 minutes of diaphragmatic breathing to curb stress cortisol.",
            ],
            3: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with balanced meals.",
                f"Physical Movement: Complete your {metrics.phase_name.lower()} movement protocol ({metrics.target_calories} kcal target).",
                "Sugar-Free Beverage Rule: Strictly zero sodas, sweet juices, or energy drinks today.",
                "Meal Planning Defense: Prepare tomorrow's healthy snacks in advance to avoid impulsive buys.",
                "Somatic Hunger Check: Ask: 'Am I biologically hungry or emotionally exhausted/bored?'",
                "Neuro-Reset: 12 minutes of mindful eating meditation.",
            ],
            4: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water across the day.",
                f"Physical Movement: 30 minutes of steady Zone 2 cardiovascular movement.",
                "Delivery App Purge: Uninstall food delivery apps or turn off all food discount notifications.",
                "Whole-Food Anchor: Ensure at least 70% of each meal plate consists of raw or steamed vegetables.",
                "Evening Cravings Substitute: Sip cinnamon herbal tea when after-dinner sweet urges strike.",
                "Neuro-Reset: 10 minutes of autonomic soothing audio.",
            ],
            5: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with nutritious meals.",
                f"Physical Movement: 30 minutes of functional resistance exercise.",
                "Grocery Defense: Never shop while hungry; stick strictly to a pre-written whole-food list.",
                "Mindful Texture Savoring: Eat one meal in complete silence, appreciating the natural flavors.",
                "Salt & Fat Balance: Use natural spices, herbs, and lemon instead of processed sauces.",
                "Neuro-Reset: 10 minutes of guided vagus nerve relaxation.",
            ],
            6: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water throughout the day.",
                f"Physical Movement: 25 minutes of brisk walking or light jogging.",
                "Label Scrutiny: Inspect food labels today and reject anything containing high-fructose corn syrup.",
                "Emotional Dopamine Switch: Replace sugary comfort treats with a hot bath or favorite book.",
                "Sleep Protection: Go to bed on a light stomach to facilitate deep cellular repair.",
                "Neuro-Reset: 10 minutes of progressive muscle relaxation.",
            ],
            7: [
                f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with morning mineral hydration.",
                f"Physical Movement: 25 minutes of gentle full-body mobility and core stretching.",
                "Metabolic Milestone: Celebrate the reduction of afternoon lethargy and sugar brain fog.",
                "Culinary Victory: Cook a delicious, colorful, whole-food dish to honor your body.",
                "Long-Term Commitment: Reaffirm your commitment to nourishing your brain with real food.",
                "Neuro-Reset: 15 minutes of restful gratitude meditation.",
            ],
        },
    }

    track_tasks_map = tasks_by_track_and_day.get(track, {})
    routine_tasks = track_tasks_map.get(day_cycle, [
        f"Hydration Protocol: Drink {metrics.hydration_liters}L of water with electrolytes.",
        f"Physical Movement: Complete your {metrics.phase_name.lower()} exercise session ({metrics.target_calories} kcal target).",
        f"Day {day} Milestone: Implement high-friction barrier habit against track triggers.",
        "Nutrition Adherence: Maintain whole-food meals aligned with target metabolic balance.",
        "Craving Surfing: Practice 5-10 minutes of somatic mindfulness when urges arise.",
        "Sleep Inoculation: Complete evening recovery relaxation 45 minutes prior to rest.",
    ])

    why_this_works = (
        f"In {metrics.phase_name} (Day {day}), your mesolimbic dopamine pathways are undergoing "
        f"progressive neuroplastic recalibration. Combining structured caloric intake ({metrics.target_calories} kcal), "
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
        day_number=biometrics.get_effective_day(),
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
    Main clinical synthesizer pipeline:
    1. Computes deterministic biometrics (BMR, TDEE, calories, hydration, phase).
    2. Runs medical guardrails.
    3. Merges urge triggers and 10-question diagnostic assessment answers.
    4. Calibrates intensity based on diagnostic severity_level (minor/moderate/severe) & target_days (21/35/54).
    5. Calls Google Gemini (gemini-2.5-flash / gemini-1.5-flash / gemini-2.0-flash) for personalized synthesis.
    6. Safely falls back to deterministic rule-based output on any failure or timeout (NEVER throws 500).
    """
    metrics = compute_all_metrics(biometrics)
    guardrails = evaluate_clinical_guardrails(biometrics, metrics)
    effective_day = biometrics.get_effective_day()

    # Diagnostic survey attributes
    severity_level = getattr(biometrics, "severity_level", "moderate") or "moderate"
    severity_score = getattr(biometrics, "severity_score", 5.0) or 5.0
    target_days = getattr(biometrics, "target_days", 28) or 28
    survey_responses = getattr(biometrics, "survey_responses", []) or []

    # Parse high-impact weak spots (scores 2 or 3)
    high_triggers = []
    if survey_responses and isinstance(survey_responses, list):
        for resp in survey_responses:
            if isinstance(resp, dict):
                score = resp.get("score", 0)
                q_text = resp.get("question", "")
                ans_lbl = resp.get("answerLabel", "")
                if score >= 2:
                    high_triggers.append(f"- Weak Spot: '{q_text}' (User selected: {ans_lbl}, score {score}/3)")

    if severity_level == "minor":
        intensity_guidance = (
            f"DIAGNOSTIC PROTOCOL: MINOR DEPENDENCY ({target_days}-Day Rapid Reset, Severity Score: {severity_score}/10).\n"
            "Focus on boundary setting, mindful replacement habits, and environment friction tweaks rather than extreme cold-turkey isolation."
        )
    elif severity_level == "severe":
        intensity_guidance = (
            f"DIAGNOSTIC PROTOCOL: SEVERE DEPENDENCY ({target_days}-Day Deep Stabilization & Tapering, Severity Score: {severity_score}/10).\n"
            "Focus on acute withdrawal management, high-friction physical barriers, nervous system down-regulation, and gradual tapering."
        )
    else:
        intensity_guidance = (
            f"DIAGNOSTIC PROTOCOL: MODERATE COMPULSIVE LOOP ({target_days}-Day Neuroplastic Rewiring, Severity Score: {severity_score}/10).\n"
            "Focus on dopamine scheduling, trigger interruption, and structured time-blocking."
        )

    # Combine input urge triggers with recent urge logs from Supabase
    db_triggers = fetch_recent_urge_triggers_from_db(biometrics.user_id, biometrics.track)
    all_triggers = list(dict.fromkeys((biometrics.recent_urge_triggers or []) + db_triggers))

    api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key or api_key == "your-gemini-api-key":
        logger.info("GEMINI_API_KEY is not configured; using deterministic clinical engine.")
        return _generate_fallback_prescription(biometrics)

    try:
        http_opts = None
        if hasattr(types, "HttpOptions") and hasattr(types, "HttpRetryOptions"):
            try:
                http_opts = types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1))
            except Exception:
                http_opts = None

        client = genai.Client(api_key=api_key, http_options=http_opts) if http_opts else genai.Client(api_key=api_key)

        prompt = f"""
You are the Chief Clinical Officer of NIVARAN, a medical-grade mind-growth and recovery AI platform.
Generate a comprehensive, scientifically rigorous daily prescription for this user based on their exact metrics, diagnostic assessment, recovery timeline, clinical guardrails, and urge history.

USER CLINICAL & DIAGNOSTIC PROFILE:
- Username: {biometrics.username or 'Seeker'}
- Recovery Track: {biometrics.track} (sm=Mobile/Screen Detox, sa=Smoking/Alcohol, gm=Compulsive Gaming, jf=Junk Food/Sugar)
- Dynamic Timeline: Day {effective_day} of {target_days} Total Days
- Recovery Phase: Phase {metrics.phase} ({metrics.phase_name})
- Addiction Diagnostic Baseline: Severity Score {severity_score}/10.0 ({severity_level.upper()} dependency)
- Biometrics: Age {biometrics.age}, Gender {biometrics.gender}, Height {biometrics.height_cm} cm, Weight {biometrics.weight_kg} kg
- Deterministic Math: BMI {metrics.bmi} ({metrics.bmi_category}), BMR {metrics.bmr} kcal, TDEE {metrics.tdee} kcal
- Target Calories: {metrics.target_calories} kcal
- Target Hydration: {metrics.hydration_liters} Liters
- Dietary Preference: {biometrics.dietary_preference}
- Medical Flags: {biometrics.medical_flags}
- Medical Notes: {biometrics.medical_notes}
- Recent Craving Wave Logs: {all_triggers if all_triggers else 'None logged yet'}

HIGH-FRICTION DIAGNOSTIC WEAK SPOTS IDENTIFIED (SCORE 2 OR 3):
{chr(10).join(high_triggers) if high_triggers else '- General habit momentum management'}

CLINICAL INTENSITY & TIMELINE CALIBRATION:
{intensity_guidance}

CLINICAL GUARDRAILS (STRICT COMPLIANCE MANDATORY):
- Allowed Physical Intensity: {guardrails['allowed_intensity']}
- Exercise Restrictions: {json.dumps(guardrails['exercise_restrictions'])}
- Dietary Restrictions: {json.dumps(guardrails['dietary_restrictions'])}
- Safety Warnings: {json.dumps(guardrails['safety_warnings'])}
- Recommended Workout Duration: {guardrails['recommended_workout_duration']} mins

PRESCRIPTION DIRECTIVES FOR DAY {effective_day} (MILESTONE {effective_day}/{target_days}):
1. Progressive Day Milestone: This prescription is specifically for Day {effective_day}. Do NOT repeat generic Day 1 or Day 2 stabilization tasks if effective_day >= 3. Advance the difficulty and neuroplastic depth appropriate for Day {effective_day} (Phase {metrics.phase}: {metrics.phase_name}).
2. Special Mission: Provide a concrete, highly targeted 1-2 sentence core challenge specifically for Day {effective_day} countering one of the user's highest diagnostic weak spots calibrated to {severity_level} intensity.
3. Routine Tasks: Provide EXACTLY 6 distinct, progressive daily checkbox habits (#1 through #6) reflecting advanced recovery milestones for Day {effective_day}. DO NOT duplicate the Special Mission inside the routine tasks list.
3. Nutrition Plan: Respect the {metrics.target_calories} kcal target, {metrics.hydration_liters}L hydration, dietary preference ({biometrics.dietary_preference}), and medical flags.
4. Movement Protocol: Adhere strictly to the {guardrails['recommended_workout_duration']}-min duration and {guardrails['allowed_intensity']} limit.
5. Neuro Reset: Provide vagus nerve / mindfulness regulation and audio focus cues.

OUTPUT REQUIREMENTS:
Output a single valid JSON object strictly matching this schema:
{{
  "special_mission": "1-2 sentence core daily behavioral challenge addressing the recovery track, timeline, and weak spots.",
  "routine_tasks": [
    "Task 1: Morning hydration or physiological anchor",
    "Task 2: Physical movement / exercise protocol",
    "Task 3: Track-specific environmental or friction barrier habit",
    "Task 4: Track-specific cue disruption or substitution habit",
    "Task 5: Mindful urge-surfing or emotional stabilization habit",
    "Task 6: Evening recovery or circadian sleep hygiene habit"
  ],
  "nutrition_plan": {{
    "short_summary": "{biometrics.dietary_preference.title()} Neuro-Recovery Nutrition ({metrics.target_calories} kcal, {metrics.hydration_liters}L water)",
    "calorie_target": {metrics.target_calories},
    "hydration_liters": {metrics.hydration_liters},
    "breakfast": "Detailed breakfast description respecting dietary preference and medical flags",
    "lunch": "Detailed lunch description respecting dietary preference and medical flags",
    "dinner": "Detailed dinner description respecting dietary preference and medical flags",
    "foods_to_avoid": ["Items strictly to avoid based on medical restrictions and dopamine stability"],
    "clinical_rationale": "Medical and neurochemical explanation of why this nutrition prevents dopamine crashes"
  }},
  "movement_protocol": {{
    "activity_name": "Summary title of physical protocol",
    "duration_mins": {guardrails['recommended_workout_duration']},
    "intensity": "{guardrails['allowed_intensity']}",
    "routines": [
      {{ "title": "Movement Routine 1", "url": "{MEDIA_RESOURCES['walking_low_impact']}" }},
      {{ "title": "Movement Routine 2", "url": "{MEDIA_RESOURCES['joint_mobility']}" }}
    ],
    "safety_notes": "Clinical safety notes based on guardrails"
  }},
  "neuro_reset": {{
    "summary": "Mindfulness & neuroplastic regulation summary",
    "duration_mins": 15,
    "mindfulness_tip": "Specific urge surfing or cognitive reframing tip for track '{biometrics.track}' and severity {severity_level}",
    "meditation_url": "{MEDIA_RESOURCES['craving_meditation']}",
    "music_type": "Binaural 432Hz Calm Mind Recovery",
    "audio_focus_link": "{MEDIA_RESOURCES['binaural_dopamine']}",
    "lifestyle_tip": "Actionable neuroplastic habit cue for Day {effective_day} of {target_days}"
  }},
  "why_this_works": "Scientific explanation of how today's protocol rewires dopamine receptors and prefrontal executive control based on diagnostic baseline"
}}
"""

        # Low-latency configuration for Gemini API
        thinking_cfg = None
        if hasattr(types, "ThinkingConfig"):
            try:
                thinking_cfg = types.ThinkingConfig(thinking_budget=0)
            except Exception:
                thinking_cfg = None

        gen_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=1200,
            thinking_config=thinking_cfg,
        )

        # Try candidate models with gemini-2.5-flash prioritizing low latency
        candidate_models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]
        response = None
        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=gen_config,
                )
                if response and response.text:
                    logger.info(f"Gemini prescription generated successfully with model: {model_name}")
                    break
            except Exception as model_err:
                logger.warning(f"Gemini model {model_name} failed: {model_err}; trying fallback model...")

        if response and response.text:
            data = json.loads(response.text)

            # Map nutrition_plan / diet_protocol
            nutrition_data = data.get("nutrition_plan") or data.get("diet_protocol") or {}
            avoid_list = nutrition_data.get("foods_to_avoid") or nutrition_data.get("avoid_list") or [
                "Ultra-processed packaged snacks and refined flour",
                "Sugary sodas, energy drinks, and artificial syrups"
            ]
            diet = DietProtocol(
                short_summary=nutrition_data.get("short_summary") or f"{biometrics.dietary_preference.title()} Neuro-Recovery Nutrition ({metrics.target_calories} kcal)",
                calorie_target=nutrition_data.get("calorie_target", metrics.target_calories),
                hydration_liters=nutrition_data.get("hydration_liters", metrics.hydration_liters),
                breakfast=nutrition_data.get("breakfast", "High-protein oats with nuts and chia seeds."),
                lunch=nutrition_data.get("lunch", "Wholesome lentil dal with vegetables and whole grains."),
                dinner=nutrition_data.get("dinner", "Light vegetable soup with organic tofu or paneer."),
                avoid_list=avoid_list,
                clinical_rationale=nutrition_data.get("clinical_rationale", "Stabilizes baseline glucose to prevent impulse craving spikes.")
            )

            # Map movement_protocol / exercise_protocol
            move_data = data.get("movement_protocol") or data.get("exercise_protocol") or {}
            raw_routines = move_data.get("routines", [])
            routines: List[ExerciseRoutineItem] = []
            if raw_routines and isinstance(raw_routines, list):
                for r in raw_routines:
                    if isinstance(r, dict):
                        routines.append(ExerciseRoutineItem(
                            title=r.get("title", "Zone 2 Low-Impact Session"),
                            url=r.get("url") or MEDIA_RESOURCES["walking_low_impact"]
                        ))
            if not routines:
                routines = [
                    ExerciseRoutineItem(title="Low-Impact Calming Movement", url=MEDIA_RESOURCES["walking_low_impact"]),
                    ExerciseRoutineItem(title="Joint Mobility Alignment", url=MEDIA_RESOURCES["joint_mobility"]),
                ]

            allowed_intensities = ["low_impact", "moderate", "progressive_strength"]
            intensity = move_data.get("intensity") or guardrails["allowed_intensity"]
            if intensity not in allowed_intensities:
                intensity = guardrails["allowed_intensity"]

            exercise = ExerciseProtocol(
                summary=move_data.get("activity_name") or move_data.get("summary") or f"{guardrails['recommended_workout_duration']}-Min Recovery Movement Session",
                duration_mins=move_data.get("duration_mins", guardrails["recommended_workout_duration"]),
                intensity=intensity,
                routines=routines,
                safety_note=move_data.get("safety_notes") or move_data.get("safety_note") or "Maintain steady diaphragmatic breathing throughout movement."
            )

            # Map neuro_reset / mental_protocol
            mental_data = data.get("neuro_reset") or data.get("mental_protocol") or {}
            mental = MentalProtocol(
                summary=mental_data.get("summary", "Autonomic Nervous System De-escalation & Neuroplastic Regulation"),
                duration_mins=mental_data.get("duration_mins", 15),
                mindfulness_tip=mental_data.get("mindfulness_tip", "Observe craving sensations in your chest or hands without taking kinetic action."),
                meditation_url=mental_data.get("meditation_url") or MEDIA_RESOURCES["craving_meditation"],
                music_type=mental_data.get("music_type", "Binaural 432Hz Calm Mind Recovery"),
                music_url=mental_data.get("audio_focus_link") or mental_data.get("music_url") or MEDIA_RESOURCES["binaural_dopamine"],
                lifestyle_tip=mental_data.get("lifestyle_tip", "Keep your sleeping sanctuary completely device-free.")
            )

            fallback_mission, fallback_tasks, _ = _build_deterministic_missions(biometrics, metrics)

            special_mission = data.get("special_mission")
            if not special_mission or len(str(special_mission).strip()) < 10:
                special_mission = fallback_mission

            # Exact 6 distinct normal routine tasks (#1 through #6), never duplicating special_mission
            raw_tasks = data.get("routine_tasks", [])
            valid_tasks: List[str] = []
            if isinstance(raw_tasks, list):
                for t in raw_tasks:
                    if isinstance(t, str) and t.strip():
                        t_clean = t.strip()
                        if t_clean.lower() != special_mission.strip().lower() and t_clean not in valid_tasks:
                            valid_tasks.append(t_clean)

            # Pad from fallback_tasks if needed to guarantee exactly 6 distinct tasks
            for ft in fallback_tasks:
                if len(valid_tasks) >= 6:
                    break
                if ft not in valid_tasks and ft.lower() != special_mission.strip().lower():
                    valid_tasks.append(ft)

            routine_tasks = valid_tasks[:6]

            why_this_works = data.get("why_this_works") or (
                f"In {metrics.phase_name} (Day {biometrics.day_number}), structured nutrition ({metrics.target_calories} kcal) "
                f"and low-impact physical movement activate the parasympathetic nervous system, reinforcing prefrontal inhibitory circuits."
            )

            return PrescriptionResponse(
                track=biometrics.track,
                day_number=effective_day,
                phase=metrics.phase,
                phase_name=metrics.phase_name,
                computed_metrics=metrics,
                special_mission=special_mission,
                routine_tasks=routine_tasks,
                diet_protocol=diet,
                exercise_protocol=exercise,
                mental_protocol=mental,
                why_this_works=why_this_works
            )

    except Exception as e:
        logger.error(f"Gemini API synthesis encountered error: {e}. Falling back safely to deterministic clinical engine.")

    return _generate_fallback_prescription(biometrics)


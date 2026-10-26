from typing import Dict, Any, List
from app.schemas.prescription import BiometricInput, ComputedMetrics


def evaluate_clinical_guardrails(biometrics: BiometricInput, metrics: ComputedMetrics) -> Dict[str, Any]:
    """
    Evaluates medical history flags, notes, and computed biometrics to derive
    strict clinical guardrails for dietary, physical, and mindfulness protocols.
    """
    flags_lower = [f.strip().lower() for f in biometrics.medical_flags]
    notes_lower = biometrics.medical_notes.lower()
    all_medical_context = " ".join(flags_lower) + " " + notes_lower

    allowed_intensity = "progressive_strength" if biometrics.activity_level in ["moderate", "active"] and metrics.phase >= 2 else "moderate"
    exercise_restrictions: List[str] = []
    dietary_restrictions: List[str] = []
    safety_warnings: List[str] = []
    recommended_duration = 30

    # 1. Asthma or Respiratory Conditions
    if any(k in all_medical_context for k in ["asthma", "respiratory", "bronchitis", "wheezing"]):
        allowed_intensity = "low_impact"
        recommended_duration = min(recommended_duration, 20)
        exercise_restrictions.append("Disallow HIIT, fast sprints, and extreme cardiovascular straining")
        exercise_restrictions.append("Enforce 5-minute nasal and diaphragmatic breathing warmups before movement")
        safety_warnings.append("Asthma/Respiratory protocol: Keep inhaler nearby; cease activity immediately if chest tightness occurs.")

    # 2. Hypertension or Cardiac Conditions
    if any(k in all_medical_context for k in ["hypertension", "cardiac", "high blood pressure", "heart", "bp"]):
        allowed_intensity = "low_impact"
        recommended_duration = min(recommended_duration, 25)
        exercise_restrictions.append("Zone 2 aerobic walking only; limit estimated peak heart rate under 120 bpm")
        exercise_restrictions.append("Strictly disallow breath-holding (Valsalva maneuver) or heavy isometric straining")
        dietary_restrictions.append("Low-sodium dietary protocol: Avoid processed snacks, papad, pickles, and added table salt")
        safety_warnings.append("Cardiovascular caution: Smooth, continuous breathing required during all physical movements.")

    # 3. Joint Pain / Knee / Back issues
    if any(k in all_medical_context for k in ["joint_pain", "joint", "knee", "back", "arthritis", "spine"]):
        allowed_intensity = "low_impact"
        recommended_duration = min(recommended_duration, 20)
        exercise_restrictions.append("Strictly disallow plyometrics, jumping jacks, running, and deep weighted squats")
        exercise_restrictions.append("Enforce non-weight-bearing seated mobility, posture alignment, and gentle flat-surface walking")
        safety_warnings.append("Joint-friendly protocol: Avoid any movement causing acute focal joint compression.")

    # 4. Diabetes or Prediabetes
    if any(k in all_medical_context for k in ["diabetes", "prediabetes", "insulin", "sugar"]):
        dietary_restrictions.append("Low-Glycemic Index (GI) rule: complex whole grains (oats, millets, quinoa), high dietary fiber")
        dietary_restrictions.append("Zero refined sugars, sweetened beverages, fruit juices, and white flour (maida)")
        safety_warnings.append("Metabolic guardrail: Pair carbohydrates with protein/healthy fats to prevent glucose spikes.")

    # 5. Lactose Intolerance or Vegan
    is_vegan = biometrics.dietary_preference == "vegan"
    if is_vegan or any(k in all_medical_context for k in ["lactose", "dairy", "milk allergy"]):
        dietary_restrictions.append("Zero dairy: eliminate milk, paneer, dahi (yogurt), butter, and whey protein")
        dietary_restrictions.append("Plant protein substitutions: organic tofu, sprouted dal/lentils, chickpeas (chole), soy/almond milk, and chia/pumpkin seeds")

    # 6. High BMI / Sedentary baseline precautions
    if metrics.bmi >= 30.0 and allowed_intensity != "low_impact":
        allowed_intensity = "low_impact"
        recommended_duration = min(recommended_duration, 25)
        exercise_restrictions.append("High BMI low-impact protocol: protect knees and ankles with controlled low-velocity movement")

    # 7. Acute Phase 1 (Days 1-7) energy preservation
    if metrics.phase == 1 and allowed_intensity == "progressive_strength":
        allowed_intensity = "moderate"
        recommended_duration = min(recommended_duration, 25)

    return {
        "allowed_intensity": allowed_intensity,
        "exercise_restrictions": exercise_restrictions,
        "dietary_restrictions": dietary_restrictions,
        "safety_warnings": safety_warnings,
        "recommended_workout_duration": recommended_duration,
    }

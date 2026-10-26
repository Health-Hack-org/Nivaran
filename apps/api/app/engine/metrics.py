from typing import Tuple, Literal
from app.schemas.prescription import BiometricInput, ComputedMetrics


def calculate_bmi(weight_kg: float, height_cm: float) -> Tuple[float, Literal["underweight", "normal", "overweight", "obese"]]:
    """Calculates BMI and clinical category."""
    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m ** 2), 1)

    if bmi < 18.5:
        category: Literal["underweight", "normal", "overweight", "obese"] = "underweight"
    elif bmi <= 24.9:
        category = "normal"
    elif bmi <= 29.9:
        category = "overweight"
    else:
        category = "obese"

    return bmi, category


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> int:
    """Calculates Basal Metabolic Rate using the Mifflin-St Jeor equation."""
    base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age)
    if gender == "male":
        bmr = base + 5.0
    elif gender == "female":
        bmr = base - 161.0
    else:
        # Average of male (+5) and female (-161)
        bmr = base - 78.0
    return max(800, round(bmr))


def calculate_tdee(bmr: int, activity_level: str) -> int:
    """Calculates Total Daily Energy Expenditure using activity multipliers."""
    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725
    }
    factor = multipliers.get(activity_level, 1.375)
    return round(bmr * factor)


def calculate_target_calories(tdee: int, bmi: float, track: str) -> int:
    """Determines clinical daily target calories based on track and BMI."""
    if bmi >= 25.0 and (track == "jf" or bmi >= 25.0):
        # Controlled deficit for junk food track or overweight recovery
        return max(1400, tdee - 400)
    elif bmi < 18.5:
        # Nutrient-dense surplus for underweight recovery
        return tdee + 300
    else:
        return tdee


def calculate_hydration(weight_kg: float, track: str) -> float:
    """Calculates baseline hydration (35 ml/kg) + extra allowance for smoking/alcohol clearance."""
    base_liters = weight_kg * 0.035
    if track == "sa":
        base_liters += 0.4
    return round(max(1.5, base_liters), 1)


def map_recovery_phase(day_number: int) -> Tuple[int, str]:
    """Maps day number to clinical recovery phase and name."""
    if day_number <= 7:
        return 1, "Acute Withdrawal & Stabilization"
    elif day_number <= 21:
        return 2, "Dopamine Rewiring & Habit Substitution"
    elif day_number <= 60:
        return 3, "Stress Inoculation & Trigger Mastery"
    else:
        return 4, "Neuroplastic Maintenance & Identity"


def compute_all_metrics(biometrics: BiometricInput) -> ComputedMetrics:
    """Orchestrates all deterministic biometric & recovery calculations."""
    bmi, bmi_category = calculate_bmi(biometrics.weight_kg, biometrics.height_cm)
    bmr = calculate_bmr(biometrics.weight_kg, biometrics.height_cm, biometrics.age, biometrics.gender)
    tdee = calculate_tdee(bmr, biometrics.activity_level)
    target_calories = calculate_target_calories(tdee, bmi, biometrics.track)
    hydration_liters = calculate_hydration(biometrics.weight_kg, biometrics.track)
    phase, phase_name = map_recovery_phase(biometrics.day_number)

    return ComputedMetrics(
        bmi=bmi,
        bmi_category=bmi_category,
        bmr=bmr,
        tdee=tdee,
        target_calories=target_calories,
        hydration_liters=hydration_liters,
        phase=phase,
        phase_name=phase_name
    )

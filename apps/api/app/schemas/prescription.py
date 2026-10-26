from typing import List, Optional, Literal
from pydantic import BaseModel, Field

TrackType = Literal["sm", "sa", "gm", "jf"]
GenderType = Literal["male", "female", "other"]
ActivityLevel = Literal["sedentary", "light", "moderate", "active"]


class BiometricInput(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = "User"
    age: int = Field(..., ge=10, le=120, description="Age in years (10-120)")
    gender: GenderType
    height_cm: float = Field(..., gt=50, lt=260, description="Height in centimeters")
    weight_kg: float = Field(..., gt=20, lt=350, description="Weight in kilograms")
    activity_level: ActivityLevel = "light"
    track: TrackType
    day_number: int = Field(default=1, ge=1, description="Recovery day number")
    medical_flags: List[str] = Field(default_factory=list, description="Medical condition flags")
    medical_notes: str = Field(default="", description="Additional medical or lifestyle notes")
    dietary_preference: str = Field(default="vegetarian", description="vegetarian, non_vegetarian, vegan, eggetarian")
    recent_urge_triggers: List[str] = Field(default_factory=list, description="Recent urge triggers logged by user")


class ComputedMetrics(BaseModel):
    bmi: float
    bmi_category: Literal["underweight", "normal", "overweight", "obese"]
    bmr: int
    tdee: int
    target_calories: int
    hydration_liters: float
    phase: int = Field(..., ge=1, le=4)
    phase_name: str


class DietProtocol(BaseModel):
    short_summary: str
    calorie_target: int
    hydration_liters: float
    breakfast: str
    lunch: str
    dinner: str
    avoid_list: List[str]
    clinical_rationale: str


class ExerciseRoutineItem(BaseModel):
    title: str
    url: str


class ExerciseProtocol(BaseModel):
    summary: str
    duration_mins: int
    intensity: Literal["low_impact", "moderate", "progressive_strength"]
    routines: List[ExerciseRoutineItem]
    safety_note: str


class MentalProtocol(BaseModel):
    summary: str
    duration_mins: int
    mindfulness_tip: str
    meditation_url: str
    music_type: str
    music_url: str
    lifestyle_tip: str


class PrescriptionResponse(BaseModel):
    track: TrackType
    day_number: int
    phase: int
    phase_name: str
    computed_metrics: ComputedMetrics
    special_mission: str
    routine_tasks: List[str]
    diet_protocol: DietProtocol
    exercise_protocol: ExerciseProtocol
    mental_protocol: MentalProtocol
    why_this_works: str


class UrgeLogRequest(BaseModel):
    user_id: Optional[str] = None
    track: TrackType
    intensity: int = Field(..., ge=1, le=10, description="Urge intensity from 1 to 10")
    trigger_type: str
    notes: Optional[str] = ""
    surfed_successfully: bool = True


class UrgeLogResponse(BaseModel):
    success: bool = True
    message: str
    track: TrackType
    intensity: int
    coping_tip: str
    trigger_analysis: str

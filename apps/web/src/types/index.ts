export type TrackType = 'sm' | 'sa' | 'gm' | 'jf';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  id: string;
  username: string;
  gender: Gender;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  active_track: TrackType;
  selected_tracks?: TrackType[];
  medical_flags: string[];
  medical_notes?: string;
  dietary_preference: string;
  avatar_url?: string | null;
  recent_urge_triggers?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface TrackProgress {
  id: string;
  user_id: string;
  track: TrackType;
  current_day: number;
  streak: number;
  shields: number;
  updated_at?: string;
}

export interface DietProtocol {
  short_summary: string;
  calorie_target: number;
  hydration_liters: number;
  breakfast: string;
  lunch: string;
  dinner: string;
  avoid_list: string[];
  clinical_rationale?: string;
}

export interface ExerciseRoutineItem {
  title: string;
  url: string;
}

export interface ExerciseProtocol {
  summary: string;
  duration_mins: number;
  intensity: 'low_impact' | 'moderate' | 'progressive_strength' | string;
  routines: ExerciseRoutineItem[];
  safety_note: string;
}

export interface MentalProtocol {
  summary: string;
  duration_mins: number;
  mindfulness_tip: string;
  meditation_url: string;
  music_type: string;
  music_url: string;
  lifestyle_tip: string;
}

export interface ComputedMetrics {
  bmi: number;
  bmi_category: 'underweight' | 'normal' | 'overweight' | 'obese';
  bmr: number;
  tdee: number;
  target_calories: number;
  hydration_liters: number;
  phase: number;
  phase_name: string;
}

export interface BiometricInput {
  user_id?: string | null;
  username?: string;
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  activity_level?: ActivityLevel;
  track: TrackType;
  day_number?: number;
  medical_flags?: string[];
  medical_notes?: string;
  dietary_preference?: string;
  recent_urge_triggers?: string[];
}

export interface PrescriptionResponse {
  track: TrackType;
  day_number: number;
  phase: 1 | 2 | 3 | 4 | number;
  phase_name: string;
  computed_metrics: ComputedMetrics;
  special_mission: string;
  routine_tasks: string[];
  diet_protocol: DietProtocol;
  exercise_protocol: ExerciseProtocol;
  mental_protocol: MentalProtocol;
  why_this_works: string;
}

export interface DailyPrescription {
  id: string;
  user_id: string;
  track: TrackType;
  day_number: number;
  phase: 1 | 2 | 3 | 4;
  special_mission: string;
  routine_tasks: string[];
  diet_protocol: DietProtocol;
  exercise_protocol: ExerciseProtocol;
  mental_protocol: MentalProtocol;
  generated_at?: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  track: TrackType;
  day_number: number;
  tasks_completed: string[] | Record<string, boolean>;
  completed_at?: string;
}

export interface UrgeLogRequest {
  user_id?: string | null;
  track: TrackType;
  intensity: number; // 1 to 10
  trigger_type: string;
  notes?: string;
  surfed_successfully?: boolean;
}

export interface UrgeLogResponse {
  success: boolean;
  message: string;
  track: TrackType;
  intensity: number;
  coping_tip: string;
  trigger_analysis: string;
}

export interface UrgeLog {
  id: string;
  user_id: string;
  track: TrackType;
  intensity: number; // 1 to 10
  trigger_type: string;
  notes?: string | null;
  surfed_successfully: boolean;
  created_at?: string;
}

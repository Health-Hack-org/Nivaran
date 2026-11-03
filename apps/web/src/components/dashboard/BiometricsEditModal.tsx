"use client";

import React, { useState } from "react";
import {
  X,
  Scale,
  Ruler,
  Activity,
  Salad,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  HeartPulse,
} from "lucide-react";
import { UserProfile, ActivityLevel, Gender, BiometricInput } from "@/types";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  isValidUuid,
  sanitizeProfileForDb,
} from "@/lib/supabase/client";
import { generatePrescription } from "@/lib/api";

interface BiometricsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export function BiometricsEditModal({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
}: BiometricsEditModalProps) {
  const [weightKg, setWeightKg] = useState<number>(currentProfile.weight_kg || 70);
  const [heightCm, setHeightCm] = useState<number>(currentProfile.height_cm || 175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    currentProfile.activity_level || "light"
  );
  const [dietaryPreference, setDietaryPreference] = useState<string>(
    currentProfile.dietary_preference || "vegetarian"
  );
  const [medicalFlags, setMedicalFlags] = useState<string[]>(
    currentProfile.medical_flags || []
  );
  const [medicalNotes, setMedicalNotes] = useState<string>(
    currentProfile.medical_notes || ""
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const medicalConditionList = [
    {
      id: "hypertension",
      label: "Hypertension / High Blood Pressure",
      guardrail: "Caps max heart rate at Zone 2. Strict avoidance of high-intensity intervals.",
    },
    {
      id: "type_2_diabetes",
      label: "Type 2 Diabetes / Insulin Resistance",
      guardrail: "Zero prolonged fasting. Steady-glucose carbohydrate distribution.",
    },
    {
      id: "asthma",
      label: "Asthma / Respiratory Sensitivity",
      guardrail: "Nasal-only steady pacing. No breath-holding breathwork.",
    },
    {
      id: "knee_joint_pain",
      label: "Joint / Knee / Lower Back Pain",
      guardrail: "Zero-impact workouts. Replaces running with kinetic low-impact walking.",
    },
    {
      id: "gerd_acid_reflux",
      label: "GERD / Severe Acid Reflux",
      guardrail: "Mandatory 3-hour pre-sleep dinner cutoff. Zero late-night eating.",
    },
  ];

  const toggleFlag = (id: string) => {
    if (medicalFlags.includes(id)) {
      setMedicalFlags(medicalFlags.filter((f) => f !== id));
    } else {
      setMedicalFlags([...medicalFlags, id]);
    }
  };

  const computeLiveBmi = (w: number, h: number) => {
    if (!w || !h) return null;
    const hM = h / 100;
    const val = w / (hM * hM);
    let cat = "Normal";
    let color = "#16a34a";
    let bg = "#dcfce7";
    if (val < 18.5) {
      cat = "Underweight";
      color = "#ca8a04";
      bg = "#fef9c3";
    } else if (val >= 25 && val < 30) {
      cat = "Overweight";
      color = "#ea580c";
      bg = "#ffedd5";
    } else if (val >= 30) {
      cat = "Obese";
      color = "#dc2626";
      bg = "#fee2e2";
    }
    return { bmiVal: val.toFixed(1), cat, color, bg };
  };

  const liveBmi = computeLiveBmi(weightKg, heightCm);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const updatedProfile: UserProfile = {
      ...currentProfile,
      weight_kg: weightKg,
      height_cm: heightCm,
      activity_level: activityLevel,
      dietary_preference: dietaryPreference,
      medical_flags: medicalFlags,
      medical_notes: medicalNotes,
      updated_at: new Date().toISOString(),
    };

    try {
      // 1. Save to Supabase if authenticated
      const supabase = getSupabaseBrowserClient();
      if (supabase && isSupabaseConfigured() && isValidUuid(currentProfile.id)) {
        const payload = sanitizeProfileForDb(updatedProfile);
        const { error } = await supabase
          .from("user_profiles")
          .update(payload)
          .eq("id", currentProfile.id);

        if (error) {
          console.warn("Could not update profile in Supabase:", error.message);
        }
      }

      // 2. Save locally
      try {
        localStorage.setItem("user_profile", JSON.stringify(updatedProfile));
      } catch (err) {}

      // 3. Re-trigger prescription recalculation
      const bioPayload: BiometricInput = {
        user_id: updatedProfile.id || "local-user",
        username: updatedProfile.username || "Seeker",
        age: updatedProfile.age || 25,
        gender: (updatedProfile.gender as Gender) || "male",
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: activityLevel,
        track: updatedProfile.active_track || "sm",
        dietary_preference: dietaryPreference,
        medical_flags: medicalFlags,
        medical_notes: medicalNotes,
      };

      try {
        await generatePrescription(bioPayload);
      } catch (genErr) {
        console.warn("Prescription regeneration fallback:", genErr);
      }

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update clinical profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-modal text-modal-foreground rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#66350F] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <HeartPulse className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase text-amber-200">
                Biometric & Guardrail Re-Evaluation
              </div>
              <h2 className="text-lg font-bold">Edit Clinical Profile</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleUpdate} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Biometrics Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-secondary" />
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="25"
                max="300"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl border border-input bg-card text-card-foreground text-sm font-semibold outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-secondary" />
                Height (cm)
              </label>
              <input
                type="number"
                step="1"
                min="60"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl border border-input bg-card text-card-foreground text-sm font-semibold outline-none focus:border-secondary"
              />
            </div>
          </div>

          {/* Live BMI pill */}
          {liveBmi && (
            <div
              className="px-3.5 py-2 rounded-xl border text-xs flex items-center justify-between font-semibold"
              style={{
                backgroundColor: liveBmi.bg,
                borderColor: liveBmi.color + "40",
                color: liveBmi.color,
              }}
            >
              <span>Calculated Live BMI: {liveBmi.bmiVal}</span>
              <span className="uppercase text-[11px] font-black tracking-wider">
                {liveBmi.cat}
              </span>
            </div>
          )}

          {/* Activity Level & Dietary Preference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-secondary" />
                Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-card text-card-foreground text-xs font-semibold outline-none focus:border-secondary"
              >
                <option value="sedentary">Sedentary (desk work)</option>
                <option value="light">Light (gentle daily walks)</option>
                <option value="moderate">Moderate (regular workouts)</option>
                <option value="active">Active (high physical demands)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Salad className="w-3.5 h-3.5 text-secondary" />
                Dietary Preference
              </label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-card text-card-foreground text-xs font-semibold outline-none focus:border-secondary"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
                <option value="eggetarian">Eggetarian</option>
                <option value="vegan">100% Vegan</option>
              </select>
            </div>
          </div>

          {/* Medical Flags */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-secondary" />
              Active Medical Guardrails
            </label>
            <div className="space-y-2">
              {medicalConditionList.map((cond) => {
                const active = medicalFlags.includes(cond.id);
                return (
                  <button
                    type="button"
                    key={cond.id}
                    onClick={() => toggleFlag(cond.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${
                      active
                        ? "bg-secondary/15 border-secondary text-foreground font-semibold"
                        : "bg-card border-border text-foreground-muted hover:bg-muted"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-foreground">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            active ? "bg-secondary" : "bg-foreground-muted/40"
                          }`}
                        />
                        {cond.label}
                      </div>
                      <div className="text-[10px] text-foreground-muted pl-3.5 mt-0.5">
                        {cond.guardrail}
                      </div>
                    </div>
                    <span className="text-xs font-black ml-2 text-foreground">
                      {active ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Additional Medical Notes / Constraints
            </label>
            <textarea
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="e.g., occasional lower back soreness, acid reflux when eating late..."
              className="w-full p-2.5 rounded-xl border border-input bg-card text-card-foreground text-xs outline-none focus:border-secondary"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold text-sm shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Recalculating Clinical Prescription...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  Update & Regenerate Protocol
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BiometricsEditModal;

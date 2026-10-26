"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Activity,
  HeartPulse,
  Scale,
  Ruler,
  Salad,
  Sparkles,
  ShieldAlert,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  UserProfile,
  TrackType,
  ActivityLevel,
  Gender,
  PrescriptionResponse,
  BiometricInput,
} from "@/types";
import { recalculateProfilePrescription } from "@/lib/api";

interface BiometricsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  currentTrack: TrackType;
  currentDay: number;
  onProfileUpdated: (updatedProfile: UserProfile, newPrescription: PrescriptionResponse) => void;
}

export function BiometricsEditModal({
  isOpen,
  onClose,
  profile,
  currentTrack,
  currentDay,
  onProfileUpdated,
}: BiometricsEditModalProps) {
  const [weightKg, setWeightKg] = useState<number>(profile.weight_kg || 70);
  const [heightCm, setHeightCm] = useState<number>(profile.height_cm || 175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile.activity_level || "light"
  );
  const [dietaryPreference, setDietaryPreference] = useState<string>(
    profile.dietary_preference || "vegetarian"
  );
  const [medicalFlags, setMedicalFlags] = useState<string[]>(
    profile.medical_flags || []
  );
  const [medicalNotes, setMedicalNotes] = useState<string>(
    profile.medical_notes || ""
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Live BMI preview
  const liveBmi = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const bmiVal = Number((weightKg / (heightM * heightM)).toFixed(1));
    let cat = "Normal";
    let color = "#137333";
    let bg = "#e6f4ea";

    if (bmiVal < 18.5) {
      cat = "Underweight";
      color = "#1a73e8";
      bg = "#e8f0fe";
    } else if (bmiVal <= 24.9) {
      cat = "Normal Healthy";
      color = "#137333";
      bg = "#e6f4ea";
    } else if (bmiVal <= 29.9) {
      cat = "Overweight";
      color = "#b06000";
      bg = "#fef7e0";
    } else {
      cat = "Obese";
      color = "#c5221f";
      bg = "#fce8e6";
    }
    return { bmiVal, cat, color, bg };
  }, [heightCm, weightKg]);

  const medicalConditionList = [
    {
      id: "asthma",
      label: "🫁 Asthma / Respiratory",
      guardrail: "Caps cardio intensity & enforces nasal diaphragmatic pacing",
    },
    {
      id: "hypertension",
      label: "🫀 High Blood Pressure",
      guardrail: "Restricts to Zone 2 walking (<120 bpm), removes added sodium & papads",
    },
    {
      id: "joint_pain",
      label: "🦵 Knee / Joint / Back Pain",
      guardrail: "Replaces impact exercises with seated mobility & gentle walks",
    },
    {
      id: "diabetes",
      label: "🩸 Diabetes / Blood Sugar",
      guardrail: "Enforces low-GI whole grains, high dietary fiber, and zero refined sugars",
    },
    {
      id: "lactose_intolerance",
      label: "🥛 Lactose Intolerance / Dairy Free",
      guardrail: "Strips milk/paneer/curd; substitutes with organic tofu, lentils, and seeds",
    },
    {
      id: "insomnia",
      label: "🌙 Sleep Disruption / Insomnia",
      guardrail: "Imposes strict 9:00 PM digital sunset and binaural delta-wave therapy",
    },
    {
      id: "anxiety",
      label: "🧘 High Stress / Anxiety Triggers",
      guardrail: "Pairs urge waves with physiological sighs and autonomic box-breathing",
    },
  ];

  const toggleFlag = (flagKey: string) => {
    setMedicalFlags((prev) =>
      prev.includes(flagKey) ? prev.filter((f) => f !== flagKey) : [...prev, flagKey]
    );
  };

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const updatedProfile: UserProfile = {
      ...profile,
      weight_kg: Number(weightKg),
      height_cm: Number(heightCm),
      activity_level: activityLevel,
      dietary_preference: dietaryPreference,
      medical_flags: medicalFlags,
      medical_notes: medicalNotes,
      updated_at: new Date().toISOString(),
    };

    const payload: BiometricInput = {
      user_id: profile.id,
      username: profile.username,
      age: profile.age,
      gender: profile.gender,
      height_cm: Number(heightCm),
      weight_kg: Number(weightKg),
      activity_level: activityLevel,
      track: currentTrack,
      day_number: currentDay,
      medical_flags: medicalFlags,
      medical_notes: medicalNotes,
      dietary_preference: dietaryPreference,
      recent_urge_triggers: [],
    };

    try {
      const refreshedPrescription = await recalculateProfilePrescription(payload);
      onProfileUpdated(updatedProfile, refreshedPrescription);
      onClose();
    } catch (err: any) {
      console.error("Failed to recalculate profile prescription:", err);
      setErrorMsg(
        err.message ||
          "Could not recalculate via FastAPI server. Please check your network or try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FFFDF9] rounded-3xl border border-[#66350F]/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleUpdate} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Biometrics Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2A1503] mb-1 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#66350F]" />
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
                className="w-full px-3 py-2 rounded-xl border border-[#66350F]/20 bg-white text-sm font-semibold text-[#2A1503] outline-none focus:border-[#66350F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A1503] mb-1 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#66350F]" />
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
                className="w-full px-3 py-2 rounded-xl border border-[#66350F]/20 bg-white text-sm font-semibold text-[#2A1503] outline-none focus:border-[#66350F]"
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
              <label className="block text-xs font-bold text-[#2A1503] mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#66350F]" />
                Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-3 py-2 rounded-xl border border-[#66350F]/20 bg-white text-xs font-semibold text-[#2A1503] outline-none focus:border-[#66350F]"
              >
                <option value="sedentary">Sedentary (desk work)</option>
                <option value="light">Light (gentle daily walks)</option>
                <option value="moderate">Moderate (regular workouts)</option>
                <option value="active">Active (high physical demands)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A1503] mb-1 flex items-center gap-1.5">
                <Salad className="w-3.5 h-3.5 text-[#66350F]" />
                Dietary Preference
              </label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#66350F]/20 bg-white text-xs font-semibold text-[#2A1503] outline-none focus:border-[#66350F]"
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
            <label className="block text-xs font-bold text-[#2A1503] mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#66350F]" />
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
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      active
                        ? "bg-[#66350F]/10 border-[#66350F] text-[#2A1503]"
                        : "bg-white border-[#66350F]/15 text-[#2A1503]/70 hover:bg-[#F5F5DC]"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            active ? "bg-[#66350F]" : "bg-gray-300"
                          }`}
                        />
                        {cond.label}
                      </div>
                      <div className="text-[10px] text-[#2A1503]/60 pl-3.5 mt-0.5">
                        {cond.guardrail}
                      </div>
                    </div>
                    <span className="text-xs font-black ml-2">
                      {active ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-[#2A1503] mb-1">
              Additional Medical Notes / Constraints
            </label>
            <textarea
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="e.g., occasional lower back soreness, acid reflux when eating late..."
              className="w-full p-2.5 rounded-xl border border-[#66350F]/20 bg-white text-xs text-[#2A1503] outline-none focus:border-[#66350F]"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#66350F] hover:bg-[#4a260a] text-white font-bold text-sm shadow transition-colors flex items-center justify-center gap-2"
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

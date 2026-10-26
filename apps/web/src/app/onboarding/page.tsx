"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BackgroundMandalas } from "@/components/mandala/BackgroundMandalas";
import { generatePrescription } from "@/lib/api";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  TrackType,
  Gender,
  ActivityLevel,
  BiometricInput,
  UserProfile,
  TrackProgress,
} from "@/types";
import {
  Smartphone,
  Flame,
  Gamepad2,
  UtensilsCrossed,
  Activity,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  HeartPulse,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  // Current Step: 1, 2, or 3
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Step 1: Identity & Biometrics
  const [username, setUsername] = useState<string>("");
  const [age, setAge] = useState<number>(24);
  const [gender, setGender] = useState<Gender>("male");
  const [heightCm, setHeightCm] = useState<number>(172);
  const [weightKg, setWeightKg] = useState<number>(68);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("light");

  // Step 2: Track & Diet
  const [track, setTrack] = useState<TrackType>("sm");
  const [dietaryPreference, setDietaryPreference] = useState<string>("vegetarian");

  // Step 3: Medical Flags & Notes
  const [medicalFlags, setMedicalFlags] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState<string>("");

  // Live BMI Calculation
  const bmiData = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const val = Number((weightKg / (heightM * heightM)).toFixed(1));
    let cat = "Normal";
    let bg = "#e6f4ea";
    let color = "#137333";

    if (val < 18.5) {
      cat = "Underweight";
      bg = "#e8f0fe";
      color = "#1a73e8";
    } else if (val <= 24.9) {
      cat = "Healthy / Normal";
      bg = "#e6f4ea";
      color = "#137333";
    } else if (val <= 29.9) {
      cat = "Overweight";
      bg = "#fef7e0";
      color = "#b06000";
    } else {
      cat = "Obese";
      bg = "#fce8e6";
      color = "#c5221f";
    }

    return { val, cat, bg, color };
  }, [heightCm, weightKg]);

  const toggleFlag = (flagKey: string) => {
    setMedicalFlags((prev) =>
      prev.includes(flagKey) ? prev.filter((f) => f !== flagKey) : [...prev, flagKey]
    );
  };

  const tracks = [
    {
      id: "sm" as TrackType,
      title: "Mobile & Social Media",
      desc: "Heal dopamine fatigue & compulsive screen loops.",
      icon: Smartphone,
    },
    {
      id: "sa" as TrackType,
      title: "Smoking & Alcohol",
      desc: "Urge-surfing, oral replacements & pulmonary detox.",
      icon: Flame,
    },
    {
      id: "gm" as TrackType,
      title: "Gaming Escapism",
      desc: "Reset over-stimulation, spinal posture & real quests.",
      icon: Gamepad2,
    },
    {
      id: "jf" as TrackType,
      title: "Junk Food / Sugar",
      desc: "Eliminate blood sugar dips & emotional cravings.",
      icon: UtensilsCrossed,
    },
  ];

  const medicalConditionList = [
    {
      id: "asthma",
      label: "Asthma / Respiratory",
      guardrail: "Caps intensity to low-impact & enforces nasal diaphragmatic warmups",
    },
    {
      id: "hypertension",
      label: "High Blood Pressure",
      guardrail: "Restricts to Zone 2 walking (<120 bpm), removes added sodium & papads",
    },
    {
      id: "joint_pain",
      label: "Knee / Joint / Back Pain",
      guardrail: "Replaces high-impact movements with seated mobility & gentle walks",
    },
    {
      id: "diabetes",
      label: "Diabetes / Blood Sugar",
      guardrail: "Enforces low-GI whole grains, high dietary fiber, and zero refined sugars",
    },
    {
      id: "lactose_intolerance",
      label: "Lactose Intolerance / Dairy Free",
      guardrail: "Strips milk/paneer/curd; substitutes with organic tofu, lentils, and seeds",
    },
    {
      id: "insomnia",
      label: "Sleep Disruption / Insomnia",
      guardrail: "Imposes strict 9:00 PM digital sunset and binaural delta-wave therapy",
    },
    {
      id: "anxiety",
      label: "High Stress / Anxiety Triggers",
      guardrail: "Pairs urge waves with physiological sighs and autonomic box-breathing",
    },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const sanitizedUsername = username.trim() || "Seeker";

      let userId: string = "local-user-" + Date.now();
      if (typeof window !== "undefined") {
        const authUser = localStorage.getItem("nivaran_auth_user");
        if (authUser) {
          try {
            const parsed = JSON.parse(authUser);
            if (parsed.id) userId = parsed.id;
          } catch {
            // ignore
          }
        }
      }

      const profileData: UserProfile = {
        id: userId,
        username: sanitizedUsername,
        gender,
        age,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: activityLevel,
        active_track: track,
        selected_tracks: [track],
        medical_flags: medicalFlags,
        medical_notes: medicalNotes,
        dietary_preference: dietaryPreference,
        avatar_url: null,
      };

      const initialProgress: TrackProgress = {
        id: "tp-" + Date.now(),
        user_id: userId,
        track,
        current_day: 1,
        streak: 0,
        shields: 1,
      };

      const supabase = getSupabaseBrowserClient();
      if (supabase && isSupabaseConfigured()) {
        try {
          await supabase.from("profiles").upsert(profileData);
          await supabase.from("track_progress").upsert(initialProgress, {
            onConflict: "user_id,track",
          });
        } catch (dbErr) {
          console.warn("Supabase upsert warning:", dbErr);
        }
      }

      localStorage.setItem("nivaran_profile", JSON.stringify(profileData));
      localStorage.setItem("nivaran_track_progress", JSON.stringify(initialProgress));

      const biometricPayload: BiometricInput = {
        user_id: userId,
        username: sanitizedUsername,
        age,
        gender,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: activityLevel,
        track,
        day_number: 1,
        medical_flags: medicalFlags,
        medical_notes: medicalNotes,
        dietary_preference: dietaryPreference,
        recent_urge_triggers: [],
      };

      try {
        const prescription = await generatePrescription(biometricPayload);
        localStorage.setItem("nivaran_prescription", JSON.stringify(prescription));
      } catch (apiErr: any) {
        console.warn("FastAPI prescription fallback:", apiErr);
      }

      router.push(`/dashboard`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize recovery protocol. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Signature Mandalas */}
      <BackgroundMandalas />

      {/* Main Glassmorphic Onboarding Card */}
      <div className="glass-card glass-card-wide" style={{ textAlign: "left" }}>
        {/* Step Indicator Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(194, 178, 128, 0.4)",
            paddingBottom: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "2px",
                color: "#8B4513",
                textTransform: "uppercase",
                display: "block",
              }}
            >
              Step {step} of 3
            </span>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: "4px 0 0 0", color: "#2A1503" }}>
              {step === 1 && "Identity & Biometric Baseline"}
              {step === 2 && "Recovery Track & Nutrition"}
              {step === 3 && "Clinical Screening & Guardrails"}
            </h2>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  width: s === step ? "28px" : "8px",
                  background: s <= step ? "#66350F" : "#C2B280",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            style={{
              background: "rgba(150, 45, 45, 0.1)",
              border: "1px solid rgba(150, 45, 45, 0.3)",
              color: "#962d2d",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: IDENTITY & BIOMETRICS */}
        {step === 1 && (
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "6px" }}>
              Username / Display Alias *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Phoenix"
              className="nivaran-input"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "6px" }}>
                  Age (Years)
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(Math.max(10, Math.min(120, Number(e.target.value))))}
                  className="nivaran-input"
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "6px" }}>
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="nivaran-select"
                  style={{ marginBottom: 0 }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Height & Weight with Live BMI Preview */}
            <div
              style={{
                background: "rgba(232, 216, 196, 0.4)",
                border: "1px solid rgba(194, 178, 128, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#66350F", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Activity style={{ width: "16px", height: "16px" }} />
                  Biometrics
                </span>

                {bmiData && (
                  <span
                    style={{
                      background: bmiData.bg,
                      color: bmiData.color,
                      fontSize: "11px",
                      fontWeight: "bold",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      border: `1px solid ${bmiData.color}40`,
                    }}
                  >
                    BMI: {bmiData.val} • {bmiData.cat}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#2A1503", marginBottom: "4px" }}>
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="nivaran-input"
                    style={{ marginBottom: 0 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#2A1503", marginBottom: "4px" }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="nivaran-input"
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "6px" }}>
                Daily Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="nivaran-select"
              >
                <option value="sedentary">Sedentary (Desk job / minimal movement)</option>
                <option value="light">Light (1-3 light walks per week)</option>
                <option value="moderate">Moderate (Regular movement / sports)</option>
                <option value="active">Active (Heavy physical activity / labor)</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 2: PRIMARY TRACK & DIETARY PREFERENCE */}
        {step === 2 && (
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "10px" }}>
              Primary Recovery Track
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {tracks.map((t) => {
                const Icon = t.icon;
                const isSelected = track === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setTrack(t.id)}
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid #66350F" : "1px solid #ccc",
                      background: isSelected ? "#66350F" : "white",
                      color: isSelected ? "#F5F5DC" : "#2A1503",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
                      <Icon style={{ width: "16px", height: "16px" }} />
                      <span>{t.title}</span>
                      {isSelected && <Check style={{ width: "14px", height: "14px", marginLeft: "auto" }} />}
                    </div>
                    <div style={{ fontSize: "11px", opacity: isSelected ? 0.85 : 0.7, lineHeight: 1.3 }}>
                      {t.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "6px" }}>
                Dietary Preference
              </label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="nivaran-select"
              >
                <option value="vegetarian">Vegetarian (Plant foods & traditional dairy)</option>
                <option value="eggetarian">Eggetarian (Vegetarian with eggs)</option>
                <option value="non_vegetarian">Non-Vegetarian (Lean poultry, fish, eggs)</option>
                <option value="vegan">Vegan (100% plant-based, dairy-free)</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: MEDICAL SCREENING & CLINICAL GUARDRAILS */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <HeartPulse style={{ width: "16px", height: "16px", color: "#66350F" }} />
              <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F" }}>
                Clinical Screening Flags
              </label>
            </div>
            <p style={{ fontSize: "12px", color: "#2A1503", opacity: 0.8, marginBottom: "14px", margin: "0 0 14px 0" }}>
              Select any conditions you experience. Our rule-bounded engine strictly adapts workouts and diets to prevent injury.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              {medicalConditionList.map((cond) => {
                const isChecked = medicalFlags.includes(cond.id);
                return (
                  <div
                    key={cond.id}
                    onClick={() => toggleFlag(cond.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: isChecked ? "1.5px solid #66350F" : "1px solid #ccc",
                      background: isChecked ? "rgba(102, 53, 15, 0.1)" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", fontSize: "12px", color: "#2A1503" }}>
                      <span>{cond.label}</span>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "4px",
                          border: isChecked ? "1.5px solid #66350F" : "1px solid #999",
                          background: isChecked ? "#66350F" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        {isChecked && <Check style={{ width: "12px", height: "12px", strokeWidth: 3 }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: "10px", color: "#66350F", marginTop: "4px", lineHeight: 1.2 }}>
                      {cond.guardrail}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#66350F", marginBottom: "6px" }}>
                Additional Medical Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="e.g. recovering from knee strain, work night shifts..."
                className="nivaran-input"
                style={{ resize: "none" }}
              />
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(194, 178, 128, 0.4)",
            paddingTop: "18px",
            marginTop: "16px",
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep(step - 1)}
              className="nivaran-btn-outline"
              style={{ width: "auto", padding: "10px 20px", marginBottom: 0 }}
            >
              <ArrowLeft style={{ width: "14px", height: "14px" }} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !username.trim()) {
                  setUsername("Seeker");
                }
                setStep(step + 1);
              }}
              className="nivaran-btn"
              style={{ width: "auto", padding: "12px 28px", marginBottom: 0 }}
            >
              <span>Continue</span>
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="nivaran-btn"
              style={{ width: "auto", padding: "12px 28px", marginBottom: 0 }}
            >
              <Sparkles style={{ width: "16px", height: "16px" }} />
              <span>{isSubmitting ? "Synthesizing Protocol..." : "Generate My Recovery Protocol"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

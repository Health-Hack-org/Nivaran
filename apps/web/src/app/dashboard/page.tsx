"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  HeartPulse,
} from "lucide-react";

import { SpringCheck } from "@/components/ui/SpringCheck";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UrgeSOSModal } from "@/components/dashboard/UrgeSOSModal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import {
  UserProfile,
  TrackType,
  PrescriptionResponse,
  BiometricInput,
} from "@/types";
import { generatePrescription } from "@/lib/api";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  isValidUuid,
  sanitizeProfileForDb,
  sanitizeTrackProgressForDb,
} from "@/lib/supabase/client";

// Fallback prescription if backend is initializing
const DEFAULT_PRESCRIPTION: PrescriptionResponse = {
  track: "sm",
  day_number: 1,
  phase: 1,
  phase_name: "Phase 1 · Acute Stabilization",
  computed_metrics: {
    bmi: 22.9,
    bmi_category: "normal",
    bmr: 1680,
    tdee: 2310,
    target_calories: 2050,
    hydration_liters: 2.5,
    phase: 1,
    phase_name: "Phase 1 · Acute Stabilization",
  },
  special_mission:
    "Implement a strict 90-minute morning digital blackout. Do not view any notification or feed before 9:00 AM.",
  routine_tasks: [
    "Turn off all non-human push notifications for social media applications",
    "Switch mobile display color profile to high-contrast Grayscale",
    "Complete 20-minute morning natural light walk to anchor circadian cortisol rhythm",
    "Place charging station outside of the bedroom for overnight recovery",
    "Practice 10-second urge pause: touch a physical object before unlocking device",
    "Initiate digital sunset: shut down all recreational screens 45 minutes before sleep",
  ],
  diet_protocol: {
    short_summary: "High-protein neuro-stabilization with slow-release complex carbohydrates.",
    calorie_target: 2050,
    hydration_liters: 2.5,
    breakfast: "Oatmeal with roasted almonds, chia seeds & berries (High fiber, steady glucose).",
    lunch: "2 whole wheat rotis + mixed dal + steamed green vegetable bowl.",
    dinner: "Light vegetable soup + grilled paneer or organic tofu.",
    avoid_list: [
      "Ultra-processed packaged snacks and refined flour (maida)",
      "Sugary sodas, energy drinks, and artificial syrups",
      "Heavy caffeine after 2:00 PM",
    ],
    clinical_rationale:
      "Prevents reactive hypoglycemia dips that trigger impulsive dopamine-seeking craving loops.",
  },
  exercise_protocol: {
    summary: "25 minutes of steady-state aerobic Zone 2 nasal breathing walking.",
    duration_mins: 25,
    intensity: "low_impact",
    routines: [
      {
        title: "Posture Reset & Hip Flexor Decompression",
        url: "https://www.youtube.com/watch?v=g_tea8ZNk5A",
      },
      {
        title: "Zone 2 Low-Impact Brisk Walking",
        url: "https://www.youtube.com/watch?v=enYITYwvPAQ",
      },
    ],
    safety_note: "Keep breathing strictly nasal; heart rate under 125 bpm to avoid acute sympathetic stress.",
  },
  mental_protocol: {
    summary: "10 minutes of box-breathing and non-visual audio therapy.",
    duration_mins: 10,
    mindfulness_tip: "Observe cravings as physical sensations in the chest without reacting.",
    meditation_url: "https://www.youtube.com/watch?v=inpok4MKVLM",
    music_type: "Binaural Dopamine Restoration (432Hz)",
    music_url: "https://www.youtube.com/watch?v=1ZYbU82GVz4",
    lifestyle_tip: "Initiate digital sunset at 9:00 PM. No blue light in the final hour before bed.",
  },
  why_this_works:
    "Early recovery requires reducing neurochemical volatility. Stabilizing blood sugar and capping cardio intensity prevents the adrenal surges that trigger compulsive relapses.",
};

const DEFAULT_PROFILE: UserProfile = {
  id: "local-user-default",
  username: "Seeker",
  gender: "male",
  age: 24,
  height_cm: 175,
  weight_kg: 70,
  activity_level: "light",
  active_track: "sm",
  medical_flags: [],
  medical_notes: "",
  dietary_preference: "vegetarian",
  avatar_url: null,
};

interface TaskState {
  specialMission: boolean;
  routineTasks: Record<number, boolean>;
  nutritionAdherence: boolean;
  mindMovement: boolean;
}

/**
 * Converts TaskState object to array of completed task identifier strings
 * to persist in Supabase daily_logs.tasks_completed JSONB column.
 */
function getCompletedTaskIds(state: TaskState): string[] {
  const ids: string[] = [];
  if (state.specialMission) ids.push("special_mission");
  Object.entries(state.routineTasks).forEach(([idx, done]) => {
    if (done) ids.push(`routine_${idx}`);
  });
  if (state.nutritionAdherence) ids.push("nutrition");
  if (state.mindMovement) ids.push("mind_movement");
  return ids;
}

/**
 * Restores checkbox states from daily_logs.tasks_completed (array or object).
 */
function restoreTaskStateFromCompletedIds(data: any): TaskState {
  const result: TaskState = {
    specialMission: false,
    routineTasks: {},
    nutritionAdherence: false,
    mindMovement: false,
  };
  if (!data) return result;

  if (Array.isArray(data)) {
    data.forEach((id: string) => {
      if (id === "special_mission") result.specialMission = true;
      else if (id === "nutrition") result.nutritionAdherence = true;
      else if (id === "mind_movement") result.mindMovement = true;
      else if (typeof id === "string" && id.startsWith("routine_")) {
        const idx = parseInt(id.replace("routine_", ""), 10);
        if (!isNaN(idx)) result.routineTasks[idx] = true;
      }
    });
    return result;
  }

  if (typeof data === "object") {
    result.specialMission = Boolean(data.specialMission);
    result.nutritionAdherence = Boolean(data.nutritionAdherence);
    result.mindMovement = Boolean(data.mindMovement);
    if (data.routineTasks && typeof data.routineTasks === "object") {
      Object.entries(data.routineTasks).forEach(([k, v]) => {
        const idx = parseInt(k, 10);
        if (!isNaN(idx)) result.routineTasks[idx] = Boolean(v);
      });
    }
    return result;
  }

  return result;
}

/**
 * Merges two TaskState objects with logical OR so no checked items are lost between layers
 */
function mergeTaskStates(
  a: TaskState | null | undefined,
  b: TaskState | null | undefined
): TaskState {
  const result: TaskState = {
    specialMission: Boolean(a?.specialMission || b?.specialMission),
    routineTasks: {},
    nutritionAdherence: Boolean(a?.nutritionAdherence || b?.nutritionAdherence),
    mindMovement: Boolean(a?.mindMovement || b?.mindMovement),
  };
  const allIndices = new Set([
    ...Object.keys(a?.routineTasks || {}),
    ...Object.keys(b?.routineTasks || {}),
  ]);
  allIndices.forEach((k) => {
    const idx = parseInt(k, 10);
    if (!isNaN(idx)) {
      result.routineTasks[idx] = Boolean(a?.routineTasks?.[idx] || b?.routineTasks?.[idx]);
    }
  });
  return result;
}

/**
 * Dual-layer reader: Retrieves saved TaskState across all known user/guest key patterns
 */
function getSavedTaskState(
  userId: string | null | undefined,
  track: TrackType,
  day: number
): TaskState | null {
  if (typeof window === "undefined") return null;
  const candidateKeys = [
    `nivaran_tasks_${userId || "guest"}_${track}_day_${day}`,
    `nivaran_tasks_${userId || "guest"}_${track}_${day}`,
    `nivaran_tasks_${track}_day_${day}`,
    `nivaran_tasks_${track}_${day}`,
  ];
  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return restoreTaskStateFromCompletedIds(parsed);
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Dual-layer reader: Checks whether a specific day is marked completed
 */
function getSavedDayComplete(
  userId: string | null | undefined,
  track: TrackType,
  day: number
): boolean {
  if (typeof window === "undefined") return false;
  const candidateKeys = [
    `nivaran_day_done_${userId || "guest"}_${track}_day_${day}`,
    `nivaran_day_done_${userId || "guest"}_${track}_${day}`,
    `nivaran_day_done_${track}_day_${day}`,
    `nivaran_day_done_${track}_${day}`,
  ];
  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === "true") return true;
    } catch {}
  }
  return false;
}

/**
 * Dual-layer writer: Atomically persists TaskState to all standard localStorage keys
 */
function persistTaskStateToStorage(
  userId: string | null | undefined,
  track: TrackType,
  day: number,
  state: TaskState,
  isDone?: boolean
) {
  if (typeof window === "undefined") return;
  const keys = [
    `nivaran_tasks_${userId || "guest"}_${track}_day_${day}`,
    `nivaran_tasks_${track}_day_${day}`,
  ];
  const jsonStr = JSON.stringify(state);
  for (const key of keys) {
    try {
      localStorage.setItem(key, jsonStr);
    } catch {}
  }
  if (isDone !== undefined) {
    const doneKeys = [
      `nivaran_day_done_${userId || "guest"}_${track}_day_${day}`,
      `nivaran_day_done_${userId || "guest"}_${track}_${day}`,
      `nivaran_day_done_${track}_day_${day}`,
      `nivaran_day_done_${track}_${day}`,
    ];
    for (const dKey of doneKeys) {
      try {
        if (isDone) {
          localStorage.setItem(dKey, "true");
        } else {
          localStorage.removeItem(dKey);
        }
      } catch {}
    }
  }
}

/**
 * Checks whether a prescription contains placeholder default fallback tasks
 */
function isDefaultFallbackTasks(rx: PrescriptionResponse | null | undefined): boolean {
  if (!rx) return true;
  if (!Array.isArray(rx.routine_tasks) || rx.routine_tasks.length < 6) return true;
  if (
    rx.special_mission === DEFAULT_PRESCRIPTION.special_mission &&
    rx.routine_tasks[0] === DEFAULT_PRESCRIPTION.routine_tasks[0] &&
    rx.routine_tasks[1] === DEFAULT_PRESCRIPTION.routine_tasks[1]
  ) {
    return true;
  }
  return false;
}

/**
 * Retrieves valid, non-fallback prescription from localStorage across all known key patterns
 */
function getValidCachedPrescription(
  userId: string | null | undefined,
  track: TrackType,
  day: number
): PrescriptionResponse | null {
  if (typeof window === "undefined") return null;
  const candidateKeys = [
    `nivaran_rx_${userId || "guest"}_${track}_day_${day}`,
    `nivaran_rx_${userId || "guest"}_${track}_${day}`,
    `nivaran_rx_${track}_${day}`,
    "nivaran_prescription"
  ];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.track === track &&
          Number(parsed.day_number) === Number(day) &&
          Array.isArray(parsed.routine_tasks) &&
          parsed.routine_tasks.length >= 6 &&
          !isDefaultFallbackTasks(parsed)
        ) {
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Atomically writes prescription to all standard localStorage keys.
 * Never allows fallback/default placeholder tasks to overwrite valid AI-generated tasks in storage.
 */
function persistPrescriptionToStorage(
  userId: string | null | undefined,
  rx: PrescriptionResponse,
  force: boolean = false
) {
  if (typeof window === "undefined" || !rx) return;
  const track = rx.track as TrackType;
  const day = Number(rx.day_number);

  if (!force && isDefaultFallbackTasks(rx)) {
    const existing = getValidCachedPrescription(userId, track, day);
    if (existing && !isDefaultFallbackTasks(existing)) {
      console.warn("Blocked fallback prescription from overwriting valid AI tasks in localStorage");
      return;
    }
  }

  const jsonStr = JSON.stringify(rx);
  const keys = [
    `nivaran_rx_${userId || "guest"}_${track}_day_${day}`,
    `nivaran_rx_${userId || "guest"}_${track}_${day}`,
    `nivaran_rx_${track}_${day}`,
    "nivaran_prescription"
  ];
  for (const key of keys) {
    try {
      localStorage.setItem(key, jsonStr);
    } catch {}
  }
}

interface DashboardTrackProgress {
  currentDay: number;
  streak: number;
  shields: number;
  targetDays?: number;
  severityScore?: number;
  severityLevel?: "minor" | "moderate" | "severe";
  surveyResponses?: any[];
}

export default function DashboardPage() {
  const router = useRouter();

  // Core State
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [currentTrack, setCurrentTrack] = useState<TrackType>("sm");
  const [allTracksProgress, setAllTracksProgress] = useState<
    Record<TrackType, DashboardTrackProgress>
  >({
    sm: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
    sa: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
    gm: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
    jf: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
  });

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [prescription, setPrescription] = useState<PrescriptionResponse>(DEFAULT_PRESCRIPTION);
  const [isLoadingPrescription, setIsLoadingPrescription] = useState<boolean>(false);
  const activeReqRef = React.useRef<string>("");
  const hasInitializedRef = React.useRef<boolean>(false);
  const lockedPrescriptionRef = React.useRef<{
    track: TrackType;
    day: number;
    isAiGenerated: boolean;
  }>({
    track: "sm",
    day: 1,
    isAiGenerated: false,
  });

  const setGuardedPrescription = useCallback(
    (
      newRxOrUpdater: PrescriptionResponse | ((prev: PrescriptionResponse) => PrescriptionResponse),
      force: boolean = false
    ) => {
      setPrescription((prev) => {
        const next = typeof newRxOrUpdater === "function" ? newRxOrUpdater(prev) : newRxOrUpdater;
        if (!force && !isDefaultFallbackTasks(prev) && isDefaultFallbackTasks(next)) {
          console.warn("Blocked fallback tasks from overwriting valid AI tasks in state");
          return prev;
        }
        return next;
      });
    },
    []
  );

  // Daily Tasks Checklist State (Stored per track and day)
  const [taskState, setTaskState] = useState<TaskState>({
    specialMission: false,
    routineTasks: {},
    nutritionAdherence: false,
    mindMovement: false,
  });

  const [isDayCompleted, setIsDayCompleted] = useState<boolean>(false);
  const [advancingDay, setAdvancingDay] = useState<boolean>(false);
  const [isMandalaPulsing, setIsMandalaPulsing] = useState<boolean>(false);

  // Modals & Drawer State
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState<boolean>(false);
  const [isSOSOpen, setIsSOSOpen] = useState<boolean>(false);

  // Active track progress & target days calculation
  const activeTrackProgress = allTracksProgress[currentTrack] || {
    currentDay: 1,
    streak: 0,
    shields: 1,
    targetDays: 28,
  };
  const currentDayNumber = activeTrackProgress.currentDay || 1;
  const targetDays = activeTrackProgress.targetDays || 28;
  const progressPercent = Math.min(100, Math.round((currentDayNumber / targetDays) * 100));

  // Check if profile was updated more than 30 days ago (or has no timestamp)
  const isProfileStale = useMemo(() => {
    if (!profile || !profile.updated_at) return false;
    const diffDays = (Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 30;
  }, [profile]);

  const taskStorageKey = `nivaran_tasks_${currentTrack}_day_${currentDayNumber}`;

  // ========================================================
  // 1. INITIAL MOUNT: AUTH CHECK & FULL DATA FLOW PERSISTENCE
  // ========================================================
  useEffect(() => {
    setIsMounted(true);
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    let isSubscribed = true;

    async function initializeDashboard() {
      if (typeof window === "undefined") return;

      const supabase = getSupabaseBrowserClient();
      let activeUserId: string | null = null;

      // 1. Check for active session in Supabase Auth
      if (supabase && isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            activeUserId = session.user.id;
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              activeUserId = user.id;
            }
          }
        } catch (authErr) {
          console.warn("Supabase auth session query error:", authErr);
        }
      }

      // If no Supabase user session, check local storage (guest user or local profile)
      if (!activeUserId) {
        const localUserStr = localStorage.getItem("nivaran_auth_user");
        const localProfileStr = localStorage.getItem("nivaran_profile");
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            activeUserId = localUser.id || localUser.user_id;
          } catch {}
        }
        if (!activeUserId && localProfileStr) {
          try {
            const localProf = JSON.parse(localProfileStr);
            activeUserId = localProf.id;
          } catch {}
        }
      }

      // If still no user at all, initialize a default guest session so the dashboard ALWAYS opens!
      if (!activeUserId) {
        const guestUser = {
          id: "guest-" + Date.now(),
          email: "guest@nivaran.app",
          isGuest: true,
        };
        activeUserId = guestUser.id;
        localStorage.setItem("nivaran_auth_user", JSON.stringify(guestUser));
      }

      if (!isSubscribed) return;

      // 2. Fetch Profile from Supabase (if valid UUID) or localStorage
      let loadedProfile = DEFAULT_PROFILE;
      if (supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
        try {
          const { data: profRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", activeUserId)
            .maybeSingle();

          if (profRow) {
            loadedProfile = {
              ...DEFAULT_PROFILE,
              ...profRow,
              selected_tracks: [profRow.active_track || "sm"],
            };
          }
        } catch (e) {
          console.warn("Error querying profile from Supabase:", e);
        }
      }

      const savedProfile = localStorage.getItem("nivaran_profile");
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          loadedProfile = {
            ...loadedProfile,
            ...parsed,
            active_track: parsed.active_track || loadedProfile.active_track || "sm",
          };
        } catch {}
      }

      if (activeUserId && loadedProfile.id === DEFAULT_PROFILE.id) {
        loadedProfile.id = activeUserId;
      }

      if (isSubscribed) {
        setProfile(loadedProfile);
        localStorage.setItem("nivaran_profile", JSON.stringify(loadedProfile));
      }

      const activeTrack: TrackType = loadedProfile.active_track || "sm";
      if (isSubscribed) {
        setCurrentTrack(activeTrack);
      }

      // 3. Fetch current track progress from track_progress table
      let progressMap: Record<TrackType, DashboardTrackProgress> = {
        sm: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
        sa: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
        gm: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
        jf: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
      };

      if (supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
        try {
          const { data: trkRows } = await supabase
            .from("track_progress")
            .select("track, current_day, streak, shields, target_days, severity_score, severity_level, survey_responses")
            .eq("user_id", activeUserId);

          if (trkRows && trkRows.length > 0) {
            trkRows.forEach((row: any) => {
              const t = row.track as TrackType;
              if (t in progressMap) {
                progressMap[t] = {
                  currentDay: row.current_day || 1,
                  streak: row.streak || 0,
                  shields: row.shields ?? 1,
                  targetDays: row.target_days || 28,
                  severityScore:
                    row.severity_score !== null && row.severity_score !== undefined
                      ? Number(row.severity_score)
                      : undefined,
                  severityLevel: row.severity_level || undefined,
                  surveyResponses: row.survey_responses || undefined,
                };
              }
            });
          }
        } catch (trkErr) {
          console.warn("Error fetching track_progress from Supabase:", trkErr);
        }
      }

      // Fallback to local storage if progress not found in Supabase
      const savedProgress = localStorage.getItem("nivaran_all_tracks_progress");
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          Object.keys(parsed).forEach((k) => {
            const t = k as TrackType;
            if (t in progressMap) {
              progressMap[t] = {
                ...progressMap[t],
                ...parsed[t],
                currentDay: Math.max(parsed[t]?.currentDay || 1, progressMap[t].currentDay),
                streak: Math.max(parsed[t]?.streak ?? 0, progressMap[t].streak),
              };
            }
          });
        } catch {}
      }

      // Also merge single active track progress if stored in nivaran_track_progress
      const savedSingleProgress = localStorage.getItem("nivaran_track_progress");
      if (savedSingleProgress) {
        try {
          const parsed = JSON.parse(savedSingleProgress);
          const t = parsed.track as TrackType;
          if (t && t in progressMap) {
            progressMap[t] = {
              ...progressMap[t],
              currentDay: Math.max(parsed.current_day || 1, progressMap[t].currentDay),
              streak: Math.max(parsed.streak ?? 0, progressMap[t].streak),
              shields: parsed.shields ?? progressMap[t].shields,
              targetDays:
                parsed.target_days || parsed.targetDays || progressMap[t].targetDays || 28,
              severityScore:
                parsed.severity_score !== undefined
                  ? Number(parsed.severity_score)
                  : progressMap[t].severityScore,
              severityLevel: parsed.severity_level || progressMap[t].severityLevel,
              surveyResponses: parsed.survey_responses || progressMap[t].surveyResponses,
            };
          }
        } catch {}
      }

      if (isSubscribed) {
        setAllTracksProgress(progressMap);
        localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(progressMap));
      }

      const activeDayNumber = progressMap[activeTrack]?.currentDay || 1;

      // 4. Fetch today's prescription: Check valid cache first across all localStorage keys
      let activeRx: PrescriptionResponse | null = getValidCachedPrescription(activeUserId, activeTrack, activeDayNumber);

      if (!activeRx && supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
        try {
          const { data: rxRows } = await supabase
            .from("daily_prescriptions")
            .select("*")
            .eq("user_id", activeUserId)
            .eq("track", activeTrack)
            .eq("day_number", activeDayNumber)
            .limit(1);

          if (rxRows && rxRows.length > 0) {
            const row = rxRows[0];
            const parsedRx: PrescriptionResponse = {
              track: row.track,
              day_number: row.day_number,
              phase: row.phase,
              phase_name:
                row.phase === 1
                  ? "Acute Withdrawal & Stabilization"
                  : row.phase === 2
                  ? "Dopamine Rewiring & Habit Substitution"
                  : row.phase === 3
                  ? "Stress Inoculation & Trigger Mastery"
                  : "Neuroplastic Maintenance & Identity",
              computed_metrics: {
                bmi: 22.0,
                bmi_category: "normal",
                bmr: 1600,
                tdee: 2200,
                target_calories: row.diet_protocol?.calorie_target || 2050,
                hydration_liters: row.diet_protocol?.hydration_liters || 2.5,
                phase: row.phase,
                phase_name: "Phase " + row.phase,
              },
              special_mission: row.special_mission,
              routine_tasks: row.routine_tasks || [],
              diet_protocol: row.diet_protocol,
              exercise_protocol: row.exercise_protocol,
              mental_protocol: row.mental_protocol,
              why_this_works:
                row.why_this_works ||
                "Clinical behavioral activation protocol rewiring prefrontal dopamine circuits.",
            };
            if (!isDefaultFallbackTasks(parsedRx)) {
              activeRx = parsedRx;
            }
          }
        } catch (rxErr) {
          console.warn("Error querying daily_prescriptions from Supabase:", rxErr);
        }
      }

      if (activeRx && !isDefaultFallbackTasks(activeRx)) {
        if (isSubscribed) {
          setGuardedPrescription(activeRx);
          persistPrescriptionToStorage(activeUserId, activeRx);
          lockedPrescriptionRef.current = {
            track: activeTrack,
            day: activeDayNumber,
            isAiGenerated: true,
          };
        }
      } else {
        setIsLoadingPrescription(true);
        const genPayload: BiometricInput = {
          user_id: activeUserId,
          username: loadedProfile.username,
          age: loadedProfile.age,
          gender: loadedProfile.gender,
          height_cm: loadedProfile.height_cm,
          weight_kg: loadedProfile.weight_kg,
          activity_level: loadedProfile.activity_level,
          track: activeTrack,
          day_number: activeDayNumber,
          medical_flags: loadedProfile.medical_flags || [],
          medical_notes: loadedProfile.medical_notes || "",
          dietary_preference: loadedProfile.dietary_preference || "vegetarian",
          target_days: progressMap[activeTrack]?.targetDays || 28,
          severity_score: progressMap[activeTrack]?.severityScore,
          severity_level: progressMap[activeTrack]?.severityLevel,
          survey_responses: progressMap[activeTrack]?.surveyResponses,
        };
        try {
          const generatedRx = await generatePrescription(genPayload);
          if (isSubscribed && generatedRx) {
            setGuardedPrescription(generatedRx);
            persistPrescriptionToStorage(activeUserId, generatedRx);
            lockedPrescriptionRef.current = {
              track: activeTrack,
              day: activeDayNumber,
              isAiGenerated: !isDefaultFallbackTasks(generatedRx),
            };
          }
        } catch (genErr) {
          console.warn("Generate prescription fallback:", genErr);
          const fallbackRx: PrescriptionResponse = {
            ...DEFAULT_PRESCRIPTION,
            track: activeTrack,
            day_number: activeDayNumber,
          };
          if (isSubscribed) {
            setGuardedPrescription(fallbackRx);
            persistPrescriptionToStorage(activeUserId, fallbackRx);
          }
        } finally {
          if (isSubscribed) {
            setIsLoadingPrescription(false);
          }
        }
      }

      // 5. Fetch today's completed task IDs: Dual-layer read (localStorage immediate + Supabase sync)
      const localTaskState = getSavedTaskState(activeUserId, activeTrack, activeDayNumber);
      const localDayDone = getSavedDayComplete(activeUserId, activeTrack, activeDayNumber);

      if (localTaskState && isSubscribed) {
        setTaskState(localTaskState);
      }
      if (localDayDone && isSubscribed) {
        setIsDayCompleted(true);
      }

      if (supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
        try {
          const { data: logRow } = await supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", activeUserId)
            .eq("track", activeTrack)
            .eq("day_number", activeDayNumber)
            .maybeSingle();

          if (logRow && isSubscribed) {
            const remoteState = restoreTaskStateFromCompletedIds(logRow.tasks_completed);
            const isRemoteDone = Boolean(logRow.completed_at);
            const mergedState = mergeTaskStates(localTaskState, remoteState);
            const mergedDone = localDayDone || isRemoteDone;
            setTaskState(mergedState);
            setIsDayCompleted(mergedDone);
            persistTaskStateToStorage(activeUserId, activeTrack, activeDayNumber, mergedState, mergedDone);
          } else if (localTaskState && isSubscribed) {
            // Local state has completed tasks not yet in Supabase - sync to cloud in background
            const completedIds = getCompletedTaskIds(localTaskState);
            supabase
              .from("daily_logs")
              .upsert(
                {
                  user_id: activeUserId,
                  track: activeTrack,
                  day_number: activeDayNumber,
                  tasks_completed: completedIds,
                  completed_at: localDayDone ? new Date().toISOString() : null,
                },
                { onConflict: "user_id,track,day_number" }
              )
              .then(({ error }: { error: any }) => {
                if (error) console.warn("Background daily_logs sync warning:", error);
              });
          }
        } catch (logErr) {
          console.warn("Error querying daily_logs from Supabase:", logErr);
        }
      }
    }

    initializeDashboard();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Fetch prescription for a specific track and day
  const fetchTrackPrescription = async (
    track: TrackType,
    day: number,
    activeProf: UserProfile = profile,
    forceRefresh: boolean = false
  ) => {
    // 0. Guard against redundant fetches or overwriting already locked AI tasks for the same track & day
    if (
      !forceRefresh &&
      lockedPrescriptionRef.current.track === track &&
      lockedPrescriptionRef.current.day === day &&
      lockedPrescriptionRef.current.isAiGenerated &&
      prescription.track === track &&
      prescription.day_number === day &&
      !isDefaultFallbackTasks(prescription)
    ) {
      return;
    }

    // 1. Check local storage cache immediately across all keys
    if (!forceRefresh) {
      const cached = getValidCachedPrescription(activeProf.id, track, day);
      if (cached) {
        setGuardedPrescription(cached);
        persistPrescriptionToStorage(activeProf.id, cached);
        lockedPrescriptionRef.current = {
          track,
          day,
          isAiGenerated: true,
        };
        return;
      }
    }

    // 2. Check Supabase cache
    const supabase = getSupabaseBrowserClient();
    if (!forceRefresh && supabase && isSupabaseConfigured() && isValidUuid(activeProf.id)) {
      try {
        const { data: rxRows } = await supabase
          .from("daily_prescriptions")
          .select("*")
          .eq("user_id", activeProf.id)
          .eq("track", track)
          .eq("day_number", day)
          .limit(1);

        if (rxRows && rxRows.length > 0) {
          const row = rxRows[0];
          const cachedRx: PrescriptionResponse = {
            track: row.track,
            day_number: row.day_number,
            phase: row.phase,
            phase_name:
              row.phase === 1
                ? "Acute Withdrawal & Stabilization"
                : row.phase === 2
                ? "Dopamine Rewiring & Habit Substitution"
                : row.phase === 3
                ? "Stress Inoculation & Trigger Mastery"
                : "Neuroplastic Maintenance & Identity",
            computed_metrics: {
              bmi: 22.0,
              bmi_category: "normal",
              bmr: 1600,
              tdee: 2200,
              target_calories: row.diet_protocol?.calorie_target || 2050,
              hydration_liters: row.diet_protocol?.hydration_liters || 2.5,
              phase: row.phase,
              phase_name: "Phase " + row.phase,
            },
            special_mission: row.special_mission,
            routine_tasks: row.routine_tasks || [],
            diet_protocol: row.diet_protocol,
            exercise_protocol: row.exercise_protocol,
            mental_protocol: row.mental_protocol,
            why_this_works:
              row.why_this_works ||
              "Clinical behavioral activation protocol rewiring prefrontal dopamine circuits.",
          };
          if (!isDefaultFallbackTasks(cachedRx)) {
            setGuardedPrescription(cachedRx);
            persistPrescriptionToStorage(activeProf.id, cachedRx);
            lockedPrescriptionRef.current = {
              track,
              day,
              isAiGenerated: true,
            };
            return;
          }
        }
      } catch (e) {
        console.warn("Supabase track prescription check failed:", e);
      }
    }

    // 3. If neither cache has it, generate via AI with race-condition prevention
    const reqId = `${track}_${day}_${Date.now()}`;
    activeReqRef.current = reqId;
    setIsLoadingPrescription(true);

    const payload: BiometricInput = {
      user_id: activeProf.id,
      username: activeProf.username,
      age: activeProf.age,
      gender: activeProf.gender,
      height_cm: activeProf.height_cm,
      weight_kg: activeProf.weight_kg,
      activity_level: activeProf.activity_level,
      track,
      day_number: day,
      medical_flags: activeProf.medical_flags || [],
      medical_notes: activeProf.medical_notes || "",
      dietary_preference: activeProf.dietary_preference || "vegetarian",
      recent_urge_triggers: activeProf.recent_urge_triggers || [],
      target_days: allTracksProgress[track]?.targetDays || 28,
      severity_score: allTracksProgress[track]?.severityScore,
      severity_level: allTracksProgress[track]?.severityLevel,
      survey_responses: allTracksProgress[track]?.surveyResponses,
    };

    try {
      const res = await generatePrescription(payload, forceRefresh);
      if (activeReqRef.current === reqId && res) {
        setGuardedPrescription(res, true);
        persistPrescriptionToStorage(activeProf.id, res, true);
        lockedPrescriptionRef.current = {
          track,
          day,
          isAiGenerated: !isDefaultFallbackTasks(res),
        };
      }
    } catch (err) {
      console.warn("Using local fallback prescription:", err);
      if (activeReqRef.current === reqId) {
        setGuardedPrescription((prev) => {
          if (!isDefaultFallbackTasks(prev)) return prev;
          return {
            ...DEFAULT_PRESCRIPTION,
            track,
            day_number: day,
          };
        });
      }
    } finally {
      if (activeReqRef.current === reqId) {
        setIsLoadingPrescription(false);
      }
    }
  };

  // Synchronize Task Completion State from dual-layer storage on track/day change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = getSavedTaskState(profile.id, currentTrack, currentDayNumber);
    if (saved) {
      setTaskState(saved);
    } else {
      setTaskState({
        specialMission: false,
        routineTasks: {},
        nutritionAdherence: false,
        mindMovement: false,
      });
    }

    const savedDone = getSavedDayComplete(profile.id, currentTrack, currentDayNumber);
    setIsDayCompleted(savedDone);
  }, [currentTrack, currentDayNumber, profile.id]);

  // ========================================================
  // 2. TASK COMPLETION: Dual-layer persistence (localStorage immediate + Supabase background)
  // ========================================================
  const updateTasks = useCallback(
    (updater: (prev: TaskState) => TaskState) => {
      setTaskState((prev) => {
        const next = updater(prev);

        // 1. Instantly save progress to dual-layer localStorage (keyed by user/guest ID & track/day)
        persistTaskStateToStorage(profile.id, currentTrack, currentDayNumber, next);

        // Also update track_progress snapshot in localStorage
        const activeProg = allTracksProgress[currentTrack] || {
          currentDay: currentDayNumber,
          streak: 0,
          shields: 1,
          targetDays: targetDays,
        };
        const progressPayload = {
          track: currentTrack,
          current_day: currentDayNumber,
          streak: activeProg.streak || 0,
          shields: activeProg.shields || 1,
          target_days: targetDays,
        };
        try {
          localStorage.setItem("nivaran_track_progress", JSON.stringify(progressPayload));
          localStorage.setItem(`nivaran_track_progress_${profile.id || "guest"}_${currentTrack}`, JSON.stringify(progressPayload));
        } catch {}

        // 2. Persist completed task array into daily_logs in Supabase in background if authenticated
        const completedIds = getCompletedTaskIds(next);
        const supabase = getSupabaseBrowserClient();
        if (supabase && isSupabaseConfigured() && isValidUuid(profile.id)) {
          (async () => {
            try {
              const { error } = await supabase
                .from("daily_logs")
                .upsert(
                  {
                    user_id: profile.id,
                    track: currentTrack,
                    day_number: currentDayNumber,
                    tasks_completed: completedIds,
                  },
                  { onConflict: "user_id,track,day_number" }
                );
              if (error) console.warn("Supabase daily_logs task sync warning:", error);
            } catch (err) {
              console.warn("Supabase task sync error:", err);
            }
          })();
        }

        return next;
      });
    },
    [profile.id, currentTrack, currentDayNumber, allTracksProgress, targetDays]
  );

  // Toggles
  const toggleSpecialMission = () => {
    updateTasks((prev) => ({ ...prev, specialMission: !prev.specialMission }));
  };

  const toggleRoutineTask = (index: number) => {
    updateTasks((prev) => ({
      ...prev,
      routineTasks: {
        ...prev.routineTasks,
        [index]: !prev.routineTasks[index],
      },
    }));
  };

  const toggleNutrition = () => {
    updateTasks((prev) => ({ ...prev, nutritionAdherence: !prev.nutritionAdherence }));
  };

  const toggleMindMovement = () => {
    updateTasks((prev) => ({ ...prev, mindMovement: !prev.mindMovement }));
  };

  // Completion calculation
  const routineTasksList = prescription.routine_tasks || [];
  const completedRoutineCount = routineTasksList.reduce(
    (acc, _, idx) => (taskState.routineTasks[idx] ? acc + 1 : acc),
    0
  );

  const totalTasks = 1 + routineTasksList.length; // 1 Special Mission + 6 Normal Tasks = 7 total tasks
  const completedTasks =
    (taskState.specialMission ? 1 : 0) +
    completedRoutineCount;

  const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;

  // Handle Track Switching: Dual-layer read & restore
  const handleSelectTrack = async (track: TrackType) => {
    if (track === currentTrack) return;
    setCurrentTrack(track);

    const day = allTracksProgress[track]?.currentDay || 1;
    const updated = { ...profile, active_track: track };
    setProfile(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_profile", JSON.stringify(updated));
    }

    // Immediately restore tasks and day completion for selected track from dual-layer localStorage
    const savedForTrack = getSavedTaskState(profile.id, track, day);
    if (savedForTrack) {
      setTaskState(savedForTrack);
    } else {
      setTaskState({
        specialMission: false,
        routineTasks: {},
        nutritionAdherence: false,
        mindMovement: false,
      });
    }
    const isTrackDayDone = getSavedDayComplete(profile.id, track, day);
    setIsDayCompleted(isTrackDayDone);

    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured() && isValidUuid(profile.id)) {
      try {
        const dbProfile = sanitizeProfileForDb(updated);
        await supabase.from("profiles").upsert(dbProfile);

        // Restore task states from daily_logs for newly selected track
        const { data: logRow } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", profile.id)
          .eq("track", track)
          .eq("day_number", day)
          .maybeSingle();

        if (logRow) {
          const remoteState = restoreTaskStateFromCompletedIds(logRow.tasks_completed);
          const merged = mergeTaskStates(savedForTrack, remoteState);
          const done = isTrackDayDone || Boolean(logRow.completed_at);
          setTaskState(merged);
          setIsDayCompleted(done);
          persistTaskStateToStorage(profile.id, track, day, merged, done);
        }
      } catch (e) {
        console.warn("Track switch sync error:", e);
      }
    }

    fetchTrackPrescription(track, day, updated);
  };

  // ========================================================
  // 3. COMPLETE DAY ACTION: Full Persistence Flow
  // ========================================================
  const handleCompleteDay = async () => {
    if (!allTasksCompleted) return;

    // Trigger calm, subtle golden pulse on the Living Mandala
    setIsMandalaPulsing(true);
    setTimeout(() => {
      setIsMandalaPulsing(false);
    }, 2400);

    const activeProgress = allTracksProgress[currentTrack] || {
      currentDay: currentDayNumber,
      streak: 0,
      shields: 1,
      targetDays: targetDays,
    };
    const newStreak = (activeProgress.streak || 0) + 1;
    const newShields = newStreak % 3 === 0 ? (activeProgress.shields || 1) + 1 : (activeProgress.shields || 1);
    const nextDay = Math.max(activeProgress.currentDay || currentDayNumber, currentDayNumber) + 1;
    const nowIso = new Date().toISOString();

    const completedIds = getCompletedTaskIds(taskState);

    // 1. Dual-layer storage: Mark current day completed in localStorage
    persistTaskStateToStorage(profile.id, currentTrack, currentDayNumber, taskState, true);

    // 2. Sync completion to Supabase daily_logs and track_progress in background if authenticated
    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured() && isValidUuid(profile.id)) {
      try {
        await supabase.from("daily_logs").upsert(
          {
            user_id: profile.id,
            track: currentTrack,
            day_number: currentDayNumber,
            tasks_completed: completedIds,
            completed_at: nowIso,
          },
          { onConflict: "user_id,track,day_number" }
        );

        await supabase.from("track_progress").upsert(
          sanitizeTrackProgressForDb({
            user_id: profile.id,
            track: currentTrack,
            current_day: nextDay,
            streak: newStreak,
            shields: newShields,
            target_days: activeProgress.targetDays || 28,
            severity_score: activeProgress.severityScore,
            severity_level: activeProgress.severityLevel,
            survey_responses: activeProgress.surveyResponses,
            updated_at: nowIso,
          }),
          { onConflict: "user_id,track" }
        );
      } catch (e) {
        console.warn("Supabase completion sync warning:", e);
      }
    }

    // 3. Call FastAPI to generate Day current_day + 1 prescription, update local state, and refresh dashboard
    setAdvancingDay(true);
    const nextPayload: BiometricInput = {
      user_id: profile.id,
      username: profile.username,
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      activity_level: profile.activity_level,
      track: currentTrack,
      day_number: nextDay,
      current_day: nextDay,
      medical_flags: profile.medical_flags || [],
      medical_notes: profile.medical_notes || "",
      dietary_preference: profile.dietary_preference || "vegetarian",
      recent_urge_triggers: profile.recent_urge_triggers || [],
      target_days: activeProgress.targetDays || 28,
      severity_score: activeProgress.severityScore,
      severity_level: activeProgress.severityLevel,
      survey_responses: activeProgress.surveyResponses,
    };

    let nextPrescription: PrescriptionResponse;
    try {
      nextPrescription = await generatePrescription(nextPayload, true);
    } catch (genErr) {
      console.warn("Generate next day prescription fallback:", genErr);
      nextPrescription = {
        ...prescription,
        day_number: nextDay,
      };
    }

    const updatedTracksProgress: Record<TrackType, DashboardTrackProgress> = {
      ...allTracksProgress,
      [currentTrack]: {
        ...activeProgress,
        currentDay: nextDay,
        streak: newStreak,
        shields: newShields,
      },
    };

    // Reset daily tasks checklist for the fresh day
    const resetTasks: TaskState = {
      specialMission: false,
      routineTasks: {},
      nutritionAdherence: false,
      mindMovement: false,
    };

    // Dual-layer storage: Initialize next day fresh in localStorage
    persistTaskStateToStorage(profile.id, currentTrack, nextDay, resetTasks, false);

    setAllTracksProgress(updatedTracksProgress);
    setGuardedPrescription(nextPrescription, true);
    persistPrescriptionToStorage(profile.id, nextPrescription, true);
    lockedPrescriptionRef.current = {
      track: currentTrack,
      day: nextDay,
      isAiGenerated: !isDefaultFallbackTasks(nextPrescription),
    };
    setIsDayCompleted(false);
    setAdvancingDay(false);
    setTaskState(resetTasks);

    if (typeof window !== "undefined") {
      const progressPayload = {
        track: currentTrack,
        current_day: nextDay,
        streak: newStreak,
        shields: newShields,
        target_days: activeProgress.targetDays || 28,
        severity_score: activeProgress.severityScore,
        severity_level: activeProgress.severityLevel,
        survey_responses: activeProgress.surveyResponses,
      };
      localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(updatedTracksProgress));
      localStorage.setItem("nivaran_track_progress", JSON.stringify(progressPayload));
      localStorage.setItem(`nivaran_track_progress_${profile.id || "guest"}_${currentTrack}`, JSON.stringify(progressPayload));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Sign out - completely purge session state and return to clean landing page
  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("nivaran_auth_user");
      localStorage.removeItem("nivaran_profile");
      localStorage.removeItem("nivaran_track_progress");
      localStorage.removeItem("nivaran_prescription");
      localStorage.removeItem("nivaran_all_tracks_progress");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("nivaran_tasks_") || key.startsWith("nivaran_day_done_")) {
          localStorage.removeItem(key);
        }
      });
      window.location.href = "/";
      return;
    }
    router.push("/");
  };

  // Profile update callback
  const handleProfileUpdated = (updatedProfile: UserProfile, newPrescription: PrescriptionResponse) => {
    setProfile(updatedProfile);
    setGuardedPrescription(newPrescription, true);
    const track = updatedProfile.active_track || "sm";
    const day = allTracksProgress[track]?.currentDay || 1;
    persistPrescriptionToStorage(updatedProfile.id, newPrescription, true);
    lockedPrescriptionRef.current = {
      track,
      day,
      isAiGenerated: !isDefaultFallbackTasks(newPrescription),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_profile", JSON.stringify(updatedProfile));
    }
  };

  // Clean, concise track titles
  const trackTitles: Record<TrackType, string> = {
    sm: "Mobile & Screen Detox",
    sa: "Smoking & Alcohol Recovery",
    gm: "Compulsive Gaming Reset",
    jf: "Junk Food & Sugar Freedom",
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#2D221A] font-sans selection:bg-[#8C6A4F]/20 selection:text-[#8C6A4F] relative">
      {/* Soothing Minimal Slide-Out Drawer */}
      <Sidebar
        profile={profile}
        currentTrack={currentTrack}
        onSelectTrack={handleSelectTrack}
        allTracksProgress={allTracksProgress}
        prescription={prescription}
        onSignOut={handleSignOut}
        isOpen={sidebarDrawerOpen}
        onClose={() => setSidebarDrawerOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ======================================================== */}
        {/* A. MINIMAL TOP HEADER                                    */}
        {/* ======================================================== */}
        <header className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE5DE] shadow-xs flex items-center justify-between gap-4">
          {/* Left: [☰ Menu] + NIVARAN + Active Track */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarDrawerOpen(true)}
              className="bg-[#F0ECE7] hover:bg-[#EAE5DE] text-[#2D221A] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer border border-[#EAE5DE] transition-colors flex-shrink-0"
              aria-label="Open Menu"
            >
              <Menu className="w-4 h-4 text-[#8C6A4F]" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            <span className="font-bold text-lg sm:text-xl text-[#2D221A] tracking-tight flex-shrink-0">
              NIVARAN
            </span>

            <span className="text-[#EAE5DE] select-none hidden sm:inline">|</span>

            {/* Active Track Name Pill */}
            <span className="text-xs sm:text-sm font-medium text-[#6E5D52] bg-[#F0ECE7] px-3 py-1 rounded-full truncate">
              {!isMounted
                ? "Mobile & Screen Detox · Day 1"
                : `${trackTitles[currentTrack] || "Recovery Track"} · Day ${currentDayNumber}`}
            </span>
          </div>

          {/* Right: [☀️/🌙 ThemeToggle] & [🚨 SOS] emergency craving button */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <ThemeToggle />

            <button
              onClick={() => setIsSOSOpen(true)}
              className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all flex-shrink-0"
            >
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <span>SOS</span>
            </button>
          </div>
        </header>

        {/* Soft 30-Day Biometric Calibration Prompt */}
        {isProfileStale && (
          <div className="bg-[#FAF8F5] border border-[#8C6A4F]/30 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#8C6A4F]/10 text-[#8C6A4F] flex items-center justify-center flex-shrink-0">
                <HeartPulse className="w-5 h-5 text-[#8C6A4F]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#2D221A]">
                  30-Day Biometrics Calibration Due
                </h4>
                <p className="text-xs text-[#6E5D52]">
                  Your metabolic baseline has not been updated in over 30 days. Re-calibrate your height, weight, and diet in the Menu to keep nutrition and Zone 2 heart rate targets accurate.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarDrawerOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-[#8C6A4F] hover:bg-[#8C6A4F]/10 border border-[#8C6A4F]/30 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
            >
              Update Biometrics →
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* B. MAIN CANVAS: 3 SIMPLE FOCUSED BLOCKS                  */}
        {/* ======================================================== */}
        <main className="space-y-6">
          {/* SECTION 1: PROGRESS */}
          <section className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-[#2D221A]">
                    Day {!isMounted ? 1 : currentDayNumber} <span className="text-[#6E5D52] font-semibold text-lg sm:text-xl">/ {!isMounted ? 28 : targetDays}</span>
                  </span>
                  {isMounted && activeTrackProgress.severityScore && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        activeTrackProgress.severityLevel === "minor"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : activeTrackProgress.severityLevel === "severe"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span className="capitalize">{activeTrackProgress.severityLevel || "Moderate"} Dependency</span>
                      <span className="opacity-75">· {activeTrackProgress.severityScore.toFixed(1)}/10</span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#6E5D52] font-medium block mt-0.5">
                  {!isMounted
                    ? "Phase 1 · Acute Stabilization"
                    : `Phase ${prescription.phase || 1} · ${
                        prescription.phase_name?.replace(/^Phase \d+\s*[·-]\s*/, "") || "Acute Stabilization"
                      }`}
                </span>
              </div>

              {/* Streak Counter */}
              <div className="bg-[#F0ECE7] text-[#8C6A4F] border border-[#EAE5DE] px-3.5 py-1.5 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-[#8C6A4F] text-[#8C6A4F]" />
                <span>{!isMounted ? 0 : (activeTrackProgress.streak || 0)} Days Streak</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-[#6E5D52] font-semibold">
                <span>Milestone Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#F0ECE7] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8C6A4F] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: DAILY TASKS */}
          <section className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EAE5DE] pb-3">
              <h2 className="text-lg font-bold text-[#2D221A]">Daily Tasks</h2>
              <span className="text-xs font-semibold text-[#6E5D52]">
                {!isMounted ? "0 / 7 Completed" : `${completedTasks} / ${totalTasks} Completed`}
              </span>
            </div>

            {/* Special Mission */}
            <div
              onClick={toggleSpecialMission}
              role="checkbox"
              aria-checked={taskState.specialMission}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none active:scale-[0.99] ${
                taskState.specialMission
                  ? "bg-[#F0ECE7]/60 border-[#EAE5DE]"
                  : "bg-[#F8F7F4] border-[#EAE5DE] hover:border-[#8C6A4F]/40"
              }`}
            >
              <div
                className={`w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  taskState.specialMission
                    ? "bg-[#8C6A4F] text-white"
                    : "border-2 border-[#8C6A4F]/40 bg-white"
                }`}
              >
                {taskState.specialMission && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C6A4F] block mb-0.5">
                  Special Mission
                </span>
                <p className={`text-xs sm:text-sm font-semibold leading-relaxed ${taskState.specialMission ? "line-through text-[#6E5D52]" : "text-[#2D221A]"}`}>
                  {!isMounted ? DEFAULT_PRESCRIPTION.special_mission : prescription.special_mission}
                </p>
              </div>
            </div>

            {/* Routine Checklist using SpringCheck */}
            <SpringCheck
              tasks={!isMounted ? DEFAULT_PRESCRIPTION.routine_tasks : routineTasksList}
              checkedState={taskState.routineTasks}
              onToggleTask={toggleRoutineTask}
            />

            {/* Action button: [Complete Day] */}
            <div className="pt-2">
              <button
                onClick={handleCompleteDay}
                disabled={!allTasksCompleted || advancingDay}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 ${
                  allTasksCompleted && !advancingDay
                    ? "bg-[#8C6A4F] hover:bg-[#73543B] cursor-pointer active:scale-98"
                    : "bg-[#8C6A4F]/50 cursor-not-allowed opacity-80"
                }`}
              >
                {advancingDay ? (
                  <span>Synthesizing Next Day Protocol...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Day {currentDayNumber}</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* SECTION 3: DIET & EXERCISE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fuel Blueprint */}
            <div className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#EAE5DE] pb-3">
                <h3 className="text-base font-bold text-[#2D221A] flex items-center gap-2">
                  <span>🥗</span> Fuel Blueprint
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="bg-[#F0ECE7] text-[#2D221A] px-2.5 py-0.5 rounded-lg">
                    {prescription.diet_protocol?.calorie_target || 2050} kcal
                  </span>
                  <span className="bg-[#F0ECE7] text-[#2D221A] px-2.5 py-0.5 rounded-lg">
                    {prescription.diet_protocol?.hydration_liters || 2.5}L Water
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#6E5D52]">
                <li className="flex items-start gap-2">
                  <strong className="text-[#2D221A] font-bold min-w-[70px]">Breakfast:</strong>
                  <span>{prescription.diet_protocol?.breakfast || "High-protein oats with nuts and chia."}</span>
                </li>
                <li className="flex items-start gap-2">
                  <strong className="text-[#2D221A] font-bold min-w-[70px]">Lunch:</strong>
                  <span>{prescription.diet_protocol?.lunch || "Whole grain meal with mixed dal and greens."}</span>
                </li>
                <li className="flex items-start gap-2">
                  <strong className="text-[#2D221A] font-bold min-w-[70px]">Dinner:</strong>
                  <span>{prescription.diet_protocol?.dinner || "Light soup with grilled plant proteins."}</span>
                </li>
              </ul>
            </div>

            {/* Movement & Reset */}
            <div className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#EAE5DE] pb-3">
                <h3 className="text-base font-bold text-[#2D221A] flex items-center gap-2">
                  <span>🏃</span> Movement & Reset
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="bg-[#F0ECE7] text-[#2D221A] px-2.5 py-0.5 rounded-lg">
                    {prescription.exercise_protocol?.duration_mins || 30} mins
                  </span>
                  <span className="bg-[#F0ECE7] text-[#2D221A] px-2.5 py-0.5 rounded-lg">
                    {prescription.exercise_protocol?.intensity?.replace("_", " ") || "Low Impact"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#6E5D52]">
                <div className="flex items-start gap-2">
                  <strong className="text-[#2D221A] font-bold min-w-[70px]">Activity:</strong>
                  <span>{prescription.exercise_protocol?.summary || "30 mins steady Zone 2 nasal breathing walk."}</span>
                </div>

                <div className="pt-2 border-t border-[#EAE5DE]/60">
                  <span className="text-[11px] font-bold text-[#8C6A4F] uppercase tracking-wider block mb-1">
                    Mindfulness Reset
                  </span>
                  <a
                    href={prescription.mental_protocol?.music_url || "https://www.youtube.com/watch?v=1ZYbU82GVz4"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C6A4F] hover:text-[#73543B] underline"
                  >
                    <span>🎧 {prescription.mental_protocol?.music_type || "Binaural Dopamine Reset (432Hz)"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Interactive SOS Urge Modal */}
      <UrgeSOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        currentTrack={currentTrack}
        userId={profile.id}
        onUrgeLogged={(trigger) => {
          setProfile((prev) => ({
            ...prev,
            recent_urge_triggers: [trigger, ...(prev.recent_urge_triggers || [])].slice(0, 5),
          }));
        }}
      />
    </div>
  );
}

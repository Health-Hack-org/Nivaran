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
} from "lucide-react";

import { SpringCheck } from "@/components/ui/SpringCheck";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UrgeSOSModal } from "@/components/dashboard/UrgeSOSModal";

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

export default function DashboardPage() {
  const router = useRouter();

  // Core State
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [currentTrack, setCurrentTrack] = useState<TrackType>("sm");
  const [allTracksProgress, setAllTracksProgress] = useState<
    Record<TrackType, { currentDay: number; streak: number; shields: number }>
  >({
    sm: { currentDay: 1, streak: 0, shields: 1 },
    sa: { currentDay: 1, streak: 0, shields: 1 },
    gm: { currentDay: 1, streak: 0, shields: 1 },
    jf: { currentDay: 1, streak: 0, shields: 1 },
  });

  const [prescription, setPrescription] = useState<PrescriptionResponse>(DEFAULT_PRESCRIPTION);
  const [isLoadingPrescription, setIsLoadingPrescription] = useState<boolean>(false);

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

  // Current day calculation
  const currentDayNumber = allTracksProgress[currentTrack]?.currentDay || 1;
  const taskStorageKey = `nivaran_tasks_${currentTrack}_day_${currentDayNumber}`;

  // ========================================================
  // 1. INITIAL MOUNT: AUTH CHECK & FULL DATA FLOW PERSISTENCE
  // ========================================================
  useEffect(() => {
    let isMounted = true;

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

      if (!isMounted) return;

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

      if (loadedProfile.id === DEFAULT_PROFILE.id) {
        const savedProfile = localStorage.getItem("nivaran_profile");
        if (savedProfile) {
          try {
            loadedProfile = JSON.parse(savedProfile);
          } catch {}
        }
      }

      if (activeUserId && loadedProfile.id === DEFAULT_PROFILE.id) {
        loadedProfile.id = activeUserId;
      }

      if (isMounted) {
        setProfile(loadedProfile);
        localStorage.setItem("nivaran_profile", JSON.stringify(loadedProfile));
      }

      const activeTrack: TrackType = loadedProfile.active_track || "sm";
      if (isMounted) {
        setCurrentTrack(activeTrack);
      }

      // 3. Fetch current track progress from track_progress table
      let progressMap = {
        sm: { currentDay: 1, streak: 0, shields: 1 },
        sa: { currentDay: 1, streak: 0, shields: 1 },
        gm: { currentDay: 1, streak: 0, shields: 1 },
        jf: { currentDay: 1, streak: 0, shields: 1 },
      };

      if (supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
        try {
          const { data: trkRows } = await supabase
            .from("track_progress")
            .select("track, current_day, streak, shields")
            .eq("user_id", activeUserId);

          if (trkRows && trkRows.length > 0) {
            trkRows.forEach((row: any) => {
              const t = row.track as TrackType;
              if (t in progressMap) {
                progressMap[t] = {
                  currentDay: row.current_day || 1,
                  streak: row.streak || 0,
                  shields: row.shields ?? 1,
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
          progressMap = { ...progressMap, ...parsed };
        } catch {}
      }

      if (isMounted) {
        setAllTracksProgress(progressMap);
        localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(progressMap));
      }

      const activeDayNumber = progressMap[activeTrack]?.currentDay || 1;

      // 4. Fetch today's prescription from daily_prescriptions (or trigger generation if missing)
      let activeRx: PrescriptionResponse | null = null;
      if (supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
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
            activeRx = {
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
          }
        } catch (rxErr) {
          console.warn("Error querying daily_prescriptions from Supabase:", rxErr);
        }
      }

      if (!activeRx) {
        // Trigger generation via FastAPI backend
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
        };
        try {
          activeRx = await generatePrescription(genPayload);
        } catch (genErr) {
          console.warn("Generate prescription fallback:", genErr);
          activeRx = {
            ...DEFAULT_PRESCRIPTION,
            track: activeTrack,
            day_number: activeDayNumber,
          };
        }
      }

      if (isMounted && activeRx) {
        setPrescription(activeRx);
        localStorage.setItem("nivaran_prescription", JSON.stringify(activeRx));
      }

      // 5. Fetch today's completed task IDs from daily_logs to restore checkbox states
      if (supabase && isSupabaseConfigured() && isValidUuid(activeUserId)) {
        try {
          const { data: logRow } = await supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", activeUserId)
            .eq("track", activeTrack)
            .eq("day_number", activeDayNumber)
            .maybeSingle();

          if (logRow && isMounted) {
            const restoredState = restoreTaskStateFromCompletedIds(logRow.tasks_completed);
            setTaskState(restoredState);
            setIsDayCompleted(Boolean(logRow.completed_at));
            localStorage.setItem(
              `nivaran_tasks_${activeTrack}_day_${activeDayNumber}`,
              JSON.stringify(restoredState)
            );
            if (logRow.completed_at) {
              localStorage.setItem(
                `nivaran_day_done_${activeTrack}_${activeDayNumber}`,
                "true"
              );
            }
          }
        } catch (logErr) {
          console.warn("Error querying daily_logs from Supabase:", logErr);
        }
      }
    }

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Fetch prescription for a specific track and day
  const fetchTrackPrescription = async (
    track: TrackType,
    day: number,
    activeProf: UserProfile = profile
  ) => {
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
    };

    try {
      const res = await generatePrescription(payload);
      setPrescription(res);
      localStorage.setItem("nivaran_prescription", JSON.stringify(res));
    } catch (err) {
      console.warn("Using local fallback prescription:", err);
      setPrescription((prev) => ({
        ...prev,
        track,
        day_number: day,
      }));
    } finally {
      setIsLoadingPrescription(false);
    }
  };

  // Synchronize Task Completion State from local storage on track/day change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTasks = localStorage.getItem(taskStorageKey);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        setTaskState(parsed);
      } catch (e) {
        setTaskState({
          specialMission: false,
          routineTasks: {},
          nutritionAdherence: false,
          mindMovement: false,
        });
      }
    } else {
      setTaskState({
        specialMission: false,
        routineTasks: {},
        nutritionAdherence: false,
        mindMovement: false,
      });
    }

    const savedDayComplete = localStorage.getItem(`nivaran_day_done_${currentTrack}_${currentDayNumber}`);
    setIsDayCompleted(savedDayComplete === "true");
  }, [currentTrack, currentDayNumber, taskStorageKey]);

  // ========================================================
  // 2. TASK COMPLETION: Toggling saves completed task array into daily_logs
  // ========================================================
  const updateTasks = useCallback(
    (updater: (prev: TaskState) => TaskState) => {
      setTaskState((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          localStorage.setItem(taskStorageKey, JSON.stringify(next));
        }

        // Persist completed task array into daily_logs in Supabase
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
    [taskStorageKey, profile.id, currentTrack, currentDayNumber]
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

  const totalTasks = 1 + routineTasksList.length + 1 + 1; // Special Mission + Routines + Nutrition + Mind/Movement
  const completedTasks =
    (taskState.specialMission ? 1 : 0) +
    completedRoutineCount +
    (taskState.nutritionAdherence ? 1 : 0) +
    (taskState.mindMovement ? 1 : 0);

  const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;

  // Handle Track Switching
  const handleSelectTrack = async (track: TrackType) => {
    if (track === currentTrack) return;
    setCurrentTrack(track);

    const day = allTracksProgress[track]?.currentDay || 1;
    const updated = { ...profile, active_track: track };
    setProfile(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_profile", JSON.stringify(updated));
    }

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
          const restored = restoreTaskStateFromCompletedIds(logRow.tasks_completed);
          setTaskState(restored);
          setIsDayCompleted(Boolean(logRow.completed_at));
        } else {
          setTaskState({
            specialMission: false,
            routineTasks: {},
            nutritionAdherence: false,
            mindMovement: false,
          });
          setIsDayCompleted(false);
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

    const activeProgress = allTracksProgress[currentTrack] || { currentDay: 1, streak: 0, shields: 1 };
    const newStreak = activeProgress.streak + 1;
    const newShields = newStreak % 3 === 0 ? (activeProgress.shields || 1) + 1 : (activeProgress.shields || 1);
    const nextDay = activeProgress.currentDay + 1;
    const nowIso = new Date().toISOString();

    const completedIds = getCompletedTaskIds(taskState);

    // 1. Record completed_at: NOW() in daily_logs
    // 2. Increment streak by 1 in track_progress (grant +1 shield if streak % 3 == 0)
    // 3. Set current_day = current_day + 1
    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured() && isValidUuid(profile.id)) {
      try {
        // Record completion in daily_logs
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

        // Update track_progress with incremented streak and next day
        await supabase.from("track_progress").upsert(
          {
            user_id: profile.id,
            track: currentTrack,
            current_day: nextDay,
            streak: newStreak,
            shields: newShields,
            updated_at: nowIso,
          },
          { onConflict: "user_id,track" }
        );
      } catch (e) {
        console.warn("Supabase completion sync warning:", e);
      }
    }

    // 4. Call FastAPI to generate Day current_day + 1 prescription, update local state, and refresh dashboard
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
      medical_flags: profile.medical_flags || [],
      medical_notes: profile.medical_notes || "",
      dietary_preference: profile.dietary_preference || "vegetarian",
      recent_urge_triggers: profile.recent_urge_triggers || [],
    };

    let nextPrescription: PrescriptionResponse;
    try {
      nextPrescription = await generatePrescription(nextPayload);
    } catch (genErr) {
      console.warn("Generate next day prescription fallback:", genErr);
      nextPrescription = {
        ...prescription,
        day_number: nextDay,
      };
    }

    const updatedTracksProgress = {
      ...allTracksProgress,
      [currentTrack]: {
        currentDay: nextDay,
        streak: newStreak,
        shields: newShields,
      },
    };

    setAllTracksProgress(updatedTracksProgress);
    setPrescription(nextPrescription);
    setIsDayCompleted(false);
    setAdvancingDay(false);

    // Reset daily tasks checklist for the fresh day
    const resetTasks: TaskState = {
      specialMission: false,
      routineTasks: {},
      nutritionAdherence: false,
      mindMovement: false,
    };
    setTaskState(resetTasks);

    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(updatedTracksProgress));
      localStorage.setItem("nivaran_prescription", JSON.stringify(nextPrescription));
      localStorage.setItem(`nivaran_tasks_${currentTrack}_day_${nextDay}`, JSON.stringify(resetTasks));
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
    setPrescription(newPrescription);
    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_profile", JSON.stringify(updatedProfile));
      localStorage.setItem("nivaran_prescription", JSON.stringify(newPrescription));
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
              {trackTitles[currentTrack] || "Recovery Track"} · Day {currentDayNumber}
            </span>
          </div>

          {/* Right: [🚨 SOS] emergency craving button */}
          <button
            onClick={() => setIsSOSOpen(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all flex-shrink-0"
          >
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            <span>SOS</span>
          </button>
        </header>

        {/* ======================================================== */}
        {/* B. MAIN CANVAS: 3 SIMPLE FOCUSED BLOCKS                  */}
        {/* ======================================================== */}
        <main className="space-y-6">
          {/* SECTION 1: PROGRESS */}
          <section className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-[#2D221A]">
                  Day {currentDayNumber} <span className="text-[#6E5D52] font-semibold text-lg sm:text-xl">/ 28</span>
                </span>
                <span className="text-xs text-[#6E5D52] font-medium block mt-0.5">
                  Phase {prescription.phase || 1} · {prescription.phase_name || "Acute Stabilization"}
                </span>
              </div>

              {/* Streak Counter */}
              <div className="bg-[#F0ECE7] text-[#8C6A4F] border border-[#EAE5DE] px-3.5 py-1.5 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-[#8C6A4F] text-[#8C6A4F]" />
                <span>{allTracksProgress[currentTrack]?.streak || 0} Days Streak</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-[#6E5D52] font-semibold">
                <span>Milestone Progress</span>
                <span>{Math.min(100, Math.round((currentDayNumber / 28) * 100))}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#F0ECE7] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8C6A4F] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((currentDayNumber / 28) * 100))}%` }}
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: DAILY TASKS */}
          <section className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EAE5DE] pb-3">
              <h2 className="text-lg font-bold text-[#2D221A]">Daily Tasks</h2>
              <span className="text-xs font-semibold text-[#6E5D52]">
                {completedTasks} / {totalTasks} Completed
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
                  {prescription.special_mission}
                </p>
              </div>
            </div>

            {/* Routine Checklist using SpringCheck */}
            <SpringCheck
              tasks={routineTasksList}
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

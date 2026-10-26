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
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

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
  const [taskState, setTaskState] = useState<{
    specialMission: boolean;
    routineTasks: Record<number, boolean>;
    nutritionAdherence: boolean;
    mindMovement: boolean;
  }>({
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
  const [isBiometricsEditOpen, setIsBiometricsEditOpen] = useState<boolean>(false);
  const [isRationaleOpen, setIsRationaleOpen] = useState<boolean>(false);

  // 30-Day Health Check Notification State
  const [dismissHealthCheck, setDismissHealthCheck] = useState<boolean>(false);
  const isHealthCheckDue = useMemo(() => {
    if (!profile) return false;
    const lastUpdate = profile.updated_at || profile.created_at;
    if (!lastUpdate) return false;
    const daysSince = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30;
  }, [profile]);

  // Load from localStorage or Supabase on initial render
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Profile
    const savedProfile = localStorage.getItem("nivaran_profile");
    let loadedProfile = DEFAULT_PROFILE;
    if (savedProfile) {
      try {
        loadedProfile = JSON.parse(savedProfile);
        setProfile(loadedProfile);
        if (loadedProfile.active_track) {
          setCurrentTrack(loadedProfile.active_track);
        }
      } catch (e) {
        console.error("Failed to parse profile:", e);
      }
    }

    // Load All Tracks Progress
    const savedProgress = localStorage.getItem("nivaran_all_tracks_progress");
    if (savedProgress) {
      try {
        setAllTracksProgress(JSON.parse(savedProgress));
      } catch (e) {
        console.error("Failed to parse tracks progress:", e);
      }
    } else {
      const singleTrack = localStorage.getItem("nivaran_track_progress");
      if (singleTrack) {
        try {
          const parsed = JSON.parse(singleTrack);
          setAllTracksProgress((prev) => ({
            ...prev,
            [parsed.track || "sm"]: {
              currentDay: parsed.current_day || 1,
              streak: parsed.streak || 0,
              shields: parsed.shields || 1,
            },
          }));
        } catch (e) {}
      }
    }

    // Load Prescription
    const savedPrescription = localStorage.getItem("nivaran_prescription");
    if (savedPrescription) {
      try {
        const parsed = JSON.parse(savedPrescription);
        if (parsed.track === loadedProfile.active_track) {
          setPrescription(parsed);
        } else {
          fetchTrackPrescription(loadedProfile.active_track || "sm", 1, loadedProfile);
        }
      } catch (e) {
        fetchTrackPrescription(loadedProfile.active_track || "sm", 1, loadedProfile);
      }
    } else {
      fetchTrackPrescription(loadedProfile.active_track || "sm", 1, loadedProfile);
    }
  }, []);

  // Fetch prescription for a track and day
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
      recent_urge_triggers: [],
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

  // Synchronize Task Completion State for active track & day
  const currentDayNumber = allTracksProgress[currentTrack]?.currentDay || 1;
  const taskStorageKey = `nivaran_tasks_${currentTrack}_day_${currentDayNumber}`;

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

  // Localized state updater for instant UI feedback without page lag
  const updateTasks = useCallback((updater: (prev: typeof taskState) => typeof taskState) => {
    setTaskState((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        localStorage.setItem(taskStorageKey, JSON.stringify(next));
      }
      return next;
    });
  }, [taskStorageKey]);

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

  // Alignment percentage for living mandala
  const alignmentPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handle Track Switching
  const handleSelectTrack = (track: TrackType) => {
    if (track === currentTrack) return;
    setCurrentTrack(track);
    const day = allTracksProgress[track]?.currentDay || 1;
    fetchTrackPrescription(track, day, profile);

    const updated = { ...profile, active_track: track };
    setProfile(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_profile", JSON.stringify(updated));
    }
  };

  // Complete Day Action - Subtle golden tactile pulse, NO CONFETTI
  const handleCompleteDay = async () => {
    if (!allTasksCompleted) return;

    // Trigger calm, subtle golden pulse on the Living Mandala
    setIsMandalaPulsing(true);
    setTimeout(() => {
      setIsMandalaPulsing(false);
    }, 2400);

    const activeProgress = allTracksProgress[currentTrack] || { currentDay: 1, streak: 0, shields: 1 };
    const newStreak = activeProgress.streak + 1;
    const newShields = newStreak % 3 === 0 ? activeProgress.shields + 1 : activeProgress.shields;

    const updatedTracksProgress = {
      ...allTracksProgress,
      [currentTrack]: {
        ...activeProgress,
        streak: newStreak,
        shields: newShields,
      },
    };

    setAllTracksProgress(updatedTracksProgress);
    setIsDayCompleted(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(updatedTracksProgress));
      localStorage.setItem(`nivaran_day_done_${currentTrack}_${currentDayNumber}`, "true");
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured() && profile.id) {
      try {
        await supabase.from("track_progress").upsert({
          user_id: profile.id,
          track: currentTrack,
          current_day: currentDayNumber,
          streak: newStreak,
          shields: newShields,
        });

        await supabase.from("daily_logs").upsert({
          user_id: profile.id,
          track: currentTrack,
          day_number: currentDayNumber,
          tasks_completed: taskState,
        });
      } catch (e) {
        console.warn("Supabase completion sync warning:", e);
      }
    }
  };

  // Proceed to Day X+1
  const handleProceedNextDay = async () => {
    setAdvancingDay(true);
    const activeProgress = allTracksProgress[currentTrack] || { currentDay: 1, streak: 0, shields: 1 };
    const nextDay = activeProgress.currentDay + 1;

    const updatedTracksProgress = {
      ...allTracksProgress,
      [currentTrack]: {
        ...activeProgress,
        currentDay: nextDay,
      },
    };

    setAllTracksProgress(updatedTracksProgress);
    setIsDayCompleted(false);

    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(updatedTracksProgress));
    }

    setTaskState({
      specialMission: false,
      routineTasks: {},
      nutritionAdherence: false,
      mindMovement: false,
    });

    await fetchTrackPrescription(currentTrack, nextDay, profile);
    setAdvancingDay(false);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Reset Progress
  const handleResetProgress = () => {
    const confirmReset = window.confirm(
      `Are you sure you want to reset your progress for ${currentTrack.toUpperCase()}? Streak and day will return to Day 1.`
    );
    if (!confirmReset) return;

    const updatedTracksProgress = {
      ...allTracksProgress,
      [currentTrack]: {
        currentDay: 1,
        streak: 0,
        shields: 1,
      },
    };

    setAllTracksProgress(updatedTracksProgress);
    setIsDayCompleted(false);
    setTaskState({
      specialMission: false,
      routineTasks: {},
      nutritionAdherence: false,
      mindMovement: false,
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(updatedTracksProgress));
      localStorage.removeItem(`nivaran_day_done_${currentTrack}_${currentDayNumber}`);
      localStorage.removeItem(taskStorageKey);
    }

    fetchTrackPrescription(currentTrack, 1, profile);
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
      // Force clean reload back to landing page so no stale memory remains
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
              {!isDayCompleted ? (
                <button
                  onClick={handleCompleteDay}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#8C6A4F] hover:bg-[#73543B] transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Complete Day</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Day {currentDayNumber} Completed! Streak Fortified 🔥</span>
                  </div>
                  <button
                    onClick={handleProceedNextDay}
                    disabled={advancingDay}
                    className="w-full py-3 px-4 rounded-xl bg-[#8C6A4F] hover:bg-[#73543B] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    {advancingDay ? (
                      <span>Loading Next Day...</span>
                    ) : (
                      <>
                        <span>Proceed to Day {currentDayNumber + 1}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
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
                    {prescription.diet_protocol?.calorie_target || 2200} kcal
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
                    Low Impact
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

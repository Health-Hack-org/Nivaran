"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Cigarette,
  Gamepad2,
  UtensilsCrossed,
  Brain,
  ShieldAlert,
  Flame,
  Droplets,
  Activity,
  HeartPulse,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Compass,
  Lock,
  User,
  LogIn,
  UserPlus,
} from "lucide-react";
import { TrackType, Gender, ActivityLevel, UserProfile, TrackProgress, BiometricInput } from "@/types";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  sanitizeProfileForDb,
  sanitizeTrackProgressForDb,
  isValidUuid,
} from "@/lib/supabase/client";
import {
  TRACK_DIAGNOSTIC_SURVEYS,
  SURVEY_OPTIONS,
  calculateDiagnosticScore,
  DiagnosticResult,
} from "@/lib/constants/surveys";
import { generatePrescription } from "@/lib/api";
import Stepper, { Step } from "@/components/ui/Stepper";
import SpecularButton from "@/components/ui/SpecularButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navLinks = [
  { id: "about", label: "About" },
  { id: "tracks", label: "Tracks" },
  { id: "science", label: "Science" },
  { id: "safety", label: "Safety" },
];

export default function ExplorePage() {
  const router = useRouter();

  // Active navigation anchor
  const [activeSection, setActiveSection] = useState("about");

  // Onboarding Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1); // 1: Track, 2: Biometrics, 3: Survey, 4: Report Card
  const [selectedTrack, setSelectedTrack] = useState<TrackType>("sm");

  // Diagnostic Survey state (for Step 3 & Step 4)
  const [surveyQuestionIndex, setSurveyQuestionIndex] = useState(0); // 0..9
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, number>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Biometrics state (for Step 2)
  const [bioUsername, setBioUsername] = useState("Seeker");
  const [bioAge, setBioAge] = useState(25);
  const [bioGender, setBioGender] = useState<Gender>("male");
  const [bioHeightCm, setBioHeightCm] = useState(175);
  const [bioWeightKg, setBioWeightKg] = useState(70);
  const [bioActivityLevel, setBioActivityLevel] = useState<ActivityLevel>("light");
  const [bioDiet, setBioDiet] = useState("vegetarian");
  const [bioMedicalFlags, setBioMedicalFlags] = useState<string[]>([]);
  const [isSubmittingBio, setIsSubmittingBio] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check if user is logged in & has existing profile
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  // Conditional dashboard button: only true if authenticated user has active row in track_progress
  const [hasActiveTrackProgress, setHasActiveTrackProgress] = useState(false);

  // Helper: profile fresh check (updated within past 30 days)
  const isProfileFresh = (prof: UserProfile | null): boolean => {
    if (!prof || !prof.height_cm) return false;
    if (!prof.updated_at) return false;
    const diffDays = (Date.now() - new Date(prof.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  };

  useEffect(() => {
    async function checkCurrentSession() {
      if (typeof window === "undefined") return;

      const supabase = getSupabaseBrowserClient();
      if (supabase && isSupabaseConfigured()) {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUser(data.user);

          // Check if active recovery track exists in track_progress
          try {
            const { data: trk } = await supabase
              .from("track_progress")
              .select("id")
              .eq("user_id", data.user.id)
              .limit(1);

            if (trk && trk.length > 0) {
              setHasActiveTrackProgress(true);
            } else {
              setHasActiveTrackProgress(false);
            }
          } catch {
            setHasActiveTrackProgress(false);
          }

          // Check profile row
          try {
            const { data: prof } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .maybeSingle();

            if (prof && prof.height_cm) {
              setHasExistingProfile(true);
              setUserProfile(prof);
              setBioUsername(prof.username || data.user.user_metadata?.username || "Seeker");
              setBioAge(prof.age || 25);
              setBioGender(prof.gender || "male");
              setBioHeightCm(prof.height_cm || 175);
              setBioWeightKg(prof.weight_kg || 70);
              setBioActivityLevel(prof.activity_level || "light");
              setBioDiet(prof.dietary_preference || "vegetarian");
              setBioMedicalFlags(prof.medical_flags || []);
              localStorage.setItem("nivaran_profile", JSON.stringify(prof));
            }
          } catch {}
          return;
        }
      }

      // Local mock check
      const localUser = localStorage.getItem("nivaran_auth_user");
      const localProfile = localStorage.getItem("nivaran_profile");
      if (localUser) {
        try {
          setCurrentUser(JSON.parse(localUser));
        } catch {
          // ignore
        }
      }
      if (localProfile) {
        try {
          const parsed = JSON.parse(localProfile);
          if (parsed && parsed.height_cm) {
            setHasExistingProfile(true);
            setUserProfile(parsed);
            setBioUsername(parsed.username || "Seeker");
            setBioAge(parsed.age || 25);
            setBioGender(parsed.gender || "male");
            setBioHeightCm(parsed.height_cm || 175);
            setBioWeightKg(parsed.weight_kg || 70);
            setBioActivityLevel(parsed.activity_level || "light");
            setBioDiet(parsed.dietary_preference || "vegetarian");
            setBioMedicalFlags(parsed.medical_flags || []);
          }
        } catch {
          // ignore
        }
      }
    }

    checkCurrentSession();
  }, []);

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["about", "tracks", "science", "safety"];
      const scrollPos = window.scrollY + 140;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Open modal with track
  const handleOpenModal = (trackId?: TrackType) => {
    // If not authenticated, route to /auth signup first
    if (!currentUser) {
      router.push(`/auth?tab=signup${trackId ? `&track=${trackId}` : ""}`);
      return;
    }
    if (trackId) setSelectedTrack(trackId);
    setAuthError("");
    setSurveyQuestionIndex(0);
    setSurveyAnswers({});
    setDiagnosticResult(null);
    setModalStep(1);
    setIsModalOpen(true);
  };

  // Step 1: Track Selected -> Proceed to Next Step
  const handleContinueFromTrack = () => {
    setAuthError("");
    if (isProfileFresh(userProfile)) {
      // Step 2 is auto-skipped if profile is fresh (<= 30 days) -> proceed to Step 3
      setSurveyQuestionIndex(0);
      setSurveyAnswers({});
      setModalStep(3);
    } else {
      // Profile missing or > 30 days -> Show Biometrics (Step 2)
      setModalStep(2);
    }
  };

  // Step 2: Biometrics Submission
  const handleBiometricsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBio(true);
    setAuthError("");

    try {
      const supabase = getSupabaseBrowserClient();
      let activeUser = currentUser;

      if (supabase && isSupabaseConfigured()) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            activeUser = userData.user;
            setCurrentUser(userData.user);
          }
        } catch { }
      }

      const userId = activeUser?.id || userProfile?.id || "user-" + Date.now();
      const sanitizedUsername =
        (bioUsername || "").trim() ||
        userProfile?.username ||
        activeUser?.user_metadata?.username ||
        activeUser?.email?.split("@")[0] ||
        "Seeker";

      const profileData: UserProfile = {
        id: userId,
        username: sanitizedUsername,
        gender: bioGender,
        age: Number(bioAge),
        height_cm: Number(bioHeightCm),
        weight_kg: Number(bioWeightKg),
        activity_level: bioActivityLevel,
        active_track: selectedTrack,
        selected_tracks: [selectedTrack],
        medical_flags: bioMedicalFlags,
        medical_notes: "",
        dietary_preference: bioDiet,
        updated_at: new Date().toISOString(),
        created_at: userProfile?.created_at || new Date().toISOString(),
      };

      if (supabase && isSupabaseConfigured() && activeUser?.id && isValidUuid(activeUser.id)) {
        try {
          const dbProfile = sanitizeProfileForDb(profileData);
          await supabase.from("profiles").upsert(dbProfile);
        } catch (dbErr) {
          console.warn("Supabase profile upsert warning:", dbErr);
        }
      }

      localStorage.setItem("nivaran_profile", JSON.stringify(profileData));
      setUserProfile(profileData);
      setHasExistingProfile(true);

      // Successfully saved physical profile -> advance to Step 3: Diagnostic Survey!
      setSurveyQuestionIndex(0);
      setSurveyAnswers({});
      setModalStep(3);
    } catch (err: any) {
      setAuthError(err.message || "Failed to save biometrics.");
    } finally {
      setIsSubmittingBio(false);
    }
  };

  // Step 3: Diagnostic Survey Option Click
  const handleSelectSurveyOption = (score: number) => {
    const survey = TRACK_DIAGNOSTIC_SURVEYS[selectedTrack] || TRACK_DIAGNOSTIC_SURVEYS.sm;
    const currentQuestion = survey.questions[surveyQuestionIndex];
    if (!currentQuestion) return;

    const nextAnswers = { ...surveyAnswers, [currentQuestion.id]: score };
    setSurveyAnswers(nextAnswers);

    if (surveyQuestionIndex < survey.questions.length - 1) {
      setSurveyQuestionIndex((prev) => prev + 1);
    } else {
      // 10th question answered! Compute score & advance to Step 4: Diagnostic Report Card
      const result = calculateDiagnosticScore(selectedTrack, nextAnswers);
      setDiagnosticResult(result);
      setModalStep(4);
    }
  };

  // Step 4: Generate AI Recovery Plan & Enter Dashboard
  const handleGenerateAIPlan = async () => {
    if (!diagnosticResult) return;
    setIsGeneratingPlan(true);
    setAuthError("");

    try {
      const supabase = getSupabaseBrowserClient();
      let activeUser = currentUser;

      if (supabase && isSupabaseConfigured()) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) activeUser = userData.user;
        } catch { }
      }

      const userId = activeUser?.id || userProfile?.id || "user-" + Date.now();
      const profile: UserProfile = userProfile || {
        id: userId,
        username: bioUsername || "Seeker",
        age: bioAge,
        gender: bioGender,
        height_cm: bioHeightCm,
        weight_kg: bioWeightKg,
        activity_level: bioActivityLevel,
        active_track: selectedTrack,
        dietary_preference: bioDiet,
        medical_flags: bioMedicalFlags,
        medical_notes: "",
      };

      const progressData: TrackProgress = {
        id: "tp-" + Date.now(),
        user_id: userId,
        track: selectedTrack,
        current_day: 1,
        streak: 0,
        shields: 1,
        severity_score: diagnosticResult.severityScore,
        severity_level: diagnosticResult.severityLevel,
        target_days: diagnosticResult.targetDays,
        survey_responses: diagnosticResult.surveyResponses,
        updated_at: new Date().toISOString(),
      };

      // 1. Upsert profile and track_progress into Supabase
      if (supabase && isSupabaseConfigured() && activeUser?.id && isValidUuid(activeUser.id)) {
        try {
          await supabase.from("profiles").upsert(
            sanitizeProfileForDb({
              ...profile,
              active_track: selectedTrack,
              updated_at: new Date().toISOString(),
            })
          );

          const dbTrack = sanitizeTrackProgressForDb({
            user_id: activeUser.id,
            track: selectedTrack,
            current_day: 1,
            streak: 0,
            shields: 1,
            severity_score: diagnosticResult.severityScore,
            severity_level: diagnosticResult.severityLevel,
            target_days: diagnosticResult.targetDays,
            survey_responses: diagnosticResult.surveyResponses,
          });

          await supabase.from("track_progress").upsert(dbTrack, {
            onConflict: "user_id,track",
          });
        } catch (dbErr) {
          console.warn("Supabase upsert warning:", dbErr);
        }
      }

      // 2. Persist in local storage
      localStorage.setItem("nivaran_track_progress", JSON.stringify(progressData));
      localStorage.setItem(
        "nivaran_profile",
        JSON.stringify({
          ...profile,
          active_track: selectedTrack,
          updated_at: new Date().toISOString(),
        })
      );

      // Ensure all_tracks_progress has user's selected track with target_days immediately
      try {
        let currentAllProgress: Record<string, any> = {
          sm: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
          sa: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
          gm: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
          jf: { currentDay: 1, streak: 0, shields: 1, targetDays: 28 },
        };
        const rawAll = localStorage.getItem("nivaran_all_tracks_progress");
        if (rawAll) {
          const parsedAll = JSON.parse(rawAll);
          currentAllProgress = { ...currentAllProgress, ...parsedAll };
        }
        currentAllProgress[selectedTrack] = {
          currentDay: 1,
          streak: 0,
          shields: 1,
          targetDays: diagnosticResult.targetDays,
          severityScore: diagnosticResult.severityScore,
          severityLevel: diagnosticResult.severityLevel,
          surveyResponses: diagnosticResult.surveyResponses,
        };
        localStorage.setItem("nivaran_all_tracks_progress", JSON.stringify(currentAllProgress));
      } catch (storageErr) {
        console.warn("Failed saving all_tracks_progress:", storageErr);
      }

      // 3. Make POST request to FastAPI to generate Day 1 prescription with diagnostic baseline
      const prescriptionPayload: BiometricInput = {
        user_id: userId,
        username: profile.username || "Seeker",
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        activity_level: profile.activity_level,
        track: selectedTrack,
        day_number: 1,
        medical_flags: profile.medical_flags || [],
        medical_notes: profile.medical_notes || "",
        dietary_preference: profile.dietary_preference || "vegetarian",
        target_days: diagnosticResult.targetDays,
        severity_score: diagnosticResult.severityScore,
        severity_level: diagnosticResult.severityLevel,
        survey_responses: diagnosticResult.surveyResponses,
      };

      try {
        const rx = await generatePrescription(prescriptionPayload);
        if (rx) {
          localStorage.setItem("nivaran_prescription", JSON.stringify(rx));
          localStorage.setItem(`nivaran_prescription_${selectedTrack}`, JSON.stringify(rx));
          localStorage.setItem(`nivaran_rx_${userId}_${selectedTrack}_day_1`, JSON.stringify(rx));
          localStorage.setItem(`nivaran_rx_${selectedTrack}_day_1`, JSON.stringify(rx));
          localStorage.setItem(`nivaran_rx_${selectedTrack}_1`, JSON.stringify(rx));
        }
      } catch (apiErr) {
        console.warn("Prescription fallback:", apiErr);
      }

      // Extra safety: save to daily_prescriptions directly if user is authenticated
      if (supabase && isSupabaseConfigured() && activeUser?.id && isValidUuid(activeUser.id)) {
        try {
          const rxRaw = localStorage.getItem("nivaran_prescription");
          if (rxRaw) {
            const parsedRx = JSON.parse(rxRaw);
            await supabase.from("daily_prescriptions").upsert({
              user_id: activeUser.id,
              track: selectedTrack,
              day_number: 1,
              phase: parsedRx.phase || 1,
              special_mission: parsedRx.special_mission,
              routine_tasks: parsedRx.routine_tasks || [],
              diet_protocol: parsedRx.diet_protocol,
              exercise_protocol: parsedRx.exercise_protocol,
              mental_protocol: parsedRx.mental_protocol,
              why_this_works: parsedRx.why_this_works,
            }, { onConflict: "user_id,track,day_number" });
          }
        } catch (dbRxErr) {
          console.warn("Supabase direct rx upsert:", dbRxErr);
        }
      }

      // 4. Route to dashboard
      setHasActiveTrackProgress(true);
      setIsModalOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Failed to generate AI recovery plan.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const tracks = [
    {
      id: "sm" as TrackType,
      title: "Mobile & Screen",
      icon: Smartphone,
      accent: "#8C6A4F",
      headline: "Digital minimalism and morning dopamine blackout.",
      points: [
        "Eliminate compulsive notification checking",
        "Restore sustained attention span",
        "Deep sleep & circadian alignment",
      ],
    },
    {
      id: "sa" as TrackType,
      title: "Smoking & Alcohol",
      icon: Flame,
      accent: "#962D2D",
      headline: "Pulmonary detox and neurochemical balance.",
      points: [
        "Physiological sigh craving deflection",
        "Cellular antioxidant recovery",
        "Autonomic nervous system stabilization",
      ],
    },
    {
      id: "gm" as TrackType,
      title: "Compulsive Gaming",
      icon: Gamepad2,
      accent: "#73543B",
      headline: "Over-stimulation reset and posture recovery.",
      points: [
        "Reset hyper-stimulated reward pathways",
        "Spine decompression and Zone 2 walking",
        "Executive deep-work rebuilding",
      ],
    },
    {
      id: "jf" as TrackType,
      title: "Junk Food",
      icon: UtensilsCrossed,
      accent: "#B45309",
      headline: "Blood glucose stabilization and clean nourishment.",
      points: [
        "Flatten reactive hypoglycemia dips",
        "High-satiety clean plant nutrition",
        "Dopaminergic tastebud reset",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#2D221A] font-sans selection:bg-[#8C6A4F]/20 selection:text-[#8C6A4F] pt-20 sm:pt-24 pb-16 relative isolate overflow-x-hidden">
      {/* Background Ambient Mandala (Locked in background layer, zero overlap with cards or text) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <svg
          className="explore-corner-mandala"
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <g transform="translate(300 300)" fill="none" stroke="#5C3D24" strokeWidth="1.8">
            <defs>
              <path
                id="exploreCornerPetal"
                d="M0,-240 C40,-180 40,-90 0,-30 C-40,-90 -40,-180 0,-240 Z"
                fill="none"
              />
            </defs>
            <g fill="none">
              {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map((deg) => (
                <use
                  key={deg}
                  href="#exploreCornerPetal"
                  transform={deg === 0 ? undefined : `rotate(${deg})`}
                />
              ))}
            </g>
            <circle r="190" stroke="#5C3D24" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
            <circle r="150" stroke="#5C3D24" strokeWidth="1.8" fill="none" />
            <circle r="110" stroke="#5C3D24" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
            <circle r="75" stroke="#5C3D24" strokeWidth="1.8" fill="none" />
            <circle r="40" stroke="#5C3D24" strokeWidth="1.2" fill="none" />
            <circle r="12" fill="#5C3D24" />
          </g>
        </svg>
      </div>
      {/* ======================================================== */}
      {/* STICKY MINIMAL HEADER                                    */}
      {/* ======================================================== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full transition-all"
        style={{
          background: "rgba(248, 247, 244, 0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid #EAE5DE",
          boxShadow: "0 2px 10px rgba(45, 34, 26, 0.03)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand title */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0 text-decoration-none">
            <span className="font-bold text-xl text-[#2D221A] tracking-tight group-hover:text-[#8C6A4F] transition-colors">
              NIVARAN
            </span>
          </Link>

          {/* Center Links: About, Tracks, Science, Safety */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${isActive
                      ? "text-[#2D221A] font-semibold bg-[#F0ECE7]"
                      : "text-[#6E5D52] hover:text-[#2D221A] hover:bg-[#F0ECE7]/60"
                    }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Buttons: [ThemeToggle] & [Dashboard] & [Get Started] */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />

            {hasActiveTrackProgress && (
              <Link
                href="/dashboard"
                className="bg-[#F0ECE7] hover:bg-[#EAE5DE] text-[#2D221A] text-sm font-semibold px-4 py-2 rounded-xl border border-[#EAE5DE] transition-colors inline-flex items-center gap-1.5 h-10"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2D221A]" />
              </Link>
            )}

            <SpecularButton
              size="md"
              radius={12}
              tint="#8C6A4F"
              baseColor="#73543B"
              lineColor="#FFFFFF"
              textColor="#FFFFFF"
              intensity={1.25}
              idleIntensity={0.4}
              shineSize={14}
              shineFade={36}
              thickness={1.4}
              glow={1}
              followMouse={true}
              proximity={250}
              onClick={() => handleOpenModal()}
              className="h-10 px-5 text-sm font-semibold active:scale-95 cursor-pointer inline-flex items-center gap-2 transition-transform"
            >
              <Sparkles className="w-4 h-4 text-white shrink-0" />
              <span>Get Started with Your Recovery</span>
            </SpecularButton>
          </div>
        </div>

        {/* Mobile horizontal quick jump bar */}
        <div className="md:hidden flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar border-t border-[#EAE5DE]">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeSection === link.id
                  ? "bg-[#8C6A4F] text-white"
                  : "bg-white text-[#6E5D52] border border-[#EAE5DE]"
                }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </header>

      {/* ======================================================== */}
      {/* MINIMAL MAIN CONTENT (SHORT & DIRECT COPY)               */}
      {/* ======================================================== */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col gap-10">
        {/* 1. HERO */}
        <section id="hero" className="relative z-10 bg-white rounded-2xl p-8 sm:p-12 border border-[#EAE5DE] shadow-xs space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0ECE7] text-xs font-bold text-[#8C6A4F]">
            <Activity className="w-3.5 h-3.5" />
            <span>Clinical Wellness Foundation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2D221A] tracking-tight leading-tight">
            Mind-Growth & Recovery Sanctuary
          </h1>
          <p className="text-[#6E5D52] text-base sm:text-lg leading-relaxed max-w-3xl">
            A clinical approach to breaking compulsive habits through metabolic stability.
          </p>
        </section>

        {/* 2. ABOUT */}
        <section id="about" className="relative z-10 space-y-4 scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C6A4F]">
            <span className="w-2 h-2 rounded-full bg-[#8C6A4F]" />
            About NIVARAN
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EAE5DE] shadow-xs space-y-4">
            <p className="text-base sm:text-lg text-[#2D221A] leading-relaxed">
              NIVARAN is an open-access clinical wellness sanctuary engineered by <strong>THE HEXA-GRAMS</strong>.
              We replace vague willpower platitudes with deterministic biometric calculations to stabilize the body so the mind can heal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F0ECE7]/50 border border-[#EAE5DE] space-y-1">
                <span className="font-bold text-sm text-[#2D221A] flex items-center gap-1.5">
                  <span>🎯</span> The Willpower Fallacy
                </span>
                <p className="text-xs text-[#6E5D52] leading-relaxed">
                  95% of cold-turkey cessation attempts fail because glucose drops and sympathetic stress overload the prefrontal cortex. We stabilize the body first.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F0ECE7]/50 border border-[#EAE5DE] space-y-1">
                <span className="font-bold text-sm text-[#2D221A] flex items-center gap-1.5">
                  <span>📈</span> 4-Phase Roadmap
                </span>
                <p className="text-xs text-[#6E5D52] leading-relaxed">
                  Progress through Acute Stabilization (Days 1–7), Dopamine Rewiring (Days 8–14), Stress Inoculation (Days 15–21), and Neuroplastic Identity (Days 22–28).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TRACKS */}
        <section id="tracks" className="relative z-10 space-y-4 scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C6A4F]">
            <span className="w-2 h-2 rounded-full bg-[#8C6A4F]" />
            Recovery Tracks
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#2D221A] tracking-tight">Choose Your Track</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tracks.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-6 border border-[#EAE5DE] shadow-xs flex flex-col justify-between hover:border-[#8C6A4F]/60 transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: t.accent }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-[#8C6A4F] px-2.5 py-0.5 rounded-full bg-[#F0ECE7]">
                        28 Days
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#2D221A]">{t.title}</h3>
                    <p className="text-xs text-[#6E5D52] leading-relaxed">
                      {t.headline}
                    </p>

                    <ul className="space-y-2 pt-2 border-t border-[#EAE5DE]">
                      {t.points.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#6E5D52]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#EAE5DE]">
                    <button
                      onClick={() => handleOpenModal(t.id)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer shadow-xs bg-[#8C6A4F] hover:bg-[#73543B] active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>Select Your Track</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. SCIENCE & SAFETY */}
        <section id="science" className="relative z-10 space-y-4 scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C6A4F]">
            <span className="w-2 h-2 rounded-full bg-[#8C6A4F]" />
            Science & Safety
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dopamine Re-Regulation */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EAE5DE] shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C6A4F] px-2.5 py-0.5 rounded-full bg-[#F0ECE7]">
                Science
              </span>
              <h3 className="text-xl font-bold text-[#2D221A]">Dopamine Re-Regulation</h3>
              <ul className="space-y-3 text-xs sm:text-sm text-[#6E5D52]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Morning digital blackouts anchor stable tonic dopamine throughout the day.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Zone 2 aerobic movement stimulates neuroplastic BDNF without cortisol exhaustion.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Glucose-stabilizing complex nutrition eliminates sudden hypoglycemic craving surges.</span>
                </li>
              </ul>
            </div>

            {/* Medical-Safe Routines */}
            <div id="safety" className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EAE5DE] shadow-xs space-y-4 scroll-mt-28">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C6A4F] px-2.5 py-0.5 rounded-full bg-[#F0ECE7]">
                Safety
              </span>
              <h3 className="text-xl font-bold text-[#2D221A]">Medical-Safe Routines</h3>
              <ul className="space-y-3 text-xs sm:text-sm text-[#6E5D52]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Strict Zone 2 cardio limits protect against cardiac strain and hypertension spikes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Zero fasting mandates prevent dangerous hypoglycemic episodes for diabetic safety.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Low-impact kinetic walking substitutes running for orthopedic and lumbar joint care.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8C6A4F] flex-shrink-0 mt-0.5" />
                  <span>Nasal-only breathing protocols humidify airways to protect against respiratory spasm.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. BOTTOM CTA */}
        <section className="relative z-10 bg-white rounded-2xl p-8 sm:p-12 border border-[#EAE5DE] shadow-xs text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[#2D221A] tracking-tight">
            Ready to Begin?
          </h2>
          <p className="max-w-md mx-auto text-sm text-[#6E5D52]">
            Start your personalized recovery journey today.
          </p>
          <div className="pt-2 flex justify-center">
            <SpecularButton
              size="lg"
              radius={12}
              tint="#8C6A4F"
              baseColor="#73543B"
              lineColor="#FFFFFF"
              textColor="#FFFFFF"
              intensity={1.25}
              idleIntensity={0.45}
              shineSize={16}
              shineFade={36}
              thickness={1.5}
              glow={1}
              followMouse={true}
              proximity={250}
              onClick={() => handleOpenModal()}
              className="px-8 py-3.5 text-base font-semibold active:scale-95 cursor-pointer inline-flex items-center gap-2 transition-transform"
            >
              <Sparkles className="w-4 h-4 text-white shrink-0" />
              <span>Get Started with Your Recovery</span>
            </SpecularButton>
          </div>
        </section>

        {/* TEAM FOOTER */}
        <footer className="relative z-10 pt-4 pb-8 border-t border-[#EAE5DE] text-center space-y-1">
          <span className="text-xs font-bold tracking-widest uppercase text-[#8C6A4F]">
            THE HEXA-GRAMS
          </span>
          <p className="text-xs text-[#6E5D52]">
            Health-Hack 2026 · Clinical Wellness Sanctuary
          </p>
        </footer>
      </main>

      {/* ======================================================== */}
      {/* MULTI-STEP ONBOARDING & TRACK SELECTION MODAL            */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dimmed Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div
            className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E8EEE7] shadow-[0_4px_16px_rgba(53,41,31,0.08)] z-50 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EEE7]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#668575]">
                  NIVARAN Clinical Protocol Setup
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#35291F]">
                  Personalized Sanctuary Onboarding
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold">
                {authError}
              </div>
            )}

            {/* REACT BITS STEPPER INTEGRATION */}
            <div className="pt-2">
              <Stepper
                step={modalStep}
                onStepChange={(newStep) => {
                  if (newStep < modalStep) {
                    if (newStep === 2 && isProfileFresh(userProfile)) {
                      setModalStep(1);
                    } else {
                      setModalStep(newStep as 1 | 2 | 3 | 4);
                    }
                  }
                }}
                linear={false}
                theme="light"
                accentColor="#8C6A4F"
                frame={false}
                showFooter={false}
                width="100%"
                transition="slide"
              >
                {/* STEP 1: FOCUS TRACK */}
                <Step title="Recovery Track" description="Choose focus">
                  <div className="py-2 space-y-4">
                    <p className="text-xs text-[#35291F]/80">
                      Select the primary recovery track you wish to begin today. You will complete a 10-point clinical assessment to personalize your timeline:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tracks.map((t) => {
                        const Icon = t.icon;
                        const isSelected = selectedTrack === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTrack(t.id)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${isSelected
                                ? "border-[#8C6A4F] bg-[#8C6A4F]/10 shadow-xs"
                                : "border-[#E8EEE7] bg-white hover:border-[#8C6A4F]/40"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                style={{ backgroundColor: t.accent }}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-[#8C6A4F]" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#35291F]">{t.title}</div>
                              <p className="text-[11px] text-[#35291F]/80 line-clamp-2 mt-0.5">
                                {t.headline}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-[#E8EEE7] flex items-center justify-end">
                      <button
                        onClick={handleContinueFromTrack}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#8C6A4F] hover:bg-[#73543B] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        <span>Continue to Clinical Assessment</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Step>

                {/* STEP 2: 1-TIME BIOMETRICS CHECK (Auto-skipped if profile is fresh <= 30 days) */}
                <Step title="Physical Profile" description="Biometrics check">
                  <form onSubmit={handleBiometricsSubmit} className="py-2 space-y-4">
                    <p className="text-xs text-[#35291F]/80">
                      Used exclusively to calibrate your deterministic BMR, TDEE, and safe Zone 2 heart rate targets:
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Age (Years)
                        </label>
                        <input
                          type="number"
                          min={14}
                          max={99}
                          value={bioAge}
                          onChange={(e) => setBioAge(Number(e.target.value))}
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#8C6A4F] focus:ring-1 focus:ring-[#8C6A4F] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Biological Sex
                        </label>
                        <select
                          value={bioGender}
                          onChange={(e) => setBioGender(e.target.value as Gender)}
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#8C6A4F] focus:ring-1 focus:ring-[#8C6A4F] outline-none bg-white"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Height (cm)
                        </label>
                        <input
                          type="number"
                          min={100}
                          max={240}
                          value={bioHeightCm}
                          onChange={(e) => setBioHeightCm(Number(e.target.value))}
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#8C6A4F] focus:ring-1 focus:ring-[#8C6A4F] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          min={35}
                          max={250}
                          value={bioWeightKg}
                          onChange={(e) => setBioWeightKg(Number(e.target.value))}
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#8C6A4F] focus:ring-1 focus:ring-[#8C6A4F] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Activity Baseline
                        </label>
                        <select
                          value={bioActivityLevel}
                          onChange={(e) => setBioActivityLevel(e.target.value as ActivityLevel)}
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#8C6A4F] focus:ring-1 focus:ring-[#8C6A4F] outline-none bg-white"
                        >
                          <option value="sedentary">Sedentary (Desk work)</option>
                          <option value="light">Light (1-2 walks/wk)</option>
                          <option value="moderate">Moderate (3-5 workouts/wk)</option>
                          <option value="active">Active (Physical work)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Dietary Preference
                        </label>
                        <select
                          value={bioDiet}
                          onChange={(e) => setBioDiet(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#8C6A4F] focus:ring-1 focus:ring-[#8C6A4F] outline-none bg-white"
                        >
                          <option value="vegetarian">Vegetarian</option>
                          <option value="vegan">Vegan</option>
                          <option value="non-vegetarian">Non-Vegetarian</option>
                          <option value="keto-friendly">Keto-Friendly</option>
                        </select>
                      </div>
                    </div>

                    {/* Medical Flags */}
                    <div>
                      <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                        Medical Flags (For Automatic Clinical Guardrails)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "hypertension", label: "Hypertension" },
                          { id: "type2_diabetes", label: "Type 2 Diabetes" },
                          { id: "asthma", label: "Asthma" },
                          { id: "joint_pain", label: "Joint / Knee Pain" },
                          { id: "chronic_fatigue", label: "Chronic Fatigue" },
                        ].map((flag) => {
                          const isChecked = bioMedicalFlags.includes(flag.id);
                          return (
                            <button
                              type="button"
                              key={flag.id}
                              onClick={() => {
                                setBioMedicalFlags((prev) =>
                                  prev.includes(flag.id)
                                    ? prev.filter((f) => f !== flag.id)
                                    : [...prev, flag.id]
                                );
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${isChecked
                                  ? "bg-[#E8EEE7] border-[#8C6A4F] text-[#35291F] font-bold shadow-xs"
                                  : "bg-white border-[#E8EEE7] text-[#35291F]/70 hover:border-[#8C6A4F]/50"
                                }`}
                            >
                              {isChecked ? "✓ " : "+ "}
                              {flag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E8EEE7] flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setModalStep(1)}
                        className="px-4 py-2.5 rounded-xl border border-[#E8EEE7] text-[#35291F] text-xs font-semibold hover:bg-[#E8EEE7]/40 transition-colors cursor-pointer"
                      >
                        ← Back to Track
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmittingBio}
                        className="flex-1 sm:flex-initial py-2.5 px-6 rounded-xl bg-[#8C6A4F] hover:bg-[#73543B] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        {isSubmittingBio ? (
                          <span>Saving Profile...</span>
                        ) : (
                          <>
                            <span>Proceed to Clinical Assessment</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </Step>

                {/* STEP 3: 10-QUESTION DIAGNOSTIC SURVEY */}
                <Step
                  title="Clinical Survey"
                  description={`Question ${surveyQuestionIndex + 1} of 10`}
                >
                  {(() => {
                    const activeSurvey =
                      TRACK_DIAGNOSTIC_SURVEYS[selectedTrack] || TRACK_DIAGNOSTIC_SURVEYS.sm;
                    const currentQ = activeSurvey.questions[surveyQuestionIndex];

                    return (
                      <div className="py-2 space-y-4">
                        {/* Stepper Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#6E5D52]">
                            <span className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-[#8C6A4F]/10 text-[#8C6A4F] text-[10px] uppercase font-bold tracking-wider">
                                {currentQ?.dimension || "Assessment"}
                              </span>
                              <span>{activeSurvey.title}</span>
                            </span>
                            <span className="text-[#8C6A4F] font-bold">
                              Question {surveyQuestionIndex + 1} of {activeSurvey.questions.length}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#EAE5DE] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#8C6A4F] transition-all duration-300"
                              style={{
                                width: `${((surveyQuestionIndex + 1) / activeSurvey.questions.length) * 100
                                  }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Question Box */}
                        <div className="p-4 rounded-2xl bg-[#F8F7F4] dark:bg-[#1E1915] border border-[#EAE5DE] dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold text-[#8C6A4F] dark:text-[#E2BA91] uppercase tracking-wider block">
                            Trigger Dimension: {currentQ?.triggerCategory}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-[#2D221A] dark:text-white leading-snug">
                            {currentQ?.question}
                          </h4>
                        </div>

                        {/* 4 Standard Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {SURVEY_OPTIONS.map((opt) => {
                            const isChosen = surveyAnswers[currentQ?.id] === opt.score;
                            return (
                              <button
                                key={opt.score}
                                type="button"
                                onClick={() => handleSelectSurveyOption(opt.score)}
                                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 select-none active:scale-[0.99] ${isChosen
                                    ? "border-[#8C6A4F] bg-[#8C6A4F]/10 shadow-xs ring-1 ring-[#8C6A4F]"
                                    : "border-[#EAE5DE] dark:border-white/10 bg-white dark:bg-[#26201B] hover:border-[#8C6A4F]/50 hover:bg-[#FAF8F5] dark:hover:bg-[#302720]"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-[#2D221A] dark:text-white">
                                    {opt.label}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isChosen
                                        ? "bg-[#8C6A4F] text-white"
                                        : "bg-[#F0ECE7] dark:bg-[#1A1512] text-[#6E5D52] dark:text-[#DDD4CA]"
                                      }`}
                                  >
                                    {opt.score} {opt.score === 1 ? "pt" : "pts"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#6E5D52] dark:text-[#DDD4CA] leading-tight">
                                  {opt.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {/* Stepper Navigation */}
                        <div className="pt-3 border-t border-[#EAE5DE] flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (surveyQuestionIndex > 0) {
                                setSurveyQuestionIndex((prev) => prev - 1);
                              } else {
                                if (isProfileFresh(userProfile)) {
                                  setModalStep(1);
                                } else {
                                  setModalStep(2);
                                }
                              }
                            }}
                            className="px-4 py-2 rounded-xl border border-[#EAE5DE] text-[#2D221A] text-xs font-semibold hover:bg-[#F0ECE7]/50 transition-colors cursor-pointer"
                          >
                            {surveyQuestionIndex > 0 ? "← Previous Question" : "← Back"}
                          </button>

                          {surveyAnswers[currentQ?.id] !== undefined && (
                            <button
                              type="button"
                              onClick={() => {
                                if (surveyQuestionIndex < activeSurvey.questions.length - 1) {
                                  setSurveyQuestionIndex((prev) => prev + 1);
                                } else {
                                  const res = calculateDiagnosticScore(
                                    selectedTrack,
                                    surveyAnswers
                                  );
                                  setDiagnosticResult(res);
                                  setModalStep(4);
                                }
                              }}
                              className="px-5 py-2 rounded-xl bg-[#8C6A4F] hover:bg-[#73543B] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <span>
                                {surveyQuestionIndex === activeSurvey.questions.length - 1
                                  ? "View Diagnostic Report"
                                  : "Next Question"}
                              </span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </Step>

                {/* STEP 4: DIAGNOSTIC REPORT CARD & PROTOCOL SYNTHESIS */}
                <Step title="Diagnostic Report" description="Protocol synthesis">
                  {diagnosticResult ? (
                    <div className="py-2 space-y-4">
                      {/* Report Hero Card */}
                      <div className="p-5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E1915] border border-[#EAE5DE] dark:border-white/10 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#EAE5DE] dark:border-white/10 pb-3">
                          <div>
                            <span className="text-[10px] font-bold text-[#8C6A4F] dark:text-[#E2BA91] uppercase tracking-wider block">
                              Assessment Complete · {tracks.find((t) => t.id === selectedTrack)?.title}
                            </span>
                            <h4 className="text-base sm:text-lg font-bold text-[#2D221A] dark:text-white">
                              Clinical Diagnostic Summary
                            </h4>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${diagnosticResult.severityLevel === "minor"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                                : diagnosticResult.severityLevel === "severe"
                                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                              }`}
                          >
                            {diagnosticResult.classificationTitle}
                          </span>
                        </div>

                        {/* Severity Gauge & Protocol Duration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-4 rounded-xl bg-white dark:bg-[#26201B] border border-[#EAE5DE] dark:border-white/10 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#8C6A4F]/10 dark:bg-[#8C6A4F]/20 border border-[#8C6A4F]/20 dark:border-[#8C6A4F]/40 flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-lg font-black text-[#8C6A4F] dark:text-[#E2BA91]">
                                {diagnosticResult.severityScore}
                              </span>
                              <span className="text-[9px] font-semibold text-[#6E5D52] dark:text-[#DDD4CA]">/ 10.0</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#2D221A] dark:text-white block">
                                Normalized Severity
                              </span>
                              <p className="text-[11px] text-[#6E5D52] dark:text-[#DDD4CA] leading-tight mt-0.5">
                                Calculated across 10 behavioral dimensions (Raw Score: {diagnosticResult.rawScore}/30)
                              </p>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-[#26201B] border border-[#EAE5DE] dark:border-white/10 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#2D221A] dark:bg-[#1A1512] border dark:border-white/10 text-white flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-xl font-black text-[#F8F7F4]">
                                {diagnosticResult.targetDays}
                              </span>
                              <span className="text-[9px] font-bold text-[#F8F7F4]/70">DAYS</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#2D221A] dark:text-white block">
                                {diagnosticResult.timelineName}
                              </span>
                              <p className="text-[11px] text-[#6E5D52] dark:text-[#DDD4CA] leading-tight mt-0.5">
                                Scientifically calibrated duration to rewire neural craving loops and restore dopamine.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Top Vulnerability / Trigger Areas */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-[#2D221A] dark:text-white block uppercase tracking-wider">
                            High-Friction Diagnostic Weak Spots ({diagnosticResult.topTriggers.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {diagnosticResult.topTriggers.map((trig, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-white dark:bg-[#26201B] border border-[#EAE5DE] dark:border-white/10 text-left space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-[#8C6A4F] dark:text-[#E2BA91] uppercase">
                                    {trig.dimension}
                                  </span>
                                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/40">
                                    {trig.score}/3 pts
                                  </span>
                                </div>
                                <p className="text-[11px] font-semibold text-[#2D221A] dark:text-[#FAF6F0] line-clamp-2">
                                  {trig.triggerCategory}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSurveyQuestionIndex(9);
                            setModalStep(3);
                          }}
                          className="px-4 py-2.5 rounded-xl border border-[#EAE5DE] dark:border-white/15 text-[#2D221A] dark:text-white text-xs font-semibold hover:bg-[#F0ECE7]/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          ← Review Survey
                        </button>

                        <button
                          type="button"
                          onClick={handleGenerateAIPlan}
                          disabled={isGeneratingPlan}
                          className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-[#8C6A4F] hover:bg-[#73543B] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95"
                        >
                          {isGeneratingPlan ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Synthesizing {diagnosticResult.targetDays}-Day Clinical Plan...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-200" />
                              <span>Generate My AI Recovery Plan →</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-[#6E5D52]">
                      Please complete the 10-question assessment first.
                    </div>
                  )}
                </Step>
              </Stepper>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

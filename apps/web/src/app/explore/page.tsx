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
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { generatePrescription } from "@/lib/api";
import Stepper, { Step } from "@/components/ui/Stepper";
import SpecularButton from "@/components/ui/SpecularButton";

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
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1); // 1: Track, 2: Auth, 3: Biometrics
  const [selectedTrack, setSelectedTrack] = useState<TrackType>("sm");

  // Auth sub-tab (for Step 2)
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Biometrics state (for Step 3)
  const [bioUsername, setBioUsername] = useState("Seeker");
  const [bioAge, setBioAge] = useState(25);
  const [bioGender, setBioGender] = useState<Gender>("male");
  const [bioHeightCm, setBioHeightCm] = useState(175);
  const [bioWeightKg, setBioWeightKg] = useState(70);
  const [bioActivityLevel, setBioActivityLevel] = useState<ActivityLevel>("light");
  const [bioDiet, setBioDiet] = useState("vegetarian");
  const [bioMedicalFlags, setBioMedicalFlags] = useState<string[]>([]);
  const [isSubmittingBio, setIsSubmittingBio] = useState(false);

  // Check if user is logged in & has existing profile
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  useEffect(() => {
    async function checkCurrentSession() {
      if (typeof window === "undefined") return;

      const supabase = getSupabaseBrowserClient();
      if (supabase && isSupabaseConfigured()) {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUser(data.user);
          // Check profile row
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (prof && prof.height_cm) {
            setHasExistingProfile(true);
            localStorage.setItem("nivaran_profile", JSON.stringify(prof));
          }
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
    if (trackId) setSelectedTrack(trackId);
    setAuthError("");
    setModalStep(1);
    setIsModalOpen(true);
  };

  // Step 1: Track Selected -> Proceed to Auth Check
  const handleContinueFromTrack = () => {
    if (currentUser) {
      if (hasExistingProfile) {
        // User is logged in and has completed profile -> Route immediately to dashboard with new track!
        handleAssociateTrackAndRedirect(selectedTrack);
      } else {
        // Logged in but needs biometrics
        setModalStep(3);
      }
    } else {
      // Need login / signup
      setModalStep(2);
    }
  };

  // Associate track for existing profile & go to dashboard
  const handleAssociateTrackAndRedirect = async (track: TrackType) => {
    setIsAuthLoading(true);
    try {
      const stored = localStorage.getItem("nivaran_profile");
      let profile: UserProfile | null = stored ? JSON.parse(stored) : null;
      const userId = currentUser?.id || profile?.id || "user-" + Date.now();

      if (profile) {
        profile.active_track = track;
        const currentTracks = profile.selected_tracks || [];
        if (!currentTracks.includes(track)) {
          profile.selected_tracks = [...currentTracks, track];
        }
        profile.updated_at = new Date().toISOString();
        localStorage.setItem("nivaran_profile", JSON.stringify(profile));
      }

      const initialProgress: TrackProgress = {
        id: "tp-" + Date.now(),
        user_id: userId,
        track,
        current_day: 1,
        streak: 0,
        shields: 1,
      };
      localStorage.setItem("nivaran_track_progress", JSON.stringify(initialProgress));

      const supabase = getSupabaseBrowserClient();
      if (supabase && isSupabaseConfigured() && profile) {
        await supabase.from("profiles").upsert(profile);
        await supabase.from("track_progress").upsert(initialProgress, { onConflict: "user_id,track" });
      }

      // Generate initial prescription
      if (profile) {
        const payload: BiometricInput = {
          user_id: userId,
          username: profile.username,
          age: profile.age,
          gender: profile.gender,
          height_cm: profile.height_cm,
          weight_kg: profile.weight_kg,
          activity_level: profile.activity_level,
          track,
          day_number: 1,
          medical_flags: profile.medical_flags,
          medical_notes: profile.medical_notes,
          dietary_preference: profile.dietary_preference,
        };
        try {
          const rx = await generatePrescription(payload);
          localStorage.setItem("nivaran_prescription", JSON.stringify(rx));
        } catch {
          // fallback gracefully
        }
      }

      setIsModalOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Failed to initialize track.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Step 2 Auth: Sign in or Sign up
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError("");

    try {
      const supabase = getSupabaseBrowserClient();

      if (supabase && isSupabaseConfigured()) {
        if (authTab === "login") {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });
          if (error) throw error;
          if (data.user) {
            setCurrentUser(data.user);
            const { data: prof } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .single();

            if (prof && prof.height_cm) {
              setHasExistingProfile(true);
              localStorage.setItem("nivaran_profile", JSON.stringify(prof));
              await handleAssociateTrackAndRedirect(selectedTrack);
              return;
            }
          }
        } else {
          // Sign Up
          const { data, error } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
              data: { username: authUsername || "Seeker" },
            },
          });
          if (error) throw error;
          if (data.user) {
            setCurrentUser(data.user);
            setBioUsername(authUsername || "Seeker");
          }
        }
      } else {
        // Local mode
        const mockUser = {
          id: "local-user-" + Date.now(),
          email: authEmail || "seeker@nivaran.app",
        };
        localStorage.setItem("nivaran_auth_user", JSON.stringify(mockUser));
        setCurrentUser(mockUser);

        const existingProf = localStorage.getItem("nivaran_profile");
        if (existingProf) {
          const parsed = JSON.parse(existingProf);
          if (parsed && parsed.height_cm) {
            setHasExistingProfile(true);
            await handleAssociateTrackAndRedirect(selectedTrack);
            return;
          }
        }
      }

      // Proceed to Step 3: Biometrics
      setModalStep(3);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Guest Continue
  const handleGuestContinue = async () => {
    const guestUser = {
      id: "guest-" + Date.now(),
      email: "guest@nivaran.app",
      isGuest: true,
    };
    localStorage.setItem("nivaran_auth_user", JSON.stringify(guestUser));
    setCurrentUser(guestUser);

    const existingProf = localStorage.getItem("nivaran_profile");
    if (existingProf) {
      try {
        const parsed = JSON.parse(existingProf);
        if (parsed?.height_cm) {
          setHasExistingProfile(true);
          await handleAssociateTrackAndRedirect(selectedTrack);
          return;
        }
      } catch {
        // ignore
      }
    }
    setModalStep(3);
  };

  // Step 3: Biometrics Submission
  const handleBiometricsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBio(true);
    setAuthError("");

    try {
      const userId = currentUser?.id || "user-" + Date.now();
      const profileData: UserProfile = {
        id: userId,
        username: bioUsername || "Seeker",
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
        created_at: new Date().toISOString(),
      };

      const initialProgress: TrackProgress = {
        id: "tp-" + Date.now(),
        user_id: userId,
        track: selectedTrack,
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

      const payload: BiometricInput = {
        user_id: userId,
        username: bioUsername,
        age: bioAge,
        gender: bioGender,
        height_cm: bioHeightCm,
        weight_kg: bioWeightKg,
        activity_level: bioActivityLevel,
        track: selectedTrack,
        day_number: 1,
        medical_flags: bioMedicalFlags,
        dietary_preference: bioDiet,
      };

      try {
        const rx = await generatePrescription(payload);
        localStorage.setItem("nivaran_prescription", JSON.stringify(rx));
      } catch (apiErr) {
        console.warn("Prescription fallback:", apiErr);
      }

      setIsModalOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Failed to save profile.");
    } finally {
      setIsSubmittingBio(false);
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
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "text-[#2D221A] font-semibold bg-[#F0ECE7]"
                      : "text-[#6E5D52] hover:text-[#2D221A] hover:bg-[#F0ECE7]/60"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Buttons: [Dashboard] & [Get Started] */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard"
              className="bg-[#F0ECE7] hover:bg-[#EAE5DE] text-[#2D221A] text-sm font-semibold px-4 py-2 rounded-xl border border-[#EAE5DE] transition-colors inline-flex items-center gap-1.5 h-10"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#2D221A]" />
            </Link>

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
              <span>Get Started</span>
            </SpecularButton>
          </div>
        </div>

        {/* Mobile horizontal quick jump bar */}
        <div className="md:hidden flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar border-t border-[#EAE5DE]">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeSection === link.id
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
                      <span>Select Track</span>
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
            Start your personalized 28-day recovery journey today.
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
              <span>Choose Your Recovery Plan</span>
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
            style={{ backgroundColor: "#FFFFFF" }}
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
                    setModalStep(newStep as 1 | 2 | 3);
                  } else if (newStep === 2 && selectedTrack) {
                    setModalStep(2);
                  } else if (newStep === 3 && currentUser) {
                    setModalStep(3);
                  }
                }}
                linear={true}
                theme="light"
                accentColor="#668575"
                frame={false}
                showFooter={false}
                width="100%"
                transition="slide"
              >
                {/* STEP 1: FOCUS TRACK */}
                <Step title="Recovery Track" description="Choose focus">
                  <div className="py-2 space-y-4">
                    <p className="text-xs text-[#35291F]/80">
                      Select the primary recovery track you wish to begin today. You can add more tracks later in your Sanctuary:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tracks.map((t) => {
                        const Icon = t.icon;
                        const isSelected = selectedTrack === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTrack(t.id)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                              isSelected
                                ? "border-[#668575] bg-[#E8EEE7]/40 shadow-xs"
                                : "border-[#E8EEE7] bg-white hover:border-[#668575]/40"
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
                                <CheckCircle2 className="w-4 h-4 text-[#668575]" />
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
                        disabled={isAuthLoading}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#668575] hover:bg-[#526c5f] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        <span>{hasExistingProfile ? "Activate Track & Enter Sanctuary" : "Continue to Authentication"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Step>

                {/* STEP 2: AUTHENTICATION CHECK */}
                <Step title="Identity & Auth" description="Sign in or guest">
                  <div className="py-2 space-y-4">
                    {/* Tabs */}
                    <div className="flex items-center border-b border-[#E8EEE7]">
                      <button
                        type="button"
                        onClick={() => setAuthTab("login")}
                        className={`flex-1 py-2 text-xs font-bold transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                          authTab === "login"
                            ? "border-[#668575] text-[#668575]"
                            : "border-transparent text-[#35291F]/60 hover:text-[#35291F]"
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthTab("signup")}
                        className={`flex-1 py-2 text-xs font-bold transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                          authTab === "signup"
                            ? "border-[#668575] text-[#668575]"
                            : "border-transparent text-[#35291F]/60 hover:text-[#35291F]"
                        }`}
                      >
                        Create Account
                      </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-3 pt-1">
                      {authTab === "signup" && (
                        <div>
                          <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                            Your Seeker Name
                          </label>
                          <input
                            type="text"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            placeholder="e.g. Maya"
                            required
                            className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="seeker@nivaran.app"
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E8EEE7]">
                        <button
                          type="button"
                          onClick={() => setModalStep(1)}
                          className="px-4 py-2.5 rounded-xl border border-[#E8EEE7] text-[#35291F] text-xs font-semibold hover:bg-[#E8EEE7]/40 transition-colors cursor-pointer"
                        >
                          ← Back to Track
                        </button>

                        <button
                          type="submit"
                          disabled={isAuthLoading}
                          className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#668575] hover:bg-[#526c5f] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                        >
                          {isAuthLoading ? (
                            <span>Authenticating...</span>
                          ) : (
                            <>
                              {authTab === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                              <span>{authTab === "login" ? "Sign In & Continue" : "Create Account & Continue"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Guest fallback option */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={handleGuestContinue}
                        className="text-xs text-[#668575] hover:underline font-semibold cursor-pointer"
                      >
                        Or continue as Guest Seeker →
                      </button>
                    </div>
                  </div>
                </Step>

                {/* STEP 3: SMART BIOMETRIC PROFILING */}
                <Step title="Biometrics & Medical" description="Physical profile">
                  <form onSubmit={handleBiometricsSubmit} className="py-2 space-y-4">
                    <p className="text-xs text-[#35291F]/80">
                      Used exclusively to calculate your deterministic BMR, TDEE, and safe Zone 2 heart rate:
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
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#35291F] block mb-1">
                          Biological Sex
                        </label>
                        <select
                          value={bioGender}
                          onChange={(e) => setBioGender(e.target.value as Gender)}
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none bg-white"
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
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none"
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
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none"
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
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none bg-white"
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
                          className="w-full p-2.5 rounded-xl border border-[#E8EEE7] text-xs text-[#35291F] focus:border-[#668575] focus:ring-1 focus:ring-[#668575] outline-none bg-white"
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
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-[#E8EEE7] border-[#668575] text-[#35291F] font-bold shadow-xs"
                                  : "bg-white border-[#E8EEE7] text-[#35291F]/70 hover:border-[#668575]/50"
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
                        onClick={() => setModalStep(2)}
                        className="px-4 py-2.5 rounded-xl border border-[#E8EEE7] text-[#35291F] text-xs font-semibold hover:bg-[#E8EEE7]/40 transition-colors cursor-pointer"
                      >
                        ← Back to Auth
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmittingBio}
                        className="flex-1 sm:flex-initial py-2.5 px-6 rounded-xl bg-[#668575] hover:bg-[#526c5f] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        {isSubmittingBio ? (
                          <span>Synthesizing Clinical Protocol...</span>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-[#E8EEE7]" />
                            <span>Enter NIVARAN Sanctuary</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </Step>
              </Stepper>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

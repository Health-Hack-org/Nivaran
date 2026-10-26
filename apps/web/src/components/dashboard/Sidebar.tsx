"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Smartphone,
  Flame,
  Gamepad2,
  UtensilsCrossed,
  Settings,
  LogOut,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { UserProfile, TrackType, PrescriptionResponse, BiometricInput } from "@/types";
import { generatePrescription } from "@/lib/api";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface SidebarProps {
  profile: UserProfile;
  currentTrack: TrackType;
  onSelectTrack: (track: TrackType) => void;
  allTracksProgress: Record<TrackType, { currentDay: number; streak: number; shields?: number }>;
  prescription?: PrescriptionResponse;
  onOpenEditBiometrics?: () => void;
  onResetProgress?: () => void;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updatedProfile: UserProfile, newPrescription: PrescriptionResponse) => void;
}

export function Sidebar({
  profile,
  currentTrack,
  onSelectTrack,
  allTracksProgress,
  prescription,
  onSignOut,
  isOpen,
  onClose,
  onProfileUpdated,
}: SidebarProps) {
  // Track meta
  const trackInfo: Record<
    TrackType,
    { title: string; subtitle: string; icon: React.ElementType }
  > = {
    sm: {
      title: "Mobile & Screen Detox",
      subtitle: "Digital minimalism & dopamine reset",
      icon: Smartphone,
    },
    sa: {
      title: "Smoking & Alcohol Recovery",
      subtitle: "Pulmonary detox & stability",
      icon: Flame,
    },
    gm: {
      title: "Compulsive Gaming Reset",
      subtitle: "Over-stimulation reset",
      icon: Gamepad2,
    },
    jf: {
      title: "Junk Food & Sugar Freedom",
      subtitle: "Glucose stability & gut calm",
      icon: UtensilsCrossed,
    },
  };

  // State: Default vs Edit Profile View
  const [isEditing, setIsEditing] = useState(false);
  const [height, setHeight] = useState(profile.height_cm || 175);
  const [weight, setWeight] = useState(profile.weight_kg || 70);
  const [diet, setDiet] = useState(profile.dietary_preference || "vegetarian");
  const [flags, setFlags] = useState<string[]>(profile.medical_flags || []);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if profile prop changes
  useEffect(() => {
    setHeight(profile.height_cm || 175);
    setWeight(profile.weight_kg || 70);
    setDiet(profile.dietary_preference || "vegetarian");
    setFlags(profile.medical_flags || []);
  }, [profile]);

  const activeProgramMeta = trackInfo[currentTrack] || trackInfo.sm;
  const activeProg = allTracksProgress[currentTrack] || { currentDay: 1, streak: 0, shields: 1 };
  const percentComplete = Math.min(100, Math.round((activeProg.currentDay / 28) * 100));

  const availableFlags = [
    { id: "asthma", label: "Asthma" },
    { id: "hypertension", label: "Hypertension" },
    { id: "joint_pain", label: "Joint Pain" },
    { id: "diabetes", label: "Type 2 Diabetes" },
    { id: "anxiety", label: "Anxiety" },
    { id: "insomnia", label: "Insomnia" },
  ];

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Handle Save Profile
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        height_cm: Number(height),
        weight_kg: Number(weight),
        dietary_preference: diet as any,
        medical_flags: flags,
        updated_at: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("nivaran_profile", JSON.stringify(updatedProfile));
      }

      const supabase = getSupabaseBrowserClient();
      if (supabase && isSupabaseConfigured()) {
        await supabase.from("profiles").upsert(updatedProfile);
      }

      // Re-generate prescription with new biometrics
      const payload: BiometricInput = {
        user_id: updatedProfile.id,
        username: updatedProfile.username,
        age: updatedProfile.age,
        gender: updatedProfile.gender,
        height_cm: updatedProfile.height_cm,
        weight_kg: updatedProfile.weight_kg,
        activity_level: updatedProfile.activity_level,
        track: currentTrack,
        day_number: activeProg.currentDay,
        medical_flags: updatedProfile.medical_flags,
        medical_notes: updatedProfile.medical_notes,
        dietary_preference: updatedProfile.dietary_preference,
      };

      let newRx: PrescriptionResponse;
      try {
        newRx = await generatePrescription(payload);
      } catch {
        newRx = prescription || ({} as any);
      }

      if (typeof window !== "undefined" && newRx) {
        localStorage.setItem("nivaran_prescription", JSON.stringify(newRx));
      }

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile, newRx);
      }

      setIsEditing(false);
    } catch {
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Dimmed Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-50 transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Minimal Drawer Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[320px] max-w-[85vw] flex flex-col justify-between transition-transform duration-200 ease-out bg-[#F8F7F4] border-r border-[#EAE5DE] shadow-sm ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DE]">
            <div>
              <h2 className="text-lg font-bold text-[#2D221A] leading-none">
                NIVARAN
              </h2>
              <span className="text-[10px] font-bold text-[#8C6A4F] uppercase tracking-wider mt-1 block">
                Sanctuary Drawer
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6E5D52] hover:text-[#2D221A] hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isEditing ? (
            /* ======================================================== */
            /* DEFAULT STATE: Clean & Uncluttered                      */
            /* ======================================================== */
            <div className="space-y-4">
              {/* User Name & Avatar */}
              <div className="bg-white rounded-2xl p-4 border border-[#EAE5DE] shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0ECE7] text-[#8C6A4F] font-bold text-sm flex items-center justify-center border border-[#EAE5DE] flex-shrink-0">
                  {profile.username ? profile.username.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#2D221A] truncate">
                    {profile.username || "Seeker"}
                  </div>
                  <div className="text-xs text-[#6E5D52]">
                    {profile.age}y · {profile.gender}
                  </div>
                </div>
              </div>

              {/* Active Recovery Track */}
              <div className="bg-white rounded-2xl p-4 border border-[#EAE5DE] shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6A4F] block">
                  Active Recovery Track
                </span>
                <div className="text-sm font-bold text-[#2D221A]">
                  {activeProgramMeta.title}
                </div>
                <p className="text-xs text-[#6E5D52]">
                  {activeProgramMeta.subtitle}
                </p>
              </div>

              {/* Overall Track Progress */}
              <div className="bg-white rounded-2xl p-4 border border-[#EAE5DE] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#2D221A]">
                  <span>Track Progress</span>
                  <span className="text-[#8C6A4F]">Day {activeProg.currentDay} / 28</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#F0ECE7] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#8C6A4F] transition-all duration-300"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#6E5D52] pt-1">
                  <span>🔥 {activeProg.streak} Day Streak</span>
                  <span>{percentComplete}% Complete</span>
                </div>
              </div>

              {/* [⚙ Edit Profile] Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#2D221A] bg-white hover:bg-[#F0ECE7] border border-[#EAE5DE] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <Settings className="w-3.5 h-3.5 text-[#8C6A4F]" />
                <span>Edit Profile</span>
              </button>
            </div>
          ) : (
            /* ======================================================== */
            /* EDIT STATE: Input Fields                                 */
            /* ======================================================== */
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-[#2D221A]">Profile & Biometrics</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-[#6E5D52] hover:text-[#2D221A] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6E5D52] block">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={100}
                  max={250}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#EAE5DE] bg-white text-xs font-semibold text-[#2D221A] outline-none focus:border-[#8C6A4F]"
                />
              </div>

              {/* Weight */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6E5D52] block">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  min={30}
                  max={250}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#EAE5DE] bg-white text-xs font-semibold text-[#2D221A] outline-none focus:border-[#8C6A4F]"
                />
              </div>

              {/* Dietary Preference */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6E5D52] block">
                  Dietary Preference
                </label>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE5DE] bg-white text-xs font-semibold text-[#2D221A] outline-none focus:border-[#8C6A4F]"
                >
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non_vegetarian">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="eggetarian">Eggetarian</option>
                </select>
              </div>

              {/* Medical Flags */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#6E5D52] block">
                  Medical Flags
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableFlags.map((flag) => {
                    const isSelected = flags.includes(flag.id);
                    return (
                      <button
                        key={flag.id}
                        type="button"
                        onClick={() => toggleFlag(flag.id)}
                        className={`p-2 rounded-xl text-[11px] font-semibold text-left border transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-[#F0ECE7] border-[#8C6A4F] text-[#2D221A]"
                            : "bg-white border-[#EAE5DE] text-[#6E5D52] hover:border-[#8C6A4F]/40"
                        }`}
                      >
                        <span className="truncate">{flag.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#8C6A4F] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Changes Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#8C6A4F] hover:bg-[#73543B] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer: Sign Out Button at Bottom */}
        <div className="p-4 border-t border-[#EAE5DE] bg-white">
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-700" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Flame,
  Droplets,
  HeartPulse,
  Brain,
  Headphones,
  Footprints,
} from "lucide-react";
import { DietProtocol, ExerciseProtocol, MentalProtocol } from "@/types";

interface RecoveryBoostCardProps {
  diet: DietProtocol;
  exercise: ExerciseProtocol;
  mental: MentalProtocol;
}

export function RecoveryBoostCard({
  diet,
  exercise,
  mental,
}: RecoveryBoostCardProps) {
  const [isRationaleOpen, setIsRationaleOpen] = useState(false);

  // Foods to be mindful of (reference tags)
  const mindfulFoods = [
    "Highly processed foods",
    "Excess added sugars",
    "Refined carbs",
    "Fried foods",
    "Energy drinks",
    "Excessive caffeine (after 2 PM)",
  ];

  // Primary workout URL
  const primaryVideoUrl =
    exercise.routines && exercise.routines.length > 0
      ? exercise.routines[0].url
      : "https://www.youtube.com/watch?v=enYITYwvPAQ";

  // Primary audio URL
  const primaryAudioUrl =
    mental.music_url || mental.meditation_url || "https://www.youtube.com/watch?v=1ZYbU82GVz4";

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ======================================================== */}
      {/* CARD 1: DAILY NUTRITION BLUEPRINT                        */}
      {/* ======================================================== */}
      <div
        className="rounded-2xl p-5 sm:p-6 transition-shadow duration-200"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(42, 21, 3, 0.08)",
          boxShadow: "0 4px 14px rgba(42, 21, 3, 0.04)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#2A1503]/8 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {/* Leaf icon inside soft light-green circle */}
            <div className="w-9 h-9 rounded-full bg-[#EBF7EE] text-[#2A7B4C] flex items-center justify-center flex-shrink-0 text-base shadow-2xs">
              🌿
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#66350F]/70 block">
                PRECISION FUEL
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#2A1503]">
                Daily Nutrition Blueprint
              </h3>
            </div>
          </div>

          {/* Right Badges: 🔥 2255 kcal and 💧 2.4L Water */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#FAF0E6] text-[#A0522D] border border-[#DEB887]/50 text-xs font-bold flex items-center gap-1 shadow-2xs">
              <span>🔥</span>
              <span>{diet.calorie_target || 2255} kcal</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-xs font-bold flex items-center gap-1 shadow-2xs">
              <span>💧</span>
              <span>{diet.hydration_liters || 2.4}L Water</span>
            </span>
          </div>
        </div>

        {/* Meal Rows (Clean, rounded card items with chevron > on the right) */}
        <div className="space-y-2.5 my-4">
          {/* 🥣 Breakfast */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F0] border border-[#2A1503]/6 hover:border-[#66350F]/20 transition-all gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-base flex-shrink-0 mt-0.5">🥣</span>
              <div className="text-xs leading-relaxed text-[#2A1503]">
                <strong className="text-[#66350F] mr-1.5 font-bold">Breakfast:</strong>
                <span className="font-medium text-[#2A1503]/90">
                  {diet.breakfast ||
                    "Oatmeal with water or unsweetened plant milk, berries, chia seeds, and almonds."}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#66350F]/40 flex-shrink-0" />
          </div>

          {/* 🍛 Lunch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F0] border border-[#2A1503]/6 hover:border-[#66350F]/20 transition-all gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-base flex-shrink-0 mt-0.5">🍛</span>
              <div className="text-xs leading-relaxed text-[#2A1503]">
                <strong className="text-[#66350F] mr-1.5 font-bold">Lunch:</strong>
                <span className="font-medium text-[#2A1503]/90">
                  {diet.lunch ||
                    "Hearty lentil soup (dal) with mixed vegetables, brown rice, and side salad with lemon-herb dressing."}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#66350F]/40 flex-shrink-0" />
          </div>

          {/* 🍲 Dinner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F0] border border-[#2A1503]/6 hover:border-[#66350F]/20 transition-all gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-base flex-shrink-0 mt-0.5">🍲</span>
              <div className="text-xs leading-relaxed text-[#2A1503]">
                <strong className="text-[#66350F] mr-1.5 font-bold">Dinner:</strong>
                <span className="font-medium text-[#2A1503]/90">
                  {diet.dinner ||
                    "Paneer (or firm tofu) bhurji with onions, tomatoes, bell peppers, served with 2 whole-wheat rotis and steamed green beans."}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#66350F]/40 flex-shrink-0" />
          </div>
        </div>

        {/* Foods to be mindful of Box */}
        <div className="p-3.5 rounded-xl bg-[#FFF8F8] border border-rose-200/70 space-y-2 mt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
            <AlertCircle className="w-3.5 h-3.5 text-rose-700 flex-shrink-0" />
            <span>Foods to be mindful of</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mindfulFoods.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-white/90 text-rose-900 border border-rose-200/80 text-[11px] font-medium shadow-2xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Expandable: Why this fuel mix stabilizes dopamine */}
        <div className="mt-3.5 pt-3 border-t border-[#2A1503]/8">
          <button
            onClick={() => setIsRationaleOpen(!isRationaleOpen)}
            className="text-xs font-semibold text-[#66350F] hover:text-[#4a260a] flex items-center justify-between w-full transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>Why this fuel mix stabilizes dopamine</span>
            </span>
            {isRationaleOpen ? (
              <ChevronUp className="w-4 h-4 text-[#66350F]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#66350F]" />
            )}
          </button>
          {isRationaleOpen && (
            <p className="mt-2 text-xs text-[#2A1503]/80 leading-relaxed bg-[#FAF8F0] p-3 rounded-xl border border-[#2A1503]/6">
              {diet.clinical_rationale ||
                "Prevents reactive hypoglycemia dips that trigger acute dopamine-seeking craving loops. Complex carbohydrates and stable plant proteins ensure continuous neurotransmitter replenishment."}
            </p>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 2: MOVEMENT & NEURO-RESET                            */}
      {/* ======================================================== */}
      <div
        className="rounded-2xl p-5 sm:p-6 transition-shadow duration-200"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(42, 21, 3, 0.08)",
          boxShadow: "0 4px 14px rgba(42, 21, 3, 0.04)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#2A1503]/8 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {/* Heart/Vitals icon inside soft blue circle */}
            <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <HeartPulse className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#66350F]/70 block">
                NEURO-PHYSICAL PROTOCOL
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#2A1503]">
                Movement & Neuro-Reset
              </h3>
            </div>
          </div>

          {/* Right Badges: ⏱️ 45 mins and 🟢 Moderate */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#FAF8F0] text-[#66350F] border border-[#66350F]/15 text-xs font-bold shadow-2xs">
              ⏱️ {exercise.duration_mins ? `${exercise.duration_mins + (mental.duration_mins || 10)} mins` : "45 mins"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-bold shadow-2xs">
              🟢 Moderate
            </span>
          </div>
        </div>

        {/* Content Row: Physical Movement Workout */}
        <div className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-start gap-3 min-w-0">
              {/* Runner icon inside light-sand circle */}
              <div className="w-10 h-10 rounded-full bg-[#FAF0E6] text-[#66350F] flex items-center justify-center flex-shrink-0 text-lg shadow-2xs mt-0.5">
                🏃
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-[#2A1503]">
                  30-Minute Brisk Indoor Walking Workout
                </h4>
                <p className="text-xs text-[#2A1503]/75 leading-relaxed">
                  Moderate intensity physical activity to elevate mood, reduce stress hormones, and support dopamine regulation without overstimulation.
                </p>
              </div>
            </div>

            {/* Action Button: [▶ Guided Video ↗] in dark espresso */}
            <a
              href={primaryVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90 active:scale-95 flex-shrink-0"
              style={{
                backgroundColor: "#2A1503",
              }}
            >
              <span>▶ Guided Video</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#F5F5DC]/80" />
            </a>
          </div>

          {/* Secondary Neuro-Reset & Focus Soundscape Row */}
          <div className="mt-3 pt-3 border-t border-[#2A1503]/6 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 text-base shadow-2xs mt-0.5">
                🎧
              </div>
              <div className="space-y-0.5 min-w-0">
                <h5 className="text-xs font-bold text-[#2A1503]">
                  {mental.music_type || "Binaural Dopamine Restoration (432Hz)"} (15 mins)
                </h5>
                <p className="text-[11px] text-[#2A1503]/70 leading-relaxed">
                  Non-visual box-breathing and dopamine stabilization soundscape.
                </p>
              </div>
            </div>

            <a
              href={primaryAudioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-[#66350F] bg-[#FAF8F0] hover:bg-[#F5EFE6] border border-[#66350F]/20 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
            >
              <span>🎧 Focus Audio</span>
              <ExternalLink className="w-3 h-3 text-[#66350F]/70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecoveryBoostCard;

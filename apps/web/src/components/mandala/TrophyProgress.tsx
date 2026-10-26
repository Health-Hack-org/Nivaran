"use client";

import React, { useMemo } from "react";
import { Award, Flame, Sparkles } from "lucide-react";

interface TrophyProgressProps {
  currentDay: number;
  streak: number;
}

interface TierInfo {
  name: "Bronze" | "Silver" | "Gold" | "Platinum";
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  trophyColor: string;
  targetDay: number;
  prevTargetDay: number;
  title: string;
}

export function TrophyProgress({ currentDay = 1, streak = 0 }: TrophyProgressProps) {
  const tier: TierInfo = useMemo(() => {
    if (currentDay < 8) {
      return {
        name: "Bronze",
        badgeColor: "#8C4A15",
        badgeBg: "rgba(205, 127, 50, 0.15)",
        badgeBorder: "rgba(205, 127, 50, 0.4)",
        trophyColor: "#B86221",
        targetDay: 7,
        prevTargetDay: 0,
        title: "Acute Neurochemical Reset",
      };
    } else if (currentDay < 15) {
      return {
        name: "Silver",
        badgeColor: "#4B5563",
        badgeBg: "rgba(107, 114, 128, 0.15)",
        badgeBorder: "rgba(156, 163, 175, 0.4)",
        trophyColor: "#717D8A",
        targetDay: 14,
        prevTargetDay: 7,
        title: "Dopamine Receptor Upregulation",
      };
    } else if (currentDay < 22) {
      return {
        name: "Gold",
        badgeColor: "#9A6B08",
        badgeBg: "rgba(212, 175, 55, 0.18)",
        badgeBorder: "rgba(212, 175, 55, 0.45)",
        trophyColor: "#C99710",
        targetDay: 21,
        prevTargetDay: 14,
        title: "Habit Synaptic Fortification",
      };
    } else {
      return {
        name: "Platinum",
        badgeColor: "#155E75",
        badgeBg: "rgba(14, 165, 233, 0.15)",
        badgeBorder: "rgba(56, 189, 248, 0.45)",
        trophyColor: "#0284C7",
        targetDay: 28,
        prevTargetDay: 21,
        title: "Sovereign Mastery Protocol",
      };
    }
  }, [currentDay]);

  // Ring calculation
  const daysInTier = tier.targetDay - tier.prevTargetDay;
  const progressInTier = Math.min(Math.max(currentDay - tier.prevTargetDay, 0), daysInTier);
  const percentInTier = Math.min(100, Math.round((progressInTier / daysInTier) * 100));
  const daysRemaining = Math.max(0, tier.targetDay - currentDay);

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentInTier / 100) * circumference;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-shadow duration-200 flex flex-col justify-between"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(42, 21, 3, 0.08)",
        boxShadow: "0 4px 14px rgba(42, 21, 3, 0.04)",
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-widest uppercase text-[#66350F]/80 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-[#66350F]" />
          Clinical Rank Telemetry
        </span>
        <div
          className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1"
          style={{
            color: tier.badgeColor,
            backgroundColor: tier.badgeBg,
            borderColor: tier.badgeBorder,
          }}
        >
          <Sparkles className="w-3 h-3" />
          {tier.name}
        </div>
      </div>

      {/* Main Visual: SVG Ring + Animated Trophy */}
      <div className="flex items-center gap-5 my-1">
        <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 110 110">
            {/* Background Track Ring */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke="#E8D8C4"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={tier.trophyColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </svg>

          {/* Trophy Graphic in Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <svg
              className="w-12 h-12 transition-transform duration-300 hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
            >
              {/* Cup body */}
              <path
                d="M6 3H18V10C18 13.3137 15.3137 16 12 16C8.68629 16 6 13.3137 6 10V3Z"
                fill={tier.trophyColor}
                opacity="0.9"
              />
              {/* Cup rim */}
              <path d="M5 3H19V5H5V3Z" fill="#2A1503" opacity="0.3" />
              {/* Left Handle */}
              <path
                d="M6 5H4C2.89543 5 2 5.89543 2 7V8C2 9.65685 3.34315 11 5 11H6V9H5C4.44772 9 4 8.55228 4 8V7C4 6.44772 4.44772 6 5 6H6V5Z"
                fill={tier.trophyColor}
              />
              {/* Right Handle */}
              <path
                d="M18 5H20C21.1046 5 22 5.89543 22 7V8C22 9.65685 20.6569 11 19 11H18V9H19C19.5523 9 20 8.55228 20 8V7C20 6.44772 19.5523 6 19 6H18V5Z"
                fill={tier.trophyColor}
              />
              {/* Trophy Stem */}
              <path d="M11 16H13V19H11V16Z" fill={tier.trophyColor} />
              {/* Trophy Base */}
              <path
                d="M8 19H16L17 21H7L8 19Z"
                fill="#2A1503"
                opacity="0.8"
              />
              {/* Center Star Emblem */}
              <circle cx="12" cy="9.5" r="2.2" fill="#FFF8EE" />
            </svg>
            <span className="text-[10px] font-black text-[#2A1503]/80 -mt-0.5">
              {percentInTier}%
            </span>
          </div>
        </div>

        {/* Details Right Column */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#66350F] truncate">
            {tier.title}
          </div>
          <div className="text-2xl font-black text-[#2A1503] tracking-tight mt-0.5">
            {tier.name} Tier
          </div>

          <div className="mt-2 text-xs text-[#2A1503]/75 leading-relaxed">
            {daysRemaining > 0 ? (
              <span>
                <strong className="text-[#66350F] font-bold">{daysRemaining} days</strong> until{" "}
                {tier.name === "Bronze"
                  ? "Silver"
                  : tier.name === "Silver"
                  ? "Gold"
                  : tier.name === "Gold"
                  ? "Platinum"
                  : "Final Mastery"}
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                ✓ Milestone Secured! Ready to advance.
              </span>
            )}
          </div>

          <div className="w-full bg-[#E8D8C4]/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${percentInTier}%`,
                backgroundColor: tier.trophyColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Milestone Hint */}
      <div className="mt-3 pt-2.5 border-t border-[#66350F]/10 flex items-center justify-between text-[11px] text-[#2A1503]/70">
        <span>Target: Day {tier.targetDay} Milestone</span>
        <span className="font-semibold text-[#66350F] flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
          {streak} Day Streak
        </span>
      </div>
    </div>
  );
}

export default TrophyProgress;

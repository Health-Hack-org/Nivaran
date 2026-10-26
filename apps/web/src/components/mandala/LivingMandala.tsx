"use client";

import React, { useMemo } from "react";
import { Sparkles, Flame, Shield, Award, X } from "lucide-react";

interface LivingMandalaProps {
  specialMissionCompleted: boolean;
  routineHabitsCompleted: boolean;
  nutritionCompleted: boolean;
  mindMovementCompleted: boolean;
  alignmentPercentage: number;
  currentDay?: number;
  streak?: number;
  shields?: number;
  isPulsing?: boolean;
  onClose?: () => void;
}

export function LivingMandala({
  specialMissionCompleted,
  routineHabitsCompleted,
  nutritionCompleted,
  mindMovementCompleted,
  alignmentPercentage,
  currentDay = 1,
  streak = 0,
  shields = 1,
  isPulsing = false,
  onClose,
}: LivingMandalaProps) {
  // 4 Recovery Pillars
  const rings = [
    {
      id: "ring1",
      name: "Special Mission",
      r: 28,
      completed: specialMissionCompleted,
      color: "#66350F",
    },
    {
      id: "ring2",
      name: "Routine Habits",
      r: 44,
      completed: routineHabitsCompleted,
      color: "#8C4A15",
    },
    {
      id: "ring3",
      name: "Nutrition",
      r: 60,
      completed: nutritionCompleted,
      color: "#2A7B4C",
    },
    {
      id: "ring4",
      name: "Mind & Movement",
      r: 76,
      completed: mindMovementCompleted,
      color: "#D4AF37",
    },
  ];

  // Milestone Tier computation
  const tier = useMemo(() => {
    if (currentDay < 8) {
      return { name: "Bronze Tier", icon: "🥉", daysLeft: Math.max(0, 7 - currentDay) };
    } else if (currentDay < 15) {
      return { name: "Silver Tier", icon: "🥈", daysLeft: Math.max(0, 14 - currentDay) };
    } else if (currentDay < 22) {
      return { name: "Gold Tier", icon: "🥇", daysLeft: Math.max(0, 21 - currentDay) };
    } else {
      return { name: "Platinum Tier", icon: "💎", daysLeft: Math.max(0, 28 - currentDay) };
    }
  }, [currentDay]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between transition-all duration-300"
      style={{
        backgroundColor: "#FFFFFF",
        border: isPulsing
          ? "1.5px solid #D4AF37"
          : "1px solid rgba(42, 21, 3, 0.08)",
        boxShadow: isPulsing
          ? "0 0 24px rgba(212, 175, 55, 0.25), 0 4px 14px rgba(42, 21, 3, 0.04)"
          : "0 4px 14px rgba(42, 21, 3, 0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-widest uppercase text-[#66350F] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          Living Bullseye Mandala
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#66350F]/70">
            Day {currentDay} of 28
          </span>
          <div
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "rgba(102, 53, 15, 0.08)",
              color: "#66350F",
            }}
          >
            {alignmentPercentage}% Aligned
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#2A1503]/60 hover:text-[#2A1503] hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Close Mandala Popover"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center SVG Bullseye Mandala + Clean Bullet Legend */}
      <div className="flex items-center gap-5 my-2">
        {/* Bullseye SVG Mandala */}
        <div
          className={`relative w-36 h-36 flex-shrink-0 flex items-center justify-center transition-transform duration-500 ${
            isPulsing ? "scale-105" : "scale-100"
          }`}
        >
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 180 180">
            <defs>
              <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Subtle background guide circles - unbroken continuous circles */}
            <circle cx="90" cy="90" r="82" stroke="#E8D8C4" strokeWidth="1" fill="none" opacity="0.45" />
            <circle cx="90" cy="90" r="20" stroke="#E8D8C4" strokeWidth="1" fill="none" opacity="0.45" />

            {/* 4 Concentric Pillar Rings */}
            {rings.map((ring) => {
              const circ = 2 * Math.PI * ring.r;
              const offset = ring.completed ? 0 : circ;

              return (
                <g key={ring.id}>
                  {/* Inactive Track - Solid smooth continuous circular track */}
                  <circle
                    cx="90"
                    cy="90"
                    r={ring.r}
                    stroke="#E8D8C4"
                    strokeWidth="5"
                    fill="none"
                    opacity="0.6"
                  />
                  {/* Active Highlight Ring */}
                  <circle
                    cx="90"
                    cy="90"
                    r={ring.r}
                    stroke={ring.completed ? ring.color : "transparent"}
                    strokeWidth="5.5"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="none"
                    filter={ring.completed ? "url(#goldGlow)" : undefined}
                    style={{
                      transition: "stroke-dashoffset 0.6s ease-in-out, stroke 0.4s ease",
                    }}
                  />
                </g>
              );
            })}

            {/* Center Core Bindu */}
            <circle
              cx="90"
              cy="90"
              r="14"
              fill={alignmentPercentage === 100 || isPulsing ? "#D4AF37" : "#66350F"}
              className="transition-colors duration-400"
            />
            <circle cx="90" cy="90" r="8" fill="#FFF8EE" />
          </svg>

          {/* Center alignment overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-black text-[#2A1503]">
              {alignmentPercentage}%
            </span>
          </div>
        </div>

        {/* Minimalist 4 Pillars Legend */}
        <div className="flex-1 min-w-0 space-y-2">
          {rings.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 text-xs transition-colors duration-200"
            >
              {r.completed ? (
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: r.color }}
                >
                  ✓
                </span>
              ) : (
                <span
                  className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] text-transparent flex-shrink-0"
                  style={{ borderColor: "#C2B280", backgroundColor: "transparent" }}
                >
                  ○
                </span>
              )}

              <span
                className={`truncate text-xs ${
                  r.completed
                    ? "text-[#2A1503] font-semibold"
                    : "text-[#2A1503]/55 font-medium"
                }`}
              >
                {r.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clean Single-Line Telemetry Strip */}
      <div className="mt-3 pt-3 border-t border-[#2A1503]/8 flex items-center justify-between text-xs font-bold text-[#2A1503] flex-wrap gap-2">
        {/* Streak */}
        <div className="flex items-center gap-1.5 text-amber-700">
          <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
          <span>{streak} Day Streak</span>
        </div>

        <div className="hidden sm:block h-3.5 w-[1px] bg-[#2A1503]/10" />

        {/* Shields */}
        <div className="flex items-center gap-1.5 text-sky-700">
          <Shield className="w-3.5 h-3.5 fill-sky-600 text-sky-600" />
          <span>{shields} Shields</span>
        </div>

        <div className="hidden sm:block h-3.5 w-[1px] bg-[#2A1503]/10" />

        {/* Milestone Rank Tier */}
        <div className="flex items-center gap-1.5 text-[#66350F]">
          <span>{tier.icon}</span>
          <span>{tier.name} ({tier.daysLeft}d left)</span>
        </div>
      </div>
    </div>
  );
}

export default LivingMandala;

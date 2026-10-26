"use client";

import React, { useState, useRef, useEffect } from "react";
import { LivingMandala } from "@/components/mandala/LivingMandala";

interface FloatingMandalaWidgetProps {
  specialMissionCompleted: boolean;
  routineHabitsCompleted: boolean;
  nutritionCompleted: boolean;
  mindMovementCompleted: boolean;
  alignmentPercentage: number;
  currentDay: number;
  streak: number;
  shields: number;
  isPulsing?: boolean;
}

export function FloatingMandalaWidget({
  specialMissionCompleted,
  routineHabitsCompleted,
  nutritionCompleted,
  mindMovementCompleted,
  alignmentPercentage,
  currentDay,
  streak,
  shields,
  isPulsing = false,
}: FloatingMandalaWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  return (
    <div ref={widgetRef} className="relative flex-shrink-0 select-none">
      {/* 1. Compact Bullseye Target Widget Button (44px x 44px concentric rings + X% Aligned label) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Living Bullseye Mandala Popover"
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full transition-all duration-200 hover:bg-[#2A1503]/5 active:scale-95 cursor-pointer border border-[#66350F]/20 bg-[#FAF8F0] shadow-xs group"
        style={{
          boxShadow: isPulsing
            ? "0 0 16px rgba(212, 175, 55, 0.5), 0 2px 8px rgba(42, 21, 3, 0.1)"
            : "0 2px 8px rgba(42, 21, 3, 0.05)",
        }}
      >
        {/* Compact circular bullseye icon with concentric bronze/gold rings (44px x 44px) */}
        <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-[#C2B280]/60 relative shadow-xs">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 100 100">
            {/* Outer Track Ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#E8D8C4"
              strokeWidth="4"
              fill="none"
              opacity="0.8"
            />
            {/* Routine Habits Ring */}
            <circle
              cx="50"
              cy="50"
              r="34"
              stroke={routineHabitsCompleted ? "#8C4A15" : "#D4AF37"}
              strokeWidth="4"
              fill="none"
              opacity={routineHabitsCompleted ? "1" : "0.45"}
            />
            {/* Nutrition Ring */}
            <circle
              cx="50"
              cy="50"
              r="24"
              stroke={nutritionCompleted ? "#2A7B4C" : "#C2A878"}
              strokeWidth="4"
              fill="none"
              opacity={nutritionCompleted ? "1" : "0.5"}
            />
            {/* Mind & Movement Ring */}
            <circle
              cx="50"
              cy="50"
              r="14"
              stroke={mindMovementCompleted ? "#D4AF37" : "#C19A6B"}
              strokeWidth="3.5"
              fill="none"
              opacity={mindMovementCompleted ? "1" : "0.5"}
            />
            {/* Center Core Bindu */}
            <circle
              cx="50"
              cy="50"
              r="6"
              fill={alignmentPercentage === 100 || isPulsing ? "#D4AF37" : "#66350F"}
            />
          </svg>
        </div>

        {/* Text label beside: X% Aligned */}
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black tracking-tight text-[#66350F] whitespace-nowrap">
            {alignmentPercentage}% Aligned
          </span>
          <span className="text-[9px] font-semibold text-[#2A1503]/50 -mt-0.5 whitespace-nowrap">
            Day {currentDay}
          </span>
        </div>
      </button>

      {/* 2. Anchored Living Bullseye Mandala Popover Modal */}
      {isOpen && (
        <>
          {/* Dimmed backdrop to close on outside click */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/25 z-40 backdrop-blur-xs transition-opacity duration-200"
            aria-hidden="true"
          />

          {/* Anchored Popover Box directly underneath */}
          <div
            className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-14 z-50 w-[380px] max-w-[92vw] animate-in fade-in slide-in-from-top-3 duration-200"
            style={{
              filter: "drop-shadow(0 14px 36px rgba(42, 21, 3, 0.2))",
            }}
          >
            <LivingMandala
              specialMissionCompleted={specialMissionCompleted}
              routineHabitsCompleted={routineHabitsCompleted}
              nutritionCompleted={nutritionCompleted}
              mindMovementCompleted={mindMovementCompleted}
              alignmentPercentage={alignmentPercentage}
              currentDay={currentDay}
              streak={streak}
              shields={shields}
              isPulsing={isPulsing}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default FloatingMandalaWidget;

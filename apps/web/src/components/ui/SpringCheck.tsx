"use client";

import React from "react";
import { Check } from "lucide-react";

interface SpringCheckItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  index: number;
}

export function SpringCheckItem({
  label,
  checked,
  onToggle,
  index,
}: SpringCheckItemProps) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`group w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 cursor-pointer select-none active:scale-[0.99] ${
        checked
          ? "bg-[#F0ECE7]/60 border-[#EAE5DE] shadow-xs"
          : "bg-white border-[#EAE5DE] hover:border-[#8C6A4F]/50 hover:bg-[#F8F7F4]"
      }`}
    >
      {/* Spring Tactile Checkbox Box */}
      <div
        className={`w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          checked
            ? "bg-[#8C6A4F] border-[#8C6A4F] text-white scale-100 shadow-xs"
            : "border-2 border-[#8C6A4F]/40 bg-white group-hover:border-[#8C6A4F] scale-95"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Check
          className={`w-3.5 h-3.5 stroke-[3] transition-all duration-200 ${
            checked
              ? "opacity-100 scale-100"
              : "opacity-0 scale-50"
          }`}
          style={{
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>

      {/* Task Text */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-semibold leading-relaxed transition-all duration-200 block ${
            checked
              ? "line-through text-[#6E5D52]"
              : "text-[#2D221A]"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Subtle Index Tag */}
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
          checked
            ? "text-[#8C6A4F] bg-[#8C6A4F]/10"
            : "text-[#6E5D52] bg-[#F0ECE7]"
        }`}
      >
        #{index + 1}
      </span>
    </div>
  );
}

interface SpringCheckProps {
  tasks: string[];
  checkedState: Record<number, boolean>;
  onToggleTask: (index: number) => void;
}

export function SpringCheck({
  tasks,
  checkedState,
  onToggleTask,
}: SpringCheckProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-xs text-[#2A1503]/60 italic p-3 bg-[#FAF8F0] rounded-xl border border-[#2A1503]/6">
        No routine tasks prescribed for this phase.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, idx) => (
        <SpringCheckItem
          key={idx}
          index={idx}
          label={task}
          checked={Boolean(checkedState[idx])}
          onToggle={() => onToggleTask(idx)}
        />
      ))}
    </div>
  );
}

export default SpringCheck;

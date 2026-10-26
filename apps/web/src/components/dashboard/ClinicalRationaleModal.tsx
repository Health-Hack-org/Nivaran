"use client";

import React from "react";
import {
  X,
  Brain,
  Calculator,
  Flame,
  Droplets,
  HeartPulse,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { PrescriptionResponse } from "@/types";

interface ClinicalRationaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: PrescriptionResponse;
}

export function ClinicalRationaleModal({
  isOpen,
  onClose,
  prescription,
}: ClinicalRationaleModalProps) {
  if (!isOpen) return null;

  const { computed_metrics, why_this_works, diet_protocol, exercise_protocol, mental_protocol } =
    prescription;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] rounded-3xl border border-[#66350F]/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#2A1503] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Brain className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase text-amber-200">
                Evidence-Based Medicine & Math
              </div>
              <h2 className="text-lg font-bold">Why Today&apos;s Protocol Works</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Neuroscience Rationale Card */}
          <div className="p-5 rounded-2xl bg-[#F5F5DC] border border-[#66350F]/15">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#66350F] mb-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Neurochemical & Behavioral Rationale
            </div>
            <p className="text-sm text-[#2A1503] leading-relaxed font-serif italic">
              &ldquo;{why_this_works || "Today's clinical plan targets baseline dopamine restoration while preventing compensatory blood glucose drops that trigger acute cravings."}&rdquo;
            </p>
          </div>

          {/* Metabolic Math Telemetry */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#66350F] mb-3">
              <Calculator className="w-4 h-4" />
              Metabolic Telemetry & Biophysical Math
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-[#66350F]/15 shadow-sm text-center">
                <div className="text-[10px] font-bold uppercase text-[#2A1503]/60">
                  BMI Score
                </div>
                <div className="text-xl font-black text-[#2A1503] mt-0.5">
                  {computed_metrics.bmi}
                </div>
                <div className="text-[10px] font-semibold text-emerald-700 capitalize mt-0.5">
                  {computed_metrics.bmi_category}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#66350F]/15 shadow-sm text-center">
                <div className="text-[10px] font-bold uppercase text-[#2A1503]/60">
                  Basal BMR
                </div>
                <div className="text-xl font-black text-[#66350F] mt-0.5">
                  {computed_metrics.bmr}
                </div>
                <div className="text-[10px] font-semibold text-[#2A1503]/60 mt-0.5">
                  kcal / resting
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#66350F]/15 shadow-sm text-center">
                <div className="text-[10px] font-bold uppercase text-[#2A1503]/60 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-600" /> Target Calories
                </div>
                <div className="text-xl font-black text-[#2A1503] mt-0.5">
                  {computed_metrics.target_calories}
                </div>
                <div className="text-[10px] font-semibold text-[#66350F] mt-0.5">
                  kcal / day
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#66350F]/15 shadow-sm text-center">
                <div className="text-[10px] font-bold uppercase text-[#2A1503]/60 flex items-center justify-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-600" /> Hydration
                </div>
                <div className="text-xl font-black text-sky-700 mt-0.5">
                  {computed_metrics.hydration_liters}L
                </div>
                <div className="text-[10px] font-semibold text-[#2A1503]/60 mt-0.5">
                  35ml / kg base
                </div>
              </div>
            </div>
          </div>

          {/* Pillar Rationale Breakdowns */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white border border-[#66350F]/15 shadow-sm">
              <div className="text-xs font-bold text-[#66350F] flex items-center gap-1.5 mb-1">
                <HeartPulse className="w-3.5 h-3.5" />
                Dietary & Cellular Stabilization:
              </div>
              <div className="text-xs text-[#2A1503]/85 leading-relaxed">
                {diet_protocol.clinical_rationale ||
                  "Formulated with complex carbohydrates and bioavailable amino acids to optimize tryptophan-to-serotonin transport in the gut-brain axis."}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#66350F]/15 shadow-sm">
              <div className="text-xs font-bold text-[#66350F] flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Exercise Safety Guardrail:
              </div>
              <div className="text-xs text-[#2A1503]/85 leading-relaxed">
                {exercise_protocol.safety_note ||
                  "Heart rate kept in Zone 2 to trigger mitochondrial biogenesis without inducing cortisol spikes that destabilize cravings."}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#66350F]/15 shadow-sm">
              <div className="text-xs font-bold text-[#66350F] flex items-center gap-1.5 mb-1">
                <Brain className="w-3.5 h-3.5" />
                Neuro-Regulation & Binaural Entrainment:
              </div>
              <div className="text-xs text-[#2A1503]/85 leading-relaxed">
                {mental_protocol.lifestyle_tip} — {mental_protocol.music_type} stimulates alpha/theta brainwave synchronization to reduce autonomic sympathetic overdrive.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#66350F]/15 bg-[#F5F5DC]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#66350F] hover:bg-[#4a260a] text-white font-bold text-xs shadow transition-colors"
          >
            Understood, Return to Sanctuary
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClinicalRationaleModal;

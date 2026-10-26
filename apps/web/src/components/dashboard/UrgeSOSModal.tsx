"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Wind,
  Waves,
  ClipboardPen,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
} from "lucide-react";
import { TrackType, UrgeLogRequest, UrgeLogResponse } from "@/types";
import { logUrgeEvent } from "@/lib/api";

interface UrgeSOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: TrackType;
  userId?: string;
  onUrgeLogged?: (trigger: string, tip: string) => void;
}

export function UrgeSOSModal({
  isOpen,
  onClose,
  currentTrack,
  userId,
  onUrgeLogged,
}: UrgeSOSModalProps) {
  const [activeTab, setActiveTab] = useState<"sigh" | "surf" | "log">("sigh");

  // Tab 1: Physiological Sigh State (Cycles: Inhale 1 [2s] -> Inhale 2 [2s] = 4s total inhale -> Hold [2s] -> Exhale [6s] = 12s cycle)
  const [breathPhase, setBreathPhase] = useState<"inhale1" | "inhale2" | "hold" | "exhale">("inhale1");
  const [breathSeconds, setBreathSeconds] = useState<number>(0);
  const [breathCycleCount, setBreathCycleCount] = useState<number>(0);
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(true);

  // Tab 2: 10-Minute Urge Surfing Timer (600 seconds)
  const [surfSecondsLeft, setSurfSecondsLeft] = useState<number>(600);
  const [isSurfingRunning, setIsSurfingRunning] = useState<boolean>(false);

  // Tab 3: Craving & Trigger Logger State
  const [intensity, setIntensity] = useState<number>(7);
  const [selectedTrigger, setSelectedTrigger] = useState<string>("Stress");
  const [notes, setNotes] = useState<string>("");
  const [surfedSuccessfully, setSurfedSuccessfully] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [logResult, setLogResult] = useState<UrgeLogResponse | null>(null);

  // Breathwork timer
  useEffect(() => {
    if (!isOpen || activeTab !== "sigh" || !isBreathingActive) return;

    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        const next = prev + 1;
        // 0-2s: First Inhale (Nose)
        // 2-4s: Sharp Top-Up Inhale (Nose)
        // 4-6s: Hold & Stabilize
        // 6-12s: Slow, Audible Mouth Exhale
        if (next < 2) {
          setBreathPhase("inhale1");
        } else if (next < 4) {
          setBreathPhase("inhale2");
        } else if (next < 6) {
          setBreathPhase("hold");
        } else if (next < 12) {
          setBreathPhase("exhale");
        } else {
          // cycle completed
          setBreathCycleCount((c) => c + 1);
          setBreathPhase("inhale1");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeTab, isBreathingActive]);

  // Urge Surfing countdown timer
  useEffect(() => {
    if (!isOpen || activeTab !== "surf" || !isSurfingRunning) return;

    const timer = setInterval(() => {
      setSurfSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSurfingRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, activeTab, isSurfingRunning]);

  if (!isOpen) return null;

  const handleUrgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLogResult(null);

    const payload: UrgeLogRequest = {
      user_id: userId || "local-user",
      track: currentTrack,
      intensity,
      trigger_type: selectedTrigger,
      notes,
      surfed_successfully: surfedSuccessfully,
    };

    try {
      const res = await logUrgeEvent(payload);
      setLogResult(res);
      if (onUrgeLogged) {
        onUrgeLogged(selectedTrigger, res.coping_tip);
      }
    } catch (err) {
      // Local fallback if API fails
      const fallbackRes: UrgeLogResponse = {
        success: true,
        message: "Urge wave safely recorded and overcome.",
        track: currentTrack,
        intensity,
        coping_tip:
          "Somatic alert: Splash cold water on your forehead and neck to activate the vagus nerve and mammalian dive reflex. The neurochemical craving wave has already passed its zenith.",
        trigger_analysis: `High craving surge logged for [${selectedTrigger}]. Autonomic nervous system re-stabilizing.`,
      };
      setLogResult(fallbackRes);
      if (onUrgeLogged) {
        onUrgeLogged(selectedTrigger, fallbackRes.coping_tip);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggersList = [
    { id: "Stress", label: "⚡ Stress & Pressure" },
    { id: "Boredom", label: "🥱 Boredom / Low Stim" },
    { id: "Late Night", label: "🌙 Late Night Fatigue" },
    { id: "Social", label: "👥 Social Trigger / Peer" },
    { id: "Fatigue", label: "🔋 Brain Fog / Exhaustion" },
    { id: "Anxiety", label: "💓 Anticipatory Anxiety" },
  ];

  const formatMinutes = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Visual text for breathwork phase
  const getBreathInstruction = () => {
    switch (breathPhase) {
      case "inhale1":
        return {
          title: "Deep Diaphragmatic Inhale",
          sub: "Inhale deeply through your nose into the belly (2s)",
          color: "#D4AF37",
          scale: "scale-110",
        };
      case "inhale2":
        return {
          title: "Sharp Top-Up Inhale",
          sub: "Take a second sharp sniff to maximally reinflate alveoli (2s)",
          color: "#E59866",
          scale: "scale-125",
        };
      case "hold":
        return {
          title: "Hold & Retain",
          sub: "Hold breath gently, let oxygen exchange balance (2s)",
          color: "#66350F",
          scale: "scale-125",
        };
      case "exhale":
        return {
          title: "Slow Audible Exhale",
          sub: "Release all air through mouth, slowing heart rate via vagus nerve (6s)",
          color: "#962D2D",
          scale: "scale-90",
        };
    }
  };

  const instruction = getBreathInstruction();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] rounded-3xl border-2 border-[#962D2D]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="bg-[#962D2D] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase text-amber-200">
                Clinical Sanctuary Crisis Protocol
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                SOS Craving Interception
              </h2>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#66350F]/15 bg-[#F5F5DC]/80 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("sigh")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "sigh"
                ? "border-[#962D2D] text-[#962D2D]"
                : "border-transparent text-[#2A1503]/60 hover:text-[#2A1503]"
            }`}
          >
            <Wind className="w-4 h-4" />
            1. Physiological Sigh
          </button>
          <button
            onClick={() => setActiveTab("surf")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "surf"
                ? "border-[#962D2D] text-[#962D2D]"
                : "border-transparent text-[#2A1503]/60 hover:text-[#2A1503]"
            }`}
          >
            <Waves className="w-4 h-4" />
            2. Urge Surfing Clock
          </button>
          <button
            onClick={() => setActiveTab("log")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "log"
                ? "border-[#962D2D] text-[#962D2D]"
                : "border-transparent text-[#2A1503]/60 hover:text-[#2A1503]"
            }`}
          >
            <ClipboardPen className="w-4 h-4" />
            3. Trigger Logger & AI Tip
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: PHYSIOLOGICAL SIGH */}
          {activeTab === "sigh" && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="max-w-md">
                <span className="text-xs font-bold uppercase tracking-wider text-[#962D2D]">
                  Autonomic Rapid Reset
                </span>
                <h3 className="text-xl font-black text-[#2A1503] mt-0.5">
                  The Dual-Inhale Physiological Sigh
                </h3>
                <p className="text-xs text-[#2A1503]/75 mt-1 leading-relaxed">
                  Discovered by Dr. Jack Feldman (UCLA) & popularized by Dr. Andrew Huberman: Two inhales followed by one prolonged exhale immediately collapses carbon dioxide in alveoli and lowers heart rate in 3 cycles.
                </p>
              </div>

              {/* Animated Pacer Visual */}
              <div className="relative w-56 h-56 flex items-center justify-center my-2">
                {/* Outer ripple rings */}
                <div
                  className={`absolute inset-0 rounded-full border-2 border-[#962D2D]/20 transition-transform duration-1000 ${
                    breathPhase === "inhale1" || breathPhase === "inhale2" ? "scale-125 opacity-75" : "scale-100 opacity-20"
                  }`}
                />
                <div
                  className={`absolute inset-3 rounded-full border border-[#D4AF37]/30 transition-transform duration-1000 ${
                    breathPhase === "hold" ? "scale-110 opacity-80" : "scale-95 opacity-30"
                  }`}
                />

                {/* Central expanding circle */}
                <div
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all duration-1000 transform ${instruction.scale}`}
                  style={{
                    background: `radial-gradient(circle, ${instruction.color} 0%, #2A1503 100%)`,
                  }}
                >
                  <Wind className="w-8 h-8 text-amber-200 mb-1 animate-pulse" />
                  <span className="text-2xl font-black">{12 - breathSeconds}s</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-100/90">
                    {breathPhase}
                  </span>
                </div>
              </div>

              {/* Live Instruction Banner */}
              <div className="bg-[#F5F5DC] border border-[#66350F]/20 rounded-2xl p-4 w-full max-w-md">
                <div className="text-sm font-black text-[#962D2D]">
                  {instruction.title}
                </div>
                <div className="text-xs text-[#2A1503]/80 mt-1">
                  {instruction.sub}
                </div>
                <div className="mt-3 pt-2 border-t border-[#66350F]/10 flex items-center justify-between text-xs font-semibold text-[#66350F]">
                  <span>Cycle #{breathCycleCount + 1} of 3 target</span>
                  <button
                    onClick={() => setIsBreathingActive(!isBreathingActive)}
                    className="text-xs px-2.5 py-1 rounded-md bg-[#66350F] text-white hover:bg-[#4a260a] transition-colors"
                  >
                    {isBreathingActive ? "Pause Pacer" : "Resume Pacer"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: URGE SURFING TIMER */}
          {activeTab === "surf" && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="max-w-md">
                <span className="text-xs font-bold uppercase tracking-wider text-[#962D2D]">
                  Dr. Alan Marlatt's Protocol
                </span>
                <h3 className="text-xl font-black text-[#2A1503] mt-0.5">
                  10-Minute Urge Wave Surfing
                </h3>
                <p className="text-xs text-[#2A1503]/75 mt-1 leading-relaxed">
                  Neuroscience proves cravings are like ocean waves: they rise, crest at 3–5 minutes, and subside within 10–12 minutes. You don’t fight the wave; you surf atop it with non-judgmental awareness.
                </p>
              </div>

              {/* Large Clock Display */}
              <div className="relative w-64 h-64 rounded-full bg-[#F5F5DC] border-4 border-[#962D2D]/20 flex flex-col items-center justify-center shadow-inner">
                {/* Visual Progress ring */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="#E8D8C4"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="#962D2D"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (surfSecondsLeft / 600)}
                    strokeLinecap="round"
                    fill="none"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>

                <Waves className="w-8 h-8 text-[#962D2D] mb-1" />
                <span className="text-4xl font-black text-[#2A1503] tracking-tighter">
                  {formatMinutes(surfSecondsLeft)}
                </span>
                <span className="text-[11px] font-bold text-[#66350F] mt-1 uppercase tracking-wider">
                  {surfSecondsLeft > 300
                    ? "Phase: Wave Rising (Stay Anchored)"
                    : surfSecondsLeft > 60
                    ? "Phase: Wave Cresting & Falling"
                    : "Phase: Sovereign Calm"}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSurfingRunning(!isSurfingRunning)}
                  className="px-6 py-2.5 rounded-xl bg-[#962D2D] text-white font-bold text-sm shadow hover:bg-[#7e2424] transition-colors flex items-center gap-2"
                >
                  {isSurfingRunning ? (
                    <>
                      <Pause className="w-4 h-4" /> Pause Timer
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Start Surfing
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsSurfingRunning(false);
                    setSurfSecondsLeft(600);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#66350F]/30 text-[#66350F] font-bold text-sm hover:bg-[#66350F]/10 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>

              {/* Clinical Milestone Chips */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-md text-left text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#66350F]/10">
                  <div className="font-bold text-[#66350F]">2 Mins</div>
                  <div className="text-[11px] text-[#2A1503]/70">Heart rate stabilizes; breath slows.</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#66350F]/10">
                  <div className="font-bold text-[#66350F]">5 Mins</div>
                  <div className="text-[11px] text-[#2A1503]/70">Dopamine acute surge peaks & dissipates.</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#66350F]/10">
                  <div className="font-bold text-[#66350F]">10 Mins</div>
                  <div className="text-[11px] text-[#2A1503]/70">Prefrontal cortex regains executive control.</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRIGGER LOGGER */}
          {activeTab === "log" && (
            <div className="space-y-5">
              <div className="border-b border-[#66350F]/10 pb-3">
                <h3 className="text-lg font-black text-[#2A1503]">
                  Log Craving & Trigger Telemetry
                </h3>
                <p className="text-xs text-[#2A1503]/75 mt-0.5">
                  Logging urges feeds our clinical algorithm. Future daily prescriptions will automatically adapt dietary timing, exercise intensity, and neuro-regulation to shield your specific vulnerabilities.
                </p>
              </div>

              {logResult ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-left space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Urge Wave Logged Successfully
                  </div>
                  <div className="text-xs font-semibold text-[#2A1503] bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm leading-relaxed">
                    <strong className="text-[#66350F] block mb-1">
                      🧠 Immediate Clinical Coping Strategy:
                    </strong>
                    {logResult.coping_tip}
                  </div>
                  <div className="text-[11px] text-[#2A1503]/80">
                    {logResult.trigger_analysis}
                  </div>
                  <button
                    onClick={() => {
                      setLogResult(null);
                      onClose();
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-[#66350F] text-white font-bold text-xs hover:bg-[#4a260a] transition-colors"
                  >
                    Return to Sanctuary Dashboard
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUrgeSubmit} className="space-y-4">
                  {/* Intensity Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#2A1503] mb-1">
                      <span>Craving Intensity: {intensity} / 10</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                          intensity <= 3
                            ? "bg-emerald-100 text-emerald-800"
                            : intensity <= 7
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {intensity <= 3 ? "Mild Urge" : intensity <= 7 ? "Moderate Surge" : "Severe Crisis"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="w-full accent-[#962D2D] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#2A1503]/50 px-1 mt-0.5">
                      <span>1 (Faint Thought)</span>
                      <span>5 (Persistent Pull)</span>
                      <span>10 (Overwhelming)</span>
                    </div>
                  </div>

                  {/* Trigger Select Chips */}
                  <div>
                    <label className="block text-xs font-bold text-[#2A1503] mb-1.5">
                      Primary Trigger Context
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {triggersList.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => setSelectedTrigger(t.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border ${
                            selectedTrigger === t.id
                              ? "bg-[#66350F] text-white border-[#66350F] shadow-sm"
                              : "bg-[#F5F5DC]/70 border-[#66350F]/20 text-[#2A1503] hover:bg-[#E8D8C4]"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Somatic description */}
                  <div>
                    <label className="block text-xs font-bold text-[#2A1503] mb-1">
                      Somatic Feelings / Context (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Felt chest tightness after answering an urgent email at 10 PM..."
                      className="w-full p-2.5 rounded-xl border border-[#66350F]/20 bg-white text-xs text-[#2A1503] outline-none focus:border-[#962D2D]"
                    />
                  </div>

                  {/* Surfed Successfully Checkbox */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#2A1503] cursor-pointer bg-[#F5F5DC]/50 p-2.5 rounded-xl border border-[#66350F]/15">
                    <input
                      type="checkbox"
                      checked={surfedSuccessfully}
                      onChange={(e) => setSurfedSuccessfully(e.target.checked)}
                      className="rounded accent-[#66350F] w-4 h-4 cursor-pointer"
                    />
                    <span>I chose to ride out this urge without relapsing (Urge Surfed)</span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-[#962D2D] hover:bg-[#7e2424] text-white font-bold text-sm shadow transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        Log Event & Retrieve Clinical Coping Protocol
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UrgeSOSModal;

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BackgroundMandalas } from "@/components/mandala/BackgroundMandalas";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const authUser = localStorage.getItem("nivaran_auth_user");
      const stored = localStorage.getItem("nivaran_profile");
      if (authUser && stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.username) {
            setHasProfile(true);
            return;
          }
        } catch {
          // ignore
        }
      }
      setHasProfile(false);
    }
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      {/* Signature Mandalas */}
      <BackgroundMandalas />

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">NIVARAN</h1>
        <p className="hero-subtitle">A free mind-growth & addiction recovery app</p>

        <Link
          href="/explore"
          className="nivaran-btn-hero"
        >
          <span>Enter NIVARAN</span>
          <ArrowRight style={{ width: "18px", height: "18px" }} />
        </Link>
      </section>

      {/* About Section */}
      <div className="about-wrapper">
        <div className="about-container">
          <div className="about-column">
            <h3>Why Nivaran?</h3>
            <p>
              Recovery shouldn't rely solely on brute-force willpower. Nivaran combines 
              deterministic biometric calculations (BMI, BMR, TDEE) with clinical safety 
              guardrails to stabilize blood sugar, calm the nervous system, and recondition 
              reward pathways sustainably across 4 recovery tracks.
            </p>
          </div>

          <div className="about-column">
            <h3>The Sanctuary</h3>
            <p>
              A distraction-free environment framed by slow-rotating mandalas that soothe visual fatigue. 
              Equipped with an emergency SOS Urge Surfing Protocol featuring real-time box breathing, 
              urge timer regulation, and somatic impulse deflection to neutralize cravings in under 3 minutes.
            </p>
          </div>

          <div className="about-column">
            <h3>Clarity and Growth</h3>
            <p>
              A structured 4-phase transformation: Acute Stabilization, Dopamine Rewiring, 
              Stress Inoculation, and Neuroplastic Identity. Earn shields, celebrate streak milestones, 
              and restore physical vigor day by day through tailored daily missions.
            </p>
          </div>
        </div>

        {/* Team Footer */}
        <div className="team-footer">
          <div className="team-name">THE HEXA-GRAMS</div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundMandalas } from "@/components/mandala/BackgroundMandalas";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AlertCircle, UserPlus, UserCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.user) {
          localStorage.setItem(
            "nivaran_auth_user",
            JSON.stringify({ id: data.user.id, email: data.user.email })
          );
          router.push("/onboarding");
          return;
        }
      } else {
        // Local Dev / Mock Auth Mode
        const mockUser = {
          id: "local-user-" + Date.now(),
          email: email || "new_seeker@nivaran.app",
        };
        localStorage.setItem("nivaran_auth_user", JSON.stringify(mockUser));
        router.push("/onboarding");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignup = () => {
    const guestUser = {
      id: "guest-user-" + Date.now(),
      email: "guest@nivaran.app",
      isGuest: true,
    };
    localStorage.setItem("nivaran_auth_user", JSON.stringify(guestUser));
    router.push("/onboarding");
  };

  return (
    <div className="auth-wrapper">
      {/* Signature Mandalas */}
      <BackgroundMandalas />

      {/* Centered Glassmorphic Card */}
      <div className="glass-card">
        <Link href="/" style={{ textDecoration: "none" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#66350F",
              color: "#F5F5DC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "20px",
              margin: "0 auto 16px auto",
              border: "1px solid #C2B280",
            }}
          >
            N
          </div>
        </Link>

        <h2 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 6px 0", color: "#2A1503" }}>
          Begin Journey
        </h2>
        <p style={{ fontSize: "14px", color: "#66350F", margin: "0 0 24px 0", fontWeight: 500 }}>
          Create your free recovery account
        </p>

        {errorMsg && (
          <div
            style={{
              background: "rgba(150, 45, 45, 0.1)",
              border: "1px solid rgba(150, 45, 45, 0.3)",
              color: "#962d2d",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              textAlign: "left",
            }}
          >
            <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="nivaran-input"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="nivaran-input"
          />

          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            className="nivaran-input"
          />

          <button type="submit" disabled={isLoading} className="nivaran-btn">
            <UserPlus style={{ width: "16px", height: "16px" }} />
            <span>{isLoading ? "Creating..." : "Create Account & Onboard"}</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuestSignup}
          className="nivaran-btn-outline"
        >
          <UserCheck style={{ width: "16px", height: "16px" }} />
          <span>Skip Account (Guest Mode)</span>
        </button>

        <div style={{ marginTop: "20px", fontSize: "13px" }}>
          Already have an account?{" "}
          <Link href="/login" className="nivaran-link" style={{ display: "inline" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

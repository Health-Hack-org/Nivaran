"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackgroundMandalas } from "@/components/mandala/BackgroundMandalas";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AlertCircle, LogIn, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const supabase = getSupabaseBrowserClient();

      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (profile) {
            localStorage.setItem("nivaran_profile", JSON.stringify(profile));
            router.push("/dashboard");
          } else {
            router.push("/onboarding");
          }
          return;
        }
      } else {
        // Local Dev / Mock Auth Mode
        const mockUser = {
          id: "local-user-" + Date.now(),
          email: email || "seeker@nivaran.app",
        };
        localStorage.setItem("nivaran_auth_user", JSON.stringify(mockUser));

        const storedProfile = localStorage.getItem("nivaran_profile");
        if (storedProfile) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: "guest-user-1",
      email: "guest@nivaran.app",
      isGuest: true,
    };
    localStorage.setItem("nivaran_auth_user", JSON.stringify(guestUser));

    const storedProfile = localStorage.getItem("nivaran_profile");
    if (storedProfile) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }
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
          Welcome Back
        </h2>
        <p style={{ fontSize: "14px", color: "#66350F", margin: "0 0 24px 0", fontWeight: 500 }}>
          Re-enter your recovery sanctuary
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

        <form onSubmit={handleLogin}>
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
            placeholder="Password"
            className="nivaran-input"
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              marginBottom: "16px",
              color: "#2A1503",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <span style={{ color: "#66350F", cursor: "pointer" }}>Forgot password?</span>
          </div>

          <button type="submit" disabled={isLoading} className="nivaran-btn">
            <LogIn style={{ width: "16px", height: "16px" }} />
            <span>{isLoading ? "Signing In..." : "Sign In to Sanctuary"}</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuestLogin}
          className="nivaran-btn-outline"
        >
          <UserCheck style={{ width: "16px", height: "16px" }} />
          <span>Continue as Guest</span>
        </button>

        <div style={{ marginTop: "20px", fontSize: "13px" }}>
          Don't have an account?{" "}
          <Link href="/signup" className="nivaran-link" style={{ display: "inline" }}>
            Create one free
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect } from "react";
import { RotateCcw, Home, Sparkles, AlertCircle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("NIVARAN Sanctuary Runtime Boundary caught:", error);
  }, [error]);

  const handleClearStaleStateAndReload = () => {
    if (typeof window !== "undefined") {
      try {
        // Clear tasks and prescription cache if corrupted
        const keysToRemove = Object.keys(localStorage).filter(
          (k) => k.startsWith("nivaran_tasks_") || k.startsWith("nivaran_rx_")
        );
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#F8F7F4] text-[#2D221A]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#EAE5DE] shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F0ECE7] border border-[#EAE5DE] text-[#8C6A4F] flex items-center justify-center mx-auto shadow-inner">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#2D221A]">
            Sanctuary Refresh Needed
          </h2>
          <p className="text-xs sm:text-sm text-[#6E5D52] leading-relaxed">
            A state update or hot-reload collision occurred. Click below to re-sync the sanctuary without restarting the dev server.
          </p>
          {process.env.NODE_ENV !== "production" && error?.message && (
            <div className="mt-3 p-3 bg-[#FAF8F5] border border-[#EAE5DE] rounded-xl text-left overflow-x-auto text-[11px] text-rose-800 font-mono">
              {error.message}
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#8C6A4F] hover:bg-[#73543B] transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Re-sync Sanctuary (Retry)</span>
          </button>

          <button
            type="button"
            onClick={handleClearStaleStateAndReload}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-[#6E5D52] hover:text-[#2D221A] hover:bg-[#F0ECE7] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Clear Stale Cache & Reload</span>
          </button>

          <a
            href="/"
            className="block text-center text-xs font-semibold text-[#8C6A4F] hover:underline pt-1"
          >
            Return to Welcome Page
          </a>
        </div>
      </div>
    </div>
  );
}


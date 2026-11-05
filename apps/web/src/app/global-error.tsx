"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("NIVARAN Root Layout Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7F4] text-[#2D221A] font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#EAE5DE] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F0ECE7] border border-[#EAE5DE] text-[#8C6A4F] flex items-center justify-center mx-auto text-2xl font-black">
            🌿
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#2D221A]">
              Sanctuary Reset
            </h2>
            <p className="text-xs sm:text-sm text-[#6E5D52] leading-relaxed">
              An unexpected layout collision was caught. Re-launching the sanctuary will restore normal state.
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#8C6A4F] hover:bg-[#73543B] transition-all shadow-md active:scale-98 cursor-pointer"
          >
            Re-launch NIVARAN
          </button>
        </div>
      </body>
    </html>
  );
}


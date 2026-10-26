"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrackType } from "@/types";

const VALID_TRACKS: TrackType[] = ["sm", "sa", "gm", "jf"];

export default function TrackDashboardPage({ params }: { params: { track: string } }) {
  const router = useRouter();

  useEffect(() => {
    const track = params.track as TrackType;
    if (VALID_TRACKS.includes(track)) {
      if (typeof window !== "undefined") {
        const savedProfile = localStorage.getItem("nivaran_profile");
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            parsed.active_track = track;
            localStorage.setItem("nivaran_profile", JSON.stringify(parsed));
          } catch (e) {}
        }
      }
    }
    router.replace("/dashboard");
  }, [params.track, router]);

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center text-[#2A1503]">
      <div className="flex items-center gap-2 text-sm font-bold text-[#66350F]">
        <span className="animate-spin">⏳</span>
        <span>Entering {params.track.toUpperCase()} Clinical Sanctuary...</span>
      </div>
    </div>
  );
}

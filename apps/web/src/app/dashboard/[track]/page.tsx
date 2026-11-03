"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrackType } from "@/types";

const VALID_TRACKS: TrackType[] = ["sm", "sa", "gm", "jf"];

export default function TrackDashboardPage({ params }: { params: { track: string } }) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const track = params?.track as TrackType;
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
        const savedProgress = localStorage.getItem("nivaran_all_tracks_progress");
        if (savedProgress) {
          try {
            const parsed = JSON.parse(savedProgress);
            if (parsed && parsed[track]) {
              localStorage.setItem(
                "nivaran_track_progress",
                JSON.stringify({
                  track,
                  current_day: parsed[track].currentDay || 1,
                  streak: parsed[track].streak || 0,
                  shields: parsed[track].shields || 1,
                  target_days: parsed[track].targetDays || 28,
                })
              );
            }
          } catch (e) {}
        }
      }
    }
    router.replace("/dashboard");
  }, [params?.track, router]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center text-foreground">
      <div className="flex items-center gap-2 text-sm font-bold text-primary dark:text-[#E2BA91]">
        <span className="animate-spin">⏳</span>
        <span>
          {!isMounted
            ? "Entering Clinical Sanctuary..."
            : `Entering ${params?.track ? params.track.toUpperCase() : ""} Clinical Sanctuary...`}
        </span>
      </div>
    </div>
  );
}

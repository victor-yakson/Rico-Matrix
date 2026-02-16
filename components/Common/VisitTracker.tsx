"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = "rm_visit_tracked_v1";
    if (window.localStorage.getItem(key)) return;

    const track = async () => {
      try {
        await fetch("/api/track", {
          method: "POST",
          headers: {
            "x-track-ua": navigator.userAgent,
            "x-track-path": window.location.pathname,
          },
        });
        window.localStorage.setItem(key, "1");
      } catch {
        // Silently ignore tracking failures
      }
    };

    track();
  }, []);

  return null;
}

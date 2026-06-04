"use client";

import { useEffect } from "react";

const VISITOR_ID_KEY = "rm_visitor_id_v2";
const VISITOR_REGISTERED_KEY = "rm_visitor_registered_v2";

const generateVisitorId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
};

export default function VisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storage = window.localStorage;
    let visitorId = storage.getItem(VISITOR_ID_KEY);

    if (!visitorId) {
      visitorId = generateVisitorId();
      storage.setItem(VISITOR_ID_KEY, visitorId);
    }

    const registeredVisitorId = storage.getItem(VISITOR_REGISTERED_KEY);
    if (registeredVisitorId === visitorId) return;

    const controller = new AbortController();

    const register = async () => {
      try {
        const response = await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            visitorId,
            path: window.location.pathname,
          }),
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = await response.json().catch(() => null);
        if (payload?.ok) {
          storage.setItem(VISITOR_REGISTERED_KEY, visitorId as string);
        }
      } catch {
        // Ignore tracking failures; retry on a later visit.
      }
    };

    void register();

    return () => controller.abort();
  }, []);

  return null;
}

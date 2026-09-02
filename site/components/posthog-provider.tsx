"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

// Optional analytics: no-ops until NEXT_PUBLIC_POSTHOG_KEY is set (wired at launch).
// Events go same-origin through the /ingest reverse proxy in next.config.ts.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
    });
  }, []);
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

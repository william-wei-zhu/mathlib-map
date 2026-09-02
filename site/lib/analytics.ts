"use client";

import posthog from "posthog-js";

/** Fire a product event; a no-op until analytics is configured. Never send personal data. */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  try {
    if (posthog.__loaded) posthog.capture(event, props);
  } catch {
    // analytics must never break the page
  }
}

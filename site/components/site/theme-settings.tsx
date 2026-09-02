"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const subscribeNoop = () => () => {};

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  // True only after hydration, so the server and first client render agree (no theme is known on the server).
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const current = mounted ? theme ?? "system" : undefined;

  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-3">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-12 items-center gap-2 rounded-full border px-5 font-medium transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/40 text-foreground hover:border-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

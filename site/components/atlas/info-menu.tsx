"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/lib/use-dismiss";
import type { Snapshot } from "./atlas-shell";

const LINKS = [
  { href: "/about", label: "About & data sources" },
  { href: "/privacy", label: "Privacy" },
  { href: "/settings", label: "Settings" },
] as const;

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function InfoMenu({ snapshot }: { snapshot?: Snapshot }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(ref, open, close);

  const { theme, setTheme } = useTheme();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:border-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card p-1.5 shadow-xl">
          <div className="px-1.5 pt-1 pb-2">
            <p className="eyebrow mb-1.5 px-1.5 text-muted-foreground">Theme</p>
            <div className="flex gap-1 rounded-full bg-muted p-1" role="group" aria-label="Theme">
              {THEMES.map(({ value, label, Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={active}
                    title={label}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 text-xs font-medium transition-colors",
                      active ? "bg-foreground text-background" : "text-foreground hover:bg-card",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <ul className="border-t border-border pt-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="block rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {snapshot && (
            <p className="mt-1 border-t border-border px-3 pt-2 pb-1 text-xs leading-snug text-muted-foreground">
              Mathlib {snapshot.mathlibTag} · snapshot {snapshot.date}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

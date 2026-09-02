"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useDismiss } from "@/lib/use-dismiss";
import type { Snapshot } from "./atlas-shell";

const LINKS = [
  { href: "/about", label: "About & data sources" },
  { href: "/privacy", label: "Privacy" },
  { href: "/settings", label: "Settings" },
] as const;

export function InfoMenu({ snapshot }: { snapshot?: Snapshot }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
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
          <ul>
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

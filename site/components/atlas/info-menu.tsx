"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

const LINKS = [
  { href: "/about", label: "About & data sources" },
  { href: "/privacy", label: "Privacy" },
  { href: "/settings", label: "Settings" },
] as const;

export function InfoMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
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
        <ul className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

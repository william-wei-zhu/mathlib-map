"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The three views, verbatim labels everywhere: Map, Structures, Theorems. */
export const VIEWS = [
  { label: "Map", href: "/", match: (p: string) => p === "/" || p.startsWith("/area") },
  { label: "Structures", href: "/hierarchy", match: (p: string) => p.startsWith("/hierarchy") || p.startsWith("/class") },
  { label: "Theorems", href: "/search", match: (p: string) => p.startsWith("/search") || p.startsWith("/decl") || p.startsWith("/tour") },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      {VIEWS.map((v) => {
        const active = v.match(pathname);
        return (
          <li key={v.href}>
            <Link
              href={v.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // Tighter padding and tracking below sm so Map, Structures, Theorems, and the gear fit in 375px.
                "eyebrow inline-flex h-11 items-center rounded-full border px-3 text-[0.7rem] tracking-[0.08em] transition-colors sm:px-4 sm:text-[0.76rem] sm:tracking-[0.16em]",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/40 bg-transparent text-foreground hover:border-foreground",
              )}
            >
              {v.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

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
    <ul className="flex items-center gap-2">
      {VIEWS.map((v) => {
        const active = v.match(pathname);
        return (
          <li key={v.href}>
            <Link
              href={v.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "eyebrow inline-flex h-11 items-center rounded-full border px-4 transition-colors",
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

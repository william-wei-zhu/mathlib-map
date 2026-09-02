import Link from "next/link";
import { Settings } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { NavLinks } from "@/components/site/nav-links";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark className="h-12 w-12 shrink-0 text-foreground sm:h-14 sm:w-14" />
          <span className="font-display text-3xl leading-none tracking-tight text-foreground sm:text-4xl">
            {SITE_NAME}
          </span>
        </Link>
        <div className="order-last flex w-full items-center justify-between gap-3 sm:order-none sm:w-auto">
          <NavLinks />
          <Link
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/40 text-foreground transition-colors hover:border-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

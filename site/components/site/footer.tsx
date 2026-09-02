import Link from "next/link";
import { GITHUB_REPO_URL, INDEPENDENCE_LINE, LINKEDIN_URL, SITE_NAME } from "@/lib/site";
import { SNAPSHOT } from "@/lib/snapshot";

const linkClass = "text-accent-ink underline underline-offset-4 hover:text-foreground";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-3">
            <p className="font-display text-2xl leading-none text-foreground">{SITE_NAME}</p>
            <p className="text-sm text-muted-foreground">{INDEPENDENCE_LINE}</p>
            <p className="text-sm text-muted-foreground">
              Built by{" "}
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                William Zhu
              </a>
              . Source on{" "}
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                GitHub
              </a>
              .
            </p>
            <p className="eyebrow text-muted-foreground">
              Mathlib {SNAPSHOT.mathlibTag} · snapshot {SNAPSHOT.date}
            </p>
          </div>
          <nav className="flex flex-col gap-2.5">
            <Link href="/about" className={`eyebrow ${linkClass}`}>About &amp; data sources</Link>
            <Link href="/privacy" className={`eyebrow ${linkClass}`}>Privacy &amp; disclaimer</Link>
            <Link href="/settings" className={`eyebrow ${linkClass}`}>Settings</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

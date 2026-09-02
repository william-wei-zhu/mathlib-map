import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/site";

/** Honest in-progress page for a view that is not live yet. */
export function ComingView({
  label,
  title,
  body,
  eta,
}: {
  label: string;
  title: string;
  body: string;
  eta: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow text-accent-ink">{label}</p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
        {title}
      </h1>
      <p className="mt-6 text-lg text-foreground">{body}</p>
      <p className="mt-4 text-base text-muted-foreground">{eta}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Follow the build on GitHub
        </a>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-foreground/40 px-5 font-medium text-foreground transition-colors hover:border-foreground"
        >
          Back to the map
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="eyebrow text-accent-ink">404</p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
        That page is not on the map.
      </h1>
      <p className="mt-4 text-base text-foreground">
        The address may have changed, or the declaration may have been renamed in Mathlib.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        Back to the map
      </Link>
    </div>
  );
}

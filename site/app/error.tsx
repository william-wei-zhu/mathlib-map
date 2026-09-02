"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">Something went wrong</p>
      <h1 className="mt-4 font-display text-2xl @sm:text-3xl @lg:text-4xl leading-tight tracking-tight text-foreground">
        The data for this page did not load.
      </h1>
      <p className="mt-4 text-base text-foreground">
        This is usually a brief hiccup reaching the data store. Trying again normally fixes it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        Try again
      </button>
    </div>
  );
}

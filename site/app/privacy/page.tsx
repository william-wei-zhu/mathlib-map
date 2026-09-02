import type { Metadata } from "next";
import { ProseSection } from "@/components/site/prose-section";
import { GITHUB_REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy & disclaimer",
  description: "What Mathlib Map collects (almost nothing), the limits of its numbers, and how to reach us.",
};

const linkClass = "text-accent-ink underline underline-offset-4 hover:text-foreground";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-accent-ink">Privacy &amp; disclaimer</p>
      <h1 className="mt-4 font-display text-2xl @sm:text-3xl @lg:text-4xl @2xl:text-5xl leading-tight tracking-tight text-foreground">
        We keep almost nothing, and we show our work.
      </h1>
      <p className="eyebrow mt-5 text-muted-foreground">Last updated · September 2026</p>

      <ProseSection title="Informational only">
        <p>
          Mathlib Map is an informational visualization of a public software library. It is not
          a substitute for the Mathlib documentation or source, and the numbers here are
          derived estimates, not official statistics. Verify against Mathlib itself before
          relying on anything.
        </p>
      </ProseSection>

      <ProseSection title="What we collect">
        <p>There are no accounts and no logins.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Preferences.</strong> Your light or dark theme choice is stored in your own
            browser and never sent to us.
          </li>
          <li>
            <strong>Usage analytics.</strong> When enabled, we use a privacy-respecting
            analytics service to count page views and which views people use, without
            advertising or selling data. You can block it with any content blocker; the site
            works the same.
          </li>
        </ul>
      </ProseSection>

      <ProseSection title="Automated classification">
        <p>
          The subject area assigned to each part of Mathlib is chosen by a language model from
          the file&apos;s own documentation, with hand overrides. It can be wrong. Every area page
          shows which files it counts and offers a one-click way to report a misclassification.
        </p>
      </ProseSection>

      <ProseSection title="Contact">
        <p>
          Questions, corrections, or removal requests: open an issue on{" "}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            GitHub
          </a>
          .
        </p>
      </ProseSection>
    </div>
  );
}

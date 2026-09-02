import type { Metadata } from "next";
import { ThemeSettings } from "@/components/site/theme-settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Choose a light, dark, or system theme.",
  robots: { index: false },
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-accent-ink">Settings</p>
      <h1 className="mt-4 font-display text-2xl @sm:text-3xl @lg:text-4xl leading-tight tracking-tight text-foreground">
        Make it yours.
      </h1>
      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-2xl text-foreground">Theme</h2>
        <p className="mt-2 text-base text-foreground">
          Follows your device by default. Your choice is kept in this browser only.
        </p>
        <div className="mt-5">
          <ThemeSettings />
        </div>
      </section>
      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-2xl text-foreground">Account</h2>
        <p className="mt-2 text-base text-foreground">
          There are no accounts. Everything here is public and free to use.
        </p>
      </section>
    </div>
  );
}

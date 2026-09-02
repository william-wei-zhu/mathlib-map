import type { Metadata } from "next";
import { Fraunces, Literata, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { AtlasShell } from "@/components/atlas/atlas-shell";
import { fetchShard } from "@/lib/data";
import { type MapIndex } from "@/lib/map-data";
import { getSnapshot } from "@/lib/snapshot";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const literata = Literata({
  variable: "--font-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Never let a bucket hiccup white-screen every route: AtlasShell renders a graceful fallback when
  // the map index is null, so we degrade instead of throwing out of the root layout.
  let mapIndex: MapIndex | null = null;
  try {
    mapIndex = await fetchShard<MapIndex>("map/index.json");
  } catch {
    mapIndex = null;
  }
  const snapshot = await getSnapshot();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${literata.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground">
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AtlasShell mapIndex={mapIndex} snapshot={snapshot}>{children}</AtlasShell>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

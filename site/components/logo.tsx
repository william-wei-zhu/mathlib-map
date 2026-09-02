import type { SVGProps } from "react";

/**
 * The Mathlib Map mark: a map tile with contour lines and one location dot.
 * Used inline in the header and rendered to PNG for icons and the share image.
 */
export const LOGO_COLORS = {
  tile: "#121110",
  contour: "#fbfaf7",
  dot: "#b3441c",
} as const;

export function LogoMark({
  tile = "currentColor",
  contour = "var(--paper)",
  dot = "var(--accent-ink)",
  ...props
}: SVGProps<SVGSVGElement> & { tile?: string; contour?: string; dot?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={tile} />
      <path
        d="M14 38 C 12 26, 24 16, 38 19 C 52 22, 56 36, 47 46 C 38 56, 17 52, 14 38 Z"
        fill="none"
        stroke={contour}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M22 37 C 21 30, 28 24, 37 26 C 46 28, 47 37, 41 42 C 35 47, 24 45, 22 37 Z"
        fill="none"
        stroke={contour}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="35" r="3.6" fill={dot} />
    </svg>
  );
}

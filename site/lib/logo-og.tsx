import { LOGO_COLORS } from "@/components/logo";

/** The mark as plain SVG elements that satori (next/og) can rasterize. */
export function LogoOg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill={LOGO_COLORS.tile} />
      <path
        d="M14 38 C 12 26, 24 16, 38 19 C 52 22, 56 36, 47 46 C 38 56, 17 52, 14 38 Z"
        fill="none"
        stroke={LOGO_COLORS.contour}
        strokeWidth="2.6"
      />
      <path
        d="M22 37 C 21 30, 28 24, 37 26 C 46 28, 47 37, 41 42 C 35 47, 24 45, 22 37 Z"
        fill="none"
        stroke={LOGO_COLORS.contour}
        strokeWidth="2.6"
      />
      <circle cx="34" cy="35" r="3.6" fill={LOGO_COLORS.dot} />
    </svg>
  );
}

import { LOGO_COLORS } from "@/components/logo";

/** The node-constellation mark as plain SVG elements that satori (next/og) can rasterize.
 *  Mirrors components/logo.tsx; keep the two in sync. */
const HUB = [33, 33] as const;
const NODES = [
  [18, 18],
  [48, 16],
  [52, 41],
  [28, 51],
  [13, 40],
] as const;
const CHORDS = [
  [0, 1],
  [2, 3],
] as const;

export function LogoOg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill={LOGO_COLORS.tile} />
      {NODES.map(([x, y], i) => (
        <line key={`s${i}`} x1={HUB[0]} y1={HUB[1]} x2={x} y2={y} stroke={LOGO_COLORS.contour} strokeWidth="2.1" strokeLinecap="round" />
      ))}
      {CHORDS.map(([a, b], i) => (
        <line key={`c${i}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke={LOGO_COLORS.contour} strokeWidth="2.1" strokeLinecap="round" />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r="3.1" fill={LOGO_COLORS.contour} />
      ))}
      <circle cx={HUB[0]} cy={HUB[1]} r="4.6" fill={LOGO_COLORS.dot} />
    </svg>
  );
}

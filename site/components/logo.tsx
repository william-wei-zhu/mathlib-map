import type { SVGProps } from "react";

/**
 * The Mathlib Map mark: a small node constellation, a knowledge graph in miniature, with one
 * terracotta focal node. Drawn on a rounded ink tile. Used inline in the top bar and rendered to
 * PNG for icons and the share image (mirrored in lib/logo-og.tsx). Keep the two in sync.
 */
export const LOGO_COLORS = {
  tile: "#121110",
  contour: "#fbfaf7",
  dot: "#b3441c",
} as const;

/** Hub-and-spoke constellation: a central focal node linked to five others, plus two chords. */
const HUB: [number, number] = [33, 33];
const NODES: [number, number][] = [
  [18, 18],
  [48, 16],
  [52, 41],
  [28, 51],
  [13, 40],
];
const CHORDS: [number, number][] = [
  [0, 1], // top arc
  [2, 3], // lower-right arc
];

export function LogoMark({
  tile = "currentColor",
  contour = "var(--paper)",
  dot = "var(--accent-ink)",
  ...props
}: SVGProps<SVGSVGElement> & { tile?: string; contour?: string; dot?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={tile} />
      <g stroke={contour} strokeWidth="2.1" strokeLinecap="round">
        {NODES.map(([x, y], i) => (
          <line key={`s${i}`} x1={HUB[0]} y1={HUB[1]} x2={x} y2={y} />
        ))}
        {CHORDS.map(([a, b], i) => (
          <line key={`c${i}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} opacity="0.7" />
        ))}
      </g>
      {NODES.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r="3.1" fill={contour} />
      ))}
      <circle cx={HUB[0]} cy={HUB[1]} r="4.6" fill={dot} />
    </svg>
  );
}

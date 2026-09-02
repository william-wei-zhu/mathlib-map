import type { ReactNode } from "react";

/** Render a Lean docstring's inline code (backticks) as code; everything else stays plain text. */
export function DocText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <code key={i++} className="lean rounded bg-secondary px-1 py-0.5 text-[0.85em] text-foreground">
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p className={className}>{parts}</p>;
}

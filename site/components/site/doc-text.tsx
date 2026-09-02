import type { ReactNode } from "react";

/**
 * Render the inline Markdown that Lean docstrings actually use: `code`, **bold**, *italic*, and
 * horizontal rules. Everything else stays plain text; nothing is interpreted as HTML.
 */
export function DocText({ text, className }: { text: string; className?: string }) {
  const cleaned = text.replace(/^\s*-{3,}\s*$/gm, "").replace(/\s*---\s*/g, " ");
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > last) parts.push(cleaned.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(
        <code key={i++} className="lean rounded bg-secondary px-1 py-0.5 text-[0.85em] text-foreground">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**")) {
      parts.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < cleaned.length) parts.push(cleaned.slice(last));
  return <p className={className}>{parts}</p>;
}

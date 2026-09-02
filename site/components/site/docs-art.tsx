/**
 * Hand-built illustrations for the walk-through page, in the site's own tokens. Paths use
 * pathLength=1 so the `.draw` rule can paint them in once.
 */
const ink = "stroke-foreground";
const acc = "stroke-accent-ink";
const mono = { fontFamily: "var(--font-mono)", letterSpacing: "0.1em" } as const;

export function PipelineArt() {
  const boxes = [
    { x: 20, label: "MATHLIB" },
    { x: 200, label: "LEAN EXTRACTOR" },
    { x: 380, label: "PYTHON PIPELINE" },
    { x: 560, label: "PUBLIC BUCKET" },
    { x: 740, label: "SITE" },
  ];
  return (
    <svg viewBox="0 0 900 130" className="block w-full" role="img" aria-label="Mathlib flows through a Lean extractor and a Python pipeline into a public bucket that the site reads">
      {boxes.map((b, i) => (
        <g key={b.label}>
          <rect x={b.x} y={30} width={140} height={54} rx={27} fill="none" strokeWidth={1.6} pathLength={1} className={`draw ${ink}`} />
          <text x={b.x + 70} y={62} textAnchor="middle" fontSize={11} className="fill-foreground" style={mono}>{b.label}</text>
          {i < boxes.length - 1 && <line x1={b.x + 140} y1={57} x2={b.x + 180} y2={57} strokeWidth={1.6} pathLength={1} className={`draw ${acc}`} />}
        </g>
      ))}
      <text x={450} y={112} textAnchor="middle" fontSize={11} className="fill-muted-foreground" style={mono}>ONCE PER MATHLIB RELEASE · NOTHING RUNS LEAN AT REQUEST TIME</text>
    </svg>
  );
}

export function ReadArt() {
  // A stack of files becoming rows of records.
  return (
    <svg viewBox="0 0 320 180" className="block w-full max-w-sm" role="img" aria-label="Files become records">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={30 + i * 10} y={30 + i * 10} width={90} height={110} rx={6} fill="none" strokeWidth={1.5} pathLength={1} className={`draw ${ink}`} />
      ))}
      <line x1={150} y1={90} x2={200} y2={90} strokeWidth={1.6} pathLength={1} className={`draw ${acc}`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <circle cx={222} cy={45 + i * 22} r={3.5} className="fill-accent-ink" />
          <line x1={234} y1={45 + i * 22} x2={290 - (i % 2) * 18} y2={45 + i * 22} strokeWidth={1.5} pathLength={1} className={`draw ${ink}`} />
        </g>
      ))}
    </svg>
  );
}

export function FilterArt() {
  // A dense graph on the left; the same nodes with only the load-bearing edges on the right.
  const pts = [[40, 40], [110, 30], [70, 95], [130, 110], [40, 140], [120, 160]];
  const right = pts.map(([x, y]) => [x + 170, y]);
  const dense: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [0, 4], [1, 5], [2, 5], [0, 3]];
  const spine: [number, number][] = [[0, 2], [1, 3], [2, 4], [3, 5]];
  return (
    <svg viewBox="0 0 320 190" className="block w-full max-w-sm" role="img" aria-label="Twelve edges become four">
      {dense.map(([a, b], i) => <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} strokeWidth={1} className="stroke-foreground/40" />)}
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} className="fill-foreground" />)}
      <line x1={150} y1={95} x2={190} y2={95} strokeWidth={1.6} pathLength={1} className={`draw ${acc}`} />
      {spine.map(([a, b], i) => <line key={i} x1={right[a][0]} y1={right[a][1]} x2={right[b][0]} y2={right[b][1]} strokeWidth={1.8} pathLength={1} className={`draw ${acc}`} />)}
      {right.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} className="fill-foreground" />)}
    </svg>
  );
}

export function ClassifyArt() {
  // A file card gets a subject stamp.
  return (
    <svg viewBox="0 0 320 180" className="block w-full max-w-sm" role="img" aria-label="A file receives a subject code">
      <rect x={40} y={30} width={150} height={120} rx={8} fill="none" strokeWidth={1.5} pathLength={1} className={`draw ${ink}`} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1={58} y1={58 + i * 18} x2={150 - (i % 3) * 20} y2={58 + i * 18} strokeWidth={1.4} className="stroke-foreground/50" />)}
      <circle cx={230} cy={90} r={38} fill="none" strokeWidth={2} pathLength={1} className={`draw ${acc}`} />
      <text x={230} y={86} textAnchor="middle" fontSize={16} className="fill-accent-ink" style={mono}>11A</text>
      <text x={230} y={104} textAnchor="middle" fontSize={9} className="fill-accent-ink" style={mono}>NUMBER THEORY</text>
    </svg>
  );
}

export function MeasureArt() {
  // A column: axioms at the bottom, a theorem at the top, depth ticks in between.
  return (
    <svg viewBox="0 0 320 200" className="block w-full max-w-sm" role="img" aria-label="Depth from the axioms">
      <line x1={160} y1={40} x2={160} y2={160} strokeWidth={1.6} pathLength={1} className={`draw ${ink}`} />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={150} y1={50 + i * 25} x2={170} y2={50 + i * 25} strokeWidth={1.4} className="stroke-foreground/60" />)}
      <circle cx={160} cy={40} r={6} className="fill-accent-ink" />
      <text x={175} y={44} fontSize={10} className="fill-foreground" style={mono}>THEOREM</text>
      <rect x={110} y={160} width={100} height={22} rx={11} fill="none" strokeWidth={1.6} pathLength={1} className={`draw ${ink}`} />
      <text x={160} y={175} textAnchor="middle" fontSize={9} className="fill-foreground" style={mono}>AXIOMS</text>
      <text x={40} y={104} fontSize={10} className="fill-muted-foreground" style={mono}>DEPTH</text>
    </svg>
  );
}

export function PublishArt() {
  // Shards flowing into a bucket, a page reading one.
  return (
    <svg viewBox="0 0 320 180" className="block w-full max-w-sm" role="img" aria-label="Shards in a bucket, one read by a page">
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={30 + (i % 3) * 26} y={40 + Math.floor(i / 3) * 26} width={18} height={18} rx={3} fill="none" strokeWidth={1.4} pathLength={1} className={`draw ${ink}`} />)}
      <path d="M130 50 h80 l-8 80 h-64 z" fill="none" strokeWidth={1.6} pathLength={1} className={`draw ${ink}`} />
      <line x1={110} y1={72} x2={128} y2={72} strokeWidth={1.6} pathLength={1} className={`draw ${acc}`} />
      <rect x={240} y={45} width={50} height={90} rx={6} fill="none" strokeWidth={1.5} pathLength={1} className={`draw ${ink}`} />
      <line x1={210} y1={90} x2={238} y2={90} strokeWidth={1.6} pathLength={1} className={`draw ${acc}`} />
      <rect x={250} y={60} width={30} height={6} rx={3} className="fill-accent-ink" />
    </svg>
  );
}

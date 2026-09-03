"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { DATA_BASE_URL } from "@/lib/site";
import { areaHref, type MapIndex } from "@/lib/map-data";
import { declHref, nodeShardPath } from "@/lib/atlas-data";
import { AtlasCanvas, type Metric, type Landmark } from "./atlas-canvas";
import { TheoremGraph, type GraphNode } from "./theorem-graph";
import { SearchBox } from "./search-box";
import { LayersControl } from "./layers-control";
import { InfoMenu } from "./info-menu";
import { MapLegend } from "./map-legend";
import { track } from "@/lib/analytics";

const MIN_W = 300;
const MAX_W = 720;
const DEFAULT_W = 390;
const STORE_KEY = "atlas.sidebarW";

function areaCodeOf(pathname: string): string | null {
  const m = pathname.match(/^\/area\/(\d{2})/);
  return m ? m[1] : null;
}

function declNameOf(pathname: string): string | null {
  const m = pathname.match(/^\/decl\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function getJson(url: string): Promise<unknown> {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function fetchLandmarks(code: string): Promise<Landmark[]> {
  const data = (await getJson(`${DATA_BASE_URL}/map/area/${code}.json`)) as { topResults?: Landmark[] } | null;
  return (data?.topResults ?? []).slice(0, 18);
}

export type Snapshot = { mathlibTag: string; date: string; downloads: string | null };

export function AtlasShell({
  mapIndex,
  snapshot,
  children,
}: {
  mapIndex: MapIndex | null;
  snapshot?: Snapshot;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("coverage");
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_W);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [nodeData, setNodeData] = useState<GraphNode | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const isDecl = pathname.startsWith("/decl");
  const isHierarchy = pathname === "/hierarchy";
  const usesOverlay = isDecl || isHierarchy; // routes whose payload is a full-canvas overlay
  const prevPath = useRef<string | null>(null);

  // Keep an overlay (theorem graph, structures diagram) in the visible map area, never behind the
  // panel: on desktop it starts to the right of the panel; on mobile the sheet is shortened and the
  // overlay sits above it.
  const overlayInset = open
    ? "top-0 right-0 left-0 sm:left-[calc(var(--sw)+1.5rem)] bottom-[47vh] sm:bottom-0"
    : "inset-0";

  // Collapse on the map home; open the panel when diving in from the map (or on first content load);
  // otherwise preserve the user's manual collapse as they move between content routes.
  useEffect(() => {
    const was = prevPath.current;
    prevPath.current = pathname;
    // Sync the panel to the route: collapse on home, open when diving in from the map, otherwise
    // keep the user's manual choice (null = no change).
    const next = pathname === "/" ? false : was === null || was === "/" ? true : null;
    if (next !== null) setOpen(next);
  }, [pathname]);

  // Resolve what the map should focus on from the route: an area shows its landmarks; a
  // declaration flies to its area and highlights the node; anything else returns to the world.
  useEffect(() => {
    let alive = true;
    (async () => {
      const area = areaCodeOf(pathname);
      const decl = declNameOf(pathname);
      if (area) {
        setActiveNode(null);
        setNodeData(null);
        setFocusCode(area);
        const lm = await fetchLandmarks(area);
        if (alive) setLandmarks(lm);
      } else if (decl) {
        const node = (await getJson(`${DATA_BASE_URL}/${nodeShardPath(decl)}`)) as
          | { area?: { code?: string }; name?: string; kind?: string; uses?: GraphNode["uses"]; usedBy?: GraphNode["usedBy"] }
          | null;
        if (!alive) return;
        const code = node?.area?.code ?? null;
        setActiveNode(decl);
        setFocusCode(code);
        setNodeData(node ? { name: node.name ?? decl, kind: node.kind ?? "theorem", uses: node.uses ?? [], usedBy: node.usedBy ?? [] } : null);
        setLandmarks([]); // the theorem graph is the focus here, not the area's landmarks
      } else {
        setFocusCode(null);
        setLandmarks([]);
        setActiveNode(null);
        setNodeData(null);
      }
    })();
    return () => { alive = false; };
  }, [pathname]);

  // Reset the panel scroll to the top when the route changes.
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [pathname]);

  // Restore a remembered sidebar width from localStorage on mount (guarded to avoid a hydration
  // mismatch: the server and first client render both use DEFAULT_W, then this reconciles).
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(STORE_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v >= MIN_W && v <= MAX_W) setWidth(v);
    } catch {}
  }, []);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    // Capture the pointer so a fast drag that leaves the window (or crosses an iframe) never strands
    // the listeners with the handle stuck mid-drag.
    const handle = e.currentTarget as HTMLElement;
    try { handle.setPointerCapture(e.pointerId); } catch {}
    let latest = width;
    const onMove = (ev: PointerEvent) => {
      latest = Math.min(MAX_W, Math.max(MIN_W, ev.clientX - 12));
      setWidth(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try { handle.releasePointerCapture(e.pointerId); } catch {}
      document.body.style.userSelect = "";
      try { localStorage.setItem(STORE_KEY, String(Math.round(latest))); } catch {}
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [width]);

  const collapsePanel = useCallback(() => { setOpen(false); track("sidebar_toggled", { open: false }); }, []);

  // Swipe the mobile bottom sheet down to dismiss it (a tap on the handle also collapses via onClick).
  const startSheetSwipe = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const startY = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch {}
    let done = false;
    const onMove = (ev: PointerEvent) => {
      if (!done && ev.clientY - startY > 32) { done = true; collapsePanel(); }
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  }, [collapsePanel]);

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-background"
      style={{ ["--sw" as string]: `${width}px` } as React.CSSProperties}
    >
      {mapIndex ? (
        <AtlasCanvas
          index={mapIndex}
          metric={metric}
          focusCode={focusCode}
          landmarks={landmarks}
          activeNode={activeNode}
          onPick={(code) => router.push(areaHref(code))}
          onNode={(name) => router.push(declHref(name))}
          onExitFocus={() => router.push("/")}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-8 text-center text-muted-foreground">
          The map data is unavailable right now.
        </div>
      )}

      <TheoremGraph
        node={nodeData}
        onPick={(name) => router.push(declHref(name))}
        onDismiss={() => router.push(focusCode ? areaHref(focusCode) : "/")}
        containerClassName={overlayInset}
      />

      {/* structures diagram renders here (portaled by HierarchyExplorer) over the faint map */}
      {isHierarchy && (
        <div className={`pointer-events-none absolute z-10 ${overlayInset}`}>
          <div className="absolute inset-0 bg-background/55 backdrop-blur-[1px]" />
          <div id="atlas-hierarchy-slot" className="pointer-events-auto absolute inset-0" />
        </div>
      )}

      {/* top: logo + search (full width on mobile, panel-width on desktop) */}
      <div className="pointer-events-none absolute left-3 right-16 top-3 z-30 flex items-center gap-2 sm:right-auto sm:w-[var(--sw)] sm:max-w-[calc(100vw-1.5rem)]">
        <Link href="/" aria-label="Mathlib Map home" className="pointer-events-auto inline-flex shrink-0 rounded-[14px] text-foreground shadow-md">
          <LogoMark className="h-11 w-11" />
        </Link>
        <div className="pointer-events-auto min-w-0 flex-1">
          <SearchBox areas={mapIndex?.areas ?? []} />
        </div>
      </div>

      {/* menu (top-right, both breakpoints) */}
      <div className="absolute right-3 top-3 z-40">
        <InfoMenu snapshot={snapshot} />
      </div>

      {/* panel: left card on desktop, bottom sheet on mobile */}
      {open ? (
        <section
          className={`pointer-events-auto absolute z-20 flex flex-col overflow-hidden border border-border bg-card shadow-xl
            max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:rounded-t-2xl ${usesOverlay ? "max-sm:h-[47vh]" : "max-sm:h-[68vh]"}
            sm:left-3 sm:right-auto sm:top-[4.5rem] sm:bottom-3 sm:w-[var(--sw)] sm:rounded-2xl`}
        >
          {/* mobile: a generous tap-or-swipe-down target to collapse the sheet */}
          <button
            type="button"
            onClick={collapsePanel}
            onPointerDown={startSheetSwipe}
            aria-label="Collapse panel"
            className="group flex w-full shrink-0 touch-none items-center justify-center gap-1.5 py-3 sm:hidden"
          >
            <span className="h-1.5 w-12 rounded-full bg-border transition-colors group-active:bg-muted-foreground" />
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {/* desktop: collapse button at the card's top-right */}
          <button
            type="button"
            onClick={collapsePanel}
            aria-label="Collapse panel"
            className="absolute right-2.5 top-2.5 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <div ref={contentRef} className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); track("sidebar_toggled", { open: true }); }}
          className="pointer-events-auto absolute z-20 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md transition-colors hover:border-foreground
            max-sm:bottom-5 max-sm:left-1/2 max-sm:-translate-x-1/2
            sm:left-3 sm:top-[4.5rem]"
        >
          <PanelLeftOpen className="h-4 w-4" />
          {isHome ? "Explore areas" : "Show panel"}
        </button>
      )}

      {/* drag-to-resize handle at the panel's right edge (desktop only) */}
      {open && (
        <div
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          className="group pointer-events-auto absolute z-30 hidden w-4 -translate-x-1/2 cursor-col-resize sm:block"
          style={{ left: width + 12, top: "4.5rem", bottom: "0.75rem" }}
        >
          <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded bg-transparent transition-colors group-hover:bg-accent-ink/50" />
        </div>
      )}

      {/* layers: small collapsible control, grouped with the map controls at bottom-right */}
      <div className="pointer-events-auto absolute bottom-5 right-5 z-30 sm:bottom-[10.5rem]">
        <LayersControl metric={metric} onMetric={setMetric} />
      </div>

      {/* first-run map grammar primer, world view only */}
      {isHome && <MapLegend />}
    </div>
  );
}

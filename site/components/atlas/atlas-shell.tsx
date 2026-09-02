"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { DATA_BASE_URL } from "@/lib/site";
import { areaHref, type MapIndex } from "@/lib/map-data";
import { declHref, nodeShardPath } from "@/lib/atlas-data";
import { AtlasCanvas, type Metric, type Landmark } from "./atlas-canvas";
import { TheoremGraph, type GraphNode } from "./theorem-graph";
import { SearchBox } from "./search-box";
import { LayersControl } from "./layers-control";
import { InfoMenu } from "./info-menu";
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

export function AtlasShell({ mapIndex, children }: { mapIndex: MapIndex | null; children: React.ReactNode }) {
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

  // Open the sidebar for any content route; collapse on the map home.
  useEffect(() => {
    setOpen(pathname !== "/");
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

  // Restore a remembered sidebar width.
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(STORE_KEY));
      if (v >= MIN_W && v <= MAX_W) setWidth(v);
    } catch {}
  }, []);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    let latest = width;
    const onMove = (ev: PointerEvent) => {
      latest = Math.min(MAX_W, Math.max(MIN_W, ev.clientX - 12));
      setWidth(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      try { localStorage.setItem(STORE_KEY, String(Math.round(latest))); } catch {}
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [width]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background">
      {mapIndex ? (
        <AtlasCanvas
          index={mapIndex}
          metric={metric}
          focusCode={focusCode}
          landmarks={landmarks}
          activeNode={activeNode}
          onPick={(code) => router.push(areaHref(code))}
          onNode={(name) => router.push(declHref(name))}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-8 text-center text-muted-foreground">
          The map data is unavailable right now.
        </div>
      )}

      <TheoremGraph node={nodeData} onPick={(name) => router.push(declHref(name))} />

      {/* left column: logo + search, then the sidebar panel */}
      <div
        className="pointer-events-none absolute inset-y-3 left-3 z-20 flex max-w-[calc(100vw-1.5rem)] flex-col gap-3"
        style={{ width }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/" aria-label="Mathlib Map home" className="inline-flex shrink-0 rounded-[14px] text-foreground shadow-md">
            <LogoMark className="h-11 w-11" />
          </Link>
          <div className="min-w-0 flex-1">
            <SearchBox areas={mapIndex?.areas ?? []} />
          </div>
        </div>

        {open ? (
          <section className="pointer-events-auto relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <button
              type="button"
              onClick={() => { setOpen(false); track("sidebar_toggled", { open: false }); }}
              aria-label="Collapse panel"
              className="absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => { setOpen(true); track("sidebar_toggled", { open: true }); }}
            className="pointer-events-auto inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md transition-colors hover:border-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
            {isHome ? "Explore areas" : "Show panel"}
          </button>
        )}

        {/* drag-to-resize handle at the column's right edge, above the map */}
        {open && (
          <div
            onPointerDown={startResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            className="group pointer-events-auto absolute bottom-0 right-0 top-[3.75rem] z-30 w-4 translate-x-1/2 cursor-col-resize"
          >
            <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded bg-transparent transition-colors group-hover:bg-accent-ink/50" />
          </div>
        )}
      </div>

      {/* right column: menu + layers */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-3">
        <div className="pointer-events-auto">
          <InfoMenu />
        </div>
        <div className="pointer-events-auto">
          <LayersControl metric={metric} onMetric={setMetric} />
        </div>
      </div>
    </div>
  );
}

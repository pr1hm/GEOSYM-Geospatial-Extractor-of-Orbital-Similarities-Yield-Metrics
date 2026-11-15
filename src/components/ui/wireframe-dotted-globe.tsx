"use client";

/**
 * Wireframe dotted globe with analog-site score spikes (d3 + canvas, no WebGL).
 * Based on a public "wireframe dotted globe" design, adapted for GEOSYM:
 * local land data, score spikes, click/hover, fly-to, touch support.
 * AI-assisted code: written with Claude (Anthropic) during NASA Space Apps 2026,
 * reviewed and integrated by Team TAVME. See README "AI use" section.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import { buildPlanetSpots, paintPlanet } from "./planetSurface";

export interface GlobeSpike {
  id: string;
  lat: number;
  lng: number;
  value: number; // 0..1 spike height
  color: string;
  label: string;
  sublabel?: string;
  score?: number;
  rank?: number;
  dim?: boolean; // drawn faint (not in the top matches)
  star?: boolean; // new candidate in the top matches: draw a star at the tip
}

interface Props {
  spikes: GlobeSpike[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  /** "earth" draws land; "moon"/"mars" draw a tinted, cratered-looking sphere instead */
  variant?: "earth" | "moon" | "mars";
  autoRotate?: boolean;
  interactive?: boolean;
  maxHeight?: number;
}

const VARIANT = {
  earth: { ocean: "#050505", rim: "rgba(230,230,230,0.55)", grid: "rgba(230,230,230,0.12)", dot: "rgba(170,170,170,0.75)" },
  moon: { ocean: "#121214", rim: "rgba(220,220,225,0.6)", grid: "rgba(220,220,225,0.10)", dot: "rgba(190,190,198,0.55)" },
  mars: { ocean: "#1A0C08", rim: "rgba(240,140,90,0.65)", grid: "rgba(240,140,90,0.12)", dot: "rgba(226,110,70,0.55)" },
} as const;

type LngLat = [number, number];

function pointInRing(pt: LngLat, ring: number[][]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygon(pt: LngLat, poly: number[][][]): boolean {
  if (!pointInRing(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(pt, poly[i])) return false;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLandDots(land: any, step = 1.25): LngLat[] {
  const dots: LngLat[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  land.features.forEach((f: any) => {
    const g = f.geometry;
    const polys: number[][][][] = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    polys.forEach((poly) => {
      let minX = 180, minY = 90, maxX = -180, maxY = -90;
      poly[0].forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      const sx = Math.ceil(minX / step) * step;
      const sy = Math.ceil(minY / step) * step;
      for (let x = sx; x <= maxX; x += step) {
        for (let y = sy; y <= maxY; y += step) {
          if (pointInPolygon([x, y], poly)) dots.push([x, y]);
        }
      }
    });
  });
  return dots;
}

export default function WireframeDottedGlobe({
  spikes,
  selectedId,
  onSelect,
  className = "",
  variant = "earth",
  autoRotate = true,
  interactive = true,
  maxHeight = 620,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 640, h: 560 });
  const [hover, setHover] = useState<{ s: GlobeSpike; x: number; y: number } | null>(null);
  const [landReady, setLandReady] = useState(false);

  // Mutable render state (kept in refs so the animation loop never restarts)
  const st = useRef({
    rotation: [-75, -18] as [number, number],
    scale: 1,
    autoRotate,
    lastInteract: 0,
    grow: 0,
    growStart: 0,
    fly: null as null | { from: [number, number]; to: [number, number]; t0: number },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    land: null as any,
    dots: [] as LngLat[],
    spikes: [] as GlobeSpike[],
    selectedId: undefined as string | undefined,
    projected: [] as { s: GlobeSpike; bx: number; by: number; tx: number; ty: number }[],
  });

  // Load land shapes and precompute halftone dots once
  useEffect(() => {
    let alive = true;
    if (variant !== "earth") {
      setLandReady(true);
      return;
    }
    fetch("/data/land-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        if (!alive) return;
        const land = feature(topo, topo.objects.land);
        st.current.land = land;
        st.current.dots = buildLandDots(land);
        setLandReady(true);
      })
      .catch(() => setLandReady(true));
    return () => {
      alive = false;
    };
  }, [variant]);

  // Responsive sizing
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(280, Math.round(e.contentRect.width));
      setSize({ w, h: Math.round(Math.min(w, maxHeight) * (w < 640 ? 0.95 : 0.9)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight]);

  // New spike set: regrow from the surface
  const spikeKey = spikes.map((s) => `${s.id}:${s.value.toFixed(3)}`).join("|");
  useEffect(() => {
    st.current.spikes = spikes;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    st.current.grow = reduce ? 1 : 0;
    st.current.growStart = performance.now();
  }, [spikeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to the selected site
  const selected = useMemo(() => spikes.find((s) => s.id === selectedId), [spikes, selectedId]);
  useEffect(() => {
    st.current.selectedId = selectedId;
    if (!selected) return;
    const from = [...st.current.rotation] as [number, number];
    let toLng = -selected.lng;
    while (toLng - from[0] > 180) toLng -= 360;
    while (toLng - from[0] < -180) toLng += 360;
    const tiltCap = variant === "earth" ? 60 : 89;
    st.current.fly = { from, to: [toLng, Math.max(-tiltCap, Math.min(tiltCap, -selected.lat))], t0: performance.now() };
    st.current.autoRotate = false;
    st.current.lastInteract = performance.now();
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    const baseR = Math.min(w, h) / 2.55;
    const projection = d3.geoOrthographic().translate([cx, cy]).clipAngle(90);
    const path = d3.geoPath(projection, ctx);
    const graticule = d3.geoGraticule10();
    const planet = variant === "earth" ? null : buildPlanetSpots(variant);
    const ease = d3.easeCubicOut;

    const frame = (now: number) => {
      const s = st.current;
      // idle -> resume auto-rotate after 5 s
      if (autoRotate && !s.autoRotate && !s.fly && now - s.lastInteract > 5000) s.autoRotate = true;
      if (s.fly) {
        const t = Math.min(1, (now - s.fly.t0) / 900);
        const k = d3.easeCubicInOut(t);
        s.rotation = [s.fly.from[0] + (s.fly.to[0] - s.fly.from[0]) * k, s.fly.from[1] + (s.fly.to[1] - s.fly.from[1]) * k];
        if (t >= 1) s.fly = null;
      } else if (s.autoRotate) {
        s.rotation = [s.rotation[0] + 0.12, s.rotation[1]];
      }
      s.grow = Math.min(1, ease(Math.min(1, (now - s.growStart) / 800)));

      const r = baseR * s.scale;
      projection.scale(r).rotate([s.rotation[0], s.rotation[1], 0]);
      ctx.clearRect(0, 0, w, h);

      if (planet) {
        paintPlanet(ctx, path, cx, cy, r, planet);
      } else {
      // Ocean disk + rim
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const pal = VARIANT[variant];
      ctx.fillStyle = pal.ocean;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = pal.rim;
      ctx.stroke();

      // Graticule
      ctx.beginPath();
      path(graticule);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = pal.grid;
      ctx.stroke();

      }

      if (s.land) {
        // Land outline
        ctx.beginPath();
        path(s.land);
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = "rgba(230,230,230,0.45)";
        ctx.stroke();

        // Halftone dots (front hemisphere only)
        const center: LngLat = [-s.rotation[0], -s.rotation[1]];
        ctx.fillStyle = "rgba(170,170,170,0.75)";
        for (const d of s.dots) {
          if (d3.geoDistance(d, center) > Math.PI / 2) continue;
          const p = projection(d);
          if (!p) continue;
          ctx.fillRect(p[0] - 0.65, p[1] - 0.65, 1.3, 1.3);
        }
      }

      // Spikes: in an orthographic view the tip of a radial spike projects to
      // center + (base - center) * (1 + height)
      const center: LngLat = [-s.rotation[0], -s.rotation[1]];
      const projected: typeof s.projected = [];
      const order = (x: GlobeSpike) => (x.id === s.selectedId ? 2 : x.dim ? 0 : 1);
      const ordered = [...s.spikes].sort((a, b) => order(a) - order(b));
      for (const sp of ordered) {
        const ll: LngLat = [sp.lng, sp.lat];
        if (d3.geoDistance(ll, center) > Math.PI / 2 - 0.02) continue;
        const p = projection(ll);
        if (!p) continue;
        const hgt = (0.07 + sp.value * 0.42) * s.grow;
        const tx = cx + (p[0] - cx) * (1 + hgt);
        const ty = cy + (p[1] - cy) * (1 + hgt);
        const isSel = sp.id === s.selectedId;
        ctx.globalAlpha = sp.dim && !isSel ? 0.6 : 1;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(tx, ty);
        ctx.lineWidth = isSel ? 3 : sp.dim ? 1.6 : 2.4;
        ctx.strokeStyle = isSel ? "#FFFFFF" : sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = isSel ? 14 : sp.dim ? 0 : 7;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(p[0], p[1], isSel ? 3.5 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = sp.color;
        ctx.fill();
        if (isSel) {
          const phase = (now % 1200) / 1200;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 4 + phase * 16, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,165,59,${1 - phase})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        if (sp.star && !sp.dim && s.grow > 0.9) {
          ctx.font = "bold 12px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = sp.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText("★", tx, ty);
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        projected.push({ s: sp, bx: p[0], by: p[1], tx, ty });
      }
      s.projected = projected;
    };

    const timer = d3.timer(() => frame(performance.now()));

    // Interaction: drag to rotate (mouse + touch), wheel/pinch-free zoom
    let drag: null | { x: number; y: number; rot: [number, number]; moved: boolean } = null;
    const toLocal = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const nearest = (x: number, y: number) => {
      let best: (typeof st.current.projected)[number] | null = null;
      let bd = 14;
      for (const pr of st.current.projected) {
        // distance from point to spike segment
        const vx = pr.tx - pr.bx, vy = pr.ty - pr.by;
        const L = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - pr.bx) * vx + (y - pr.by) * vy) / L));
        const dx = pr.bx + t * vx - x, dy = pr.by + t * vy - y;
        const d = Math.hypot(dx, dy);
        if (d < bd) {
          bd = d;
          best = pr;
        }
      }
      return best;
    };
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      drag = { x: p.x, y: p.y, rot: [...st.current.rotation] as [number, number], moved: false };
      st.current.autoRotate = false;
      st.current.fly = null;
      st.current.lastInteract = performance.now();
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      if (drag) {
        const dx = p.x - drag.x, dy = p.y - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        const k = 0.35 / st.current.scale;
        st.current.rotation = [drag.rot[0] + dx * k, Math.max(-80, Math.min(80, drag.rot[1] - dy * k))];
        st.current.lastInteract = performance.now();
        setHover(null);
        return;
      }
      const n = nearest(p.x, p.y);
      setHover(n ? { s: n.s, x: n.tx, y: n.ty } : null);
      canvas.style.cursor = n ? "pointer" : "grab";
    };
    const onUp = (e: PointerEvent) => {
      const p = toLocal(e);
      if (drag && !drag.moved) {
        const n = nearest(p.x, p.y);
        if (n && onSelect) onSelect(n.s.id);
      }
      drag = null;
    };
    const onLeave = () => setHover(null);
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return; // don't hijack page scroll
      e.preventDefault();
      st.current.scale = Math.max(0.7, Math.min(2.6, st.current.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
    };
    if (!interactive) {
      return () => timer.stop();
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      timer.stop();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [size, onSelect, variant, interactive, autoRotate]);

  return (
    <div ref={wrapRef} className={`relative w-full select-none ${className}`}>
      <canvas ref={canvasRef} className="block mx-auto touch-none" style={{ cursor: "grab" }} aria-label="Globe of Earth analog sites" role="img" />
      {!landReady && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs tracking-widest text-neutral-500">
          SCANNING EARTH...
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-[#1E1E1E] bg-[#0F1115]/95 px-2.5 py-1.5 text-[11px] text-[#E6E6E6] shadow-lg"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <div className="font-semibold">
            {hover.s.rank ? `#${hover.s.rank} ` : ""}
            {hover.s.label}
          </div>
          {hover.s.sublabel && <div className="text-[#8A8F98]">{hover.s.sublabel}</div>}
          {hover.s.score !== undefined && (
            <div className="font-mono" style={{ color: hover.s.color }}>
              {hover.s.score.toFixed(1)}% match
            </div>
          )}
        </div>
      )}
    </div>
  );
}

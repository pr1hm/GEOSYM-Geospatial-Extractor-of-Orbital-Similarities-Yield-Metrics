"use client";

/**
 * GEOSYM: globe-first explorer.
 * Navbar (Moon/Mars) -> target strip -> hero globe with floating panels ->
 * site drawer -> validation, weights, method, credits.
 * AI-assisted code: written with Claude (Anthropic) during NASA Space Apps 2026,
 * reviewed and integrated by Team TAVME. See README "AI use" section.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  PlanetaryTarget,
  EarthAnalogSite,
  SimilarityWeights,
  AnalogScoreResult,
  MissionBriefResponse,
  FeatureMetadataRegistry,
  PhysicalVector8D,
} from "@/lib/types";
import { DEFAULT_WEIGHTS, PRESET_WEIGHTS, rankEarthAnalogs } from "@/lib/similarityEngine";
import { earthProvenance, PROVENANCE_LABEL, Provenance, LIVE_EXTRACTION_FAILED } from "@/lib/provenance";
import { Panel } from "@/components/hud/Panel";
import { GithubButton, REPO_URL } from "@/components/GithubButton";
import type { GlobeSpike } from "@/components/ui/wireframe-dotted-globe";

const Globe = dynamic(() => import("@/components/ui/wireframe-dotted-globe"), {
  ssr: false,
  loading: () => <div className="flex aspect-square w-full items-center justify-center font-mono text-xs tracking-widest text-muted">SCANNING...</div>,
});

const FEATURE_KEYS: (keyof PhysicalVector8D)[] = [
  "mean_slope_deg",
  "terrain_ruggedness_tri",
  "sar_roughness_db",
  "sar_depolarization_ratio",
  "diurnal_delta_t_c",
  "min_temp_c",
  "iron_oxide_index",
  "basalt_mafic_index",
];

const TOP_N = 10;
const CAT_COLOR = { known: "#3DDC97", india: "#FFA53B", candidate: "#3EA6FF" } as const;
type Cat = keyof typeof CAT_COLOR;
const CAT_LABEL: Record<Cat, string> = { known: "Known NASA analog", india: "India site", candidate: "New candidate" };
const MODE_SHORT: Record<string, string> = {
  rover_mobility: "Rover",
  thermal_cryo: "Cryo",
  isru_mineralogy: "ISRU",
  hazard_autonomy: "Hazard",
  balanced: "Balanced",
};

const categoryOf = (s: EarthAnalogSite): Cat => (/india/i.test(s.region_country) ? "india" : s.is_known_nasa_analog ? "known" : "candidate");
const barColor = (p: number) => (p >= 75 ? "#3DDC97" : p >= 50 ? "#F5C542" : "#E5484D");

function fmt(v: number | undefined, unit = "") {
  if (v === undefined || v === null || Number.isNaN(v)) return "n/a";
  const a = Math.abs(v);
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2);
  return unit ? `${s} ${unit}` : s;
}

function ProvBadge({ p }: { p: Provenance }) {
  const cls = p === "measured" ? "border-good/40 text-good" : p === "reference" ? "border-cand/40 text-cand" : "border-partial/40 text-partial";
  return <span className={`rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wider ${cls}`}>{PROVENANCE_LABEL[p]}</span>;
}

function Float({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative border border-line bg-bg/75 backdrop-blur-sm ${className}`}>
      <span className="hud-corner left-[-1px] top-[-1px] border-l border-t" />
      <span className="hud-corner right-[-1px] top-[-1px] border-r border-t" />
      <span className="hud-corner bottom-[-1px] left-[-1px] border-b border-l" />
      <span className="hud-corner bottom-[-1px] right-[-1px] border-b border-r" />
      {children}
    </div>
  );
}

type Filter = "ALL" | Cat;
type Tab = "overview" | "features" | "breaks" | "brief";

export default function Page() {
  const [targets, setTargets] = useState<PlanetaryTarget[]>([]);
  const [sites, setSites] = useState<EarthAnalogSite[]>([]);
  const [meta, setMeta] = useState<FeatureMetadataRegistry | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [body, setBody] = useState<"Moon" | "Mars">("Moon");
  const [targetId, setTargetId] = useState("");
  const [preset, setPreset] = useState("rover_mobility");
  const [weights, setWeights] = useState<SimilarityWeights>(PRESET_WEIGHTS.rover_mobility?.weights ?? DEFAULT_WEIGHTS);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [brief, setBrief] = useState<MissionBriefResponse | null>(null);
  const [briefSource, setBriefSource] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, e] = await Promise.all([fetch("/data/planetary_targets.json"), fetch("/data/earth_analogs.json")]);
        if (!t.ok || !e.ok) throw new Error("load");
        const tj = await t.json();
        const ej = await e.json();
        setTargets(tj.targets || []);
        setSites(ej.sites || []);
        setMeta(ej.features_metadata || tj.features_metadata);
        const first = (tj.targets || []).find((x: PlanetaryTarget) => x.id === "moon_malapert_massif") || tj.targets?.[0];
        if (first) {
          setTargetId(first.id);
          setBody(first.target_body);
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close drawer with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const target = useMemo(() => targets.find((t) => t.id === targetId) || targets[0], [targets, targetId]);
  const bodyTargets = useMemo(() => targets.filter((t) => t.target_body === body), [targets, body]);

  const ranked = useMemo(() => (target && sites.length ? rankEarthAnalogs(target, sites, weights, meta) : []), [target, sites, weights, meta]);
  const rankOf = useMemo(() => new Map(ranked.map((r, i) => [r.site.id, i + 1])), [ranked]);
  const visible = useMemo(() => ranked.filter((r) => filter === "ALL" || categoryOf(r.site) === filter), [ranked, filter]);
  const topIds = useMemo(() => new Set(visible.slice(0, TOP_N).map((r) => r.site.id)), [visible]);

  useEffect(() => {
    if (ranked.length && !ranked.some((r) => r.site.id === selectedId)) setSelectedId(ranked[0].site.id);
  }, [ranked, selectedId]);
  useEffect(() => setBrief(null), [selectedId, targetId]);

  const selected: AnalogScoreResult | undefined = useMemo(() => ranked.find((r) => r.site.id === selectedId) || ranked[0], [ranked, selectedId]);

  const spikes: GlobeSpike[] = useMemo(() => {
    if (!visible.length) return [];
    const scores = visible.map((r) => r.match_score_pct);
    const lo = Math.min(...scores);
    const hi = Math.max(...scores);
    return visible.map((r) => {
      const cat = categoryOf(r.site);
      return {
        id: r.site.id,
        lat: r.site.latitude,
        lng: r.site.longitude,
        value: Math.pow((r.match_score_pct - lo) / Math.max(1e-6, hi - lo), 1.6),
        color: CAT_COLOR[cat],
        label: r.site.name,
        sublabel: r.site.region_country,
        score: r.match_score_pct,
        rank: rankOf.get(r.site.id),
        dim: !topIds.has(r.site.id),
        star: !r.site.is_known_nasa_analog,
      };
    });
  }, [visible, rankOf, topIds]);

  const targetMarker: GlobeSpike[] = useMemo(
    () => (target ? [{ id: target.id, lat: target.latitude, lng: target.longitude, value: 0.35, color: "#FFA53B", label: target.name }] : []),
    [target],
  );

  // Score every site against every target (same weights) to find each site's best twin
  const bestTwin = useMemo(() => {
    const best = new Map<string, { target: PlanetaryTarget; score: number }>();
    if (!sites.length) return best;
    targets.forEach((t) => {
      rankEarthAnalogs(t, sites, weights, meta).forEach((r) => {
        const cur = best.get(r.site.id);
        if (!cur || r.match_score_pct > cur.score) best.set(r.site.id, { target: t, score: r.match_score_pct });
      });
    });
    return best;
  }, [targets, sites, weights, meta]);

  const [discFilter, setDiscFilter] = useState<"all" | "india">("all");
  const discoveries = useMemo(() => {
    const knownScores = ranked.filter((r) => r.site.is_known_nasa_analog).map((r) => r.match_score_pct).sort((a, b) => a - b);
    const medianKnown = knownScores.length ? knownScores[Math.floor(knownScores.length / 2)] : 0;
    const fresh = ranked.filter((r) => !r.site.is_known_nasa_analog);
    const beat = fresh.filter((r) => r.match_score_pct > medianKnown).length;
    const list = fresh.filter((r) => discFilter === "all" || /india/i.test(r.site.region_country));
    return { medianKnown, beat, total: fresh.length, list: list.slice(0, 8), indiaCount: fresh.filter((r) => /india/i.test(r.site.region_country)).length };
  }, [ranked, discFilter]);

  const newInTop = useMemo(() => visible.slice(0, TOP_N).filter((r) => !r.site.is_known_nasa_analog).length, [visible]);

  const validation = useMemo(() => {
    const known = ranked.map((r, i) => ({ r, rank: i + 1 })).filter((x) => x.r.site.is_known_nasa_analog);
    const half = Math.ceil(ranked.length / 2);
    const ranks = known.map((k) => k.rank).sort((a, b) => a - b);
    return {
      known,
      inTopHalf: known.filter((k) => k.rank <= half).length,
      total: known.length,
      median: ranks.length ? ranks[Math.floor(ranks.length / 2)] : 0,
      n: ranked.length,
    };
  }, [ranked]);

  const openSite = useCallback((id: string) => {
    setSelectedId(id);
    setTab("overview");
    setDrawerOpen(true);
  }, []);

  const switchBody = (b: "Moon" | "Mars") => {
    setBody(b);
    const t = targets.find((x) => x.target_body === b);
    if (t) setTargetId(t.id);
    setDrawerOpen(false);
  };

  const choosePreset = (k: string) => {
    setPreset(k);
    if (PRESET_WEIGHTS[k]) setWeights(PRESET_WEIGHTS[k].weights);
  };

  const generateBrief = async () => {
    if (!target || !selected) return;
    setBriefLoading(true);
    try {
      const res = await fetch("/api/mission-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, result: selected }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
        setBriefSource(data.source || "");
      }
    } finally {
      setBriefLoading(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-bg font-mono text-xs tracking-[0.3em] text-accent">LOADING ANALOG DATA...</div>;
  if (loadError || !target)
    return <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-center text-sm text-muted">Couldn&apos;t load the data files in /public/data. Run the pipeline export, then reload.</div>;

  const selCat = selected ? categoryOf(selected.site) : "candidate";
  const breaks = selected?.feature_breakdowns.filter((f) => f.similarity_pct < 50) ?? [];
  const strong = [...(selected?.feature_breakdowns ?? [])].sort((a, b) => b.similarity_pct - a.similarity_pct).slice(0, 3);
  const vacuum = target.atmospheric_pressure_bar < 1e-6;

  const topList = (
    <>
      <div className="mb-2 flex flex-wrap gap-1">
        {(["ALL", "known", "india", "candidate"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${filter === f ? "border-accent text-accent" : "border-line text-muted hover:text-ink"}`}
          >
            {f === "ALL" ? "All" : f === "candidate" ? "New" : f === "known" ? "Known" : "India"}
          </button>
        ))}
      </div>
      <ol>
        {visible.slice(0, TOP_N).map((r) => {
          const cat = categoryOf(r.site);
          const sel = r.site.id === selected?.site.id && drawerOpen;
          return (
            <li key={r.site.id}>
              <button
                onClick={() => openSite(r.site.id)}
                className={`flex w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left transition-colors ${sel ? "border-accent bg-accent/10" : "border-transparent hover:border-accent/60 hover:bg-white/[0.03]"}`}
              >
                <span className="w-5 font-mono text-[11px] text-muted">{rankOf.get(r.site.id)}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: CAT_COLOR[cat] }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px]">{r.site.name}</span>
                    {!r.site.is_known_nasa_analog && <span className="shrink-0 border border-accent/60 px-1 font-mono text-[8.5px] leading-[13px] text-accent">NEW</span>}
                  </span>
                  <span className="block h-[2px] w-full bg-line">
                    <span className="block h-full" style={{ width: `${r.match_score_pct}%`, background: CAT_COLOR[cat] }} />
                  </span>
                </span>
                <span className="w-10 text-right font-mono text-[12px]">{r.match_score_pct.toFixed(1)}</span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && <li className="py-3 text-center text-[12px] text-muted">No sites in this filter.</li>}
      </ol>
    </>
  );

  const targetCard = (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent">{target.target_body} target</div>
          <div className="font-display text-lg font-semibold leading-tight">{target.name}</div>
        </div>
        <span className="font-mono text-[11px] text-muted">
          {target.latitude.toFixed(1)}°, {target.longitude.toFixed(1)}°
        </span>
      </div>
      <div className="mx-auto mt-1 w-[220px]">
        <Globe
          key={target.target_body}
          variant={target.target_body === "Moon" ? "moon" : "mars"}
          spikes={targetMarker}
          selectedId={target.id}
          autoRotate={false}
          interactive={true}
          maxHeight={240}
        />
      </div>
      <p className="-mt-1 mb-1 text-center font-mono text-[10px] text-muted">Orange marker = target location · drag to look around</p>
      <p className="text-[12px] leading-snug text-muted">{target.mission_context}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2 font-mono text-[11px]">
        <div>
          <div className="text-muted">Gravity</div>
          <div>{target.target_gravity_g} g</div>
        </div>
        <div>
          <div className="text-muted">Atmosphere</div>
          <div>{vacuum ? "vacuum" : `${target.atmospheric_pressure_bar} bar`}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-hud-grid text-ink">
      {/* ===== Navbar ===== */}
      <nav className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1680px] items-center justify-between gap-3 px-4">
          <a href="#explore" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center border border-accent font-display text-xs font-bold text-accent">GS</span>
            <span className="hidden sm:block">
              <span className="block font-display text-sm font-bold tracking-[0.2em]">GEOSYM</span>
              <span className="block text-[10px] text-muted">Earth analogs for Moon &amp; Mars</span>
            </span>
          </a>
          <div className="grid grid-cols-2 border border-line" role="tablist" aria-label="Choose Moon or Mars">
            {(["Moon", "Mars"] as const).map((b) => (
              <button
                key={b}
                role="tab"
                aria-selected={body === b}
                onClick={() => switchBody(b)}
                className={`flex items-center gap-2 px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors sm:px-6 ${
                  body === b ? (b === "Moon" ? "bg-ink/10 text-ink" : "bg-accent/15 text-accent") : "text-muted hover:text-ink"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${b === "Moon" ? "bg-[#C9CCD2]" : "bg-[#E2552D]"}`} />
                {b}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-5 font-mono text-[11px] uppercase tracking-wider text-muted md:flex">
              <a href="#explore" className="hover:text-accent">Explore</a>
              <a href="#discoveries" className="hover:text-accent">New sites</a>
              <a href="#validation" className="hover:text-accent">Validation</a>
              <a href="/method" className="hover:text-accent">Method</a>
              <a href="/method#credits" className="hover:text-accent">About</a>
            </div>
            <GithubButton />
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section id="explore" className="relative scroll-mt-14">
        {/* Target strip */}
        <div className="border-b border-line">
          <div className="mx-auto flex max-w-[1680px] items-center gap-2 overflow-x-auto px-4 py-2">
            <div className="mr-1 flex shrink-0 items-center gap-2 border-r border-line pr-3">
              <span className={`h-2 w-2 rounded-full ${body === "Moon" ? "bg-[#C9CCD2]" : "bg-[#E2552D]"}`} />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-accent">{body} targets</span>
              <span className="font-mono text-[11px] text-muted">›</span>
            </div>
            {bodyTargets.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTargetId(t.id);
                  setDrawerOpen(false);
                }}
                className={`shrink-0 border px-3 py-1 text-[12px] transition-colors ${t.id === target.id ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:border-muted hover:text-ink"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-[1680px] px-4 pb-6 pt-3 xl:min-h-[calc(100vh-56px-45px)]">
          <div className="mb-1 text-center">
            <h1 className="font-display text-xl font-semibold tracking-wide sm:text-2xl">
              Where on Earth is <span className="text-accent">{target.name}</span>?
            </h1>
            <p className="text-[12px] text-muted">
              Top {TOP_N} Earth analogs glow · <span className="text-ink">★ {newInTop} new candidates in the top {TOP_N}</span> · {ranked.length} sites scored · mode:{" "}
              {PRESET_WEIGHTS[preset]?.label ?? "custom weights"}
            </p>
          </div>

          {/* Globe */}
          <div className="mx-auto max-w-[760px]">
            <Globe spikes={spikes} selectedId={drawerOpen ? selected?.site.id : undefined} onSelect={openSite} maxHeight={720} />
          </div>

          {/* Mission mode bar */}
          <div className="mt-3 flex justify-center xl:absolute xl:bottom-6 xl:left-1/2 xl:mt-0 xl:-translate-x-1/2">
            <Float className="max-w-full">
              <div className="flex items-center gap-1 overflow-x-auto p-1.5">
                <span className="mr-1 hidden shrink-0 items-center gap-2 border-r border-line px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-accent sm:flex">
                  Mission mode <span className="text-muted">›</span>
                </span>
                {Object.keys(PRESET_WEIGHTS).map((k) => (
                  <button
                    key={k}
                    onClick={() => choosePreset(k)}
                    title={PRESET_WEIGHTS[k].description}
                    className={`shrink-0 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${preset === k ? "bg-accent text-bg" : "text-muted hover:text-ink"}`}
                  >
                    {MODE_SHORT[k] ?? PRESET_WEIGHTS[k].label}
                  </button>
                ))}
              </div>
            </Float>
          </div>

          {/* Floating panels (desktop) */}
          <Float className="mx-auto mt-3 w-full max-w-[420px] xl:absolute xl:left-4 xl:top-16 xl:mt-0 xl:w-[300px]">{targetCard}</Float>
          <Float className="mx-auto mt-3 w-full max-w-[420px] xl:absolute xl:right-4 xl:top-16 xl:mt-0 xl:w-[320px]">
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-[13px] font-semibold uppercase tracking-[0.14em]">Top matches</span>
                <span className="font-mono text-[10px] text-muted">click to open</span>
              </div>
              {topList}
            </div>
          </Float>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap justify-center gap-4 font-mono text-[10px] text-muted xl:absolute xl:bottom-6 xl:left-4 xl:mt-0 xl:flex-col xl:gap-1">
            {(Object.keys(CAT_COLOR) as Cat[]).map((c) => (
              <span key={c}>
                <span style={{ color: CAT_COLOR[c] }}>●</span> {CAT_LABEL[c]}
              </span>
            ))}
            <span>★ = new candidate in top {TOP_N}</span>
            <span>Faint = outside top {TOP_N}</span>
          </div>
          <div className="mt-2 text-center font-mono text-[10px] text-muted xl:absolute xl:bottom-6 xl:right-4 xl:mt-0">Drag to rotate · Ctrl + scroll to zoom</div>
        </div>
      </section>

      {/* ===== New candidate sites ===== */}
      <section id="discoveries" className="mx-auto max-w-[1680px] scroll-mt-16 px-4 pt-8">
        <Panel
          tag="01"
          title="New candidate sites we found"
          right={<span className="font-mono text-[10px] text-muted">{discoveries.total} flagged · not on NASA&apos;s analog list</span>}
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <p className="max-w-3xl text-[13px] leading-relaxed text-muted">
              <span className="font-mono text-3xl text-accent">{discoveries.beat}</span> new sites score higher than the median known NASA analog (
              <span className="font-mono text-ink">{discoveries.medianKnown.toFixed(1)}%</span>) for <span className="text-ink">{target.name}</span>. These are candidates flagged by
              our engine, not yet field-checked.
            </p>
            <div className="flex gap-1">
              {(
                [
                  ["all", `All new (${discoveries.total})`],
                  ["india", `India spotlight (${discoveries.indiaCount})`],
                ] as ["all" | "india", string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setDiscFilter(k)}
                  className={`border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider ${discFilter === k ? "border-accent text-accent" : "border-line text-muted hover:text-ink"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {discoveries.list.map((r) => {
              const twin = bestTwin.get(r.site.id);
              const top3 = [...r.feature_breakdowns].sort((a, b) => b.similarity_pct - a.similarity_pct).slice(0, 3);
              const india = /india/i.test(r.site.region_country);
              const estimated = LIVE_EXTRACTION_FAILED.has(r.site.id);
              return (
                <button
                  key={r.site.id}
                  onClick={() => openSite(r.site.id)}
                  className="group relative flex flex-col gap-2 border border-line bg-bg/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_0_20px_-6px_rgba(255,165,59,0.5)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: india ? CAT_COLOR.india : CAT_COLOR.candidate }}>
                        ★ New candidate{india ? " · India" : ""}
                      </div>
                      <div className="truncate font-display text-[15px] font-semibold">{r.site.name}</div>
                      <div className="truncate text-[11.5px] text-muted">{r.site.region_country}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xl text-accent">{r.match_score_pct.toFixed(1)}%</div>
                      <div className="font-mono text-[10px] text-muted">#{rankOf.get(r.site.id)} of {ranked.length}</div>
                    </div>
                  </div>
                  {twin && (
                    <div className="border-l-2 border-accent/70 pl-2 text-[11.5px]">
                      <span className="text-muted">Best twin: </span>
                      <span className="text-ink">{twin.target.name}</span>
                      <span className="text-muted">
                        {" "}
                        ({twin.target.target_body}, {twin.score.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    {top3.map((f) => (
                      <div key={f.key} className="flex items-center gap-2 text-[10.5px]">
                        <span className="w-28 truncate text-muted">{meta?.[f.key]?.label || f.label}</span>
                        <span className="h-1 flex-1 bg-line">
                          <span className="block h-full" style={{ width: `${f.similarity_pct}%`, background: barColor(f.similarity_pct) }} />
                        </span>
                        <span className="w-8 text-right font-mono">{f.similarity_pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <ProvBadge p={estimated ? "estimated" : "measured"} />
                    <span className="font-mono text-[10.5px] text-muted group-hover:text-accent">Open →</span>
                  </div>
                </button>
              );
            })}
            {discoveries.list.length === 0 && <div className="py-6 text-center text-[12px] text-muted sm:col-span-2 xl:col-span-4">No new candidates in this filter.</div>}
          </div>
          <p className="mt-3 text-[10.5px] text-muted">
            Best twin = the Moon/Mars target this site matches most closely across all {targets.length} targets, using the current mission mode. Badge shows whether its terrain values are live
            satellite measurements or estimates.
          </p>
        </Panel>
      </section>

      {/* ===== Validation ===== */}
      <section id="validation" className="mx-auto max-w-[1680px] scroll-mt-16 px-4 py-8">
        <Panel tag="02" title="Validation: does the method find known analogs?">
          <p className="text-[13px] leading-relaxed text-muted">
            <span className="font-mono text-2xl text-accent">
              {validation.inTopHalf}/{validation.total}
            </span>{" "}
            known NASA analogs rank in the top half of {validation.n} sites for {target.name} (median rank{" "}
            <span className="font-mono text-ink">{validation.median}</span>). Changing the target or mission mode updates this.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {validation.known.map((k) => (
              <button key={k.r.site.id} onClick={() => openSite(k.r.site.id)} className="flex items-center gap-2 border-b border-line/60 py-1.5 text-left text-[12px] hover:text-accent">
                <span className="w-8 font-mono text-muted">#{k.rank}</span>
                <span className="flex-1 truncate">{k.r.site.name}</span>
                <span className="font-mono">{k.r.match_score_pct.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      {/* ===== Fine-tune weights ===== */}
      <section className="mx-auto max-w-[1680px] px-4 pb-8">
        <Panel
          tag="03"
          title="Fine-tune feature weights"
          right={
            <button onClick={() => choosePreset(preset in PRESET_WEIGHTS ? preset : "balanced")} className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline">
              Reset to mode
            </button>
          }
        >
          <p className="mb-3 text-[12px] text-muted">Drag a slider to tell the engine what matters for your test. The globe and rankings above update instantly.</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_KEYS.map((k) => (
              <label key={k} className="text-[11.5px]">
                <div className="flex justify-between text-muted">
                  <span>{meta?.[k]?.label || k}</span>
                  <span className="font-mono text-ink">{weights[k].toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.1}
                  value={weights[k]}
                  onChange={(e) => {
                    setPreset("custom");
                    setWeights((w) => ({ ...w, [k]: parseFloat(e.target.value) }));
                  }}
                  className="mt-1 w-full"
                />
              </label>
            ))}
          </div>
        </Panel>
      </section>

      {/* ===== How it works CTA ===== */}
      <section className="mx-auto max-w-[1680px] px-4 pb-10">
        <a
          href="/method"
          className="group relative flex flex-wrap items-center justify-between gap-4 overflow-hidden border border-line bg-panel/80 px-6 py-6 transition-colors hover:border-accent"
        >
          <span className="hud-corner left-[-1px] top-[-1px] border-l border-t" />
          <span className="hud-corner bottom-[-1px] right-[-1px] border-b border-r" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">How it works</div>
            <div className="font-display text-xl font-semibold">See the method, try the math, and check the data</div>
            <p className="text-[12.5px] text-muted">An interactive walkthrough of the pipeline, the 8 features, Earth&apos;s limits, AI use and credits.</p>
          </div>
          <span className="font-mono text-sm text-accent transition-transform group-hover:translate-x-1">Open the method page →</span>
        </a>
      </section>

      {/* ===== Site drawer ===== */}
      {drawerOpen && <button aria-label="Close details" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
      <aside
        aria-hidden={!drawerOpen}
        className={`fixed z-50 flex flex-col border-line bg-panel/95 backdrop-blur transition-transform duration-300 ease-out
          inset-x-0 bottom-0 max-h-[82vh] rounded-t-lg border-t lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-14 lg:max-h-none lg:w-[460px] lg:rounded-none lg:border-l lg:border-t-0
          ${drawerOpen ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"}`}
      >
        {selected && (
          <>
            <div className="border-b border-line p-4">
              {!selected.site.is_known_nasa_analog && (
                <div className="mb-3 border border-accent/50 bg-accent/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-accent">
                  ★ New candidate · not on NASA&apos;s analog list
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg text-accent">#{rankOf.get(selected.site.id)}</span>
                    <span className="rounded-sm border px-1.5 py-px text-[10.5px]" style={{ borderColor: CAT_COLOR[selCat], color: CAT_COLOR[selCat] }}>
                      {CAT_LABEL[selCat]}
                    </span>
                  </div>
                  <h2 className="mt-0.5 font-display text-xl font-semibold leading-tight">{selected.site.name}</h2>
                  <p className="font-mono text-[11px] text-muted">
                    {selected.site.region_country} · {selected.site.latitude.toFixed(2)}°, {selected.site.longitude.toFixed(2)}°
                  </p>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="border border-line px-2 py-1 font-mono text-xs text-muted hover:border-accent hover:text-accent" aria-label="Close">
                  ✕
                </button>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Match to {target.name}</div>
                  <div className="font-mono text-3xl text-accent">{selected.match_score_pct.toFixed(1)}%</div>
                </div>
                <div className="text-right font-mono text-[11px] text-muted">
                  <div>{selected.site.cluster_name}</div>
                  <div>elev {fmt(selected.site.elevation_m, "m")}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 border border-line">
                {(
                  [
                    ["overview", "Overview"],
                    ["features", "Features"],
                    ["breaks", "Breaks"],
                    ["brief", "Test brief"],
                  ] as [Tab, string][]
                ).map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} className={`py-1.5 font-mono text-[10.5px] uppercase tracking-wider ${tab === k ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-[12.5px] leading-relaxed">
              {tab === "overview" && (
                <div className="flex flex-col gap-4">
                  <div className="border-l-2 border-good pl-3">
                    <h3 className="font-mono text-[11px] uppercase tracking-wider text-good">Why it matches</h3>
                    <p>Closest on {strong.map((s) => `${(meta?.[s.key]?.label || s.label).toLowerCase()} (${s.similarity_pct}%)`).join(", ")}.</p>
                    <p className="mt-1 text-muted">{selected.site.geological_summary}</p>
                  </div>
                  <div className="border-l-2 border-accent pl-3">
                    <h3 className="font-mono text-[11px] uppercase tracking-wider text-accent">What to test here</h3>
                    <p className="text-muted">{selected.site.target_mission_relevance}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {target.key_subsystems_to_test.map((k) => (
                        <span key={k} className="border border-line px-1.5 py-0.5 text-[11px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="border-l-2 border-warn pl-3">
                    <h3 className="font-mono text-[11px] uppercase tracking-wider text-warn">Biggest gap</h3>
                    <p className="text-muted">
                      {breaks.length
                        ? `${breaks.length} feature${breaks.length > 1 ? "s" : ""} below 50%, plus gravity, atmosphere and radiation. See the Breaks tab.`
                        : "No feature below 50%. Gravity, atmosphere and radiation still differ. See the Breaks tab."}
                    </p>
                  </div>
                </div>
              )}

              {tab === "features" && (
                <div className="flex flex-col gap-3">
                  {selected.feature_breakdowns.map((f) => (
                    <div key={f.key}>
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="flex items-center gap-2">
                          {meta?.[f.key]?.label || f.label}
                          <ProvBadge p={earthProvenance(selected.site.id, f.key)} />
                        </span>
                        <span className="font-mono" style={{ color: barColor(f.similarity_pct) }}>
                          {f.similarity_pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-line">
                        <div className="h-full transition-[width] duration-500" style={{ width: `${f.similarity_pct}%`, background: barColor(f.similarity_pct) }} />
                      </div>
                      <div className="mt-0.5 flex justify-between font-mono text-[10.5px] text-muted">
                        <span>
                          {target.target_body}: {fmt(f.target_raw, f.unit)}
                        </span>
                        <span>Earth: {fmt(f.analog_raw, f.unit)}</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10.5px] text-muted">
                    <ProvBadge p="measured" /> live satellite extraction · <ProvBadge p="estimated" /> calibrated estimate · {target.target_body} values from mission literature.
                  </p>
                </div>
              )}

              {tab === "breaks" && (
                <ul className="list-disc space-y-1.5 pl-4 text-muted">
                  {breaks.map((b) => (
                    <li key={b.key}>
                      <span className="text-ink">{meta?.[b.key]?.label || b.label}</span>: Earth {fmt(b.analog_raw, b.unit)} vs {target.target_body} {fmt(b.target_raw, b.unit)} ({b.similarity_pct}% match)
                    </li>
                  ))}
                  <li>
                    <span className="text-ink">Gravity</span>: Earth 1 g vs {target.target_body} {target.target_gravity_g} g. Wheel traction, dust behaviour and suit loads differ.
                  </li>
                  <li>
                    <span className="text-ink">Atmosphere</span>: Earth ~1 bar vs {vacuum ? "near-vacuum" : `${target.atmospheric_pressure_bar} bar CO₂`}. Heat transfer and outgassing can&apos;t be tested here.
                  </li>
                  <li>
                    <span className="text-ink">Radiation</span>: Earth&apos;s magnetic field and air shield the surface; the {target.target_body} has neither.
                  </li>
                  <li>Pair field tests here with thermal-vacuum chamber and reduced-gravity tests.</li>
                </ul>
              )}

              {tab === "brief" && (
                <div>
                  <p className="text-muted">Draft a field-test protocol for this site with an AI model (Llama 3.3 via Groq). It&apos;s a starting point for engineers, not a verified plan.</p>
                  <button
                    onClick={generateBrief}
                    disabled={briefLoading}
                    className="mt-3 bg-accent px-4 py-2 font-mono text-[12px] font-medium uppercase tracking-wider text-bg transition-all hover:shadow-[0_0_18px_rgba(255,165,59,0.45)] active:scale-[0.98] disabled:opacity-60"
                  >
                    {briefLoading ? "Generating..." : "Generate test brief"}
                  </button>
                  {brief && (
                    <div className="mt-4 flex flex-col gap-3">
                      <p>{brief.executive_summary}</p>
                      {brief.hardware_to_test.map((h, i) => (
                        <div key={i} className="border border-line p-3">
                          <div className="font-medium text-accent">{h.system_name}</div>
                          <div className="font-mono text-[10.5px] text-muted">{h.subsystem_type}</div>
                          <p className="mt-1 text-muted">{h.test_protocol}</p>
                        </div>
                      ))}
                      <div className="font-mono text-[10px] text-muted">AI-generated{briefSource ? ` · ${briefSource}` : ""}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      <footer className="border-t border-line px-4 py-4">
        <div className="mx-auto flex max-w-[1680px] flex-wrap justify-between gap-2 text-[11px] text-muted">
          <span>Built for the 2026 NASA Space Apps Challenge · Team TAVME · <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Source code on GitHub ↗</a></span>
          <span>Built with AI assistance (Claude) · Data: ESA Copernicus, NASA, Microsoft Planetary Computer, Natural Earth</span>
        </div>
      </footer>
    </div>
  );
}

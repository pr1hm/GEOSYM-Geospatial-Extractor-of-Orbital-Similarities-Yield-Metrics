"use client";

/**
 * GEOSYM method page: animated pipeline, interactive "try the math" playground,
 * flip cards for the 8 features, Earth's limits, AI use and credits.
 * AI-assisted code: written with Claude (Anthropic) during NASA Space Apps 2026,
 * reviewed and integrated by Dinoco Studios. See README "AI use" section.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PlanetaryTarget, EarthAnalogSite, FeatureMetadataRegistry, PhysicalVector8D } from "@/lib/types";
import { PRESET_WEIGHTS, rankEarthAnalogs } from "@/lib/similarityEngine";
import { LIVE_FEATURES, PROVENANCE_LABEL } from "@/lib/provenance";
import { Reveal, CountUp, useInView } from "@/components/method/fx";
import { GithubButton } from "@/components/GithubButton";

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

const FEATURE_GLYPH: Record<keyof PhysicalVector8D, string> = {
  mean_slope_deg: "∠",
  terrain_ruggedness_tri: "▲▼",
  sar_roughness_db: "≋",
  sar_depolarization_ratio: "⇄",
  diurnal_delta_t_c: "Δt",
  min_temp_c: "❄",
  iron_oxide_index: "Fe",
  basalt_mafic_index: "⬢",
};

const FEATURE_WHY: Record<keyof PhysicalVector8D, string> = {
  mean_slope_deg: "Landers and rovers have tilt limits. Matching slope tests touchdown safety and climbing.",
  terrain_ruggedness_tri: "Boulder fields and crater rims are what break wheels and confuse navigation.",
  sar_roughness_db: "Radar sees surface texture at wheel scale: fine dust vs gravel decides traction.",
  sar_depolarization_ratio: "High values flag blocky lava and buried ice: key for drills and habitats.",
  diurnal_delta_t_c: "Big day-night swings fatigue solar panels, seals and electronics.",
  min_temp_c: "Cold nights test batteries, lubricants and heaters for polar missions.",
  iron_oxide_index: "Oxidised iron mimics Martian dust chemistry for sampling and instruments.",
  basalt_mafic_index: "Basaltic minerals are the raw material for in-situ resource use (oxygen, bricks).",
};

const STEPS = [
  { t: "Filter Earth", d: "Keep only bare ground and ice (ESA WorldCover), then cut 5 × 5 km tiles. Forests, farms, cities and water are dropped.", k: "63 sites" },
  { t: "Measure 8 features", d: "Terrain from Copernicus DEM, radar texture from Sentinel-1, temperature from MODIS, minerals from HLS.", k: "8 numbers per site" },
  { t: "Scale to 0–1", d: "Every feature is put on the same 0–1 scale using fixed physical bounds, so slope and temperature can be compared fairly.", k: "same scale" },
  { t: "Compare with the target", d: "Each Moon/Mars target has the same 8 features. The match is 1 minus the weighted average difference.", k: "weighted distance" },
  { t: "Validate", d: "Known NASA analogs (Haughton, Atacama, McMurdo…) should rank high. If they don't, the method is wrong.", k: "known analogs as a check" },
];

function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-4">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center border border-accent font-display text-xs font-bold text-accent">GS</span>
          <span className="hidden font-display text-sm font-bold tracking-[0.2em] sm:block">GEOSYM</span>
        </a>
        <div className="flex items-center gap-3 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-muted sm:gap-5">
          <a href="/" className="hover:text-accent">Explore</a>
          <a href="/#discoveries" className="hover:text-accent">New sites</a>
          <a href="/#validation" className="hidden hover:text-accent sm:inline">Validation</a>
          <span className="text-accent">Method</span>
          <a href="#credits" className="hover:text-accent">Credits</a>
          <GithubButton />
        </div>
      </div>
    </nav>
  );
}

function SectionTitle({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <Reveal className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">{tag}</div>
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
      {sub && <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{sub}</p>}
    </Reveal>
  );
}

function Pipeline() {
  const wrap = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.6 - r.top) / Math.max(1, r.height);
      setProgress(Math.max(0, Math.min(1, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div ref={wrap} className="relative pl-10 sm:pl-14">
      <div className="absolute left-3 top-1 bottom-1 w-px bg-line sm:left-5" />
      <div className="absolute left-3 top-1 w-px bg-accent shadow-[0_0_10px_rgba(255,165,59,0.7)] sm:left-5" style={{ height: `${progress * 100}%` }} />
      <div className="flex flex-col gap-8">
        {STEPS.map((s, i) => {
          const lit = progress >= i / STEPS.length;
          return (
            <Reveal key={s.t} delay={i * 60}>
              <div className="relative">
                <span
                  className={`absolute -left-[34px] top-1 flex h-6 w-6 items-center justify-center border font-mono text-[11px] transition-colors sm:-left-[46px] ${
                    lit ? "border-accent bg-accent text-bg" : "border-line bg-bg text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="border border-line bg-panel/80 p-4 transition-colors hover:border-accent/60">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{s.t}</h3>
                    <span className="font-mono text-[11px] text-accent">{s.k}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

function Playground({ targets, sites, meta }: { targets: PlanetaryTarget[]; sites: EarthAnalogSite[]; meta?: FeatureMetadataRegistry }) {
  const [tId, setTId] = useState("moon_malapert_massif");
  const [sId, setSId] = useState("known_lonar_crater");
  const [mode, setMode] = useState("rover_mobility");
  const target = targets.find((t) => t.id === tId) || targets[0];
  const site = sites.find((s) => s.id === sId) || sites[0];
  const weights = PRESET_WEIGHTS[mode]?.weights;
  const res = useMemo(() => (target && site && weights ? rankEarthAnalogs(target, [site], weights, meta)[0] : undefined), [target, site, weights, meta]);
  if (!target || !site || !res || !weights) return null;

  const rows = res.feature_breakdowns.map((f) => ({ ...f, w: weights[f.key], contrib: weights[f.key] * f.delta_norm }));
  const sumW = rows.reduce((a, r) => a + r.w, 0);
  const sumC = rows.reduce((a, r) => a + r.contrib, 0);
  const score = Math.max(0, 1 - sumC / Math.max(1e-9, sumW)) * 100;
  const sel = "w-full border border-line bg-bg px-2 py-1.5 text-[12.5px] text-ink focus:border-accent focus:outline-none";

  return (
    <div className="border border-line bg-panel/80">
      <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-3">
        <label className="text-[11px] text-muted">
          Moon / Mars target
          <select value={tId} onChange={(e) => setTId(e.target.value)} className={sel}>
            {(["Moon", "Mars"] as const).map((b) => (
              <optgroup key={b} label={b}>
                {targets.filter((t) => t.target_body === b).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-muted">
          Earth site
          <select value={sId} onChange={(e) => setSId(e.target.value)} className={sel}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-muted">
          Mission mode (sets the weights)
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={sel}>
            {Object.entries(PRESET_WEIGHTS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="p-4">
        <div className="mb-2 flex flex-wrap gap-4 font-mono text-[10.5px] text-muted">
          <span>
            <span className="text-accent">▼</span> {target.name}
          </span>
          <span>
            <span className="text-cand">●</span> {site.name}
          </span>
          <span>gap = |Earth − target| on the 0–1 scale</span>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const a = Math.min(r.target_norm, r.analog_norm) * 100;
            const b = Math.max(r.target_norm, r.analog_norm) * 100;
            return (
              <div key={r.key} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3 sm:grid-cols-[180px_1fr_200px]">
                <div className="truncate text-[12px]">{meta?.[r.key]?.label || r.label}</div>
                <div className="relative h-6">
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-line" />
                  <div className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-warn/70 transition-all duration-500" style={{ left: `${a}%`, width: `${b - a}%` }} />
                  <div className="absolute top-0 -translate-x-1/2 text-[11px] leading-none text-accent transition-all duration-500" style={{ left: `${r.target_norm * 100}%` }}>
                    ▼
                  </div>
                  <div className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cand shadow-[0_0_8px_#3EA6FF] transition-all duration-500" style={{ left: `${r.analog_norm * 100}%` }} />
                </div>
                <div className="whitespace-nowrap text-right font-mono text-[11px] text-muted">
                  w <span className="text-ink">{r.w.toFixed(1)}</span> × gap <span className="text-ink">{r.delta_norm.toFixed(2)}</span> ={" "}
                  <span className="text-warn">{r.contrib.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
          <div className="font-mono text-[12.5px] text-muted">
            Match = 1 − Σ(w·gap) / Σw = 1 − <span className="text-warn">{sumC.toFixed(2)}</span> / <span className="text-ink">{sumW.toFixed(1)}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted">Match score</div>
            <div className="font-mono text-4xl text-accent">{score.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ k, meta }: { k: keyof PhysicalVector8D; meta?: FeatureMetadataRegistry }) {
  const [flipped, setFlipped] = useState(false);
  const live = LIVE_FEATURES.includes(k);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className={`flip h-48 w-full text-left focus:outline-none ${flipped ? "flipped" : ""}`}
      aria-label={`${meta?.[k]?.label}: tap to flip`}
    >
      <div className="flip-inner">
        <div className="flip-face flex flex-col justify-between border border-line bg-panel/90 p-4">
          <div className="font-mono text-3xl text-accent">{FEATURE_GLYPH[k]}</div>
          <div>
            <div className="font-display text-[15px] font-semibold">{meta?.[k]?.label}</div>
            <div className="font-mono text-[10.5px] text-muted">{meta?.[k]?.source}</div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wider ${live ? "border-good/40 text-good" : "border-partial/40 text-partial"}`}>
              {PROVENANCE_LABEL[live ? "measured" : "estimated"]}
            </span>
            <span className="font-mono text-[10px] text-muted">hover / tap ↻</span>
          </div>
        </div>
        <div className="flip-face flip-back flex flex-col gap-2 border border-accent/60 bg-panel p-4">
          <div className="font-display text-[14px] font-semibold text-accent">{meta?.[k]?.label}</div>
          <p className="text-[12px] leading-snug text-ink">{FEATURE_WHY[k]}</p>
          <p className="text-[11px] leading-snug text-muted">{meta?.[k]?.description}</p>
        </div>
      </div>
    </button>
  );
}

function Bar({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref}>
      <div className="flex justify-between text-[12px]">
        <span>{label}</span>
        <span className="font-mono text-muted">{text}</span>
      </div>
      <div className="mt-1 h-2 bg-line">
        <div className="h-full transition-[width] duration-1000 ease-out" style={{ width: inView ? `${(value / max) * 100}%` : "0%", background: color }} />
      </div>
    </div>
  );
}

export default function MethodPage() {
  const [targets, setTargets] = useState<PlanetaryTarget[]>([]);
  const [sites, setSites] = useState<EarthAnalogSite[]>([]);
  const [meta, setMeta] = useState<FeatureMetadataRegistry | undefined>(undefined);

  useEffect(() => {
    Promise.all([fetch("/data/planetary_targets.json").then((r) => r.json()), fetch("/data/earth_analogs.json").then((r) => r.json())])
      .then(([t, e]) => {
        setTargets(t.targets || []);
        setSites(e.sites || []);
        setMeta(e.features_metadata || t.features_metadata);
      })
      .catch(() => undefined);
  }, []);

  const known = sites.filter((s) => s.is_known_nasa_analog).length;
  const fresh = sites.filter((s) => !s.is_known_nasa_analog);
  const freshIndia = fresh.filter((s) => /india/i.test(s.region_country)).length;

  return (
    <div className="min-h-screen bg-hud-grid text-ink">
      <Nav />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full border border-line opacity-60">
          <div className="radar-sweep absolute inset-0 rounded-full" />
          <div className="absolute inset-16 rounded-full border border-line" />
          <div className="absolute inset-32 rounded-full border border-line" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-4 py-16 sm:py-24">
          <Reveal>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              How GEOSYM works <span className="blink">▍</span>
            </div>
            <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">
              Finding Earth&apos;s twins of the <span className="text-[#C9CCD2]">Moon</span> and <span className="text-[#E2552D]">Mars</span>, with numbers you can check.
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
              No single place on Earth is a perfect match. So we measure what matters for a mission, compare it fairly, prove the method on known analogs, and say openly
              where every analogy breaks down.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { n: sites.length || 63, l: "Earth sites scored", hi: false },
              { n: fresh.length || 48, l: "★ new candidate sites flagged", hi: true },
              { n: known || 15, l: "known NASA analogs as a check", hi: false },
              { n: targets.length || 10, l: "Moon & Mars targets", hi: false },
              { n: 8, l: "features per site", hi: false },
            ].map((s, i) => (
              <Reveal key={s.l} delay={i * 100}>
                <div className={`border-l-2 pl-3 ${s.hi ? "border-accent bg-accent/[0.06] py-1" : "border-line"}`}>
                  <div className={`font-mono text-4xl ${s.hi ? "text-accent" : "text-ink"}`}>
                    <CountUp to={s.n} />
                  </div>
                  <div className={`text-[12px] ${s.hi ? "text-ink" : "text-muted"}`}>{s.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={500} className="mt-8">
            <a
              href="/#discoveries"
              className="group inline-flex flex-wrap items-center gap-3 border border-accent/60 bg-accent/10 px-4 py-2.5 transition-colors hover:bg-accent/20"
            >
              <span className="font-mono text-[11px] uppercase tracking-wider text-accent">★ New discoveries</span>
              <span className="text-[13px] text-ink">
                {fresh.length || 48} candidate sites not on NASA&apos;s analog list, including {freshIndia || 3} in India
              </span>
              <span className="font-mono text-[12px] text-accent transition-transform group-hover:translate-x-1">See them →</span>
            </a>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4">
        {/* Pipeline */}
        <section className="py-16">
          <SectionTitle tag="01 · Pipeline" title="Five steps from satellite to score" sub="Scroll: the line fills as you move through the pipeline." />
          <Pipeline />
        </section>

        {/* Playground */}
        <section className="py-16">
          <SectionTitle
            tag="02 · Try the math"
            title="Pick a target and a site. Watch the score build."
            sub="Each row is one feature on a 0–1 scale. The red gap is the difference. Weights come from the mission mode, so a rover test cares about different things than an ice drill."
          />
          <Reveal>{targets.length && sites.length ? <Playground targets={targets} sites={sites} meta={meta} /> : <div className="h-64 border border-line" />}</Reveal>
        </section>

        {/* Features */}
        <section className="py-16">
          <SectionTitle tag="03 · The 8 features" title="What we measure, and why missions care" sub="Hover or tap a card to flip it. Badges show which values are live satellite measurements and which are estimates in this build." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_KEYS.map((k, i) => (
              <Reveal key={k} delay={i * 60}>
                <FeatureCard k={k} meta={meta} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Limits */}
        <section className="py-16">
          <SectionTitle tag="04 · Earth's limits" title="What no Earth site can copy" sub="That's why every site card has a 'where it breaks down' section. Field tests here should be paired with chambers and reduced-gravity flights." />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Reveal>
              <div className="h-full border border-line bg-panel/80 p-4">
                <h3 className="mb-3 font-display text-[15px] font-semibold">Gravity</h3>
                <div className="flex flex-col gap-3">
                  <Bar label="Earth" value={1} max={1} text="1.00 g" color="#E6E6E6" />
                  <Bar label="Mars" value={0.379} max={1} text="0.38 g" color="#E2552D" />
                  <Bar label="Moon" value={0.166} max={1} text="0.17 g" color="#C9CCD2" />
                </div>
                <p className="mt-3 text-[11.5px] text-muted">Changes wheel traction, dust behaviour and how much a suit or drill weighs.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="h-full border border-line bg-panel/80 p-4">
                <h3 className="mb-3 font-display text-[15px] font-semibold">Atmosphere</h3>
                <div className="flex flex-col gap-3">
                  <Bar label="Earth" value={1} max={1} text="~1 bar" color="#E6E6E6" />
                  <Bar label="Mars" value={0.02} max={1} text="~0.006 bar (CO₂)" color="#E2552D" />
                  <Bar label="Moon" value={0.003} max={1} text="near-vacuum" color="#C9CCD2" />
                </div>
                <p className="mt-3 text-[11.5px] text-muted">Air carries heat and dust differently. Bars are not to scale for Mars and the Moon: they&apos;d be invisible.</p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="h-full border border-line bg-panel/80 p-4">
                <h3 className="mb-3 font-display text-[15px] font-semibold">Radiation</h3>
                <p className="text-[12.5px] leading-relaxed text-muted">
                  Earth&apos;s magnetic field and thick air shield the surface. Mars has a thin atmosphere and no global magnetic field; the Moon has neither. Radiation
                  effects on crews and electronics can&apos;t be tested at any Earth analog site.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Credits */}
        <section id="credits" className="scroll-mt-16 py-16">
          <SectionTitle tag="05 · AI use & credits" title="Who and what made this" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                h: "Team",
                b: "Dinoco Studios · 2026 NASA Space Apps Challenge. Challenge: Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars.",
              },
              {
                h: "AI use",
                b: "Parts of the code (frontend UI, globes, this page, scoring update) were written with Claude (Anthropic) and reviewed by the team. The optional field-test brief is generated by Llama 3.3 via Groq and labelled as AI output.",
              },
              {
                h: "Data credits",
                b: "Copernicus DEM GLO-30 and Sentinel-1 (ESA), MODIS and HLS (NASA/USGS) via Microsoft Planetary Computer; ESA WorldCover; Natural Earth map outlines; LRO and MRO mission literature for Moon/Mars targets.",
              },
            ].map((c, i) => (
              <Reveal key={c.h} delay={i * 80}>
                <div className="h-full border border-line bg-panel/80 p-4">
                  <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-accent">{c.h}</div>
                  <p className="text-[12.5px] leading-relaxed text-muted">{c.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <a href="/" className="inline-block bg-accent px-6 py-3 font-mono text-[12px] font-medium uppercase tracking-wider text-bg transition-all hover:shadow-[0_0_18px_rgba(255,165,59,0.45)]">
              ← Back to the explorer
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-[11px] text-muted">Built for the 2026 NASA Space Apps Challenge · Dinoco Studios · Built with AI assistance (Claude)</footer>
    </div>
  );
}

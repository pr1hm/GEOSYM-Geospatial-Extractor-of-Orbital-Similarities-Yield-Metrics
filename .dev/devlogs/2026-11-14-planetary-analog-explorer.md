# Devlog: 2026-11-14 — Building the Planetary Analog Explorer 🚀☕

*Grab a cup of dark roast, team—we just landed something truly special for the 2026 NASA Space Apps Challenge!*

---

### The Mission Brief (And Why We Didn't Sleep Last Night)
When the challenge asked us to *"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"*, the easy cop-out would have been picking 5 famous national parks and calling it a day. But we're Principal Geospatial ML Engineers and Planetary Scientists—we wanted a real, data-backed, two-stage hybrid machine learning pipeline that actually scales.

Our goal:
1. **Offline GPU Ingestion & Foundation Embeddings (`pipeline/`):** Stream 5x5 km barren Earth tiles from Microsoft Planetary Computer STAC, crunch multi-spectral bands through `ibm-nasa-geospatial/Prithvi-EO-2.0-600M` on our 96GB RTX Pro 6000, normalize everything across Moon and Mars reference sites, and export static lightweight JSON artifacts (<1 MB).
2. **Real-Time Client Dashboard (`src/`):** Load those artifacts in Next.js, calculate weighted cosine similarity in under 5 milliseconds on every slider change, and let Groq's `llama-3.3-70b-versatile` synthesize field engineering test protocols on the fly.

---

### The Hiccups & The Breakthroughs

#### 1. The GeoTIFF Bandwidth Trap
Streaming full 1GB Copernicus DEM and Sentinel-1 SAR scenes over Azure Blob Storage is a recipe for crashing memory. We implemented windowed Cloud-Optimized GeoTIFF (COG) reading with `rasterio.vrt.WarpedVRT` and `from_bounds`. We stream *only* the exact 5x5 km bounding box directly into memory. 

#### 2. The Multi-Scale Texture & Prithvi Backbone
On the molab workstation, we spin up the 600M parameter Prithvi-EO model in `torch.bfloat16`. But what if a teammate is testing locally on a laptop without 96GB of VRAM? We wrote a deterministic 64-dimensional texture and harmonic frequency synthesizer (`generate_fast_morphology_embedding`) that completes in sub-millisecond time on any CPU. Running `python -m pipeline.export_artifacts --seed` instantly outputs all 70+ sites without requiring external network access!

#### 3. Sub-5ms Client-Side Mathematics
In `src/lib/similarityEngine.ts`, we implemented a weighted cosine similarity kernel across 8 physical dimensions (slope, TRI ruggedness, SAR roughness dB, radar depolarization, diurnal $\Delta T$, cryogenic floor, iron oxide, and basalt/mafic ratio) plus the 64D morphology embedding. Dragging any slider recalculates and re-ranks all 63 Earth locations instantly. No spinning wheel, no server round-trip latency.

#### 4. Groq LLM Mission Protocol Synthesis
In `src/app/api/mission-brief/route.ts`, we feed the exact numerical delta scorecard to Groq's `llama-3.3-70b-versatile` with JSON schema enforcement. It spits out:
- Executive assessment of the analog fit.
- 3 concrete hardware subsystems to test (rovers, percussive drills, ISRU reactors).
- The all-important section: **Where the Analogy Breaks Down** (addressing $1.0g$ Earth gravity vs $0.166g$ Moon / $0.379g$ Mars, lack of soil moisture cohesion in extraterrestrial vacuum, and required ground mitigations).
- If the API key isn't provided, our deterministic fallback synthesis kicks in gracefully.

---

### What We Shipped Today:
- `pipeline/`: STAC config, site configs (10 Moon/Mars targets, 15 NASA anchors, 48 new discoveries!), windowed COG reader, GPU embeddings, UMAP 3D projections, and reactive Marimo runner.
- `public/data/`: `planetary_targets.json` (31 KB), `earth_analogs.json` (191 KB), `tiles.geojson` (95 KB).
- `src/`: Next.js 14 App Router dashboard with space-grade monochromatic UI, dual map telemetry, 8-axis delta progress bars, and Groq mission synthesizer.
- Build status: Clean `next build` with zero errors, total first-load JS under 99 kB.

Now go fire up `pnpm dev`, pick Shackleton Crater Rim or Jezero Crater, and find your next planetary testing ground! 🌕🔴🌍


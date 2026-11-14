# 🪐 Planetary Analog Explorer
### 2026 NASA Space Apps Challenge: *"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![STAC](https://img.shields.io/badge/STAC-Microsoft_Planetary_Computer-blue)](https://planetarycomputer.microsoft.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald)](LICENSE)

A Two-Stage Hybrid Architecture pairing offline high-throughput satellite Earth observation and deep foundation model embeddings with a real-time, sub-5ms client-side weighted similarity engine and LLM-powered engineering test protocol synthesis.

---

## 🚀 Key Highlights & Architecture

1. **Microsoft Planetary Computer STAC Ingestion (`pipeline/`):**
   - Connects to `https://planetarycomputer.microsoft.com/api/stac/v1` with signed asset access.
   - Streams windowed 5x5 km Cloud-Optimized GeoTIFFs (COGs) into memory using `WarpedVRT`, bypassing massive scene downloads.
   - Enforces ESA WorldCover class 60 (bare ground) / 70 (snow/ice) masking and NDVI $\le 0.12$.
   - Extracts 8 physical dimensions:
     - **Copernicus DEM GLO-30:** `mean_slope_deg` and `terrain_ruggedness_tri` (TRI).
     - **Sentinel-1 SAR RTC:** `sar_roughness_db` ($10\log_{10}(\text{vv})$) and `sar_depolarization_ratio` ($\text{vh}/\text{vv}$).
     - **MODIS LST 8-Day:** `diurnal_delta_t_c` and `min_temp_c` ($5^{\text{th}}$ percentile cold floor).
     - **Harmonized Landsat Sentinel-2 (HLS S30/L30):** `iron_oxide_index` (Red/Blue) and `basalt_mafic_index` (SWIR/NIR).

2. **GPU Foundation Model Embeddings (`pipeline/gpu_embeddings.py`):**
   - Extracts 64-dimensional latent terrain morphology vectors using `ibm-nasa-geospatial/Prithvi-EO-2.0-600M` in `torch.bfloat16` on an NVIDIA RTX Pro 6000 (96GB VRAM).
   - Includes instant deterministic seed synthesis for local CPU execution.

3. **Curated Ground Truth & Discovery Catalog (`pipeline/config_sites.py`):**
   - **10 Planetary Targets:** Moon (Shackleton Rim, Malapert Massif, Marius Hills Lava Tube Pit, Aristarchus Plateau, Mare Tranquillitatis) & Mars (Jezero Crater, Arcadia Planitia, Mawrth Vallis, Elysium Planitia, Valles Marineris).
   - **15 Known NASA Analogs:** Haughton Crater, Atacama Yungay, McMurdo Dry Valleys, Askja, Kilauea, Lava Beds, Pilot Valley, Meteor Crater, Lake Salda, Rio Tinto, Lonar Crater, Tso Kar Basin, Matanomadh Jarosite, Danakil Depression, Namib Sand Sea.
   - **48 Unrecognized Discoveries:** High-altitude cold deserts (Spiti Valley, Changthang), volcanic necks (Dhinodhar), calderas (Tibesti, Waw an Namus), yardangs (Lut Desert, Qaidam Basin), and Andean salt flats (Puna de Atacama, Salar de Arizaro).

4. **Sub-5ms Client-Side Similarity Engine (`src/lib/similarityEngine.ts`):**
   - Weighted cosine similarity across normalized physical vectors and morphology embeddings.
   - Dynamic mission objective presets (Rover Mobility, Cryo-Thermal Endurance, ISRU Prospecting, Optical Autonomy).
   - Instant re-ranking and feature-by-feature delta calculations on every slider change.

5. **Live Groq Mission Protocol Synthesis (`src/app/api/mission-brief/route.ts`):**
   - Powered by `llama-3.3-70b-versatile` with JSON schema enforcement.
   - Generates Executive Summaries, 3 concrete hardware subsystem test protocols, and critical **"Where the Analogy Breaks Down"** assessments (covering 1.0g vs 0.166g/0.38g gravity, vacuum, and soil moisture cohesion).

---

## 📦 Directory Structure

```text
planetary-analog-explorer/
├── .env.example                 # GROQ_API_KEY template
├── requirements.txt             # Python dependencies (STAC, rasterio, PyTorch, Marimo)
├── package.json                 # Next.js 14, Tailwind CSS, Lucide icons
├── README.md
├── docs/
│   └── planetary-analog-engine.md # Detailed technical specification
├── READMEs/
│   └── FEATURES.md              # Feature directory link index
├── .dev/devlogs/
│   └── 2026-11-14-planetary-analog-explorer.md
├── pipeline/
│   ├── __init__.py
│   ├── stac_config.py           # STAC endpoint & verified collection registry
│   ├── config_sites.py          # 10 Targets + 15 NASA Anchors + 48 Discoveries
│   ├── ingest_earth.py          # Windowed COG reader (WarpedVRT)
│   ├── ingest_planetary.py      # Moon (LOLA/Diviner) & Mars (MOLA/THEMIS) vectors
│   ├── gpu_embeddings.py        # Prithvi-EO-2.0-600M / fast morphology embeddings
│   ├── normalize_and_cluster.py # Unified scaling [0,1], UMAP 3D & HDBSCAN
│   ├── export_artifacts.py      # Artifact generator (--seed & --live)
│   └── marimo_molab_runner.py   # Reactive Marimo notebook for molab RTX Pro 6000
├── public/data/
│   ├── planetary_targets.json   # 10 Reference Targets (<35 KB)
│   ├── earth_analogs.json       # 63 Earth Analogs (<200 KB)
│   └── tiles.geojson            # 5x5 km polygon geometries (<100 KB)
└── src/
    ├── lib/
    │   ├── types.ts             # Strict TypeScript schemas
    │   ├── similarityEngine.ts  # Sub-5ms Weighted Cosine Similarity
    │   └── groqBriefGenerator.ts# Groq prompt builder & fallback protocol
    └── app/
        ├── api/mission-brief/route.ts # Next.js API route for Groq Llama 3.3 70B
        ├── layout.tsx
        ├── globals.css
        └── page.tsx             # Space-grade geometric dashboard
```

---

## 🛠️ Quickstart Guide

### 1. Python Pipeline (Seed Generation & Marimo GPU Runner)
```bash
# Generate static JSON artifacts immediately (Zero external network dependencies)
python -m pipeline.export_artifacts --seed

# Launch interactive Marimo GPU notebook
marimo edit pipeline/marimo_molab_runner.py
```

### 2. Next.js Web Application
```bash
# Install dependencies using pnpm
pnpm install

# Configure environment variables (optional for live Groq calls)
cp .env.example .env
# Edit .env and insert your GROQ_API_KEY

# Start development server
pnpm dev
# Open http://localhost:3000 in your browser
```

---

## 🛰️ Testing & Verification
- **Pipeline Artifacts Export:** Verified via `python -m pipeline.export_artifacts --seed` generating 10 planetary targets and 63 Earth tiles into `public/data/`.
- **Next.js Production Build:** Verified via `pnpm build` generating optimized static pages and server routes with first-load JS under 99 kB.


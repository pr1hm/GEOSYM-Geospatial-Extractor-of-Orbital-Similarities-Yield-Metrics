# GEOSYM: Geospatial Extractor of Orbital Similarities & Yield Metrics
### Technical Architecture & System Specification

## 1. Executive Summary & Challenge Objective
Built by **Dinoco Studios** for the **2026 NASA Space Apps Challenge** (*"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"*), **GEOSYM: Geospatial Extractor of Orbital Similarities & Yield Metrics** provides an end-to-end Two-Stage Hybrid Architecture. It pairs high-throughput offline satellite ingestion and deep foundation model embeddings with a sub-5ms client-side weighted similarity engine and live Groq-powered engineering test protocol synthesis.

---

## 2. Two-Stage Hybrid Architecture

```
[ Microsoft Planetary Computer STAC ]
   ├── ESA WorldCover (Class 60/70 bare regolith check)
   ├── Copernicus DEM GLO-30 (Slope & TRI Ruggedness)
   ├── Sentinel-1 SAR RTC (Backscatter & Depolarization)
   ├── MODIS LST (Diurnal Thermal Swings & Cold Floor)
   └── HLS S30/L30 & Sentinel-2 (Iron-Oxide & Basaltic Mafic Ratios)
                       │
                       ▼
[ GPU & ML Ingestion Pipeline (pipeline/) ]
   ├── NVIDIA RTX Pro 6000 96GB VRAM (bfloat16)
   ├── ibm-nasa-geospatial/Prithvi-EO-2.0-600M (Morphology Embeddings)
   ├── Cross-Planetary Unified Scaling [0.0, 1.0]
   └── UMAP 3D Manifold Projection + HDBSCAN Clustering
                       │
                       ▼  Static Artifact Export (<1 MB)
[ public/data/ ]
   ├── planetary_targets.json  (10 Ground Truth Targets: Moon & Mars)
   ├── earth_analogs.json      (63 Earth Analogs: 15 Anchors + 48 Discoveries)
   └── tiles.geojson           (5x5 km COG footprints)
                       │
                       ▼  Instant Client-Side Consumption
[ Next.js Real-Time Engine (src/) ]
   ├── Sub-5ms Weighted Cosine Similarity Engine
   ├── Dynamic Mission Objective Weight Sliders & Presets
   ├── 8-Axis Comparative Radar & Breakdown Delta Telemetry
   └── Groq Llama 3.3 70B Live Mission Protocol Synthesis
```

---

## 3. Verified STAC Collections & Asset Keys

| Sensor / Constellation | Collection ID | Exact Asset Key | Extracted Planetary Metrics |
| :--- | :--- | :--- | :--- |
| **ESA WorldCover** | `esa-worldcover` | `"map"` | Land cover masking (Class 60: Bare; Class 70: Snow/Ice) |
| **Copernicus DEM** | `cop-dem-glo-30` | `"data"` | `mean_slope_deg` (0°–45°), `terrain_ruggedness_tri` (0–120m) |
| **Sentinel-1 SAR** | `sentinel-1-rtc` | `"vv"`, `"vh"` | `sar_roughness_db` ($10 \log_{10}(\text{vv})$), `sar_depolarization_ratio` ($\text{vh}/\text{vv}$) |
| **MODIS Thermal LST**| `modis-21A2-061` | `"LST_Day_1KM"`, `"LST_Night_1KM"` | `diurnal_delta_t_c` (thermal inertia), `min_temp_c` (cold traps) |
| **HLS Multispectral** | `hls2-s30` | `"B02"`, `"B04"`, `"B8A"`, `"B12"` | `iron_oxide_index` (Red/Blue), `basalt_mafic_index` (SWIR/NIR) |

---

## 4. Sub-5ms Client-Side Similarity Engine

The client calculates the weighted cosine similarity across normalized 8-dimensional physical vectors and 64-dimensional deep terrain morphology embeddings:

$$\text{Sim}(T, A) = \frac{\sum_{i=1}^{n} w_i \cdot T_i \cdot A_i}{\sqrt{\sum_{i=1}^{n} w_i T_i^2} \cdot \sqrt{\sum_{i=1}^{n} w_i A_i^2}}$$

### Preset Objective Profiles:
1. **Balanced Unified Holistic:** Equal weighting across all domains.
2. **Rover Mobility & Traction:** High weight on mean slope ($2.5\times$), ruggedness TRI ($2.2\times$), and SAR backscatter roughness ($2.0\times$).
3. **Extreme Cryo-Thermal Endurance:** High weight on diurnal delta $T$ ($3.0\times$) and minimum night temperature ($3.0\times$).
4. **ISRU & Mineral Extraction:** High weight on ferric iron oxide ($2.8\times$) and basaltic mafic ratio ($2.8\times$).
5. **Hazard Avoidance & Optical Autonomy:** High weight on Prithvi-EO deep morphology ($3.0\times$) and boulder-field ruggedness.

---

## 5. Live Groq Mission Brief Synthesis
Powered by `llama-3.3-70b-versatile` with `response_format: { type: "json_object" }`:
- Evaluates quantitative scorecard comparing chosen target to Earth 5x5 km tile.
- Recommends 3 concrete rover, drill, or ISRU subsystems based on $>80\%$ matching metrics.
- Pinpoints where the analogy breaks down:
  - Gravitational scaling ($1.0g$ vs $0.166g$ Moon / $0.379g$ Mars).
  - Atmospheric pressure ($1.013\text{ bar}$ Earth vs $10^{-15}\text{ bar}$ Moon / $0.006\text{ bar}$ Mars) and lack of moisture-induced soil cohesion.
- Outlines a 3-Phase verification campaign with sensor telemetry payloads.

---

## 6. End-to-End Smoke Test & Diagnostic Suite (`pipeline/smoke_test.py`)
Provides automated sequential validation across:
1. **STAC & Asset Resolution:** Queries `esa-worldcover`, `cop-dem-glo-30`, `sentinel-1-rtc`/`sentinel-1-grd`, `modis-21A2-061`/`modis-11A2-061`, and `hls2-s30`/`hls2-l30`.
2. **Windowed Raster Ingestion:** Validates live COG streaming from Azure Blob via `rasterio` and calculates finite slope and TRI metrics.
3. **Hardware Profile & Morphology Embeddings:** Verifies PyTorch multi-spectral architecture (CPU & CUDA) yielding 64-dimensional latent representations.
4. **Seed Artifact Generation:** Verifies `planetary_targets.json`, `earth_analogs.json`, and `tiles.geojson` schema contracts and bounds.
5. **Live Groq LLM API Integration:** Confirms structured JSON completions with required subsystem test protocols and breakdown analyses.



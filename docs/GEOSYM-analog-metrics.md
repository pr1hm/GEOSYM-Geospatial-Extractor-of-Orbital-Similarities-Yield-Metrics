# GEOSYM Analog Comparison Metrics, Datasets & Extraction Architecture

This document provides a unified reference for the **8 core physical metrics**, their **source datasets**, the **windowed ingestion workflow**, and the **machine learning algorithms** used in the Geospatial Extractor of Orbital Similarities & Yield Metrics (GEOSYM) to match Earth locations with lunar and Martian exploration sites.

---

## 1. The 8 Physical Metrics Explained

| Metric Key | Display Name | Unit | Sensor & Collection | Simple Meaning | Mission Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mean_slope_deg` | **Mean Slope** | $\text{deg}$ ($0^\circ–45^\circ$) | Copernicus DEM GLO-30 | *Is the terrain flat or steep?* | Evaluates rover hill-climbing, tipping, and descent limits ($<15^\circ–20^\circ$). |
| `terrain_ruggedness_tri` | **Terrain Ruggedness (TRI)** | $\text{m}$ ($0–120\text{ m}$) | Copernicus DEM GLO-30 | *How bumpy, cracked, or cratered is the ground?* | Identifies hidden ravines, boulder fields, and tests chassis suspension & obstacle avoidance. |
| `sar_roughness_db` | **Radar Roughness** | $\text{dB}$ ($-25\text{ to }+2\text{ dB}$) | Sentinel-1 SAR RTC ($\text{VV}$) | *Is the surface fine dust or coarse, sharp gravel?* | Measures regolith grain texture to evaluate tire traction, slippage, and wheel wear. |
| `sar_depolarization_ratio` | **Radar Depolarization** | $\text{ratio}$ ($0.05–0.70$) | Sentinel-1 SAR RTC ($\text{VH}/\text{VV}$) | *Are there chaotic boulder piles or volcanic rubble?* | Detects multi-bounce volume scattering matching lunar impact ejecta and jagged lava fields. |
| `diurnal_delta_t_c` | **Diurnal Thermal Swing** | $^\circ\text{C}$ ($5^\circ–75^\circ\text{C}$) | MODIS LST (Day vs. Night) | *How violent is the daily temperature jump?* | Tests thermal expansion/contraction fatigue on solar panels, glues, and composite seals. |
| `min_temp_c` | **Minimum Night Temp** | $^\circ\text{C}$ ($-80^\circ\text{ to }+25^\circ\text{C}$) | MODIS LST (Nighttime) | *How brutally cold does it get at night?* | Tests cryogenic endurance, battery survival, and lubricants for lunar polar cold traps. |
| `iron_oxide_index` | **Ferric Iron Oxide Index** | $\text{ratio}$ ($0.8–3.2$) | HLS / Sentinel-2 ($\text{B04}/\text{B02}$) | *How rusty and red is the soil?* | Replicates oxidized Martian dust (hematite) for drill testing and dust filter trials. |
| `basalt_mafic_index` | **Basaltic Mafic Index** | $\text{ratio}$ ($0.7–3.5$) | HLS ($\text{B12}/\text{B8A}$) + MODIS Emissivity | *Is the soil dark volcanic basalt like lunar/Martian plains?* | Identifies mineral analogs for In-Situ Resource Utilization (ISRU), like regolith brick sintering. |

---

## 2. Upstream Datasets & Collections Used

All data streams directly via the **Microsoft Planetary Computer STAC API** (`https://planetarycomputer.microsoft.com/api/stac/v1`):

1. **Copernicus DEM GLO-30 (`cop-dem-glo-30`)**: 30-meter elevation raster providing terrain slopes ($dy, dx$) and 8-neighbor Terrain Ruggedness Index (TRI).
2. **Sentinel-1 SAR RTC (`sentinel-1-rtc`)**: C-band (5.405 GHz) all-weather radar providing $\text{VV}$ and $\text{VH}$ backscatter to measure regolith texture and blocky rubble.
3. **MODIS Land Surface Temperature (`modis-21A2-061` / `modis-11A2-061`)**: 1 km thermal infrared capturing diurnal temperature swings ($\Delta T$) and cryogenic night floors.
4. **Harmonized Landsat Sentinel-2 (`hls2-s30` / `sentinel-2-l2a`)**: 10–30 m multi-spectral bands ($\text{B02}, \text{B04}, \text{B8A}, \text{B12}$) tracking ferric iron oxides and mafic mineral signatures.
5. **ESA WorldCover (`esa-worldcover`)**: 10-meter global land cover classification used to enforce planetary regolith screening. Only **Class 60 (Bare soil/rock)** and **Class 70 (Snow/ice)** are accepted.
6. **IBM-NASA Prithvi-EO-2.0-600M (`ibm-nasa-geospatial`)**: 600M parameter geospatial Vision Transformer extracting 64-dimensional deep terrain morphology embeddings.

---

## 3. Data Processing Steps & Extraction Procedures

The discovery and extraction pipeline runs across 5 streamlined stages:

```
[ 1. Windowed COG Streaming ] ──► [ 2. Space Filter (WorldCover) ] ──► [ 3. 8-Axis Vector Extraction ]
                                                                                   │
[ 5. Groq Llama 3.3 Protocol ] ◄── [ 4. UMAP 3D & HDBSCAN Clusters ] ◄─────────────┘
```

1. **Windowed COG Cloud Streaming:** Bypasses downloading multi-gigabyte satellite files. Using `rasterio.windows` and `WarpedVRT`, only the target 5×5 km bounding box is streamed directly from cloud storage into RAM in milliseconds.
2. **Planetary Regolith Screening:** The tile is checked against ESA WorldCover. Any area containing vegetation (Class 10), agriculture (Class 40), human infrastructure (Class 50), or water bodies (Class 80) is instantly rejected.
3. **Derivative Calculations & Normalization:** Gradient derivatives compute slope and TRI, radar decibels are derived, thermal counts are converted to Celsius, and optical ratios are extracted. All metrics are clamped and normalized to a uniform $[0.0, 1.0]$ space.
4. **Deep Terrain Morphology (Prithvi-EO-2.0-600M):** The 6-band multi-spectral tensor ($224 \times 224$) is passed through the vision foundation model to generate 64-dimensional latent features representing dunes, crater rims, and geological textures.
5. **3D Projection (UMAP) & Taxonomies (HDBSCAN):** High-dimensional physical and visual vectors are projected into 3D $(X, Y, Z)$ coordinates and categorized into 5 unsupervised planetary clusters (Hyper-Arid Ferric Regolith, Basaltic Lava Fields, Cryo-Periglacial Deserts, Steep Escarpments, and Evaporite Salt Flats).
6. **Sub-5ms Real-Time Matching & Mission Synthesis:** The Next.js frontend computes weighted cosine similarity on the fly based on user mission objective weights, and Groq Llama 3.3 70B produces tailored field testing protocols.

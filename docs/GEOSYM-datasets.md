# GEOSYM Satellite Datasets & Ingestion Architecture

This document outlines the **upstream satellite constellations, datasets, STAC collections, and asset keys** utilized by the Geospatial Extractor of Orbital Similarities & Yield Metrics (GEOSYM) to ingest, extract, and match Earth analog environments with planetary sites on the Moon and Mars.

---

## 1. Upstream Satellite Datasets & Sensors

All data streams directly via the **Microsoft Planetary Computer STAC API** (`https://planetarycomputer.microsoft.com/api/stac/v1`) using windowed Cloud-Optimized GeoTIFFs (COGs).

### Summary Table

| Dataset / Sensor | Provider / Constellation | STAC Collection ID | Asset Key / Bands | Output Metrics / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Copernicus DEM** | ESA Copernicus | `cop-dem-glo-30` | `"data"` | `mean_slope_deg`, `terrain_ruggedness_tri` |
| **Sentinel-1 SAR RTC** | ESA Copernicus Sentinel-1 | `sentinel-1-rtc` / `sentinel-1-grd` | `"vv"`, `"vh"` | `sar_roughness_db`, `sar_depolarization_ratio` |
| **MODIS Thermal LST** | NASA Terra & Aqua | `modis-21A2-061` / `modis-11A2-061` | `"LST_Day_1KM"`, `"LST_Night_1KM"`, Emissivity | `diurnal_delta_t_c`, `min_temp_c` |
| **HLS Multispectral** | NASA / USGS / ESA | `hls2-s30` / `hls2-l30` / `sentinel-2-l2a` | `"B02"`, `"B04"`, `"B8A"`, `"B12"` | `iron_oxide_index`, `basalt_mafic_index` |
| **ESA WorldCover** | European Space Agency (ESA) | `esa-worldcover` | `"map"` | Land-cover filtering (Bare Regolith & Snow/Ice) |
| **Prithvi-EO-2.0-600M**| NASA & IBM | `ibm-nasa-geospatial` | 6-band multi-spectral inputs | 64-D Latent Terrain Morphology Embeddings |

---

## 2. Detailed Dataset Breakdown

### 1. Copernicus DEM GLO-30 (`cop-dem-glo-30`)
* **What it offers:** Global Digital Elevation Model (DEM) at 30-meter spatial resolution.
* **Purpose:**
  * **Topographic Steepness (`mean_slope_deg`):** Computes gradient vectors ($dy, dx$) using 30-meter grid spacing to find slope angles ($0^\circ–45^\circ$). Evaluates rover mobility limits and landing incline hazards.
  * **Terrain Ruggedness Index (`terrain_ruggedness_tri`):** Calculates localized elevation variations between center cells and their 8 neighbors ($0–120\text{ m}$). Detects micro-craters, ravines, and boulder fields.

### 2. Sentinel-1 Synthetic Aperture Radar (`sentinel-1-rtc`)
* **What it offers:** C-band (5.405 GHz) microwave backscatter, all-weather day/night imagery, terrain-corrected to gamma0 surface reflection.
* **Purpose:**
  * **Radar Roughness (`sar_roughness_db`):** $10 \log_{10}(\text{mean}(\text{VV}))$. Identifies surface grain textures (fine sand vs. abrasive gravel) to test tire traction and regolith abrasion.
  * **Radar Depolarization (`sar_depolarization_ratio`):** Mean ratio of cross-polarization to co-polarization ($\text{VH} / \text{VV}$). Captures multi-bounce volume scattering characteristic of jagged volcanic slag, lava tube collapsed roofs, and impact ejecta.

### 3. MODIS Land Surface Temperature (`modis-21A2-061`)
* **What it offers:** 8-day composite thermal infrared imagery at 1 km resolution capturing ground skin temperature.
* **Purpose:**
  * **Diurnal Thermal Swing (`diurnal_delta_t_c`):** Measures the daily temperature variance ($T_{\text{day}} - T_{\text{night}}$). Airless and thin atmospheres experience dramatic swings; this assesses thermal cycling fatigue on solar arrays, adhesives, and composites.
  * **Minimum Night Temperature (`min_temp_c`):** 5th-percentile nighttime ground temperature (down to $-80^\circ\text{C}$). Tests cryogenic performance, lubricants, heaters, and seal brittleness for lunar South Pole and Martian polar environments.

### 4. Harmonized Landsat Sentinel-2 (`hls2-s30` / `sentinel-2-l2a`)
* **What it offers:** High-resolution (10–30 meter) surface reflectance across visible, near-infrared (NIR), and shortwave-infrared (SWIR) wavelengths.
* **Purpose:**
  * **Ferric Iron Oxide Index (`iron_oxide_index`):** Spectroscopic ratio ($\text{Red } \text{B04} / \text{Blue } \text{B02}$). Tracks oxidized iron and hematite dust, mimicking Martian soil chemistry.
  * **Basaltic Mafic Index (`basalt_mafic_index`):** Ratio of $\text{SWIR } (\text{B12}) / \text{NIR } (\text{B8A})$ augmented with thermal emissivity. Identifies pyroxene and olivine minerals for In-Situ Resource Utilization (ISRU) testing, like lunar/Martian regolith sintering and oxygen extraction.

### 5. ESA WorldCover (`esa-worldcover`)
* **What it offers:** Global 10-meter land cover map categorizing ground into 11 distinct classes.
* **Purpose:**
  * **Planetary Filter & Masking:** Restricts candidate discovery exclusively to **Class 60 (Bare / sparse vegetation)** and **Class 70 (Snow / ice)**. Automatically discards forests, agriculture, urban structures, and open water bodies to maintain true planetary analog fidelity.

### 6. IBM-NASA Prithvi-EO-2.0-600M (`ibm-nasa-geospatial`)
* **What it offers:** Geospatial Vision Transformer foundation model pre-trained on massive archives of NASA Harmonized Landsat Sentinel-2 data.
* **Purpose:**
  * Extracts **64-dimensional deep terrain morphology embeddings**. Encodes visual patterns, dunes, crater rims, and structural textures for autonomous hazard detection and visual navigation benchmarking.

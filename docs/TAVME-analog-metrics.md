# TAVME Analog Comparison Metrics

This document defines the **8 core physical metrics** used by the Terrestrial Analog Vector Matching Engine (TAVME) to compare Earth analog candidate sites against ground truth exploration sites on the Moon and Mars.

---

## The 8 Metrics Explained

### 1. Mean Slope (`mean_slope_deg`)
* **What it measures:** Average terrain steepness across the 5x5 km tile in degrees ($0^\circ$ to $45^\circ$).
* **Data Source:** Copernicus DEM GLO-30 (elevation raster gradient).
* **In Simple Terms:** *"Is the terrain flat, rolling, or a steep cliff?"*
* **Why it matters:** Planetary rovers and astronauts have strict hill-climbing limits (typically $< 15^\circ - 20^\circ$). This determines whether vehicles can safely navigate without tipping or slipping.

---

### 2. Terrain Ruggedness Index (`terrain_ruggedness_tri`)
* **What it measures:** Micro-topographic elevation variance between a center cell and its 8 neighboring cells in meters ($0$ to $120\text{ m}$).
* **Data Source:** Copernicus DEM GLO-30.
* **In Simple Terms:** *"How bumpy, cracked, or cratered is the ground?"*
* **Why it matters:** Detects hidden ditches, boulder fields, craters, and ravines. Crucial for verifying autonomous hazard avoidance, obstacle detection, and chassis suspension durability.

---

### 3. Radar Backscatter Roughness (`sar_roughness_db`)
* **What it measures:** Radar signal reflection strength (backscatter cross-section in decibels, $-25\text{ dB}$ to $+2\text{ dB}$).
* **Data Source:** Sentinel-1 Synthetic Aperture Radar (SAR) RTC ($10 \log_{10}(\text{VV})$).
* **In Simple Terms:** *"Is the ground fine powdery dust/sand or rough gravel and rocks?"*
* **Why it matters:** Microwaves bounce strongly off centimeter-to-decimeter jagged pebbles, but reflect weakly away from smooth, fine sand. This evaluates wheel traction, slip risk, and tread abrasion.

---

### 4. Radar Depolarization Ratio (`sar_depolarization_ratio`)
* **What it measures:** Cross-polarization ratio ($\text{VH} / \text{VV}$, ranging from $0.05$ to $0.70$).
* **Data Source:** Sentinel-1 Synthetic Aperture Radar (SAR) RTC.
* **In Simple Terms:** *"Are there chaotic piles of loose boulders, volcanic rubble, or fractured slabs?"*
* **Why it matters:** Volume scattering scrambles (depolarizes) radar waves when bouncing between jagged rocks. Identifies rugged volcanic terrain matching lunar impact ejecta or jagged Martian lava fields.

---

### 5. Diurnal Thermal Swing (`diurnal_delta_t_c`)
* **What it measures:** Difference between peak day temperature and coldest night ground temperature in $^\circ\text{C}$ ($5^\circ\text{C}$ to $75^\circ\text{C}$).
* **Data Source:** MODIS Land Surface Temperature (Day LST vs. Night LST).
* **In Simple Terms:** *"How violent is the daily temperature jump between day and night?"*
* **Why it matters:** Airless or thin-atmosphere worlds experience brutal thermal swings. Tests whether solar panels, adhesives, batteries, and composite seals can withstand repeated thermal expansion and contraction without cracking.

---

### 6. Minimum Night Temperature (`min_temp_c`)
* **What it measures:** 5th-percentile nighttime ground surface temperature in $^\circ\text{C}$ ($-80^\circ\text{C}$ to $+25^\circ\text{C}$).
* **Data Source:** MODIS Land Surface Temperature.
* **In Simple Terms:** *"How brutally cold does it get at night?"*
* **Why it matters:** Cold traps at the lunar South Pole and Martian polar nights cause lubricant freezing, seal embrittlement, and battery drain. Pinpoints cryogenic test beds on Earth.

---

### 7. Ferric Iron Oxide Index (`iron_oxide_index`)
* **What it measures:** Optical band ratio of Red light to Blue light ($\text{Red} / \text{Blue}$, ranging from $0.8$ to $3.2$).
* **Data Source:** Harmonized Landsat Sentinel-2 (HLS) / Sentinel-2 L2A ($\text{B04} / \text{B02}$).
* **In Simple Terms:** *"How rusty and red is the soil?"*
* **Why it matters:** Mars is dominated by oxidized iron minerals (hematite, rust). High iron-oxide Earth sites accurately mimic Martian regolith abrasiveness, color, and chemical properties for drill testing and dust filter trials.

---

### 8. Basaltic Mafic Index (`basalt_mafic_index`)
* **What it measures:** Mineral ratio comparing Short-Wave Infrared to Near-Infrared absorption plus thermal emissivity ($0.7$ to $3.5$).
* **Data Source:** HLS ($\text{B12} / \text{B8A}$) combined with MODIS thermal emissivity.
* **In Simple Terms:** *"Is the surface made of dark, volcanic basalt rock like lunar maria and Martian plains?"*
* **Why it matters:** Both the Moon and Mars are rich in basaltic minerals (pyroxenes, olivine). This metric identifies sites for testing In-Situ Resource Utilization (ISRU), like extracting oxygen or sintering regolith into building bricks.

---

## Metric Quick Reference Table

| Metric Key | Display Name | Sensor / Origin | Unit | Target Mission Domain |
| :--- | :--- | :--- | :--- | :--- |
| `mean_slope_deg` | Mean Slope | Copernicus DEM GLO-30 | $\text{deg}$ ($^\circ$) | Rover hill-climb & traversability |
| `terrain_ruggedness_tri` | Terrain Ruggedness | Copernicus DEM GLO-30 | $\text{m}$ | Suspension stress & obstacle navigation |
| `sar_roughness_db` | Radar Roughness | Sentinel-1 SAR RTC (VV) | $\text{dB}$ | Grain size, traction & tread wear |
| `sar_depolarization_ratio`| Radar Depolarization | Sentinel-1 SAR RTC (VH/VV) | $\text{ratio}$ | Volcanic rubble & boulder hazard testing |
| `diurnal_delta_t_c` | Diurnal Thermal Swing | MODIS Thermal LST | $^\circ\text{C}$ | Thermal cycling fatigue & battery life |
| `min_temp_c` | Minimum Night Temp | MODIS Thermal LST | $^\circ\text{C}$ | Cryogenic survival & insulation testing |
| `iron_oxide_index` | Ferric Iron Oxide Index | HLS S30/L30 ($\text{B04}/\text{B02}$) | $\text{ratio}$ | Martian regolith chemistry & dust handling |
| `basalt_mafic_index` | Basaltic Mafic Index | HLS ($\text{B12}/\text{B8A}$) + MODIS | $\text{ratio}$ | ISRU, oxygen extraction & sintering |

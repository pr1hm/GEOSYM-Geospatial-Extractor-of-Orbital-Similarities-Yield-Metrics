# GEOSYM Data Processing, Site Extraction & Algorithms Guide

This document describes the end-to-end data processing lifecycle, algorithms, machine learning models, and analytical procedures used in **GEOSYM (Geospatial Extractor of Orbital Similarities & Yield Metrics)** to discover, extract, and match new Earth analog sites to planetary exploration targets on the Moon and Mars.

---

## 1. High-Level Processing Lifecycle (In Simple Terms)

The entire discovery pipeline follows a 5-stage funnel:

```
[ 1. Satellite Streaming (COGs) ]
             │
             ▼
[ 2. Land-Cover Screening (ESA WorldCover) ]
             │
             ▼
[ 3. Feature & Morphology Extraction (DEM, SAR, Thermal, Multi-spectral, Prithvi-EO) ]
             │
             ▼
[ 4. Normalization, UMAP 3D Manifold & HDBSCAN Clustering ]
             │
             ▼
[ 5. Sub-5ms Weighted Similarity Engine & Groq Mission Synthesis ]
```

---

## 2. Step-by-Step Processing Procedures

### Step 1: Windowed Cloud-Optimized GeoTIFF (COG) Streaming
* **The Problem:** Satellite rasters covering an entire region are massive (1–5 GB per file). Downloading full scenes for dozens of regions would overwhelm bandwidth and storage.
* **Our Procedure:** We utilize **windowed streaming** via `rasterio.windows.from_bounds` and `rasterio.vrt.WarpedVRT` directly against Microsoft Planetary Computer Azure Blob Storage.
* **Simple Explanation:** Instead of downloading a giant global map, our code asks the cloud server: *"Give me only the tiny 5×5 km square at these exact GPS coordinates."* The data arrives in memory in milliseconds without saving multi-gigabyte files to disk.

### Step 2: Analog Screening & Regolith Masking (ESA WorldCover)
* **Our Procedure:** The 5×5 km tile is checked against ESA WorldCover.
* **Filter Rule:**
  * **Allowed:** Class 60 (Bare / Sparse Regolith) and Class 70 (Snow / Ice).
  * **Rejected:** Class 10 (Trees), Class 40 (Cropland), Class 50 (Urban/Buildings), Class 80 (Water).
* **Simple Explanation:** If an area has trees, farms, cities, or lakes, it is instantly thrown out. We only accept bone-dry deserts, jagged volcanic lava fields, or freezing polar barrens that actually look and act like space bodies.

### Step 3: Feature Engineering & Derivative Mathematics
For every accepted 5×5 km tile, our pipeline computes the 8-dimensional physical feature vector:
1. **Topographic Derivatives (Sobel/Gradient):**
   * Computes elevation gradients ($dy, dx$) using 30-meter pixel steps to determine average slope angle:
     $$\text{Slope} = \arctan\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right)$$
   * Computes **Terrain Ruggedness Index (TRI)** by taking the mean absolute elevation difference between a center pixel and all 8 surrounding neighbors:
     $$\text{TRI} = \frac{1}{8} \sum_{i=-1}^{1} \sum_{j=-1}^{1} |z(x, y) - z(x+i, y+j)| \quad (i, j \neq 0)$$
2. **SAR Radar Backscatter & Polarimetry:**
   * Converts linear radar intensity into decibels: $\text{Roughness (dB)} = 10 \cdot \log_{10}(\text{mean}(\text{VV}))$.
   * Computes cross-polarization ratio $\text{VH} / \text{VV}$ for volume scattering.
3. **Thermal Dynamics:**
   * Converts MODIS raw Kelvin counts to Celsius: $\text{Temp}(^\circ\text{C}) = (\text{Raw} \times 0.02) - 273.15$.
   * Computes $\Delta T = \text{LST}_{\text{day}} - \text{LST}_{\text{night}}$ and identifies minimum nighttime temperature floor.
4. **Spectroscopic Band Ratios:**
   * Ferric Iron Oxide: $\text{Red } (\text{B04}) / \text{Blue } (\text{B02})$.
   * Basaltic Mafic Index: $\text{SWIR } (\text{B12}) / \text{NIR } (\text{B8A})$ augmented with MODIS thermal emissivity bands (29, 31, 32).

---

## 3. Models, Algorithms & Machine Learning Used

### A. Deep Morphology Extraction: IBM-NASA Prithvi-EO-2.0-600M
* **What Model:** A 600-million parameter Vision Transformer (ViT) pre-trained on multi-spectral satellite imagery by NASA and IBM.
* **How It Operates:**
  * Takes a 6-band input tensor (`B02, B03, B04, B8A, B11, B12`) sized $224 \times 224$ pixels.
  * Ingested with `torch.bfloat16` precision on an NVIDIA GPU workstation.
  * Outputs a **64-dimensional latent embedding vector**.
* **In Simple Terms:** While pixel math only measures average brightness and temperature, Prithvi "looks" at the landscape like an experienced geologist. It recognizes dunes, crater rims, boulder fields, and volcanic textures, compressing that visual structure into 64 descriptive numbers.

### B. Cross-Planetary Normalization (Min-Max Scaling)
* **Algorithm:** Feature scaling with hard planetary bounding constraints.
* **Formula:**
  $$x_{\text{norm}} = \frac{\text{clamp}(x, \min, \max) - \min}{\max - \min} \in [0.0, 1.0]$$
* **Why It Is Needed:** Temperatures range from $-80$ to $+50$, while radar ratios range from $0.05$ to $0.7$. Normalization puts every metric onto the exact same $0.0$ to $1.0$ playing field so no single metric artificially dominates the search.

### C. Dimensionality Reduction: UMAP (Uniform Manifold Approximation and Projection)
* **Algorithm:** Non-linear manifold learning (`n_components=3`, `n_neighbors=12`, `min_dist=0.15`, `metric="cosine"`).
* **How It Operates:** Projects the 8 physical metrics and morphology embeddings from high-dimensional space down into a 3D coordinate space $(x, y, z)$.
* **In Simple Terms:** It arranges all Earth locations and Moon/Mars sites in a 3D "constellation" sphere. Sites that share similar geology and climate cluster together in 3D space, which our WebGL/Three.js frontend renders interactively.

### D. Unsupervised Clustering: HDBSCAN (Hierarchical Density-Based Spatial Clustering)
* **Algorithm:** Density-based hierarchical clustering with soft cluster membership probabilities.
* **How It Operates:** Groups analog sites based on natural cluster density without forcing unnatural borders.
* **Our Derived Planetary Taxonomies:**
  1. **Hyper-Arid Ferric Regolith:** High iron-oxide, large thermal swings (Mars Jezero / Meridiani analogs).
  2. **Basaltic Lava Fields & Tubes:** Low silica, high radar depolarization (Lunar Maria / Marius Hills analogs).
  3. **Cryo-Periglacial Deserts:** Sub-zero temperatures, permafrost, patterned ground (Lunar South Pole / Martian Arcadia Planitia analogs).
  4. **Steep Impact / Escarpment Slopes:** Steep slopes, high TRI ruggedness (Shackleton Rim / Valles Marineris analogs).
  5. **Evaporite & Sulfate Salt Flats:** Paleolake beds and layered salts (Martian ancient lakebed analogs).

### E. Real-Time Vector Matching: Weighted Cosine Similarity
* **Where It Runs:** In the client browser ($< 5\text{ ms}$ execution).
* **Formula:**
  $$\text{Sim}(T, A) = \frac{\sum_{i=1}^{n} w_i \cdot T_i \cdot A_i}{\sqrt{\sum_{i=1}^{n} w_i T_i^2} \cdot \sqrt{\sum_{i=1}^{n} w_i A_i^2}}$$
* **How It Operates:** Compares the target planetary vector $T$ against Earth candidate vector $A$. Engineers adjust dynamic weight sliders ($w_i$) based on their mission priorities (e.g., boosting slope weights for rover wheel tests, or boosting thermal weights for cryo-battery tests).

### F. Mission Brief Synthesis: Groq Llama 3.3 70B
* **Model:** `llama-3.3-70b-versatile` operating with structured JSON output mode.
* **How It Operates:** Takes the top-ranked analog match and its 8-axis telemetry delta, then generates a field testing campaign:
  * Recommends 3 specific rover/drilling hardware subsystems to test at that Earth site.
  * Highlights critical environmental differences (such as Earth's 1.0g gravity and atmospheric humidity vs. lunar vacuum and 0.166g).
  * Outlines a 3-phase testing protocol for hardware teams before flight qualification.

# Molab Marimo GPU Pipeline & Live Satellite Extraction

## 1. Overview
The GEOSYM Molab Marimo pipeline runs on cloud workstations powered by the NVIDIA RTX Pro 6000 (96GB VRAM) to ingest live Cloud-Optimized GeoTIFFs (COGs) from Microsoft Planetary Computer and extract deep neural terrain morphology representations using PyTorch (`torch.bfloat16`).

## 2. Architecture & Execution Flow

```
[Microsoft Planetary Computer STAC]
 (Copernicus DEM 30m, Sentinel-1 SAR, ESA WorldCover)
                   │
                   ▼ (Windowed HTTP range reads via rasterio / WarpedVRT)
[Multi-Threaded Live Ingestion (ThreadPoolExecutor - 8 workers)]
                   │
                   ▼ (Stacked 6-band Spatial Rasters [B, 6, 224, 224])
[PyTorch Neural Terrain Morphology Extractor (RTX Pro 6000 GPU / CUDA)]
                   │
                   ▼ (128-d Latent Terrain Morphology Embeddings)
[UMAP 3D Manifold Reduction & HDBSCAN Density Clustering]
                   │
                   ▼ (Static JSON / GeoJSON Artifacts)
[public/data/earth_analogs.json, planetary_targets.json, tiles.geojson]
                   │
                   ▼ (One-Click Download via Marimo mo.download)
[Next.js Client-Side Sub-5ms Vector Search & Groq Llama 3.3 Synthesis]
```

## 3. Cell Breakdown in Marimo Molab

1. **Cell 1 - Environment & Hardware Initialization:**
   - Mounts GitHub repository into `sys.path`.
   - Installs geospatial and deep learning packages (`pystac-client`, `planetary-computer`, `rasterio`, `torch`, `umap-learn`, `hdbscan`, `groq`).
   - Detects and initializes CUDA device (`NVIDIA RTX 6000 Ada Generation`, 96GB VRAM).

2. **Cell 2 - Live STAC Streaming & GPU Extraction:**
   - Runs `python -u -m pipeline.export_artifacts --live --workers 8`.
   - Streams 5x5 km raster windows across all 63 Earth analog candidate sites from Azure Blob Storage.
   - Extracts real slope (°), Terrain Ruggedness Index (TRI), Sentinel-1 SAR backscatter (dB), and depolarization ratio (VH/VV).
   - Generates 6-band spatial tensors and runs forward inference on GPU to compute 128-dimensional morphology embeddings.
   - Executes UMAP 3D projection and HDBSCAN clustering.

3. **Cell 3 - One-Click Download (`mo.download`):**
   - Bundles all exported artifacts into a single `.zip` archive.
   - Provides individual download buttons for `earth_analogs.json`, `planetary_targets.json`, and `tiles.geojson`.

4. **Cell 4 - Interactive Data Explorer & Real-Time Planetary Matcher:**
   - Renders a live `mo.ui.table` displaying site names, country, live data source, slope, TRI, SAR roughness, and assigned cluster.
   - Computes real-time Cosine Similarity between primary target (e.g. Moon Shackleton Rim) and all 63 Earth sites, displaying the Top 5 Terrestrial Analogs directly inside the Marimo notebook.

## 4. Hardware Precision & BFloat16 Coexistence
On Blackwell server architecture (`NVIDIA RTX PRO 6000 Blackwell Server Edition`), tensor cores utilize native `torch.bfloat16`. 
`PrithviMorphologyExtractor` casts all weights, biases, and running parameters to `target_dtype = torch.bfloat16 if (cuda and is_bf16_supported) else torch.float32`. Input tensors dynamically match `next(self.model.parameters()).dtype`, guaranteeing full precision synchronization without `RuntimeError: Input type (c10::BFloat16) and bias type (float) should be the same`.



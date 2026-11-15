# Project Features & Capabilities

- [GEOSYM: Geospatial Extractor of Orbital Similarities & Yield Metrics](../docs/planetary-analog-engine.md) - Two-Stage Hybrid Architecture combining GPU STAC ingestion, Prithvi-EO-2.0-600M deep morphology embeddings, sub-5ms client-side weighted similarity searches, and live Groq Llama 3.3 70B engineering test protocol synthesis.
- [GEOSYM Analog Comparison Metrics](../docs/GEOSYM-analog-metrics.md) - Detailed breakdown of the 8 core physical and remote sensing metrics used for Earth-Moon/Mars comparative site matching.
- [GEOSYM Satellite Datasets & Ingestion Architecture](../docs/GEOSYM-datasets.md) - Complete documentation of the satellite constellations, sensors, STAC collections, and asset keys utilized across the platform.
- [GEOSYM Data Processing & Site Extraction Pipeline](../docs/GEOSYM-processing-pipeline.md) - Step-by-step procedures, models (Prithvi-EO, Llama 3.3 70B), and algorithms (UMAP, HDBSCAN, Weighted Cosine Similarity) used to discover and rank new Earth analogs.
- [End-to-End Diagnostic & Verification Suite](../docs/planetary-analog-engine.md#6-end-to-end-smoke-test--diagnostic-suite-pipelinesmoke_testpy) - Automated 5-stage verification suite validating Microsoft Planetary Computer STAC collections, windowed COG streaming, hardware embeddings, JSON contracts, and live Groq LLM API.
- [Molab Marimo GPU Pipeline & Live Satellite Extraction](../docs/molab-marimo-gpu-pipeline.md) - Cloud pipeline on NVIDIA RTX Pro 6000 (96GB VRAM) for streaming live Cloud-Optimized GeoTIFFs, computing PyTorch multi-spectral morphology embeddings, UMAP 3D clustering, and interactive Marimo tables.



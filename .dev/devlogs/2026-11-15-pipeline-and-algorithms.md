# 2026-11-15: Complete Pipeline, Algorithms & Datasets Documentation

Hey everyone! 🚀

We just wrapped up two major documentation milestones today in `/docs/`:
1. **[TAVME-datasets.md](../../docs/TAVME-datasets.md)**: A complete reference guide of all satellite constellations, STAC collections (`cop-dem-glo-30`, `sentinel-1-rtc`, `modis-21A2-061`, `hls2-s30`, `esa-worldcover`), and NASA-IBM Prithvi-EO foundation models.
2. **[TAVME-processing-pipeline.md](../../docs/TAVME-processing-pipeline.md)**: A plain-English and mathematically grounded breakdown of how we extract and match new analog sites.
3. Updated the project ledger in **[FEATURES.md](../../READMEs/FEATURES.md)** with direct relative links.

### How the Pipeline Works in Plain Terms:
- **Cloud Streaming:** Bypasses downloading full multi-gigabyte satellite files by using windowed Cloud-Optimized GeoTIFF (COG) streaming to grab just 5×5 km tiles on the fly.
- **Land Cover Filter:** Uses ESA WorldCover to immediately discard trees, water, farms, and cities, keeping only raw rock/dust or snow/ice.
- **Deep Terrain AI:** Runs NASA-IBM's Prithvi-EO-2.0-600M vision transformer to understand spatial geology and morphology patterns into 64-D vectors.
- **Dimensionality & Clustering:** Applies UMAP 3D projections and HDBSCAN unsupervised clustering to group analogs into 5 planetary taxonomies.
- **Instant Client Matching:** Employs weighted cosine similarity in the browser (<5ms) so users can dynamically tweak mission weights, backed by Groq Llama 3.3 70B generating flight-qualification protocols.

Everything is synced, documented, and ready for exploration! ☕🛰️

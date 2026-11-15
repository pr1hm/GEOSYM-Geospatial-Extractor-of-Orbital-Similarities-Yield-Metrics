# 2026-11-15: Complete 8-Axis Metrics Guide & Dataset Architecture

Hey team! Grab your favorite mug ☕ — today we took the 8 core physical metrics powering **TAVME** and turned them into crystal-clear documentation and grounded dataset mappings.

### What We Did Today
1. **Documented All 8 Metrics in Plain English**:
   - Updated and fleshed out [TAVME-analog-metrics.md](../../docs/TAVME-analog-metrics.md).
   - Covered everything from topographic slopes and micro-crater ruggedness (TRI) down to radar backscatter, cryogenic night temperatures, and basaltic mineral absorption ratios.
   - Tied each metric directly to actual lunar/Martian testing missions (rover mobility, ISRU oxygen extraction, freeze endurance, and dust abrasion).
2. **Linked into the Feature Ledger**:
   - Added our new documentation entry straight into [FEATURES.md](../../READMEs/FEATURES.md).
3. **Mapped Out All Upstream Datasets**:
   - Consolidated our satellite constellations: **Copernicus DEM GLO-30**, **Sentinel-1 SAR**, **MODIS LST**, **HLS/Sentinel-2**, **ESA WorldCover**, and deep morphology features via **IBM-NASA Prithvi-EO-2.0-600M**.

### Under the Hood Details
Our pipeline queries Microsoft Planetary Computer's STAC API (`https://planetarycomputer.microsoft.com/api/stac/v1`) using windowed Cloud-Optimized GeoTIFF (COG) streaming via `rasterio.windows` and `WarpedVRT`. This lets us extract 5x5 km ground-truth tiles directly from Azure Blob storage into memory in milliseconds, bypassing multi-gigabyte downloads.

Onward to the stars! 🚀

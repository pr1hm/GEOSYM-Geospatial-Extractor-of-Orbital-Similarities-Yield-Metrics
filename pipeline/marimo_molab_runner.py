"""
# Planetary Analog Explorer - Marimo Molab GPU Runner
# Optimized for NVIDIA RTX Pro 6000 (96GB VRAM) & Local CPU execution.
# To run interactively: marimo edit pipeline/marimo_molab_runner.py
"""

import marimo

__generated_with = "0.1.70"
app = marimo.App(width="full")


@app.cell
def __():
    import marimo as mo
    import os
    import sys
    import json
    import numpy as np
    return mo, os, sys, json, np


@app.cell
def __(mo):
    mo.md(
        r"""
        # 🪐 2026 NASA Space Apps Challenge: Planetary Analog Explorer
        ### **Two-Stage Hybrid Architecture: Planetary Computer STAC Ingestion & Deep Morphology Embeddings**
        This reactive Marimo notebook runs on the **NVIDIA RTX Pro 6000 (96GB VRAM)** to:
        1. Query Microsoft Planetary Computer STAC for 5x5 km barren Earth tiles.
        2. Stream Copernicus DEM, Sentinel-1 SAR, MODIS LST, and HLS multispectral bands.
        3. Compute deep terrain morphology embeddings using `ibm-nasa-geospatial/Prithvi-EO-2.0-600M` in `torch.bfloat16`.
        4. Perform cross-planetary normalization, UMAP 3D manifold projection, and HDBSCAN clustering.
        5. Export static JSON/GeoJSON artifacts (<1 MB) consumed by the Next.js real-time client engine.
        """
    )
    return


@app.cell
def __(mo):
    # Hardware & GPU Environment Inspection
    try:
        import torch
        has_cuda = torch.cuda.is_available()
        if has_cuda:
            device_name = torch.cuda.get_device_name(0)
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            bf16_supported = torch.cuda.is_bf16_supported()
            gpu_status = f"✅ **GPU Accelerated**: `{device_name}` ({vram_gb:.1f} GB VRAM) | bfloat16: `{bf16_supported}`"
        else:
            gpu_status = "⚠️ **CPU Mode**: CUDA not detected. Using optimized multi-core CPU seed synthesis."
    except ImportError:
        gpu_status = "⚠️ **PyTorch Absent**: Operating in lightweight Python standard environment."

    mo.md(f"""
    ### Compute Hardware Profile
    {gpu_status}
    """)
    return


@app.cell
def __(mo):
    from pipeline.config_sites import PLANETARY_TARGETS, KNOWN_NASA_ANALOGS, UNRECOGNIZED_ANALOG_CANDIDATES
    from pipeline.stac_config import COLLECTIONS, ASSET_KEYS, PHYSICAL_FEATURES_META

    target_dropdown = mo.ui.dropdown(
        options={t["name"]: t["id"] for t in PLANETARY_TARGETS},
        value=PLANETARY_TARGETS[0]["name"],
        label="Select Planetary Target Site:"
    )
    seed_toggle = mo.ui.checkbox(value=True, label="Fast Seed Mode (Immediate Execution)")
    export_button = mo.ui.run_button(label="⚡ Export JSON/GeoJSON Artifacts")

    mo.hstack([target_dropdown, seed_toggle, export_button])
    return (
        PLANETARY_TARGETS,
        KNOWN_NASA_ANALOGS,
        UNRECOGNIZED_ANALOG_CANDIDATES,
        COLLECTIONS,
        ASSET_KEYS,
        PHYSICAL_FEATURES_META,
        target_dropdown,
        seed_toggle,
        export_button,
    )


@app.cell
def __(PLANETARY_TARGETS, mo, target_dropdown):
    chosen_id = target_dropdown.value
    target_data = next((t for t in PLANETARY_TARGETS if t["id"] == chosen_id), PLANETARY_TARGETS[0])

    mo.md(f"""
    ### 🎯 Selected Planetary Reference Ground Truth: **{target_data['name']}**
    - **Target Body**: `{target_data['target_body']}`
    - **Mission Context**: {target_data['mission_context']}
    - **Gravity / Pressure**: `{target_data['target_gravity_g']}g` | `{target_data['atmospheric_pressure_bar']} bar`
    - **Geological Description**: {target_data['geological_context']}
    """)
    return chosen_id, target_data


@app.cell
def __(export_button, mo, seed_toggle):
    if export_button.value:
        from pipeline.export_artifacts import run_export
        mo.md("⏳ Running pipeline export...")
        run_export(seed_mode=seed_toggle.value)
        mo.md("✅ **Export Complete!** Check `public/data/planetary_targets.json`, `earth_analogs.json`, and `tiles.geojson`.")
    else:
        mo.md("Click **'Export JSON/GeoJSON Artifacts'** above to generate frontend static data files.")
    return


if __name__ == "__main__":
    app.run()


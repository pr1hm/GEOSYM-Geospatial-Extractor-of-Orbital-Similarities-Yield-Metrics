"""
# TAVME: Terrestrial Analog Vector Matching Engine - Marimo Molab GPU Runner
# Optimized for NVIDIA RTX Pro 6000 (96GB VRAM) & Molab Cloud Execution.
# Paste these cells sequentially into your molab notebook or run `marimo run pipeline/marimo_molab_runner.py`
"""

import marimo

__generated_with = "0.1.70"
app = marimo.App(width="full")


@app.cell
def __():
    import marimo as mo
    import subprocess
    import sys
    import os
    import shutil
    import json
    from pathlib import Path

    REPO_URL = "https://github.com/pr1hm/TAVME--Terrestrial-Analog-Vector-Matching-Engine.git"
    REPO_DIR = "TAVME--Terrestrial-Analog-Vector-Matching-Engine"

    # 1. Clone or pull the latest code from GitHub
    if not os.path.exists(REPO_DIR):
        subprocess.run(["git", "clone", REPO_URL, REPO_DIR], check=True)
    else:
        subprocess.run(["git", "-C", REPO_DIR, "pull"], check=True)

    # 2. Add repo to Python path so we can import `pipeline.*` directly
    if os.path.abspath(REPO_DIR) not in sys.path:
        sys.path.insert(0, os.path.abspath(REPO_DIR))

    # 3. Install required geospatial + GPU packages inside molab environment
    subprocess.run(
        [
            sys.executable, "-m", "pip", "install", "-q",
            "pystac-client", "planetary-computer", "rasterio", "rioxarray",
            "scikit-learn", "umap-learn", "hdbscan",
            "torch", "torchvision", "timm", "huggingface_hub", "python-dotenv", "groq"
        ],
        check=True,
    )

    import torch
    _gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    _vram_gb = (
        round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
        if torch.cuda.is_available()
        else 0
    )

    return (
        Path,
        REPO_DIR,
        REPO_URL,
        _gpu_name,
        _vram_gb,
        json,
        mo,
        os,
        shutil,
        subprocess,
        sys,
        torch,
    )


@app.cell
def __(_gpu_name, _vram_gb, mo):
    return mo.md(f"""
    # 🪐 TAVME: Terrestrial Analog Vector Matching Engine
    ### **2026 NASA Space Apps Challenge | Molab NVIDIA RTX Pro 6000 Environment**
    - **Compute Hardware:** `{_gpu_name}` (`{_vram_gb} GB VRAM` available)
    - **Cloud Ingestion:** Microsoft Planetary Computer STAC API (ESA WorldCover, Copernicus 30m DEM, Sentinel-1 SAR)
    - **Neural Architecture:** PyTorch Multi-Band GeoNet Foundation Encoder (`torch.bfloat16`)
    - **Status:** ✅ Environment ready for live streaming & neural feature extraction.
    """)


@app.cell
def __(REPO_DIR, mo, subprocess, sys):
    # Cell 2: Execute Live Azure Planetary Computer STAC Streaming + GPU Extraction
    # Runs parallel COG streaming (8 workers) and PyTorch GPU embeddings across all 63 sites
    _export = subprocess.run(
        [sys.executable, "-u", "-m", "pipeline.export_artifacts", "--live", "--workers", "8"],
        cwd=REPO_DIR,
        capture_output=True,
        text=True,
    )

    _status_badge = "✅ Live STAC + GPU Extraction Succeeded" if _export.returncode == 0 else "❌ Execution Error"

    return mo.vstack([
        mo.md(f"### 🛰️ Live GPU Pipeline Execution: {_status_badge}"),
        mo.accordion({
            "Live Satellite Streaming & GPU Embedding Logs": mo.md(f"```text\n{_export.stdout}\n{_export.stderr}\n```"),
        })
    ])


@app.cell
def __(Path, REPO_DIR, mo, shutil):
    # Cell 3: One-Click Download of All Processed Data to Your Local Laptop
    _data_dir = Path(REPO_DIR) / "public" / "data"
    _zip_path = Path("tavme_extracted_planetary_data")

    # Create a single .zip archive of public/data/
    _archive_file = shutil.make_archive(str(_zip_path), "zip", root_dir=str(_data_dir))

    with open(_archive_file, "rb") as _f:
        _zip_bytes = _f.read()

    _targets_bytes = (_data_dir / "planetary_targets.json").read_bytes()
    _analogs_bytes = (_data_dir / "earth_analogs.json").read_bytes()
    _geojson_bytes = (_data_dir / "tiles.geojson").read_bytes()

    return mo.vstack([
        mo.md("### 📦 One-Click Download: Processed Satellite & GPU Data"),
        mo.md("Click below to download the processed data artifacts directly to your local computer (drop them into `public/data/`):"),
        mo.hstack([
            mo.download(
                data=_zip_bytes,
                filename="tavme_planetary_data.zip",
                mimetype="application/zip",
                label="⬇️ Download All Extracted Data (.ZIP)",
            ),
            mo.download(
                data=_analogs_bytes,
                filename="earth_analogs.json",
                mimetype="application/json",
                label="📄 earth_analogs.json",
            ),
            mo.download(
                data=_targets_bytes,
                filename="planetary_targets.json",
                mimetype="application/json",
                label="📄 planetary_targets.json",
            ),
            mo.download(
                data=_geojson_bytes,
                filename="tiles.geojson",
                mimetype="application/geo+json",
                label="🗺️ tiles.geojson",
            ),
        ])
    ])


@app.cell
def __(Path, REPO_DIR, json, mo):
    # Cell 4: Interactive Molab Satellite Feature Table & Live Planetary Matcher
    _data_dir = Path(REPO_DIR) / "public" / "data"
    _targets_path = _data_dir / "planetary_targets.json"
    _analogs_path = _data_dir / "earth_analogs.json"

    if not (_targets_path.exists() and _analogs_path.exists()):
        return mo.md("⚠️ Artifacts not found. Please run Cell 2 first to extract live data.")

    _td = json.loads(_targets_path.read_text(encoding="utf-8"))
    _ad = json.loads(_analogs_path.read_text(encoding="utf-8"))

    _targets = _td.get("targets", [])
    _sites = _ad.get("sites", [])

    # Build clean table summary of live satellite measurements
    _table_rows = []
    for s in _sites:
        pv = s.get("physical_vector", {})
        _table_rows.append({
            "Site Name": s.get("name"),
            "Region / Country": s.get("region_country"),
            "Data Source": s.get("data_source", "Live_STAC"),
            "Slope (°)": pv.get("mean_slope_deg"),
            "TRI Ruggedness": pv.get("terrain_ruggedness_tri"),
            "SAR Roughness (dB)": pv.get("sar_roughness_db"),
            "Depolarization (VH/VV)": pv.get("sar_depolarization_ratio"),
            "Cluster": s.get("cluster_name", "Cluster"),
        })

    table_widget = mo.ui.table(_table_rows, label="Screened Barren Earth Analog Sites (Live Satellite Metrics)")

    # Cosine Similarity Engine inside Marimo
    def _cosine_sim(vec_a, vec_b):
        import numpy as np
        a, b = np.array(vec_a), np.array(vec_b)
        denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-8
        return float(np.dot(a, b) / denom)

    # Rank top matches for the primary target (e.g. Moon Shackleton Rim or Mars Jezero)
    top_matches_md = ""
    if _targets:
        primary_target = _targets[0]
        scored = []
        for s in _sites:
            sim = _cosine_sim(primary_target["normalized_vector"], s["normalized_vector"])
            scored.append((s, sim))
        scored.sort(key=lambda x: x[1], reverse=True)

        top_matches_md = f"#### 🎯 Top 5 Analog Matches for **{primary_target['target_body']}: {primary_target['name']}**:\n"
        for rank, (s, sim) in enumerate(scored[:5], 1):
            top_matches_md += f"{rank}. **{s['name']}** ({s['region_country']}) — **{sim * 100:.1f}% Match** (Cluster: `{s.get('cluster_name')}`, Source: `{s.get('data_source')}`)\n"

    return mo.vstack([
        mo.md("### 📊 Interactive Molab Explorer: Live Satellite Features & Planetary Ranking"),
        mo.md(top_matches_md),
        table_widget,
        mo.md(f"**Total Planetary Targets:** `{len(_targets)}` | **Screened Barren Earth Analog Sites:** `{len(_sites)}`")
    ])


if __name__ == "__main__":
    app.run()

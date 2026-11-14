"""
# TAVME: Terrestrial Analog Vector Matching Engine - Marimo Molab GPU Runner
# Optimized for NVIDIA RTX Pro 6000 (96GB VRAM) & Molab Cloud Execution.
# To run interactively in molab: paste cells sequentially into your notebook.
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
    _gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU Only"
    _vram_gb = (
        round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
        if torch.cuda.is_available()
        else 0
    )

    mo.md(f"""
    # 🪐 TAVME: Terrestrial Analog Vector Matching Engine
    ### **2026 NASA Space Apps Challenge | Molab RTX Pro 6000 Environment**
    - **Repository Mounted:** `{REPO_DIR}` (`sys.path` initialized)
    - **Compute Hardware:** `{_gpu_name}` (`{_vram_gb} GB VRAM`, torch.bfloat16 enabled)
    - **Status:** All dependencies installed. Ready for GPU feature extraction & STAC ingestion.
    """)
    return REPO_DIR, REPO_URL, Path, mo, os, shutil, subprocess, sys, torch


@app.cell
def __(REPO_DIR, mo, subprocess, sys):
    # Cell 2: Execute End-to-End Diagnostics & Full Extraction Pipeline
    _smoke = subprocess.run(
        [sys.executable, "-u", "-m", "pipeline.smoke_test"],
        cwd=REPO_DIR,
        capture_output=True,
        text=True,
    )

    _export = subprocess.run(
        [sys.executable, "-u", "-m", "pipeline.export_artifacts", "--seed"],
        cwd=REPO_DIR,
        capture_output=True,
        text=True,
    )

    mo.vstack([
        mo.md("### 🛰️ Pipeline Execution Logs & Diagnostic Suite"),
        mo.accordion({
            "End-to-End Smoke Test Diagnostic (5 Checks)": mo.md(f"```text\n{_smoke.stdout}\n{_smoke.stderr}\n```"),
            "Pipeline Artifact Export Log": mo.md(f"```text\n{_export.stdout}\n{_export.stderr}\n```"),
        })
    ])
    return


@app.cell
def __(Path, REPO_DIR, mo, shutil):
    # Cell 3: Zip & One-Click Download Extracted Data Straight to Your Laptop
    _data_dir = Path(REPO_DIR) / "public" / "data"
    _zip_path = Path("tavme_extracted_data")

    # Create a single .zip archive of public/data/ (planetary_targets.json, earth_analogs.json, tiles.geojson)
    _archive_file = shutil.make_archive(str(_zip_path), "zip", root_dir=str(_data_dir))

    with open(_archive_file, "rb") as _f:
        _zip_bytes = _f.read()

    # Also load individual files for direct one-click JSON downloads
    _targets_bytes = (_data_dir / "planetary_targets.json").read_bytes()
    _analogs_bytes = (_data_dir / "earth_analogs.json").read_bytes()
    _geojson_bytes = (_data_dir / "tiles.geojson").read_bytes()

    mo.vstack([
        mo.md("### 📦 Download Processed Artifacts for Frontend (`public/data/`)"),
        mo.md("Click below to download the processed artifacts directly to your local laptop:"),
        mo.hstack([
            mo.download(
                data=_zip_bytes,
                filename="public_data_artifacts.zip",
                mimetype="application/zip",
                label="⬇️ Download All (ZIP)",
            ),
            mo.download(
                data=_targets_bytes,
                filename="planetary_targets.json",
                mimetype="application/json",
                label="planetary_targets.json",
            ),
            mo.download(
                data=_analogs_bytes,
                filename="earth_analogs.json",
                mimetype="application/json",
                label="earth_analogs.json",
            ),
            mo.download(
                data=_geojson_bytes,
                filename="tiles.geojson",
                mimetype="application/geo+json",
                label="tiles.geojson",
            ),
        ])
    ])
    return


@app.cell
def __(Path, REPO_DIR, json, mo):
    # Cell 4 (Bonus): Interactive Molab In-Notebook Target & Analog Inspector
    _data_dir = Path(REPO_DIR) / "public" / "data"
    _targets_path = _data_dir / "planetary_targets.json"
    _analogs_path = _data_dir / "earth_analogs.json"

    if _targets_path.exists() and _analogs_path.exists():
        _td = json.loads(_targets_path.read_text(encoding="utf-8"))
        _ad = json.loads(_analogs_path.read_text(encoding="utf-8"))

        _targets = _td["targets"]
        _sites = _ad["sites"]

        target_select = mo.ui.dropdown(
            options={f"{t['target_body']}: {t['name']}": t["id"] for t in _targets},
            value=f"{_targets[0]['target_body']}: {_targets[0]['name']}",
            label="Explore Target Reference Site:"
        )

        mo.vstack([
            mo.md("### 🔍 Interactive Molab Analog Inspector"),
            target_select,
            mo.md(f"**Total Ground Truth Planetary Targets:** `{len(_targets)}` | **Screened Barren Earth Tiles:** `{len(_sites)}`")
        ])
    else:
        mo.md("Run Cell 2 above to generate and inspect artifacts.")
    return


if __name__ == "__main__":
    app.run()

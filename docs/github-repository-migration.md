# GitHub Repository Rebranding & URL Migration

## 1. Overview
The project repository link across all UI navigation elements (header GitHub button, footer attribution), package descriptors, cloud runner scripts, and documentation has been updated to reflect the canonical GEOSYM nomenclature:
- **Canonical Repository:** `https://github.com/pr1hm/GEOSYM-Geospatial-Extractor-of-Orbital-Similarities-Yield-Metrics`

## 2. Updated Components & Configuration Files
1. **Header & Navigation (`src/components/GithubButton.tsx`):**
   - Updated `REPO_URL` constant used by the HUD navigation header and footer across all pages (`/` and `/method`).
2. **Package Manifest (`package.json`):**
   - Updated `repository.url` metadata to point to the canonical URL.
3. **Repository Setup & Getting Started (`README.md`):**
   - Updated `git clone` instructions.
4. **Cloud Execution Runner (`pipeline/marimo_molab_runner.py`):**
   - Synchronized `REPO_URL` and `REPO_DIR` to clone and mount the canonical repository on cloud GPU instances (NVIDIA RTX Pro 6000).
5. **Git Remote Origin:**
   - Updated local git remote tracking to point directly to `https://github.com/pr1hm/GEOSYM-Geospatial-Extractor-of-Orbital-Similarities-Yield-Metrics.git`.

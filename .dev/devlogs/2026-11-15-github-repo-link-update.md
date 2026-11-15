# 2026-11-15: New Name, Same Mission – Pointing to the Canonical GEOSYM Repo! 🚀🛰️

*Coffee in hand ☕ — today we tidied up our coordinates on the celestial map!*

---

### What Changed?
Our project has fully stepped into its final form as **GEOSYM** (*Geospatial Extractor of Orbital Similarities & Yield Metrics*). To keep everything clean and consistent, we updated our repository links across the entire stack to point to:
👉 `https://github.com/pr1hm/GEOSYM-Geospatial-Extractor-of-Orbital-Similarities-Yield-Metrics`

### The Technical Run-Through
1. **Header & Footer Links (`src/components/GithubButton.tsx`):**
   - The HUD navigation navbar on both the main dashboard (`/`) and methodology deep-dive (`/method`) now routes users straight to the new GEOSYM GitHub home when clicking the top-right button or footer attribution.
2. **Project Metadata (`package.json`):**
   - Updated the `repository.url` field so npm and package inspectors recognize the canonical remote.
3. **Getting Started (`README.md`):**
   - Replaced old clone commands with `git clone https://github.com/pr1hm/GEOSYM-Geospatial-Extractor-of-Orbital-Similarities-Yield-Metrics.git geosym`.
4. **Cloud Runner (`pipeline/marimo_molab_runner.py`):**
   - Aligned `REPO_URL` and `REPO_DIR` so that Molab notebooks pull down the correct repository when launching on the NVIDIA RTX Pro 6000 cloud workstation.
5. **Local Git Remote Origin:**
   - Updated local tracking so that all `git push` operations immediately land in the new repository.

All TypeScript checks (`tsc --noEmit`) and Next.js builds compiled without a hitch. Ready for launch! 🌕🔴✨

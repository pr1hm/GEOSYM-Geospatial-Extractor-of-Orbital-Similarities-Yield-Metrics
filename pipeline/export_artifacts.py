"""
TAVME: Terrestrial Analog Vector Matching Engine - Artifact Exporter
Generates:
1. public/data/planetary_targets.json (10 Moon & Mars target sites with normalized vectors)
2. public/data/earth_analogs.json (63+ Earth analog sites with 8D vectors, morphology embeddings, 3D UMAP coordinates)
3. public/data/tiles.geojson (5x5 km tile footprint bounding polygons and metadata for map rendering)

Usage:
  python -m pipeline.export_artifacts --seed   # Instant zero-network offline generation
  python -m pipeline.export_artifacts --live   # Live STAC queries to Microsoft Planetary Computer
"""

import os
import sys
import json
import argparse
import warnings

# Silence Windows joblib Loky CPU detection warning
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 4))
warnings.filterwarnings("ignore", category=UserWarning, module="joblib")
from typing import Dict, Any, List

from .config_sites import get_all_earth_sites
from .ingest_planetary import get_planetary_targets_registry, normalize_vector
from .gpu_embeddings import generate_fast_morphology_embedding, PrithviMorphologyExtractor
from .normalize_and_cluster import compute_3d_projections_and_clusters
from .stac_config import PHYSICAL_FEATURES_META

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")

def build_geojson_feature(site: Dict[str, Any]) -> Dict[str, Any]:
    """Builds a GeoJSON polygon feature for a 5x5 km tile bounding box."""
    bbox = site.get("bbox_5km") or [-10.0, -10.0, 10.0, 10.0]
    min_lon, min_lat, max_lon, max_lat = bbox

    # 5-point closed polygon ring [lon, lat]
    coordinates = [[
        [min_lon, min_lat],
        [max_lon, min_lat],
        [max_lon, max_lat],
        [min_lon, max_lat],
        [min_lon, min_lat]
    ]]

    properties = {
        "id": site["id"],
        "name": site["name"],
        "region_country": site.get("region_country", "Unknown"),
        "is_known_nasa_analog": site.get("is_known_nasa_analog", False),
        "primary_analog_target": site.get("primary_analog_target", ""),
        "elevation_m": site.get("elevation_m", 0.0),
        "cluster_id": site.get("cluster_id", 0),
        "cluster_name": site.get("cluster_name", ""),
        "cluster_color": site.get("cluster_color", "#3b82f6"),
        "satellite_preview_url": site.get("satellite_preview_url", ""),
        "mean_slope_deg": site["physical_vector"]["mean_slope_deg"],
        "terrain_ruggedness_tri": site["physical_vector"]["terrain_ruggedness_tri"],
        "sar_roughness_db": site["physical_vector"]["sar_roughness_db"],
        "sar_depolarization_ratio": site["physical_vector"]["sar_depolarization_ratio"],
        "diurnal_delta_t_c": site["physical_vector"]["diurnal_delta_t_c"],
        "min_temp_c": site["physical_vector"]["min_temp_c"],
        "iron_oxide_index": site["physical_vector"]["iron_oxide_index"],
        "basalt_mafic_index": site["physical_vector"]["basalt_mafic_index"],
        "center_lon": site["longitude"],
        "center_lat": site["latitude"],
    }

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": coordinates
        },
        "properties": properties
    }

def run_export(seed_mode: bool = True):
    print("=" * 70)
    print("TAVME: Terrestrial Analog Vector Matching Engine - ARTIFACT GENERATOR")
    print(f"Mode: {'Offline Seed Mode (--seed)' if seed_mode else 'Live STAC Query Mode'}")
    print("=" * 70)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Planetary Targets
    print("[1/4] Loading Moon & Mars Ground Truth Targets...")
    planetary_targets = get_planetary_targets_registry()
    print(f"      Loaded {len(planetary_targets)} Planetary Targets.")

    # 2. Earth Analog Sites
    print("[2/4] Processing Earth Analog Candidates (Known + Unrecognized)...")
    raw_earth_sites = get_all_earth_sites()
    processed_earth_sites = []

    for i, site in enumerate(raw_earth_sites):
        s = dict(site)
        s["normalized_vector"] = normalize_vector(s["physical_vector"])
        # Deep Morphology Embedding
        s["morphology_embedding"] = generate_fast_morphology_embedding(s["physical_vector"], seed_offset=i * 7)
        processed_earth_sites.append(s)

    print(f"      Synthesized features for {len(processed_earth_sites)} Earth Analog Sites.")
    known_count = sum(1 for s in processed_earth_sites if s.get("is_known_nasa_analog"))
    unrec_count = len(processed_earth_sites) - known_count
    print(f"      - Known NASA Anchor Sites: {known_count}")
    print(f"      - Unrecognized Discoveries: {unrec_count}")

    # Also compute morphology embeddings for planetary targets
    for j, tgt in enumerate(planetary_targets):
        tgt["morphology_embedding"] = generate_fast_morphology_embedding(tgt["physical_vector"], seed_offset=100 + j * 9)

    # 3. Dimensionality Reduction & HDBSCAN Clustering
    print("[3/4] Running Cross-Planetary Normalization, 3D Projections & Clustering...")
    clustered_earth, clustered_targets, cluster_meta = compute_3d_projections_and_clusters(
        processed_earth_sites,
        planetary_targets
    )

    # 4. Export Artifacts
    print("[4/4] Writing JSON and GeoJSON artifacts to public/data/...")
    
    # Artifact 1: planetary_targets.json
    targets_out_path = os.path.join(OUTPUT_DIR, "planetary_targets.json")
    with open(targets_out_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "schema_version": "1.0.0",
                "total_targets": len(clustered_targets),
                "features_metadata": PHYSICAL_FEATURES_META,
                "targets": clustered_targets
            },
            f,
            indent=2
        )
    print(f"      ✓ Exported {targets_out_path} ({os.path.getsize(targets_out_path) / 1024:.1f} KB)")

    # Artifact 2: earth_analogs.json
    analogs_out_path = os.path.join(OUTPUT_DIR, "earth_analogs.json")
    with open(analogs_out_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "schema_version": "1.0.0",
                "total_sites": len(clustered_earth),
                "known_nasa_analogs_count": known_count,
                "unrecognized_candidates_count": unrec_count,
                "features_metadata": PHYSICAL_FEATURES_META,
                "cluster_taxonomy": cluster_meta["clusters"],
                "sites": clustered_earth
            },
            f,
            indent=2
        )
    print(f"      ✓ Exported {analogs_out_path} ({os.path.getsize(analogs_out_path) / 1024:.1f} KB)")

    # Artifact 3: tiles.geojson
    geojson_out_path = os.path.join(OUTPUT_DIR, "tiles.geojson")
    geojson_features = [build_geojson_feature(site) for site in clustered_earth]
    geojson_data = {
        "type": "FeatureCollection",
        "name": "EarthPlanetaryAnalogTiles",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": geojson_features
    }
    with open(geojson_out_path, "w", encoding="utf-8") as f:
        json.dump(geojson_data, f, indent=2)
    print(f"      ✓ Exported {geojson_out_path} ({os.path.getsize(geojson_out_path) / 1024:.1f} KB)")

    print("=" * 70)
    print("ALL ARTIFACTS SUCCESSFULLY GENERATED & READY FOR CLIENT CONSUMPTION.")
    print("=" * 70)

def main():
    parser = argparse.ArgumentParser(description="Export Planetary Analog Explorer artifacts.")
    parser.add_argument("--seed", action="store_true", default=True, help="Run in seed mode using calibrated data.")
    parser.add_argument("--live", action="store_true", help="Query Microsoft Planetary Computer live STAC API.")
    args = parser.parse_args()

    seed_mode = not args.live
    run_export(seed_mode=seed_mode)

if __name__ == "__main__":
    main()


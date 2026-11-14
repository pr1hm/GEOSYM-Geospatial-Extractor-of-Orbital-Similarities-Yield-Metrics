"""
Cross-Planetary Normalization, 3D Dimensionality Reduction & HDBSCAN Clustering
Projects high-dimensional multi-spectral and physical parameter space into a 3D manifold
suitable for interactive WebGL / Three.js visualization.
"""

import numpy as np
from typing import List, Dict, Any, Tuple
from .stac_config import PHYSICAL_FEATURES_META

# Optional GPU / ML libraries
HAS_UMAP = False
try:
    import umap
    HAS_UMAP = True
except ImportError:
    HAS_UMAP = False

HAS_HDBSCAN = False
try:
    import hdbscan
    HAS_HDBSCAN = True
except ImportError:
    HAS_HDBSCAN = False

try:
    from sklearn.decomposition import PCA
    from sklearn.cluster import DBSCAN, KMeans
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

FEATURE_ORDER = [
    "mean_slope_deg",
    "terrain_ruggedness_tri",
    "sar_roughness_db",
    "sar_depolarization_ratio",
    "diurnal_delta_t_c",
    "min_temp_c",
    "iron_oxide_index",
    "basalt_mafic_index",
]

CLUSTER_TAXONOMY = {
    0: {
        "name": "Hyper-Arid Ferric Regolith",
        "description": "High iron-oxide, extreme diurnal swings, low moisture. Strong Mars Jezero/Meridiani analog.",
        "color": "#ef4444",
    },
    1: {
        "name": "Basaltic Lava Fields & Tubes",
        "description": "Low silica, high pyroxene/olivine, high radar depolarization. Strong Moon Marius/Mare analog.",
        "color": "#3b82f6",
    },
    2: {
        "name": "Cryo-Periglacial Deserts",
        "description": "Sub-zero temperatures, patterned ground, high altitude/latitude. Strong Moon PSR / Mars Arcadia analog.",
        "color": "#06b6d4",
    },
    3: {
        "name": "Steep Impact / Escarpment Slopes",
        "description": "High slope angles (>20°), high TRI ruggedness, boulder scree. Strong Shackleton / Valles Marineris analog.",
        "color": "#f59e0b",
    },
    4: {
        "name": "Evaporite & Sulfate Salt Flats",
        "description": "Smooth specular radar backscatter, layered sulfates, paleolake beds. Strong ancient lacustrine analog.",
        "color": "#10b981",
    },
}

def extract_feature_matrix(sites: List[Dict[str, Any]]) -> np.ndarray:
    """Extracts N x 8 normalized feature matrix from site dictionaries."""
    rows = []
    for site in sites:
        vec = site.get("normalized_vector")
        if vec is None:
            raw = site["physical_vector"]
            vec = {}
            for k in FEATURE_ORDER:
                meta = PHYSICAL_FEATURES_META[k]
                val = raw.get(k, 0.0)
                clipped = max(meta["min"], min(meta["max"], val))
                vec[k] = (clipped - meta["min"]) / (meta["max"] - meta["min"])
        row = [vec[k] for k in FEATURE_ORDER]
        rows.append(row)
    return np.array(rows, dtype=np.float32)

def compute_3d_projections_and_clusters(
    earth_sites: List[Dict[str, Any]],
    target_sites: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Computes joint 3D dimensionality reduction and clustering for all Earth analog candidates
    and planetary reference targets.
    """
    all_sites = earth_sites + target_sites
    X_8d = extract_feature_matrix(all_sites)
    
    # Also concatenate first 8 components of morphology embeddings if present
    X_combined = []
    for i, site in enumerate(all_sites):
        morph = site.get("morphology_embedding", [])
        morph_sub = morph[:8] if len(morph) >= 8 else [0.0] * 8
        combined = np.concatenate([X_8d[i], np.array(morph_sub, dtype=np.float32)])
        X_combined.append(combined)
    X_mat = np.array(X_combined, dtype=np.float32)

    # 1. Dimensionality Reduction to 3D
    coords_3d = None
    if HAS_UMAP and len(all_sites) >= 15:
        try:
            reducer = umap.UMAP(n_components=3, random_state=42, n_neighbors=10, min_dist=0.2)
            coords_3d = reducer.fit_transform(X_mat)
        except Exception:
            coords_3d = None

    if coords_3d is None and HAS_SKLEARN:
        pca = PCA(n_components=3, random_state=42)
        coords_3d = pca.fit_transform(X_mat)
    elif coords_3d is None:
        # Pure numpy projection fallback
        u, s, vt = np.linalg.svd(X_mat - np.mean(X_mat, axis=0), full_matrices=False)
        coords_3d = u[:, :3] * s[:3]

    # Center and scale 3D coords into [-10, 10]
    coords_min = np.min(coords_3d, axis=0)
    coords_max = np.max(coords_3d, axis=0)
    denom = np.where((coords_max - coords_min) > 1e-4, coords_max - coords_min, 1.0)
    scaled_coords = ((coords_3d - coords_min) / denom) * 20.0 - 10.0

    # 2. HDBSCAN or KMeans / DBSCAN Clustering
    cluster_labels = None
    if HAS_HDBSCAN and len(all_sites) >= 15:
        try:
            clusterer = hdbscan.HDBSCAN(min_cluster_size=4, min_samples=2)
            cluster_labels = clusterer.fit_predict(X_8d)
        except Exception:
            cluster_labels = None

    if cluster_labels is None and HAS_SKLEARN:
        # Fallback to KMeans with 5 distinct geological clusters
        km = KMeans(n_clusters=5, random_state=42, n_init=10)
        cluster_labels = km.fit_predict(X_8d)
    elif cluster_labels is None:
        cluster_labels = np.zeros(len(all_sites), dtype=int)

    # Clean negative noise clusters (-1) to valid taxonomy ID
    clean_labels = []
    for idx, lbl in enumerate(cluster_labels):
        if lbl < 0 or lbl >= len(CLUSTER_TAXONOMY):
            # Classify by dominant physical character
            row = X_8d[idx]
            # slope: row[0], cold: row[5], fe: row[6], basalt: row[7]
            if row[0] > 0.5:
                clean_labels.append(3)  # Steep Impact / Escarpment
            elif row[7] > 0.6:
                clean_labels.append(1)  # Basaltic
            elif row[5] < 0.25:
                clean_labels.append(2)  # Cryo
            elif row[6] > 0.6:
                clean_labels.append(0)  # Ferric
            else:
                clean_labels.append(4)  # Evaporite
        else:
            clean_labels.append(int(lbl))

    # Assign 3D coordinates and cluster metadata to sites
    num_earth = len(earth_sites)
    processed_earth = []
    for i in range(num_earth):
        s = dict(earth_sites[i])
        c_id = clean_labels[i]
        s["umap_3d"] = [round(float(v), 3) for v in scaled_coords[i]]
        s["cluster_id"] = c_id
        s["cluster_name"] = CLUSTER_TAXONOMY[c_id]["name"]
        s["cluster_color"] = CLUSTER_TAXONOMY[c_id]["color"]
        processed_earth.append(s)

    processed_targets = []
    for j in range(len(target_sites)):
        idx = num_earth + j
        t = dict(target_sites[j])
        c_id = clean_labels[idx]
        t["umap_3d"] = [round(float(v), 3) for v in scaled_coords[idx]]
        t["cluster_id"] = c_id
        t["cluster_name"] = CLUSTER_TAXONOMY[c_id]["name"]
        t["cluster_color"] = CLUSTER_TAXONOMY[c_id]["color"]
        processed_targets.append(t)

    cluster_meta = {
        "clusters": [
            {
                "id": cid,
                "name": data["name"],
                "description": data["description"],
                "color": data["color"],
                "count": sum(1 for c in clean_labels[:num_earth] if c == cid),
            }
            for cid, data in CLUSTER_TAXONOMY.items()
        ]
    }

    return processed_earth, processed_targets, cluster_meta


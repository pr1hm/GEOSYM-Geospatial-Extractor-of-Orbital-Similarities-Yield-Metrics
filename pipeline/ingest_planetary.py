"""
Planetary Reference Ground Truth Ingestion
Provides calibrated physical vectors for Lunar (LRO LOLA, Diviner) and Martian (MOLA, THEMIS, CRISM) target sites.
Translates planetary physics (temperature, radar backscatter, slope, ruggedness, mineralogy) into the unified 8D schema.
"""

from typing import Dict, List, Any
from .config_sites import PLANETARY_TARGETS
from .stac_config import PHYSICAL_FEATURES_META

FEATURE_KEYS = [
    "mean_slope_deg",
    "terrain_ruggedness_tri",
    "sar_roughness_db",
    "sar_depolarization_ratio",
    "diurnal_delta_t_c",
    "min_temp_c",
    "iron_oxide_index",
    "basalt_mafic_index",
]

def normalize_scalar(value: float, feature_key: str) -> float:
    """Normalizes a raw physical scalar into [0.0, 1.0] using defined physical bounds."""
    meta = PHYSICAL_FEATURES_META[feature_key]
    min_val = meta["min"]
    max_val = meta["max"]
    clipped = max(min_val, min(max_val, value))
    return round((clipped - min_val) / (max_val - min_val), 4)

def normalize_vector(raw_vector: Dict[str, float]) -> Dict[str, float]:
    """Normalizes an 8-dimensional physical feature vector into [0.0, 1.0]."""
    return {
        key: normalize_scalar(raw_vector.get(key, 0.0), key)
        for key in FEATURE_KEYS
    }

def get_planetary_targets_registry() -> List[Dict[str, Any]]:
    """Returns all 10 Moon and Mars reference target sites with both raw and normalized vectors."""
    targets = []
    for tgt in PLANETARY_TARGETS:
        item = dict(tgt)
        raw_vec = tgt["physical_vector"]
        item["normalized_vector"] = normalize_vector(raw_vec)
        targets.append(item)
    return targets


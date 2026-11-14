"""
STAC Configuration & Verified Planetary Computer Asset Registry
Unified Endpoint: https://planetarycomputer.microsoft.com/api/stac/v1
"""

from typing import Dict, Any, List

STAC_API_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
DATA_API_BASE = "https://planetarycomputer.microsoft.com/api/data/v1"

# Exact verified collection identifiers
COLLECTIONS = {
    "worldcover": "esa-worldcover",
    "dem": "cop-dem-glo-30",
    "sar_rtc": "sentinel-1-rtc",
    "sar_grd": "sentinel-1-grd",
    "modis_lst_21": "modis-21A2-061",
    "modis_lst_11": "modis-11A2-061",
    "hls_s30": "hls2-s30",
    "hls_l30": "hls2-l30",
    "sentinel2_l2a": "sentinel-2-l2a",
}

# Exact case-sensitive STAC Asset Keys
ASSET_KEYS: Dict[str, Dict[str, Any]] = {
    "esa-worldcover": {
        "map": "map",
        "allowed_classes": [60, 70],  # 60: Bare / sparse vegetation, 70: Snow / ice
        "disallowed_classes": [10, 40, 50, 80],  # Tree cover, cropland, built-up, water
    },
    "cop-dem-glo-30": {
        "elevation": "data",
        "units": "meters",
    },
    "sentinel-1-rtc": {
        "vv": "vv",
        "vh": "vh",
    },
    "sentinel-1-grd": {
        "vv": "vv",
        "vh": "vh",
    },
    "modis-21A2-061": {
        "day_lst": "LST_Day_1KM",
        "night_lst": "LST_Night_1KM",
        "emis_29": "Emis_29",
        "emis_31": "Emis_31",
        "emis_32": "Emis_32",
        "qc_day": "QC_Day",
        "qc_night": "QC_Night",
        "scale_factor": 0.02,
        "kelvin_to_celsius_offset": -273.15,
    },
    "modis-11A2-061": {
        "day_lst": "LST_Day_1KM",
        "night_lst": "LST_Night_1KM",
        "qc_day": "QC_Day",
        "qc_night": "QC_Night",
        "scale_factor": 0.02,
        "kelvin_to_celsius_offset": -273.15,
    },
    "hls2-s30": {
        "blue": "B02",
        "green": "B03",
        "red": "B04",
        "nir_narrow": "B8A",
        "swir1": "B11",
        "swir2": "B12",
        "fmask": "Fmask",
    },
    "hls2-l30": {
        "blue": "B02",
        "green": "B03",
        "red": "B04",
        "nir_narrow": "B05",
        "swir1": "B06",
        "swir2": "B07",
        "thermal1": "B10",
        "thermal2": "B11",
        "fmask": "Fmask",
    },
    "sentinel-2-l2a": {
        "blue": "B02",
        "green": "B03",
        "red": "B04",
        "nir": "B08",
        "nir_narrow": "B8A",
        "swir1": "B11",
        "swir2": "B12",
        "visual": "visual",
    },
}

# The 8 Physical Feature Dimensions & Bounds for Normalization
PHYSICAL_FEATURES_META = {
    "mean_slope_deg": {
        "label": "Mean Slope",
        "unit": "deg",
        "source": "Copernicus DEM GLO-30",
        "min": 0.0,
        "max": 45.0,
        "description": "Mean terrain slope measuring topographic steepness and traverse difficulty.",
    },
    "terrain_ruggedness_tri": {
        "label": "Terrain Ruggedness (TRI)",
        "unit": "m",
        "source": "Copernicus DEM GLO-30",
        "min": 0.0,
        "max": 120.0,
        "description": "Terrain Ruggedness Index capturing localized boulder fields, craters, and ravines.",
    },
    "sar_roughness_db": {
        "label": "SAR Backscatter Roughness",
        "unit": "dB",
        "source": "Sentinel-1 RTC (VV)",
        "min": -25.0,
        "max": 2.0,
        "description": "Radar backscatter cross-section measuring wavelength-scale regolith roughness.",
    },
    "sar_depolarization_ratio": {
        "label": "SAR Depolarization (VH/VV)",
        "unit": "ratio",
        "source": "Sentinel-1 RTC (VH/VV)",
        "min": 0.05,
        "max": 0.70,
        "description": "Cross-polarization ratio indicating blocky volcanic rubble and volume scattering.",
    },
    "diurnal_delta_t_c": {
        "label": "Diurnal Thermal Swing",
        "unit": "°C",
        "source": "MODIS LST 8-Day",
        "min": 5.0,
        "max": 75.0,
        "description": "Day-to-night temperature swing indicating thermal inertia and regolith conductivity.",
    },
    "min_temp_c": {
        "label": "Minimum Night Temperature",
        "unit": "°C",
        "source": "MODIS LST 8-Day",
        "min": -80.0,
        "max": 25.0,
        "description": "5th percentile nighttime ground temperature testing cryogenic endurance.",
    },
    "iron_oxide_index": {
        "label": "Ferric Iron Oxide Index",
        "unit": "ratio",
        "source": "HLS B04/B02 (Red/Blue)",
        "min": 0.8,
        "max": 3.2,
        "description": "Spectroscopic band ratio tracking oxidized ferric regolith and hematite coatings.",
    },
    "basalt_mafic_index": {
        "label": "Basaltic Mafic Index",
        "unit": "ratio",
        "source": "HLS B12/B8A + MODIS Emissivity",
        "min": 0.7,
        "max": 3.5,
        "description": "Combined SWIR and thermal infrared ratio indicating pyroxene/olivine basaltic crust.",
    },
}

def build_item_preview_url(collection_id: str, item_id: str) -> str:
    """Constructs Planetary Computer Data API preview thumbnail URL."""
    return f"{DATA_API_BASE}/item/preview.png?collection={collection_id}&item={item_id}"


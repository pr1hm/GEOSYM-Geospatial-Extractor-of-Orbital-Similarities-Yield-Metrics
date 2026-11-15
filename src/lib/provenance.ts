/**
 * Where each number comes from, shown as a badge on every feature.
 * AI-assisted code: written with Claude (Anthropic), reviewed by Dinoco Studios.
 *
 * - Terrain + radar (slope, TRI, SAR) were extracted live from Microsoft Planetary
 *   Computer STAC (Copernicus DEM GLO-30, Sentinel-1 RTC) for Earth sites.
 * - Temperature and spectral indices are calibrated estimates in the current build.
 * - Moon/Mars target values are reference values compiled from mission literature.
 * - Sites in LIVE_EXTRACTION_FAILED fell back to calibrated estimates for every feature.
 */
import type { PhysicalVector8D } from "./types";

export type Provenance = "measured" | "estimated" | "reference";

export const LIVE_FEATURES: (keyof PhysicalVector8D)[] = [
  "mean_slope_deg",
  "terrain_ruggedness_tri",
  "sar_roughness_db",
  "sar_depolarization_ratio",
];

export const LIVE_EXTRACTION_FAILED = new Set<string>([
  "known_haughton_crater",
  "known_mcmurdo_dry_valleys",
  "unrec_makhtesh_ramon",
  "unrec_salar_uyuni",
  "unrec_uunartoq_barren",
  "unrec_truelove_lowland",
  "unrec_axel_heiberg_diapirs",
  "unrec_svalbard_ny_alesund",
  "unrec_salar_coipasa",
]);

export function earthProvenance(siteId: string, key: keyof PhysicalVector8D): Provenance {
  if (LIVE_EXTRACTION_FAILED.has(siteId)) return "estimated";
  return LIVE_FEATURES.includes(key) ? "measured" : "estimated";
}

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  measured: "Satellite",
  estimated: "Estimate",
  reference: "Reference",
};

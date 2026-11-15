import {
  PhysicalVector8D,
  PlanetaryTarget,
  EarthAnalogSite,
  SimilarityWeights,
  PerFeatureDelta,
  AnalogScoreResult,
  FeatureMetadataRegistry
} from "./types";

export const DEFAULT_WEIGHTS: SimilarityWeights = {
  mean_slope_deg: 1.0,
  terrain_ruggedness_tri: 1.0,
  sar_roughness_db: 1.0,
  sar_depolarization_ratio: 1.0,
  diurnal_delta_t_c: 1.0,
  min_temp_c: 1.0,
  iron_oxide_index: 1.0,
  basalt_mafic_index: 1.0,
  // Morphology embedding is experimental: the current pipeline feeds the model
  // constant grids built from the same scalars, so it is off by default.
  morphology: 0,
};

export const PRESET_WEIGHTS: Record<string, { label: string; description: string; weights: SimilarityWeights }> = {
  balanced: {
    label: "Balanced Unified Holistic",
    description: "Equal weighting across topography, radar roughness, cryo-thermal swings, and spectroscopy.",
    weights: { ...DEFAULT_WEIGHTS },
  },
  rover_mobility: {
    label: "Rover Mobility & Traction",
    description: "Prioritizes slope gradient, micro-relief boulder ruggedness, and SAR roughness for wheel slip testing.",
    weights: {
      mean_slope_deg: 2.5,
      terrain_ruggedness_tri: 2.2,
      sar_roughness_db: 2.0,
      sar_depolarization_ratio: 1.8,
      diurnal_delta_t_c: 0.5,
      min_temp_c: 0.5,
      iron_oxide_index: 0.6,
      basalt_mafic_index: 0.8,
      morphology: 0,
    },
  },
  thermal_cryo: {
    label: "Extreme Cryo-Thermal Endurance",
    description: "Focuses on day/night thermal swing and minimum freeze temperatures for battery and thermal blanketing.",
    weights: {
      mean_slope_deg: 0.4,
      terrain_ruggedness_tri: 0.5,
      sar_roughness_db: 0.5,
      sar_depolarization_ratio: 0.4,
      diurnal_delta_t_c: 3.0,
      min_temp_c: 3.0,
      iron_oxide_index: 0.5,
      basalt_mafic_index: 0.6,
      morphology: 0,
    },
  },
  isru_mineralogy: {
    label: "ISRU & Mineral Extraction",
    description: "Maximizes ferric iron oxide and basaltic mafic ratios for regolith oxygen harvesting and drill coring.",
    weights: {
      mean_slope_deg: 0.6,
      terrain_ruggedness_tri: 0.7,
      sar_roughness_db: 0.8,
      sar_depolarization_ratio: 1.0,
      diurnal_delta_t_c: 0.8,
      min_temp_c: 0.6,
      iron_oxide_index: 2.8,
      basalt_mafic_index: 2.8,
      morphology: 0,
    },
  },
  hazard_autonomy: {
    label: "Hazard Avoidance & Optical Autonomy",
    description: "Weights slope, ruggedness and radar roughness: the terrain cues that hazard-avoidance cameras and LiDAR see.",
    weights: {
      mean_slope_deg: 2.0,
      terrain_ruggedness_tri: 2.4,
      sar_roughness_db: 1.4,
      sar_depolarization_ratio: 1.2,
      diurnal_delta_t_c: 0.4,
      min_temp_c: 0.4,
      iron_oxide_index: 0.8,
      basalt_mafic_index: 0.8,
      morphology: 0,
    },
  },
};

const FEATURE_KEYS: (keyof PhysicalVector8D)[] = [
  "mean_slope_deg",
  "terrain_ruggedness_tri",
  "sar_roughness_db",
  "sar_depolarization_ratio",
  "diurnal_delta_t_c",
  "min_temp_c",
  "iron_oxide_index",
  "basalt_mafic_index",
];

export function computeCosineSimilarity(v1: number[], v2: number[], weights: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const len = Math.min(v1.length, v2.length);
  for (let i = 0; i < len; i++) {
    const w = weights[i] ?? 1.0;
    const a = v1[i];
    const b = v2[i];
    dotProduct += w * a * b;
    normA += w * a * a;
    normB += w * b * b;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-7) return 0;
  return Math.max(0, Math.min(1, dotProduct / denom));
}

/**
 * Weighted similarity on normalized [0,1] features: 1 - weighted mean absolute difference.
 * Unlike cosine similarity, this respects magnitude: [0.1, 0.1] vs [0.9, 0.9] is NOT a match.
 * (AI-assisted change: written with Claude, reviewed by Dinoco Studios.)
 */
export function computeWeightedSimilarity(v1: number[], v2: number[], weights: number[]): number {
  let num = 0;
  let den = 0;
  const len = Math.min(v1.length, v2.length);
  for (let i = 0; i < len; i++) {
    const w = weights[i] ?? 1.0;
    num += w * Math.abs(v1[i] - v2[i]);
    den += w;
  }
  if (den < 1e-9) return 0;
  return Math.max(0, Math.min(1, 1 - num / den));
}

export function rankEarthAnalogs(
  target: PlanetaryTarget,
  analogs: EarthAnalogSite[],
  weights: SimilarityWeights,
  metaRegistry?: FeatureMetadataRegistry
): AnalogScoreResult[] {
  const targetNormVec = target.normalized_vector;
  const targetRawVec = target.physical_vector;
  const targetMorph = target.morphology_embedding || [];

  const weightArray = FEATURE_KEYS.map((k) => weights[k]);

  const results: AnalogScoreResult[] = analogs.map((analog) => {
    const analogNormVec = analog.normalized_vector;
    const analogRawVec = analog.physical_vector;
    const analogMorph = analog.morphology_embedding || [];

    // 1. Physical 8D Vector Weighted Cosine
    const target8D = FEATURE_KEYS.map((k) => targetNormVec[k] ?? 0.5);
    const analog8D = FEATURE_KEYS.map((k) => analogNormVec[k] ?? 0.5);
    const physicalSim = computeWeightedSimilarity(target8D, analog8D, weightArray);

    // 2. Morphology Embedding Cosine Similarity
    let morphSim = physicalSim;
    if (targetMorph.length > 0 && analogMorph.length > 0) {
      const morphWeights = new Array(targetMorph.length).fill(1.0);
      morphSim = computeCosineSimilarity(targetMorph, analogMorph, morphWeights);
    }

    // 3. Combined Weighted Score
    const totalPhysicalWeight = weightArray.reduce((acc, v) => acc + v, 0);
    const morphWeight = weights.morphology ?? 0;
    const totalWeight = totalPhysicalWeight + morphWeight;
    const combinedScore = (physicalSim * totalPhysicalWeight + morphSim * morphWeight) / totalWeight;

    // 4. Per-Feature Match vs Breakdown Delta Calculations
    let strongCount = 0;
    let warningCount = 0;

    const featureBreakdowns: PerFeatureDelta[] = FEATURE_KEYS.map((key) => {
      const tNorm = targetNormVec[key] ?? 0.5;
      const aNorm = analogNormVec[key] ?? 0.5;
      const deltaNorm = Math.abs(tNorm - aNorm);
      const similarityPct = Math.round(Math.max(0, 1 - deltaNorm) * 100);

      let status: PerFeatureDelta["status"] = "moderate_match";
      if (similarityPct >= 80) {
        status = "strong_match";
        strongCount++;
      } else if (similarityPct < 60) {
        status = "breakdown_divergence";
        warningCount++;
      }

      const meta = metaRegistry?.[key];
      return {
        key,
        label: meta?.label || key,
        unit: meta?.unit || "",
        target_raw: targetRawVec[key],
        analog_raw: analogRawVec[key],
        target_norm: tNorm,
        analog_norm: aNorm,
        delta_norm: deltaNorm,
        similarity_pct: similarityPct,
        status,
      };
    });

    return {
      site: analog,
      cosine_similarity: combinedScore,
      match_score_pct: Math.round(combinedScore * 1000) / 10,
      physical_score_pct: Math.round(physicalSim * 1000) / 10,
      morphology_score_pct: Math.round(morphSim * 1000) / 10,
      feature_breakdowns: featureBreakdowns,
      strong_matches_count: strongCount,
      breakdown_warnings_count: warningCount,
    };
  });

  // Sort descending by highest match score
  results.sort((a, b) => b.cosine_similarity - a.cosine_similarity);
  return results;
}


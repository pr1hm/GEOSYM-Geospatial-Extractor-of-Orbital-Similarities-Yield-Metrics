export interface PhysicalVector8D {
  mean_slope_deg: number;
  terrain_ruggedness_tri: number;
  sar_roughness_db: number;
  sar_depolarization_ratio: number;
  diurnal_delta_t_c: number;
  min_temp_c: number;
  iron_oxide_index: number;
  basalt_mafic_index: number;
}

export interface FeatureMetaItem {
  label: string;
  unit: string;
  source: string;
  min: number;
  max: number;
  description: string;
}

export type FeatureMetadataRegistry = Record<keyof PhysicalVector8D, FeatureMetaItem>;

export interface PlanetaryTarget {
  id: string;
  name: string;
  target_body: "Moon" | "Mars";
  mission_context: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  primary_interest: string;
  geological_context: string;
  target_gravity_g: number;
  atmospheric_pressure_bar: number;
  key_subsystems_to_test: string[];
  physical_vector: PhysicalVector8D;
  normalized_vector: PhysicalVector8D;
  morphology_embedding?: number[];
  umap_3d?: [number, number, number];
  cluster_id?: number;
  cluster_name?: string;
  cluster_color?: string;
}

export interface EarthAnalogSite {
  id: string;
  name: string;
  region_country: string;
  target_system: "Earth";
  latitude: number;
  longitude: number;
  elevation_m: number;
  bbox_5km: [number, number, number, number];
  is_known_nasa_analog: boolean;
  primary_analog_target: string;
  geological_summary: string;
  target_mission_relevance: string;
  satellite_preview_url: string;
  physical_vector: PhysicalVector8D;
  normalized_vector: PhysicalVector8D;
  morphology_embedding?: number[];
  umap_3d: [number, number, number];
  cluster_id: number;
  cluster_name: string;
  cluster_color: string;
}

export interface SimilarityWeights {
  mean_slope_deg: number;
  terrain_ruggedness_tri: number;
  sar_roughness_db: number;
  sar_depolarization_ratio: number;
  diurnal_delta_t_c: number;
  min_temp_c: number;
  iron_oxide_index: number;
  basalt_mafic_index: number;
  morphology: number;
}

export interface PerFeatureDelta {
  key: keyof PhysicalVector8D;
  label: string;
  unit: string;
  target_raw: number;
  analog_raw: number;
  target_norm: number;
  analog_norm: number;
  delta_norm: number;
  similarity_pct: number;
  status: "strong_match" | "moderate_match" | "breakdown_divergence";
}

export interface AnalogScoreResult {
  site: EarthAnalogSite;
  cosine_similarity: number;
  match_score_pct: number;
  physical_score_pct: number;
  morphology_score_pct: number;
  feature_breakdowns: PerFeatureDelta[];
  strong_matches_count: number;
  breakdown_warnings_count: number;
}

export interface MissionBriefResponse {
  executive_summary: string;
  hardware_to_test: Array<{
    system_name: string;
    subsystem_type: string;
    rationale: string;
    test_protocol: string;
  }>;
  where_analogy_breaks_down: {
    gravity_differential_analysis: string;
    atmospheric_pressure_and_radiation: string;
    divergent_physical_metrics: string[];
    engineering_mitigations: string[];
  };
  recommended_testing_protocol: {
    phase_1: string;
    phase_2: string;
    phase_3: string;
    key_telemetry_sensors: string[];
  };
}

export interface ClusterInfo {
  id: number;
  name: string;
  description: string;
  color: string;
  count: number;
}


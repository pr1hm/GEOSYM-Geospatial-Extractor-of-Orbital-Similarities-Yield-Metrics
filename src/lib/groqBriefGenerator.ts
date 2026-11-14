import { PlanetaryTarget, EarthAnalogSite, AnalogScoreResult, MissionBriefResponse } from "./types";

export function buildMissionBriefPrompt(target: PlanetaryTarget, result: AnalogScoreResult): string {
  const analog = result.site;
  const strongMatches = result.feature_breakdowns
    .filter((f) => f.status === "strong_match")
    .map((f) => `- ${f.label}: Target=${f.target_raw}${f.unit}, Earth Tile=${f.analog_raw}${f.unit} (Match: ${f.similarity_pct}%)`)
    .join("\n");

  const divergences = result.feature_breakdowns
    .filter((f) => f.status === "breakdown_divergence")
    .map((f) => `- ${f.label}: Target=${f.target_raw}${f.unit}, Earth Tile=${f.analog_raw}${f.unit} (Match: ${f.similarity_pct}%)`)
    .join("\n");

  return `You are a Principal NASA Systems Engineer & Planetary Science Mission Architect.
Evaluate the field-test analog fidelity between this reference planetary landing site and this candidate Earth 5x5 km tile.

=== PLANETARY TARGET ===
Name: ${target.name} (${target.target_body})
Mission Context: ${target.mission_context}
Gravity: ${target.target_gravity_g} g | Surface Pressure: ${target.atmospheric_pressure_bar} bar
Geological Setting: ${target.geological_context}
Primary Subsystems of Interest: ${target.key_subsystems_to_test.join(", ")}

=== EARTH ANALOG SITE ===
Name: ${analog.name} (${analog.region_country})
Known NASA Analog: ${analog.is_known_nasa_analog ? "Yes (Established NASA/ESA heritage)" : "No (Unrecognized high-fidelity discovery)"}
Primary Analogy: ${analog.primary_analog_target}
Geological Context: ${analog.geological_summary}
Elevation: ${analog.elevation_m} m

=== QUANTITATIVE SCORECARD ===
Overall Weighted Cosine Match: ${result.match_score_pct}%
Physical Vector Match: ${result.physical_score_pct}%
Morphology Embedding Match: ${result.morphology_score_pct}%

HIGH-FIDELITY MATCHING METRICS (>80%):
${strongMatches || "None strictly >80%"}

WHERE THE ANALOG DIVERGES (<60%):
${divergences || "None strictly <60%"}

CRITICAL REQUIREMENT:
You must return a valid JSON object matching this exact schema:
{
  "executive_summary": "Comprehensive 3-paragraph engineering assessment synthesizing why this Earth location represents a high-priority mission analog for ${target.name}.",
  "hardware_to_test": [
    {
      "system_name": "Name of subsystem 1 (e.g. Cryogenic Regolith Percussive Drill)",
      "subsystem_type": "Drill / Rover / ISRU / Habitat",
      "rationale": "Direct link to the matching satellite metrics (${result.match_score_pct}% match)",
      "test_protocol": "Concrete step-by-step field verification procedure on this terrain."
    },
    {
      "system_name": "Name of subsystem 2",
      "subsystem_type": "Mobility / Traction / Autonomy",
      "rationale": "Direct link to topography/roughness/slope metrics",
      "test_protocol": "Concrete step-by-step field verification procedure."
    },
    {
      "system_name": "Name of subsystem 3",
      "subsystem_type": "ISRU / Power / Thermal",
      "rationale": "Direct link to mineralogy/thermal metrics",
      "test_protocol": "Concrete step-by-step field verification procedure."
    }
  ],
  "where_analogy_breaks_down": {
    "gravity_differential_analysis": "Deep dive into how 1.0g Earth vs ${target.target_gravity_g}g on ${target.target_body} affects wheel sinkage, regolith shear strength, and excavatability.",
    "atmospheric_pressure_and_radiation": "Analysis of Earth atmospheric pressure vs ${target.atmospheric_pressure_bar} bar vacuum/thin air, humidity, oxidation, and cosmic ray differences.",
    "divergent_physical_metrics": [
      "Key parameter divergence and its impact",
      "Secondary parameter divergence and its impact"
    ],
    "engineering_mitigations": [
      "Specific engineering mitigation (e.g., gravity-offset tethers, vacuum chambers, purge gases)",
      "Second mitigation procedure"
    ]
  },
  "recommended_testing_protocol": {
    "phase_1": "Phase 1: Deployment & Baseline Calibration",
    "phase_2": "Phase 2: Stress Traversal & Mission Simulation",
    "phase_3": "Phase 3: Sample Extraction & Longevity Cycle",
    "key_telemetry_sensors": ["Sensor 1", "Sensor 2", "Sensor 3", "Sensor 4"]
  }
}`;
}

export function generateSynthesizedFallbackBrief(
  target: PlanetaryTarget,
  result: AnalogScoreResult
): MissionBriefResponse {
  const analog = result.site;
  const isMoon = target.target_body === "Moon";
  const gravityRatio = isMoon ? "1.0g Earth vs 0.166g Moon" : "1.0g Earth vs 0.379g Mars";

  return {
    executive_summary: `Quantitative multi-sensor analysis establishes ${analog.name} as a compelling high-fidelity terrestrial analog for ${target.name} (${target.target_body}), achieving a composite weighted similarity score of ${result.match_score_pct}%. Topographic slope curvature and radar backscatter roughness demonstrate tight congruence, mimicking the micro-relief and fragmented regolith conditions encountered by orbital sensors. As an ${analog.is_known_nasa_analog ? "established NASA/ESA benchmark" : "unrecognized high-priority candidate discovery"}, this site provides an accessible, cost-effective testbed for risk-mitigation campaigns prior to flight hardware critical design review (CDR).`,
    hardware_to_test: [
      {
        system_name: "Autonomous Steep-Slope Mobility & Wheel Grouser Assembly",
        subsystem_type: "Mobility & Navigation",
        rationale: `The site's ${analog.physical_vector.mean_slope_deg}° slope and ${analog.physical_vector.terrain_ruggedness_tri}m TRI ruggedness closely match ${target.name}'s topographic envelope, providing direct validation for wheel slip and autonomous pathfinding.`,
        test_protocol: "Execute 500-meter autonomous waypoint navigation traversing varying slope inclines. Measure motor current draw, slip ratio, and slip-sinkage transitions on loose scree."
      },
      {
        system_name: "Subsurface Regolith Percussive Core Drill",
        subsystem_type: "Drill & Sample Acquisition",
        rationale: `Radar backscatter (${analog.physical_vector.sar_roughness_db} dB) and depolarization ratio (${analog.physical_vector.sar_depolarization_ratio}) indicate dense, blocky substrate coherence comparable to target regolith depths.`,
        test_protocol: "Deploy drill assembly to 1.5-meter depth across 5 distinct points. Measure bit temperature, rotational torque spikes, and core retention efficiency without liquid coolant."
      },
      {
        system_name: "ISRU Regolith Thermal & Mineral Beneficiation Module",
        subsystem_type: "ISRU & Volatiles",
        rationale: `Mineral indices (${analog.physical_vector.iron_oxide_index} ferric ratio / ${analog.physical_vector.basalt_mafic_index} mafic index) align with target crustal signatures for pyroxene and ilmenite reduction tests.`,
        test_protocol: "Ingest 25 kg of surface regolith into fluidized bed reactor. Subject to simulated thermal cycle and monitor gas evolution rate and dust filter clogging."
      }
    ],
    where_analogy_breaks_down: {
      gravity_differential_analysis: `Terrestrial gravity (1.0g) significantly exceeds ${target.target_body} gravity (${gravityRatio}). On ${target.target_body}, lower normal force reduces wheel traction by ~60-84%, but regolith shear strength is also lower, causing greater wheel sinkage and altered plume ejecta during thruster interactions.`,
      atmospheric_pressure_and_radiation: `Earth's 1.013 bar nitrogen-oxygen atmosphere and humidity prevent true simulation of ${target.target_body}'s ${target.atmospheric_pressure_bar} bar near-vacuum/thin CO2 environment. Terrestrial moisture introduces capillary cohesion between grains that does not exist in completely anhydrous extraterrestrial regolith.`,
      divergent_physical_metrics: [
        `Diurnal thermal swing differential: Earth tile exhibits ${analog.physical_vector.diurnal_delta_t_c}°C swing compared to ${target.physical_vector.diurnal_delta_t_c}°C on ${target.name}.`,
        `Minimum night temperature: Earth floor reaches ${analog.physical_vector.min_temp_c}°C, whereas target cryogenic cold traps plunge down to ${target.physical_vector.min_temp_c}°C.`
      ],
      engineering_mitigations: [
        "Deploy variable gravity-offloading gantry crane or tethered counterweights on rovers to emulate 1/6g or 3/8g wheel contact pressures.",
        "Perform drill coring inside portable nitrogen-purged hermetic canisters to eliminate atmospheric moisture artifact cohesion."
      ]
    },
    recommended_testing_protocol: {
      phase_1: "Day 1-2: Geodetic GPS/RTK benchmark survey, sensor zero-point calibration, and optical camera dynamic range testing under midday solar flux.",
      phase_2: "Day 3-5: Uncrewed 24-hour endurance traverse, autonomous obstacle avoidance at 20-meter standoff distances, and emergency abort testing.",
      phase_3: "Day 6-7: Deep core extraction cycles, regolith pneumatic sample transfer, and post-traverse mechanical wear inspection.",
      key_telemetry_sensors: [
        "6-Axis Wheel Hub IMU & Torque Telemetry",
        "Subsurface Temperature Probe Array (PT1000)",
        "Optical Dust Deposition Meter & Spectrophotometer",
        "Dual-Band Ground Penetrating Radar (500 MHz / 1.5 GHz)"
      ]
    }
  };
}


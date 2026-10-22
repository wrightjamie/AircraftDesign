import { GRAVITY } from './isa.ts';
import { calculateCompositeEmptyFraction } from './costRisk.ts';

export type EngineClass =
  | 'turboprop'
  | 'high_bypass_turbofan'
  | 'low_bypass_turbofan'
  | 'afterburning_turbojet';

export type HighLiftDeviceTier =
  | 'plain_clean'
  | 'single_slotted_flaps'
  | 'fowler_slats';

export type StealthLevel =
  | 'conventional'
  | 'reduced_signature'
  | 'vlo_stealth';

export type EngineTechLevel =
  | 'standard_proven'
  | 'advanced_lightweight';

export interface CadetAircraftDesign {
  // Identity
  callsign: string;

  // Wing Planform Geometry & High Lift
  wingAreaM2: number;          // S (m^2)
  aspectRatio: number;         // AR (b^2 / S)
  sweepDeg: number;            // Quarter-chord sweep angle (degrees)
  highLiftDevice: HighLiftDeviceTier; // Plain vs Single-Slotted vs Fowler & Slats

  // Propulsion System
  engineClass: EngineClass;
  engineCount: number;         // 1, 2, 4
  thrustPerEngineKn: number;   // Max thrust rating per engine (kN)
  engineTechLevel: EngineTechLevel; // Standard proven vs Advanced lightweight turbine

  // Structural Materials & Stealth
  compositePercent: number;    // 0% (full aluminum alloy) to 100% (advanced carbon composite matrix)
  stealthLevel: StealthLevel;  // Conventional vs Reduced Signature vs VLO Stealth

  // Mass & Payload Allocation
  internalFuelKg: number;
  payloadKg: number;
}

export interface AircraftMassBudget {
  mtowKg: number;               // Maximum Takeoff Weight (kg)
  oewKg: number;                // Operating Empty Weight (kg)
  fuelKg: number;               // Internal fuel (kg)
  payloadKg: number;            // Fixed or cargo payload (kg)
  engineWeightKg: number;       // Propulsion dry weight (kg)
  emptyWeightFraction: number;  // OEW / MTOW
  compositePercent: number;     // Active composite percentage
  stealthLevel: StealthLevel;   // Active stealth tier
  highLiftDevice: HighLiftDeviceTier; // Active flap tier
  totalThrustKn: number;        // Combined engine thrust (kN)
  totalThrustN: number;         // Combined engine thrust (N)
  wingLoadingNm2: number;       // (MTOW * g) / S
  wingLoadingKgm2: number;      // MTOW / S
  thrustToWeight: number;       // T_total / (MTOW * g)
  cd0: number;                  // Zero-lift parasite drag coefficient
  oswaldEfficiency: number;     // Span efficiency factor (e)
  clMaxClean: number;           // Max lift coefficient clean
  clMaxFlaps: number;           // Max lift coefficient with flaps/slats
}

export const DEFAULT_CADET_DESIGN: CadetAircraftDesign = {
  callsign: 'EXCALIBUR-1',
  wingAreaM2: 36.0,
  aspectRatio: 6.5,
  sweepDeg: 20,
  highLiftDevice: 'single_slotted_flaps',
  engineClass: 'low_bypass_turbofan',
  engineCount: 2,
  thrustPerEngineKn: 55.0,
  engineTechLevel: 'standard_proven',
  compositePercent: 65, // 65% composite matrix
  stealthLevel: 'conventional',
  internalFuelKg: 4500,
  payloadKg: 2500, // Standard tactical mission payload
};

/**
 * Estimate zero-lift parasite drag coefficient CD0 based on engine class, wetted area, and sweep
 */
export function estimateCd0(
  engineClass: EngineClass,
  sweepDeg: number,
  aspectRatio: number
): number {
  let baseCd0 = 0.022;

  // Engine nacelle drag differences
  switch (engineClass) {
    case 'turboprop':
      baseCd0 = 0.026; // Propeller wash & large nacelle frontal area
      break;
    case 'high_bypass_turbofan':
      baseCd0 = 0.024; // Large fan cowl diameter
      break;
    case 'low_bypass_turbofan':
      baseCd0 = 0.020; // Slender combat nacelle
      break;
    case 'afterburning_turbojet':
      baseCd0 = 0.018; // Ultra-slender supersonic fuselage
      break;
  }

  // Slight variation with aspect ratio and sweep angle
  const sweepFactor = Math.cos((sweepDeg * Math.PI) / 180);
  const arFactor = 1.0 + (aspectRatio - 6.0) * 0.015;

  return Number((baseCd0 * arFactor * (0.9 + 0.1 / sweepFactor)).toFixed(4));
}

/**
 * Estimate Oswald span efficiency factor (e) based on wing aspect ratio and sweep
 * Using Raymer's empirical relation: e ≈ 1.78 * (1 - 0.045 * AR^0.68) - 0.6
 */
export function estimateOswaldEfficiency(aspectRatio: number, sweepDeg: number): number {
  const sweepRad = (sweepDeg * Math.PI) / 180;
  const straightEfficiency = 1.78 * (1 - 0.045 * Math.pow(aspectRatio, 0.68)) - 0.6;
  const sweepReduction = 1 - 0.0025 * sweepDeg;
  const efficiency = straightEfficiency * sweepReduction * Math.cos(sweepRad * 0.3);

  return Math.min(0.88, Math.max(0.65, Number(efficiency.toFixed(3))));
}

/**
 * Calculates complete mass budget, derived aerodynamics, and resulting Design Point
 */
export function calculateAircraftMassBudget(design: CadetAircraftDesign): AircraftMassBudget {
  const g = GRAVITY;
  const baseEmptyFraction = calculateCompositeEmptyFraction(design.compositePercent);

  // 1. High-Lift Devices Non-Linear Weight Penalty
  // Actuators, tracks, screw-jacks impose a minimum mechanical threshold.
  // Penalty is substantial on small wings (S ~ 10-25 m^2) and amortizes on large wings (S >= 150 m^2).
  let flapBasePenalty = 0.0;
  let flapClBonus = 0.0;
  switch (design.highLiftDevice) {
    case 'plain_clean':
      flapBasePenalty = 0.0;
      flapClBonus = 0.0;
      break;
    case 'single_slotted_flaps':
      flapBasePenalty = 0.025;
      flapClBonus = 0.50;
      break;
    case 'fowler_slats':
      flapBasePenalty = 0.055;
      flapClBonus = 1.00;
      break;
  }
  const wingAreaScaleFactor = Math.pow(40 / Math.max(10, design.wingAreaM2), 0.45);
  const flapEmptyWeightDelta = flapBasePenalty * wingAreaScaleFactor;

  // 2. Low Observable (LO) Stealth Weight Penalty (RAM coatings, internal bay structural stiffeners)
  let stealthEmptyDelta = 0.0;
  switch (design.stealthLevel) {
    case 'conventional':
      stealthEmptyDelta = 0.0;
      break;
    case 'reduced_signature':
      stealthEmptyDelta = 0.035;
      break;
    case 'vlo_stealth':
      stealthEmptyDelta = 0.090;
      break;
  }

  // 3. Wing Sweep structural penalty (spar torsional stiffness)
  const sweepWeightPenalty = (design.sweepDeg / 50) * 0.020;

  // Total empty weight fraction
  const emptyWeightFraction = baseEmptyFraction + flapEmptyWeightDelta + stealthEmptyDelta + sweepWeightPenalty;

  // Total thrust
  const totalThrustKn = design.engineCount * design.thrustPerEngineKn;
  const totalThrustN = totalThrustKn * 1000;

  // 4. Engine Dry Mass Calculation based on engine class and tech level
  let engineTW = 6.0;
  switch (design.engineClass) {
    case 'turboprop': engineTW = 4.5; break;
    case 'high_bypass_turbofan': engineTW = 5.5; break;
    case 'low_bypass_turbofan': engineTW = 8.0; break;
    case 'afterburning_turbojet': engineTW = 9.5; break;
  }
  if (design.engineTechLevel === 'advanced_lightweight') {
    engineTW *= 1.25; // 25% higher T/W saves engine weight
  }
  const engineWeightKg = Math.round(totalThrustN / (g * engineTW));

  // MTOW formulation:
  // MTOW = (Fuel + Payload) / (1 - emptyWeightFraction)
  const usefulLoadKg = design.internalFuelKg + design.payloadKg;
  const mtowKg = Math.max(500, usefulLoadKg / Math.max(0.2, 1 - emptyWeightFraction));
  const oewKg = mtowKg * emptyWeightFraction;

  // Wing loading W/S
  const totalWeightN = mtowKg * g;
  const wingLoadingNm2 = totalWeightN / Math.max(1, design.wingAreaM2);
  const wingLoadingKgm2 = mtowKg / Math.max(1, design.wingAreaM2);

  // Thrust-to-weight T/W
  const thrustToWeight = totalThrustN / totalWeightN;

  // Aerodynamics
  const cd0 = estimateCd0(design.engineClass, design.sweepDeg, design.aspectRatio);
  const oswaldEfficiency = estimateOswaldEfficiency(design.aspectRatio, design.sweepDeg);

  // Sweep effect on max lift coefficient: CLmax = CLmax0 * cos(sweep)
  const sweepFactor = Math.cos((design.sweepDeg * Math.PI) / 180);
  const clMaxClean = Number((1.45 * sweepFactor).toFixed(2));
  const clMaxFlaps = Number(((1.45 + flapClBonus) * sweepFactor).toFixed(2));

  return {
    mtowKg: Math.round(mtowKg),
    oewKg: Math.round(oewKg),
    fuelKg: design.internalFuelKg,
    payloadKg: design.payloadKg,
    engineWeightKg,
    emptyWeightFraction: Number(emptyWeightFraction.toFixed(3)),
    compositePercent: design.compositePercent,
    stealthLevel: design.stealthLevel,
    highLiftDevice: design.highLiftDevice,
    totalThrustKn,
    totalThrustN,
    wingLoadingNm2: Number(wingLoadingNm2.toFixed(1)),
    wingLoadingKgm2: Number(wingLoadingKgm2.toFixed(1)),
    thrustToWeight: Number(thrustToWeight.toFixed(3)),
    cd0,
    oswaldEfficiency,
    clMaxClean,
    clMaxFlaps,
  };
}

/**
 * Design Presets for Cadets to quickly explore archetypes
 */
export const DESIGN_PRESETS: Record<string, { name: string; description: string; design: CadetAircraftDesign }> = {
  elementary_trainer: {
    name: 'Elementary Trainer',
    description: 'Lightweight composite single-engine trainer with docile stall handling.',
    design: {
      callsign: 'TUTOR-X',
      wingAreaM2: 14.0,
      aspectRatio: 8.0,
      sweepDeg: 5,
      highLiftDevice: 'plain_clean',
      engineClass: 'turboprop',
      engineCount: 1,
      thrustPerEngineKn: 8.5,
      engineTechLevel: 'standard_proven',
      compositePercent: 85,
      stealthLevel: 'conventional',
      internalFuelKg: 280,
      payloadKg: 200,
    },
  },
  fast_jet_interceptor: {
    name: 'Fast Jet Interceptor',
    description: 'Twin-engine swept-wing fighter tuned for supersonic climb and high-g turns.',
    design: {
      callsign: 'TYPHOON-CADET',
      wingAreaM2: 48.0,
      aspectRatio: 3.2,
      sweepDeg: 42,
      highLiftDevice: 'single_slotted_flaps',
      engineClass: 'afterburning_turbojet',
      engineCount: 2,
      thrustPerEngineKn: 85.0,
      engineTechLevel: 'advanced_lightweight',
      compositePercent: 70,
      stealthLevel: 'reduced_signature',
      internalFuelKg: 5200,
      payloadKg: 1800,
    },
  },
  tactical_transport: {
    name: 'Tactical Air Transport',
    description: 'Rugged multi-engine transport designed for short unpaved field operations.',
    design: {
      callsign: 'ATLAS-MINI',
      wingAreaM2: 75.0,
      aspectRatio: 7.8,
      sweepDeg: 12,
      highLiftDevice: 'fowler_slats',
      engineClass: 'turboprop',
      engineCount: 2,
      thrustPerEngineKn: 65.0,
      engineTechLevel: 'standard_proven',
      compositePercent: 30,
      stealthLevel: 'conventional',
      internalFuelKg: 7500,
      payloadKg: 4500,
    },
  },
  maritime_patrol: {
    name: 'High-Altitude Patrol',
    description: 'High aspect-ratio twin turbofan optimized for long-endurance cruise at 35k ft.',
    design: {
      callsign: 'SENTINEL-X',
      wingAreaM2: 52.0,
      aspectRatio: 10.5,
      sweepDeg: 18,
      highLiftDevice: 'single_slotted_flaps',
      engineClass: 'high_bypass_turbofan',
      engineCount: 2,
      thrustPerEngineKn: 48.0,
      engineTechLevel: 'standard_proven',
      compositePercent: 55,
      stealthLevel: 'conventional',
      internalFuelKg: 8200,
      payloadKg: 2200,
    },
  },
};

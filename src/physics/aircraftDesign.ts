import { GRAVITY } from './isa.ts';
import { calculateCompositeEmptyFraction } from './costRisk.ts';

export type EngineClass =
  | 'turboprop'
  | 'high_bypass_turbofan'
  | 'low_bypass_turbofan'
  | 'afterburning_turbojet';

export interface CadetAircraftDesign {
  // Identity
  callsign: string;

  // Wing Planform Geometry
  wingAreaM2: number;      // S (m^2)
  aspectRatio: number;     // AR (b^2 / S)
  sweepDeg: number;        // Quarter-chord sweep angle (degrees)

  // Propulsion System
  engineClass: EngineClass;
  engineCount: number;     // 1, 2, 4
  thrustPerEngineKn: number; // Max thrust rating per engine (kN)

  // Structural Materials & Tech Level
  compositePercent: number; // 0% (full aluminum alloy) to 100% (advanced carbon composite matrix)

  // Mass & Payload Allocation
  internalFuelKg: number;
  payloadKg: number;
}

export interface AircraftMassBudget {
  mtowKg: number;               // Maximum Takeoff Weight (kg)
  oewKg: number;                // Operating Empty Weight (kg)
  fuelKg: number;               // Internal fuel (kg)
  payloadKg: number;            // Fixed or cargo payload (kg)
  emptyWeightFraction: number;  // OEW / MTOW
  compositePercent: number;     // Active composite percentage
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
  engineClass: 'low_bypass_turbofan',
  engineCount: 2,
  thrustPerEngineKn: 55.0,
  compositePercent: 65, // 65% composite matrix
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
  const emptyWeightFraction = calculateCompositeEmptyFraction(design.compositePercent);

  // MTOW formulation:
  // MTOW = (Fuel + Payload) / (1 - emptyWeightFraction)
  const usefulLoadKg = design.internalFuelKg + design.payloadKg;
  const mtowKg = Math.max(500, usefulLoadKg / (1 - emptyWeightFraction));
  const oewKg = mtowKg * emptyWeightFraction;

  // Total thrust
  const totalThrustKn = design.engineCount * design.thrustPerEngineKn;
  const totalThrustN = totalThrustKn * 1000;

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
  const clMaxClean = Number((1.55 * sweepFactor).toFixed(2));
  const clMaxFlaps = Number((2.40 * sweepFactor).toFixed(2));

  return {
    mtowKg: Math.round(mtowKg),
    oewKg: Math.round(oewKg),
    fuelKg: design.internalFuelKg,
    payloadKg: design.payloadKg,
    emptyWeightFraction,
    compositePercent: design.compositePercent,
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
      engineClass: 'turboprop',
      engineCount: 1,
      thrustPerEngineKn: 8.5,
      compositePercent: 85,
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
      engineClass: 'afterburning_turbojet',
      engineCount: 2,
      thrustPerEngineKn: 85.0,
      compositePercent: 70,
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
      engineClass: 'turboprop',
      engineCount: 2,
      thrustPerEngineKn: 65.0,
      compositePercent: 30,
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
      engineClass: 'high_bypass_turbofan',
      engineCount: 2,
      thrustPerEngineKn: 48.0,
      compositePercent: 55,
      internalFuelKg: 8200,
      payloadKg: 2200,
    },
  },
};

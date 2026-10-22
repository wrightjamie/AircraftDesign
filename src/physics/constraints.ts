import { getAtmosphereAtAltitudeFeet, GRAVITY, SEA_LEVEL_DENSITY } from './isa.ts';

export interface ConstraintPoint {
  ws: number; // Wing loading (N/m^2)
  tw: number; // Thrust to weight ratio
}

export interface OperationalConstraints {
  // Takeoff
  takeoffFieldLengthM: number;     // e.g., 450 m
  groundFrictionMu: number;         // e.g., 0.06 (rough unpaved grass)
  clTakeoff: number;               // Takeoff lift coefficient (e.g., 1.8)

  // Stall & Landing
  maxStallSpeedMs: number;          // Stall speed limit in m/s (e.g., 46 m/s / ~90 kts)
  clMax: number;                   // Maximum lift coefficient in landing/clean configuration (e.g., 2.3)

  // Maximum Level Speed
  maxSpeedKts: number;             // Desired top speed in knots (e.g., 360 kts)
  maxSpeedAltitudeFt: number;      // Altitude for max speed test (e.g., 10,000 ft)
  cd0: number;                     // Parasite drag coefficient (e.g., 0.024)
  aspectRatio: number;             // Wing Aspect Ratio (e.g., 8.0)
  oswaldEfficiency: number;        // Oswald span efficiency factor (e.g., 0.82)

  // Rate of Climb
  climbRateFpm: number;            // Rate of climb in ft/min (e.g., 3,500 ft/min)
  climbSpeedKts: number;           // True airspeed during climb in knots (e.g., 150 kts)

  // Service Ceiling
  serviceCeilingFt: number;        // Service ceiling in feet (e.g., 35,000 ft)

  // Sustained Turn
  turnLoadFactorG: number;         // Sustained g load (e.g., 3.0 g)
  turnSpeedKts: number;            // Speed during turn in knots (e.g., 250 kts)
  turnAltitudeFt: number;          // Altitude during turn (e.g., 10,000 ft)

  // Propulsion Architecture
  engineClass?: 'turboprop' | 'high_bypass_turbofan' | 'low_bypass_turbofan' | 'afterburning_turbojet';
}

/**
 * Default RAFAC Mission Brief operational constraint parameters
 */
export const DEFAULT_MISSION_CONSTRAINTS: OperationalConstraints = {
  takeoffFieldLengthM: 450,
  groundFrictionMu: 0.06,
  clTakeoff: 1.85,

  maxStallSpeedMs: 44,       // ~85.5 kts
  clMax: 2.35,

  maxSpeedKts: 360,          // ~185 m/s
  maxSpeedAltitudeFt: 10000,
  cd0: 0.024,
  aspectRatio: 8.2,
  oswaldEfficiency: 0.82,

  climbRateFpm: 3500,        // ~17.78 m/s
  climbSpeedKts: 150,        // ~77.16 m/s

  serviceCeilingFt: 35000,

  turnLoadFactorG: 3.0,
  turnSpeedKts: 250,         // ~128.6 m/s
  turnAltitudeFt: 10000,
};

/**
 * Calculate the induced drag coefficient factor K = 1 / (pi * AR * e)
 */
export function getInducedDragK(aspectRatio: number, oswaldEfficiency: number): number {
  return 1 / (Math.PI * aspectRatio * oswaldEfficiency);
}

/**
 * 1. Stall Speed & Landing Constraint (Vertical line)
 * (W/S)_stall = 0.5 * rho0 * V_stall^2 * CL_max
 */
export function calculateStallWingLoading(constraints: OperationalConstraints): number {
  const vStall = constraints.maxStallSpeedMs;
  return 0.5 * SEA_LEVEL_DENSITY * vStall * vStall * constraints.clMax;
}

/**
 * Static thrust multiplier based on engine propulsion architecture.
 * Propellers convert shaft horsepower into massive static thrust at low airspeeds (T ≈ eta_p * P / V).
 * Pure turbojets produce lower relative static thrust per unit rated cruise thrust.
 */
export function getEngineStaticThrustMultiplier(engineClass?: string): number {
  switch (engineClass) {
    case 'turboprop': return 1.30;          // +30% effective acceleration thrust at low ground roll speeds
    case 'high_bypass_turbofan': return 1.05; // Large fan bypass produces good low-speed thrust
    case 'low_bypass_turbofan': return 1.00;  // Standard baseline
    case 'afterburning_turbojet': return 0.90; // Optimized for high supersonic speed, lower static pressure ratio
    default: return 1.00;
  }
}

/**
 * Propwash / Blown-Wing Slipstream lift coefficient boost.
 * Propellers wash accelerated air directly over the inner wing and flaps, increasing local dynamic pressure (q_local > q_inf)
 * and boosting the effective takeoff lift coefficient by +20%.
 */
export function getPropwashLiftBonus(engineClass?: string): number {
  return engineClass === 'turboprop' ? 0.20 : 0.00;
}

/**
 * 2. Takeoff Field Length Constraint
 * (T/W)_TO = [ 1.21 / (g * rho0 * CL_TO_eff * S_TO) * (W/S) + mu ] / kappa_static
 */
export function calculateTakeoffTW(ws: number, constraints: OperationalConstraints): number {
  const g = GRAVITY;
  const rho0 = SEA_LEVEL_DENSITY;
  const sTO = constraints.takeoffFieldLengthM;
  const propwashBonus = getPropwashLiftBonus(constraints.engineClass);
  const clTO = constraints.clTakeoff * (1 + propwashBonus);
  const staticThrustMult = getEngineStaticThrustMultiplier(constraints.engineClass);
  const mu = constraints.groundFrictionMu;

  const requiredStaticTW = (1.21 / (g * rho0 * clTO * sTO)) * ws + mu;
  return requiredStaticTW / staticThrustMult;
}

/**
 * 3. Maximum Speed Constraint
 * (T/W)_Vmax = (rho0 / rho) * [ q * CD0 * (1 / (W/S)) + (K / q) * (W/S) ]
 */
export function calculateMaxSpeedTW(ws: number, constraints: OperationalConstraints): number {
  const atmo = getAtmosphereAtAltitudeFeet(constraints.maxSpeedAltitudeFt);
  const vMs = constraints.maxSpeedKts * 0.514444; // kts to m/s
  const q = 0.5 * atmo.densityKgM3 * vMs * vMs;
  const K = getInducedDragK(constraints.aspectRatio, constraints.oswaldEfficiency);

  // Thrust lapse estimation: Available thrust at altitude drops roughly with density ratio (or density^0.85 for turbofans)
  const thrustLapse = Math.pow(atmo.densityRatio, 0.85);

  const twRequiredAtAlt = (q * constraints.cd0) / ws + (K / q) * ws;
  return twRequiredAtAlt / thrustLapse;
}

/**
 * 4. Rate of Climb Constraint
 * (T/W)_ROC = (ROC / V) + (q * CD0 / (W/S)) + (K / q) * (W/S)
 */
export function calculateClimbTW(ws: number, constraints: OperationalConstraints): number {
  const vClimbMs = constraints.climbSpeedKts * 0.514444;
  const rocMs = constraints.climbRateFpm * 0.00508; // ft/min to m/s
  const atmo = getAtmosphereAtAltitudeFeet(0); // Sea Level
  const q = 0.5 * atmo.densityKgM3 * vClimbMs * vClimbMs;
  const K = getInducedDragK(constraints.aspectRatio, constraints.oswaldEfficiency);

  return (rocMs / vClimbMs) + (q * constraints.cd0) / ws + (K / q) * ws;
}

/**
 * 5. Service Ceiling Constraint (35,000 ft, ROC residual = 100 ft/min = 0.508 m/s)
 * At best climb speed: (L/D)_max = 1 / (2 * sqrt(CD0 * K))
 * (T/W)_ceil = (1 / lapse) * [ (0.508 / V) + 2 * sqrt(CD0 * K) ]
 */
export function calculateServiceCeilingTW(ws: number, constraints: OperationalConstraints): number {
  const atmo = getAtmosphereAtAltitudeFeet(constraints.serviceCeilingFt);
  const K = getInducedDragK(constraints.aspectRatio, constraints.oswaldEfficiency);
  const thrustLapse = Math.pow(atmo.densityRatio, 0.85);

  // Approximate airspeed for best rate of climb at ceiling
  const vBestClimb = Math.sqrt((2 * ws) / (atmo.densityKgM3 * Math.sqrt(constraints.cd0 / K)));
  const rocCeilMs = 0.508; // 100 ft/min

  const twAtAlt = (rocCeilMs / vBestClimb) + 2 * Math.sqrt(constraints.cd0 * K);
  return twAtAlt / thrustLapse;
}

/**
 * 6. Sustained Turn Constraint
 * (T/W)_turn = (rho0 / rho) * [ (q * CD0 / (W/S)) + (K * n^2 / q) * (W/S) ]
 */
export function calculateSustainedTurnTW(ws: number, constraints: OperationalConstraints): number {
  const atmo = getAtmosphereAtAltitudeFeet(constraints.turnAltitudeFt);
  const vTurnMs = constraints.turnSpeedKts * 0.514444;
  const q = 0.5 * atmo.densityKgM3 * vTurnMs * vTurnMs;
  const K = getInducedDragK(constraints.aspectRatio, constraints.oswaldEfficiency);
  const n = constraints.turnLoadFactorG;
  const thrustLapse = Math.pow(atmo.densityRatio, 0.85);

  const twAtAlt = (q * constraints.cd0) / ws + ((K * n * n) / q) * ws;
  return twAtAlt / thrustLapse;
}

/**
 * 7. Cruise / Endurance Baseline
 * Minimum thrust required for steady-state cruise at (L/D)_max
 */
export function calculateCruiseTW(constraints: OperationalConstraints): number {
  const K = getInducedDragK(constraints.aspectRatio, constraints.oswaldEfficiency);
  const ldMax = 1 / (2 * Math.sqrt(constraints.cd0 * K));
  return 1 / ldMax;
}

/**
 * Generates coordinate arrays for all 7 constraint curves across the given wsRange [min, max]
 */
export function generateConstraintCurves(
  constraints: OperationalConstraints,
  wsMin: number = 200,
  wsMax: number = 6000,
  stepCount: number = 100
) {
  const wsStep = (wsMax - wsMin) / stepCount;
  const wsValues: number[] = [];
  for (let i = 0; i <= stepCount; i++) {
    wsValues.push(wsMin + i * wsStep);
  }

  const takeoffPoints: ConstraintPoint[] = wsValues.map(ws => ({
    ws,
    tw: calculateTakeoffTW(ws, constraints)
  }));

  const maxSpeedPoints: ConstraintPoint[] = wsValues.map(ws => ({
    ws,
    tw: calculateMaxSpeedTW(ws, constraints)
  }));

  const climbPoints: ConstraintPoint[] = wsValues.map(ws => ({
    ws,
    tw: calculateClimbTW(ws, constraints)
  }));

  const ceilingPoints: ConstraintPoint[] = wsValues.map(ws => ({
    ws,
    tw: calculateServiceCeilingTW(ws, constraints)
  }));

  const turnPoints: ConstraintPoint[] = wsValues.map(ws => ({
    ws,
    tw: calculateSustainedTurnTW(ws, constraints)
  }));

  const stallWS = calculateStallWingLoading(constraints);
  const cruiseTW = calculateCruiseTW(constraints);

  return {
    stallWS,
    cruiseTW,
    takeoffPoints,
    maxSpeedPoints,
    climbPoints,
    ceilingPoints,
    turnPoints,
  };
}

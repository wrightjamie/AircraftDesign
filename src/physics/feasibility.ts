import {
  calculateStallWingLoading,
  calculateTakeoffTW,
  calculateMaxSpeedTW,
  calculateClimbTW,
  calculateServiceCeilingTW,
  calculateSustainedTurnTW,
  calculateCruiseTW,
  type OperationalConstraints
} from './constraints.ts';
import { type AircraftMassBudget } from './aircraftDesign.ts';

export interface ConstraintAuditResult {
  id: string;
  name: string;
  isViolated: boolean;
  actualValue: number;
  requiredValue: number;
  marginPercent: number; // positive = safe margin; negative = violation
  diagnosis: string;
  remedyHint: string;
}

export interface FeasibilityAudit {
  isFeasible: boolean;
  violationCount: number;
  designPoint: {
    ws: number;
    tw: number;
  };
  results: ConstraintAuditResult[];
  criticalConstraint: ConstraintAuditResult; // The one with lowest margin (or worst violation)
}

/**
 * Evaluates the cadet's aircraft design point against all 7 operational flight constraints
 */
export function auditAircraftFeasibility(
  budget: AircraftMassBudget,
  constraints: OperationalConstraints
): FeasibilityAudit {
  const ws = budget.wingLoadingNm2;
  const tw = budget.thrustToWeight;

  // Use the aircraft's custom aerodynamic properties if available, or mission baseline
  const activeConstraints: OperationalConstraints = {
    ...constraints,
    cd0: budget.cd0,
    oswaldEfficiency: budget.oswaldEfficiency,
    clMax: budget.clMaxFlaps,
  };

  const results: ConstraintAuditResult[] = [];

  // 1. Stall Speed & Landing (Vertical boundary on W/S)
  const stallWS = calculateStallWingLoading(activeConstraints);
  const stallViolated = ws > stallWS;
  const stallMargin = ((stallWS - ws) / stallWS) * 100;
  results.push({
    id: 'stall',
    name: 'Stall Speed / Landing',
    isViolated: stallViolated,
    actualValue: ws,
    requiredValue: stallWS,
    marginPercent: Number(stallMargin.toFixed(1)),
    diagnosis: stallViolated
      ? `Wing loading (${Math.round(ws)} N/m²) exceeds the maximum landing stall limit (${Math.round(stallWS)} N/m²).`
      : `Wing loading provides a ${stallMargin.toFixed(1)}% safety margin below stall threshold.`,
    remedyHint: 'Increase wing surface area (S) or reduce aircraft gross takeoff weight.',
  });

  // 2. Takeoff Ground Roll
  const requiredTakeoffTW = calculateTakeoffTW(ws, activeConstraints);
  const takeoffViolated = tw < requiredTakeoffTW;
  const takeoffMargin = ((tw - requiredTakeoffTW) / requiredTakeoffTW) * 100;
  results.push({
    id: 'takeoff',
    name: 'Takeoff Ground Roll',
    isViolated: takeoffViolated,
    actualValue: tw,
    requiredValue: Number(requiredTakeoffTW.toFixed(3)),
    marginPercent: Number(takeoffMargin.toFixed(1)),
    diagnosis: takeoffViolated
      ? `Thrust-to-weight (${tw.toFixed(3)}) is below the minimum required for takeoff (${requiredTakeoffTW.toFixed(3)}).`
      : `Sufficient acceleration to unstick safely (${takeoffMargin > 0 ? '+' : ''}${takeoffMargin.toFixed(1)}% margin).`,
    remedyHint: 'Increase engine thrust rating or increase wing area to reduce unstick speed.',
  });

  // 3. Maximum Level Speed
  const requiredSpeedTW = calculateMaxSpeedTW(ws, activeConstraints);
  const speedViolated = tw < requiredSpeedTW;
  const speedMargin = ((tw - requiredSpeedTW) / requiredSpeedTW) * 100;
  results.push({
    id: 'speed',
    name: 'Maximum Level Speed',
    isViolated: speedViolated,
    actualValue: tw,
    requiredValue: Number(requiredSpeedTW.toFixed(3)),
    marginPercent: Number(speedMargin.toFixed(1)),
    diagnosis: speedViolated
      ? `Engine thrust is insufficient to overcome total drag at maximum speed.`
      : `Thrust exceeds top speed drag requirements (${speedMargin > 0 ? '+' : ''}${speedMargin.toFixed(1)}% margin).`,
    remedyHint: 'Increase engine thrust or optimize wing sweep to reduce high-speed parasite drag.',
  });

  // 4. Rate of Climb
  const requiredClimbTW = calculateClimbTW(ws, activeConstraints);
  const climbViolated = tw < requiredClimbTW;
  const climbMargin = ((tw - requiredClimbTW) / requiredClimbTW) * 100;
  results.push({
    id: 'climb',
    name: 'Rate of Climb',
    isViolated: climbViolated,
    actualValue: tw,
    requiredValue: Number(requiredClimbTW.toFixed(3)),
    marginPercent: Number(climbMargin.toFixed(1)),
    diagnosis: climbViolated
      ? `Excess specific power is too low to sustain the required vertical climb rate.`
      : `Positive excess power delivers required vertical velocity (${climbMargin > 0 ? '+' : ''}${climbMargin.toFixed(1)}% margin).`,
    remedyHint: 'Increase engine thrust or select lightweight composite structures.',
  });

  // 5. Service Ceiling
  const requiredCeilingTW = calculateServiceCeilingTW(ws, activeConstraints);
  const ceilingViolated = tw < requiredCeilingTW;
  const ceilingMargin = ((tw - requiredCeilingTW) / requiredCeilingTW) * 100;
  results.push({
    id: 'ceiling',
    name: 'Service Ceiling',
    isViolated: ceilingViolated,
    actualValue: tw,
    requiredValue: Number(requiredCeilingTW.toFixed(3)),
    marginPercent: Number(ceilingMargin.toFixed(1)),
    diagnosis: ceilingViolated
      ? `Engine thrust lapse at high altitude is too severe to sustain level flight.`
      : `Adequate residual climb rate preserved at cruise altitude (${ceilingMargin > 0 ? '+' : ''}${ceilingMargin.toFixed(1)}% margin).`,
    remedyHint: 'Increase sea-level thrust or switch to high-bypass turbofans with better altitude lapse.',
  });

  // 6. Sustained Maneuver / Turn
  const requiredTurnTW = calculateSustainedTurnTW(ws, activeConstraints);
  const turnViolated = tw < requiredTurnTW;
  const turnMargin = ((tw - requiredTurnTW) / requiredTurnTW) * 100;
  results.push({
    id: 'turn',
    name: 'Sustained Maneuver',
    isViolated: turnViolated,
    actualValue: tw,
    requiredValue: Number(requiredTurnTW.toFixed(3)),
    marginPercent: Number(turnMargin.toFixed(1)),
    diagnosis: turnViolated
      ? `Induced drag in banked turns exceeds engine power; aircraft will bleed energy.`
      : `Sustains high-g bank without losing airspeed or altitude (${turnMargin > 0 ? '+' : ''}${turnMargin.toFixed(1)}% margin).`,
    remedyHint: 'Reduce wing loading (larger wing area) to diminish n² induced drag.',
  });

  // 7. Cruise Floor
  const requiredCruiseTW = calculateCruiseTW(activeConstraints);
  const cruiseViolated = tw < requiredCruiseTW;
  const cruiseMargin = ((tw - requiredCruiseTW) / requiredCruiseTW) * 100;
  results.push({
    id: 'cruise',
    name: 'Cruise & Endurance',
    isViolated: cruiseViolated,
    actualValue: tw,
    requiredValue: Number(requiredCruiseTW.toFixed(3)),
    marginPercent: Number(cruiseMargin.toFixed(1)),
    diagnosis: cruiseViolated
      ? `Thrust is below minimum aerodynamic drag (L/D)max condition.`
      : `Steady-state cruise efficiency satisfied (${cruiseMargin > 0 ? '+' : ''}${cruiseMargin.toFixed(1)}% margin).`,
    remedyHint: 'Increase aspect ratio or refine airframe aerodynamics.',
  });

  // Find critical constraint (minimum margin)
  const sorted = [...results].sort((a, b) => a.marginPercent - b.marginPercent);
  const criticalConstraint = sorted[0];

  const violations = results.filter((r) => r.isViolated);

  return {
    isFeasible: violations.length === 0,
    violationCount: violations.length,
    designPoint: { ws, tw },
    results,
    criticalConstraint,
  };
}

import { type EngineClass } from './aircraftDesign.ts';

export interface ProcurementEvaluation {
  unitCostM: number;               // Unit production cost in £ Millions
  airframeCostM: number;           // Structural airframe cost in £ Millions
  enginesCostM: number;            // Total powerplant cost in £ Millions
  avionicsCostM: number;           // Avionics & systems cost in £ Millions
  stealthCostM?: number;           // Low Observable radar-absorbent & shaping cost in £ Millions
  highLiftCostM?: number;          // Flap and slat actuation hardware cost in £ Millions
  costBudgetLimitM: number;        // RAF fleet unit budget limit in £ Millions
  isOverBudget: boolean;
  costBudgetUsedPercent: number;

  programRiskPercent: number;      // Total technological program risk (0 - 100%)
  materialRiskPercent: number;     // Risk from composite fraction
  engineRiskPercent: number;       // Risk from engine class & maturity
  aeroComplexityRisk: number;      // Risk from high sweep / aspect ratio
  stealthRiskPercent?: number;     // Risk from Low Observable treatment

  boardStatus: 'approved' | 'caution' | 'rejected';
  boardCritique: string;
  recommendations: string[];
}

export const DEFAULT_BUDGET_LIMIT_M = 45.0; // £45M RAF Fleet Unit Procurement Limit

/**
 * Empty weight fraction as a function of composite airframe percentage (0% to 100%)
 * Baseline aluminum: 0.53
 * 100% composite matrix: 0.43 (18.8% mass saving on structural airframe)
 */
export function calculateCompositeEmptyFraction(compositePercent: number): number {
  const compRatio = Math.min(100, Math.max(0, compositePercent)) / 100;
  return Number((0.53 - 0.10 * compRatio).toFixed(3));
}

/**
 * Non-linear / Exponential material manufacturing cost multiplier.
 * Modest cost increase for simple secondary composites (<40%).
 * Exponential cost escalation above 60% due to specialized autoclave tooling,
 * laser-guided ply layup, and automated ultrasonic non-destructive testing (NDT).
 */
export function calculateMaterialCostMultiplier(compositePercent: number): number {
  const f = Math.min(100, Math.max(0, compositePercent)) / 100;
  // Non-linear exponential escalation:
  // Base 1.0 + linear factor + exponential curve centered around 50%
  const multiplier = 1.0 + 0.35 * f + 0.85 * Math.exp(3.2 * (f - 0.5));
  return Number(multiplier.toFixed(2));
}

/**
 * Engine unit procurement cost based on architecture
 */
export function getEngineUnitCostM(engineClass: EngineClass, thrustKn: number, engineTechLevel?: string): number {
  let baseCost = 2.5;
  switch (engineClass) {
    case 'turboprop':
      baseCost = 1.2 + thrustKn * 0.015;
      break;
    case 'high_bypass_turbofan':
      baseCost = 2.5 + thrustKn * 0.025;
      break;
    case 'low_bypass_turbofan':
      baseCost = 4.0 + thrustKn * 0.035;
      break;
    case 'afterburning_turbojet':
      baseCost = 6.5 + thrustKn * 0.050; // High-temperature turbine blades, afterburner liner
      break;
  }
  if (engineTechLevel === 'advanced_lightweight') {
    baseCost *= 1.20; // 20% premium for advanced single-crystal turbine metallurgy
  }
  return baseCost;
}

/**
 * Technological Program Risk calculation (%)
 */
export function evaluateProcurementAndRisk(
  oewKg: number,
  compositePercent: number,
  engineClass: EngineClass,
  engineCount: number,
  thrustPerEngineKn: number,
  sweepDeg: number,
  aspectRatio: number,
  budgetLimitM: number = DEFAULT_BUDGET_LIMIT_M,
  stealthLevel: 'conventional' | 'reduced_signature' | 'vlo_stealth' = 'conventional',
  highLiftDevice: 'plain_clean' | 'single_slotted_flaps' | 'fowler_slats' = 'single_slotted_flaps',
  wingAreaM2: number = 36,
  mtowKg: number = 15000,
  engineTechLevel: 'standard_proven' | 'advanced_lightweight' = 'standard_proven'
): ProcurementEvaluation {
  const fComp = Math.min(100, Math.max(0, compositePercent)) / 100;

  // 1. Costs
  const materialMult = calculateMaterialCostMultiplier(compositePercent);
  // Airframe baseline: approx £1,250 per kg of empty weight * material multiplier
  const baseAirframeCost = (oewKg * 1250) / 1_000_000;
  const airframeCostM = Number((baseAirframeCost * materialMult).toFixed(2));

  // Engine Cost
  const costPerEngine = getEngineUnitCostM(engineClass, thrustPerEngineKn, engineTechLevel);
  const enginesCostM = Number((costPerEngine * engineCount).toFixed(2));

  // High-Lift Hardware Cost (actuators, tracks, screw-jacks)
  let highLiftCostM = 0;
  if (highLiftDevice === 'single_slotted_flaps') {
    highLiftCostM = Number((0.6 + 0.012 * Math.sqrt(Math.max(10, wingAreaM2))).toFixed(2));
  } else if (highLiftDevice === 'fowler_slats') {
    highLiftCostM = Number((1.8 + 0.022 * Math.sqrt(Math.max(10, wingAreaM2))).toFixed(2));
  }

  // Low Observable (LO) Stealth Cost
  // Non-linear: exponentially harder on large airframes (MTOW^1.4)
  let stealthCostM = 0;
  let stealthRiskPercent = 0;
  if (stealthLevel === 'reduced_signature') {
    stealthCostM = Number((3.5 * Math.pow(Math.max(5000, mtowKg) / 15000, 0.8)).toFixed(2));
    stealthRiskPercent = 10;
  } else if (stealthLevel === 'vlo_stealth') {
    stealthCostM = Number((14.0 * Math.pow(Math.max(5000, mtowKg) / 15000, 1.4)).toFixed(2));
    stealthRiskPercent = 25;
  }

  // Avionics & Mission Systems baseline
  const avionicsCostM = 6.5;

  const totalUnitCostM = Number((airframeCostM + enginesCostM + avionicsCostM + highLiftCostM + stealthCostM).toFixed(2));
  const isOverBudget = totalUnitCostM > budgetLimitM;
  const costBudgetUsedPercent = Number(((totalUnitCostM / budgetLimitM) * 100).toFixed(1));

  // 2. Technological Risk Index (%)
  // Material Risk: power-law escalation with composite percentage
  const materialRiskPercent = Number((48 * Math.pow(fComp, 2.2)).toFixed(1));

  // Engine Risk
  let engineRiskPercent = 8;
  switch (engineClass) {
    case 'turboprop':
      engineRiskPercent = 5;
      break;
    case 'high_bypass_turbofan':
      engineRiskPercent = 10;
      break;
    case 'low_bypass_turbofan':
      engineRiskPercent = 18;
      break;
    case 'afterburning_turbojet':
      engineRiskPercent = 26;
      break;
  }
  if (engineTechLevel === 'advanced_lightweight') {
    engineRiskPercent += 12; // Development risk for unproven turbine alloys
  }

  // Aerodynamic Complexity Risk (extreme sweep or extreme aspect ratio)
  let aeroComplexityRisk = 4;
  if (sweepDeg > 35) aeroComplexityRisk += 8;
  if (aspectRatio > 10.0) aeroComplexityRisk += 7;

  const totalRisk = Math.min(
    98,
    Math.round(8 + materialRiskPercent + engineRiskPercent + aeroComplexityRisk + stealthRiskPercent)
  );

  // 3. Air Staff Procurement Board Decision
  let boardStatus: 'approved' | 'caution' | 'rejected' = 'approved';
  let boardCritique = 'Air Staff Review: Configuration approved within baseline cost and risk tolerances.';
  const recommendations: string[] = [];

  if (totalRisk > 75 || totalUnitCostM > budgetLimitM * 1.25) {
    boardStatus = 'rejected';
    boardCritique = `PROJECT CANCELLED: Program risk (${totalRisk}%) exceeds RAF procurement threshold (75%) or unit cost exceeds budget limit (£${budgetLimitM}M).`;
    if (materialRiskPercent > 30) {
      recommendations.push('Reduce composite airframe fraction to decrease manufacturing risk.');
    }
    if (totalUnitCostM > budgetLimitM) {
      recommendations.push(`Unit cost of £${totalUnitCostM}M exceeds the £${budgetLimitM}M ceiling. Reduce airframe size or engine count.`);
    }
  } else if (totalRisk > 55 || isOverBudget) {
    boardStatus = 'caution';
    boardCritique = `PROGRAM AT RISK: Sizing configuration has elevated technological risk (${totalRisk}%) or approaches budgetary boundaries.`;
    if (isOverBudget) {
      recommendations.push(`Over budget by £${(totalUnitCostM - budgetLimitM).toFixed(1)}M. Consider scaling down propulsion or composite fraction.`);
    }
    if (totalRisk > 55) {
      recommendations.push('High developmental risk: Air Staff requires risk mitigation studies.');
    }
  } else {
    recommendations.push('Design is within healthy procurement tolerances for production commissioning.');
  }

  return {
    unitCostM: totalUnitCostM,
    airframeCostM,
    enginesCostM,
    avionicsCostM,
    costBudgetLimitM: budgetLimitM,
    isOverBudget,
    costBudgetUsedPercent,
    programRiskPercent: totalRisk,
    materialRiskPercent,
    engineRiskPercent,
    aeroComplexityRisk,
    boardStatus,
    boardCritique,
    recommendations,
  };
}

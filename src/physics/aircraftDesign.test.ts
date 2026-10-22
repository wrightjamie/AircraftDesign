import test from 'node:test';
import assert from 'node:assert';
import {
  calculateAircraftMassBudget,
  estimateCd0,
  estimateOswaldEfficiency,
  DEFAULT_CADET_DESIGN,
  DESIGN_PRESETS,
  type CadetAircraftDesign
} from './aircraftDesign.ts';
import { auditAircraftFeasibility } from './feasibility.ts';
import { DEFAULT_MISSION_CONSTRAINTS } from './constraints.ts';

test('Aircraft Design: Mass Budget MTOW formulation', () => {
  const design: CadetAircraftDesign = {
    ...DEFAULT_CADET_DESIGN,
    internalFuelKg: 4000,
    payloadKg: 2000,
    compositePercent: 0, // 0% composite (aluminum alloy) => fraction = 0.53
  };

  const budget = calculateAircraftMassBudget(design);

  // MTOW = (Fuel + Payload) / (1 - 0.53) = 6000 / 0.47 ≈ 12766 kg
  assert.ok(Math.abs(budget.mtowKg - 12766) < 10);
  assert.strictEqual(budget.fuelKg, 4000);
  assert.strictEqual(budget.payloadKg, 2000);
  assert.ok(budget.oewKg < budget.mtowKg);
  assert.strictEqual(budget.emptyWeightFraction, 0.53);
});

test('Aircraft Design: Composite structure saves airframe weight', () => {
  const alDesign: CadetAircraftDesign = { ...DEFAULT_CADET_DESIGN, compositePercent: 0 };
  const compDesign: CadetAircraftDesign = { ...DEFAULT_CADET_DESIGN, compositePercent: 70 };

  const alBudget = calculateAircraftMassBudget(alDesign);
  const compBudget = calculateAircraftMassBudget(compDesign);

  // Carbon composite should yield lower empty fraction and significantly lower MTOW
  assert.ok(compBudget.emptyWeightFraction < alBudget.emptyWeightFraction);
  assert.ok(compBudget.mtowKg < alBudget.mtowKg);
  assert.ok(compBudget.oewKg < alBudget.oewKg);
});

test('Aircraft Design: Aerodynamic derivations stay in realistic bounds', () => {
  const cd0 = estimateCd0('low_bypass_turbofan', 25, 7.0);
  assert.ok(cd0 >= 0.015 && cd0 <= 0.035, `CD0 was ${cd0}`);

  const e = estimateOswaldEfficiency(7.5, 20);
  assert.ok(e >= 0.70 && e <= 0.88, `Oswald e was ${e}`);
});

test('Aircraft Design: All presets evaluate to valid mass budgets', () => {
  for (const [key, preset] of Object.entries(DESIGN_PRESETS)) {
    const budget = calculateAircraftMassBudget(preset.design);
    assert.ok(budget.mtowKg > 0, `Preset ${key} MTOW must be positive`);
    assert.ok(budget.wingLoadingNm2 > 100, `Preset ${key} W/S must be > 100`);
    assert.ok(budget.thrustToWeight > 0.1, `Preset ${key} T/W must be > 0.1`);
  }
});

test('Feasibility Audit: Detects under-powered aircraft violation', () => {
  // Design with practically zero engine thrust
  const underPoweredDesign: CadetAircraftDesign = {
    ...DEFAULT_CADET_DESIGN,
    thrustPerEngineKn: 2.0, // Only 4 kN total for a 12-tonne plane
  };

  const budget = calculateAircraftMassBudget(underPoweredDesign);
  const audit = auditAircraftFeasibility(budget, DEFAULT_MISSION_CONSTRAINTS);

  assert.strictEqual(audit.isFeasible, false);
  assert.ok(audit.violationCount > 0);

  // Takeoff and climb must be violated
  const takeoffAudit = audit.results.find(r => r.id === 'takeoff');
  const climbAudit = audit.results.find(r => r.id === 'climb');

  assert.strictEqual(takeoffAudit?.isViolated, true);
  assert.strictEqual(climbAudit?.isViolated, true);
  assert.ok(takeoffAudit.marginPercent < 0);
});

test('Feasibility Audit: Detects undersized wing stall violation', () => {
  // Heavy aircraft with tiny 3 m² wings
  const tinyWingDesign: CadetAircraftDesign = {
    ...DEFAULT_CADET_DESIGN,
    wingAreaM2: 4.0, // Insane wing loading > 20,000 N/m²
  };

  const budget = calculateAircraftMassBudget(tinyWingDesign);
  const audit = auditAircraftFeasibility(budget, DEFAULT_MISSION_CONSTRAINTS);

  assert.strictEqual(audit.isFeasible, false);

  const stallAudit = audit.results.find(r => r.id === 'stall');
  assert.strictEqual(stallAudit?.isViolated, true);
  assert.ok(stallAudit.marginPercent < 0);
});

test('Feasibility Audit: Identifies compliant balanced configuration', () => {
  // Well-balanced multi-role tactical airlifter
  const balancedDesign: CadetAircraftDesign = {
    callsign: 'VIABLE-ONE',
    wingAreaM2: 55.0,
    aspectRatio: 8.5,
    sweepDeg: 15,
    engineClass: 'low_bypass_turbofan',
    engineCount: 2,
    thrustPerEngineKn: 85.0, // 170 kN total
    compositePercent: 70,
    internalFuelKg: 4000,
    payloadKg: 2500,
  };

  const budget = calculateAircraftMassBudget(balancedDesign);
  const audit = auditAircraftFeasibility(budget, DEFAULT_MISSION_CONSTRAINTS);

  assert.strictEqual(audit.isFeasible, true);
  assert.strictEqual(audit.violationCount, 0);
  assert.ok(audit.criticalConstraint.marginPercent >= 0);
});

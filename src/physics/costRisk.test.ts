import test from 'node:test';
import assert from 'node:assert';
import {
  calculateCompositeEmptyFraction,
  calculateMaterialCostMultiplier,
  evaluateProcurementAndRisk,
} from './costRisk.ts';
import {
  calculateTakeoffTW,
  getEngineStaticThrustMultiplier,
  getPropwashLiftBonus,
  DEFAULT_MISSION_CONSTRAINTS,
} from './constraints.ts';

test('Propeller Aero: Static thrust and propwash slipstream multipliers', () => {
  const tpStatic = getEngineStaticThrustMultiplier('turboprop');
  const jetStatic = getEngineStaticThrustMultiplier('afterburning_turbojet');
  assert.ok(tpStatic > jetStatic, 'Turboprop static multiplier must exceed turbojet');
  assert.strictEqual(tpStatic, 1.30);

  const tpPropwash = getPropwashLiftBonus('turboprop');
  const jetPropwash = getPropwashLiftBonus('low_bypass_turbofan');
  assert.strictEqual(tpPropwash, 0.20, 'Turboprop gets +20% propwash lift bonus');
  assert.strictEqual(jetPropwash, 0.00, 'Jets do not have propeller slipstream blown wing');
});

test('Propeller Aero: Turboprop requires significantly lower rated T/W for short takeoff', () => {
  const ws = 3500; // N/m^2

  const turbopropConstraints = {
    ...DEFAULT_MISSION_CONSTRAINTS,
    engineClass: 'turboprop' as const,
  };
  const jetConstraints = {
    ...DEFAULT_MISSION_CONSTRAINTS,
    engineClass: 'low_bypass_turbofan' as const,
  };

  const twTurboprop = calculateTakeoffTW(ws, turbopropConstraints);
  const twJet = calculateTakeoffTW(ws, jetConstraints);

  // Turboprop must require lower rated T/W to unstick from the same field length
  assert.ok(
    twTurboprop < twJet,
    `Turboprop T/W (${twTurboprop}) should be lower than Jet T/W (${twJet})`
  );

  // Turboprop should require approximately 20-35% less rated cruise thrust to take off
  const ratio = twTurboprop / twJet;
  assert.ok(ratio >= 0.60 && ratio <= 0.85, `Takeoff thrust ratio was ${ratio}`);
});

test('Cost & Risk: Composite empty weight fraction scaling', () => {
  const f0 = calculateCompositeEmptyFraction(0);
  const f50 = calculateCompositeEmptyFraction(50);
  const f100 = calculateCompositeEmptyFraction(100);

  assert.strictEqual(f0, 0.53);
  assert.strictEqual(f50, 0.48);
  assert.strictEqual(f100, 0.43);
  assert.ok(f100 < f50 && f50 < f0);
});

test('Cost & Risk: Non-linear exponential material cost escalation', () => {
  const mult20 = calculateMaterialCostMultiplier(20);
  const mult40 = calculateMaterialCostMultiplier(40);
  const mult70 = calculateMaterialCostMultiplier(70);
  const mult90 = calculateMaterialCostMultiplier(90);

  const deltaLow = mult40 - mult20;
  const deltaHigh = mult90 - mult70;

  // For the same 20% composite increase, the delta at high percentages must be significantly steeper
  assert.ok(
    deltaHigh > deltaLow * 2.0,
    `High composite cost delta (${deltaHigh}) should exceed low delta (${deltaLow}) by > 2x`
  );
});

test('Cost & Risk: Procurement Board approval status and threshold checks', () => {
  // Conservative low-risk configuration (trainer, 20% composite)
  const evalApproved = evaluateProcurementAndRisk(
    3000, // OEW (kg)
    20,   // 20% composite
    'turboprop',
    1,
    15,
    5,
    7.5,
    45.0  // £45M budget
  );

  assert.strictEqual(evalApproved.boardStatus, 'approved');
  assert.ok(evalApproved.programRiskPercent < 50);
  assert.ok(evalApproved.unitCostM < 45.0);

  // Extreme bleeding-edge configuration (95% composite, afterburning jet, heavy weight)
  const evalExtreme = evaluateProcurementAndRisk(
    14000,
    95, // 95% composite
    'afterburning_turbojet',
    2,
    95,
    45,
    11.0,
    30.0 // £30M tight budget
  );

  assert.strictEqual(evalExtreme.boardStatus, 'rejected');
  assert.ok(evalExtreme.programRiskPercent > 75);
  assert.ok(evalExtreme.recommendations.length > 0);
});

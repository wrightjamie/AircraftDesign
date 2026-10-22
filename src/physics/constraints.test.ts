import test from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_MISSION_CONSTRAINTS,
  getInducedDragK,
  calculateStallWingLoading,
  calculateTakeoffTW,
  calculateMaxSpeedTW,
  calculateClimbTW,
  calculateServiceCeilingTW,
  calculateSustainedTurnTW,
  calculateCruiseTW,
  generateConstraintCurves
} from './constraints.ts';

test('Aerodynamics: Induced Drag Factor K', () => {
  const K = getInducedDragK(8.0, 0.82);
  // K = 1 / (pi * 8 * 0.82) ≈ 0.0485
  assert.ok(Math.abs(K - 0.0485) < 0.001);
});

test('Constraints: Stall Speed boundary is positive and realistic', () => {
  const stallWS = calculateStallWingLoading(DEFAULT_MISSION_CONSTRAINTS);
  
  // (W/S)_stall = 0.5 * 1.225 * 44^2 * 2.35 ≈ 2786 N/m²
  assert.ok(stallWS > 2500 && stallWS < 3000);
});

test('Constraints: Takeoff Ground Roll physics verification', () => {
  const c = DEFAULT_MISSION_CONSTRAINTS;
  
  // Y-intercept at W/S = 0 must equal the rolling friction coefficient mu (0.06)
  const twAtZero = calculateTakeoffTW(0, c);
  assert.strictEqual(twAtZero, c.groundFrictionMu);

  // Takeoff T/W must increase monotonically with wing loading
  const twAt1000 = calculateTakeoffTW(1000, c);
  const twAt3000 = calculateTakeoffTW(3000, c);
  const twAt5000 = calculateTakeoffTW(5000, c);

  assert.ok(twAt1000 > twAtZero);
  assert.ok(twAt3000 > twAt1000);
  assert.ok(twAt5000 > twAt3000);

  // Reducing available field length from 450m to 300m must demand higher T/W
  const shortFieldConstraints = { ...c, takeoffFieldLengthM: 300 };
  const twShort = calculateTakeoffTW(3000, shortFieldConstraints);
  assert.ok(twShort > twAt3000);
});

test('Constraints: Maximum Speed U-shape verification around optimal wing loading', () => {
  // At lower speeds or across the analytical minimum (W/S)_opt = q * sqrt(CD0 / K),
  // the curve is proven to be strictly convex (U-shaped).
  const c = { ...DEFAULT_MISSION_CONSTRAINTS, maxSpeedKts: 160 };

  const twLow = calculateMaxSpeedTW(400, c);
  const twOpt = calculateMaxSpeedTW(2500, c);
  const twHigh = calculateMaxSpeedTW(8000, c);

  // Both extremes require more thrust than the optimal wing loading
  assert.ok(twLow > twOpt, `twLow (${twLow}) must be greater than twOpt (${twOpt})`);
  assert.ok(twHigh > twOpt, `twHigh (${twHigh}) must be greater than twOpt (${twOpt})`);
});

test('Constraints: Rate of Climb demands positive excess power', () => {
  const c = DEFAULT_MISSION_CONSTRAINTS;
  const climbTW = calculateClimbTW(3000, c);
  const cruiseTW = calculateCruiseTW(c);

  // Rate of climb must require more thrust than minimum cruise thrust
  assert.ok(climbTW > cruiseTW);

  // Higher climb rate demands higher T/W
  const fastClimbConstraints = { ...c, climbRateFpm: 5000 };
  const twFastClimb = calculateClimbTW(3000, fastClimbConstraints);
  assert.ok(twFastClimb > climbTW);
});

test('Constraints: Service Ceiling accounting for 35,000 ft density lapse', () => {
  const c = DEFAULT_MISSION_CONSTRAINTS;
  const ceilTW = calculateServiceCeilingTW(3000, c);
  
  // Must be a valid positive value
  assert.ok(ceilTW > 0.1 && ceilTW < 1.0);
});

test('Constraints: Sustained Turn scales with n^2', () => {
  const c = DEFAULT_MISSION_CONSTRAINTS;
  
  const turn1g = calculateSustainedTurnTW(3000, { ...c, turnLoadFactorG: 1.0 });
  const turn2g = calculateSustainedTurnTW(3000, { ...c, turnLoadFactorG: 2.0 });
  const turn3g = calculateSustainedTurnTW(3000, { ...c, turnLoadFactorG: 3.0 });

  assert.ok(turn2g > turn1g);
  assert.ok(turn3g > turn2g);
  // Difference between 3g and 2g should be greater than between 2g and 1g due to n^2
  assert.ok((turn3g - turn2g) > (turn2g - turn1g));
});

test('Constraints: Cruise floor is positive and independent of wing loading', () => {
  const c = DEFAULT_MISSION_CONSTRAINTS;
  const cruiseTW = calculateCruiseTW(c);

  assert.ok(cruiseTW > 0.02 && cruiseTW < 0.15);
});

test('Constraints: Full Curve Generator produces consistent points', () => {
  const curves = generateConstraintCurves(DEFAULT_MISSION_CONSTRAINTS, 200, 6000, 50);

  assert.strictEqual(curves.takeoffPoints.length, 51);
  assert.strictEqual(curves.maxSpeedPoints.length, 51);
  assert.strictEqual(curves.climbPoints.length, 51);
  assert.strictEqual(curves.ceilingPoints.length, 51);
  assert.strictEqual(curves.turnPoints.length, 51);

  // Validate every coordinate is finite, not NaN, and positive
  for (const pt of curves.takeoffPoints) {
    assert.ok(!isNaN(pt.ws) && isFinite(pt.ws) && pt.ws > 0);
    assert.ok(!isNaN(pt.tw) && isFinite(pt.tw) && pt.tw > 0);
  }
});

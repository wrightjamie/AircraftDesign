import test from 'node:test';
import assert from 'node:assert';
import { BENCHMARK_AIRCRAFT, BENCHMARK_CATEGORIES } from './benchmarks.ts';

test('Benchmarks: Fleet size exceeds minimum requirement (at least 20 aircraft)', () => {
  assert.ok(
    BENCHMARK_AIRCRAFT.length >= 20,
    `Expected at least 20 aircraft, but got ${BENCHMARK_AIRCRAFT.length}`
  );
});

test('Benchmarks: All 5 aircraft categories are represented', () => {
  assert.strictEqual(BENCHMARK_CATEGORIES.length, 5);

  for (const cat of BENCHMARK_CATEGORIES) {
    const count = BENCHMARK_AIRCRAFT.filter(a => a.category === cat).length;
    assert.ok(count >= 2, `Category ${cat} must have at least 2 aircraft, got ${count}`);
  }
});

test('Benchmarks: Mass properties consistency', () => {
  for (const ac of BENCHMARK_AIRCRAFT) {
    // MTOW must be greater than OEW
    assert.ok(
      ac.mtowKg > ac.oewKg,
      `${ac.name}: MTOW (${ac.mtowKg}) must exceed OEW (${ac.oewKg})`
    );

    // Empty weight fraction must match OEW / MTOW
    const calculatedFraction = ac.oewKg / ac.mtowKg;
    assert.ok(
      Math.abs(ac.emptyWeightFraction - calculatedFraction) < 0.005,
      `${ac.name}: Stored fraction (${ac.emptyWeightFraction}) doesn't match calculated (${calculatedFraction})`
    );

    // Empty weight fraction in aerospace engineering is realistically between 0.35 and 0.80
    assert.ok(
      ac.emptyWeightFraction >= 0.35 && ac.emptyWeightFraction <= 0.85,
      `${ac.name}: Realistic empty weight fraction check (got ${ac.emptyWeightFraction})`
    );
  }
});

test('Benchmarks: Aerodynamic Sizing formulas consistency', () => {
  const g = 9.80665;

  for (const ac of BENCHMARK_AIRCRAFT) {
    // Wing loading W/S = (MTOW * g) / wingArea
    const expectedWS = (ac.mtowKg * g) / ac.wingAreaM2;
    assert.ok(
      Math.abs(ac.wingLoadingNm2 - expectedWS) < 5,
      `${ac.name}: Stored wing loading (${ac.wingLoadingNm2}) doesn't match expected (${expectedWS})`
    );

    // Thrust-to-weight T/W = (maxThrustKn * 1000) / (MTOW * g)
    if (ac.maxThrustKn > 0) {
      const expectedTW = (ac.maxThrustKn * 1000) / (ac.mtowKg * g);
      assert.ok(
        Math.abs(ac.thrustToWeight - expectedTW) < 0.01,
        `${ac.name}: Stored T/W (${ac.thrustToWeight}) doesn't match expected (${expectedTW})`
      );
    } else {
      assert.strictEqual(ac.thrustToWeight, 0, `${ac.name}: Unpowered glider must have 0 T/W`);
    }

    // Geometry sanity checks
    assert.ok(ac.wingAreaM2 > 0, `${ac.name}: Wing area must be positive`);
    assert.ok(ac.aspectRatio > 0, `${ac.name}: Aspect ratio must be positive`);
    assert.ok(ac.maxSpeedKts > 0, `${ac.name}: Max speed must be positive`);
    assert.ok(ac.serviceCeilingFt > 0, `${ac.name}: Service ceiling must be positive`);
    assert.ok(ac.materials.length > 5, `${ac.name}: Must specify structural materials`);
  }
});

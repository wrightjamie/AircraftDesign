import test from 'node:test';
import assert from 'node:assert';
import {
  getAtmosphereAtAltitudeMeters,
  getAtmosphereAtAltitudeFeet,
  SEA_LEVEL_PRESSURE,
  SEA_LEVEL_DENSITY,
  SEA_LEVEL_TEMP,
  TROPOPAUSE_ALT,
  TROPOPAUSE_TEMP
} from './isa.ts';

test('ISA Model: Sea-level standard atmospheric conditions', () => {
  const sl = getAtmosphereAtAltitudeMeters(0);
  
  assert.strictEqual(sl.altitudeM, 0);
  assert.strictEqual(sl.altitudeFt, 0);
  assert.strictEqual(sl.temperatureK, SEA_LEVEL_TEMP);
  assert.strictEqual(sl.temperatureC, 15);
  assert.strictEqual(sl.pressurePa, SEA_LEVEL_PRESSURE);
  assert.ok(Math.abs(sl.densityKgM3 - SEA_LEVEL_DENSITY) < 1e-4);
  assert.ok(Math.abs(sl.densityRatio - 1.0) < 1e-4);
  // Speed of sound at 15°C is approx 340.29 m/s
  assert.ok(Math.abs(sl.speedOfSoundMs - 340.29) < 0.2);
});

test('ISA Model: Troposphere temperature lapse rate (-6.5°C / 1000m)', () => {
  const at1000m = getAtmosphereAtAltitudeMeters(1000);
  assert.strictEqual(at1000m.temperatureC, 15 - 6.5); // 8.5°C

  const at5000m = getAtmosphereAtAltitudeMeters(5000);
  assert.strictEqual(at5000m.temperatureC, 15 - 6.5 * 5); // -17.5°C
  assert.ok(at5000m.densityKgM3 < SEA_LEVEL_DENSITY);
  assert.ok(at5000m.pressurePa < SEA_LEVEL_PRESSURE);
});

test('ISA Model: Tropopause boundary at 11,000m (-56.5°C)', () => {
  const trop = getAtmosphereAtAltitudeMeters(TROPOPAUSE_ALT);
  assert.ok(Math.abs(trop.temperatureK - TROPOPAUSE_TEMP) < 1e-4);
  assert.ok(Math.abs(trop.temperatureC - (-56.5)) < 0.01);
  // Pressure at tropopause is approx 22632 Pa
  assert.ok(Math.abs(trop.pressurePa - 22632) < 100);
});

test('ISA Model: Cruise Altitude at 35,000 ft', () => {
  const cruise = getAtmosphereAtAltitudeFeet(35000);
  
  // 35,000 ft is approx 10,668m (within troposphere)
  assert.ok(Math.abs(cruise.altitudeFt - 35000) < 1);
  // Density ratio at 35k ft is approximately 0.31
  assert.ok(cruise.densityRatio > 0.29 && cruise.densityRatio < 0.33);
  // Density is approx 0.38 kg/m³
  assert.ok(Math.abs(cruise.densityKgM3 - 0.38) < 0.03);
});

test('ISA Model: Stratosphere isothermal layer (> 11,000m)', () => {
  const at12000m = getAtmosphereAtAltitudeMeters(12000);
  const at15000m = getAtmosphereAtAltitudeMeters(15000);

  // Temperature remains constant in lower stratosphere
  assert.strictEqual(at12000m.temperatureK, TROPOPAUSE_TEMP);
  assert.strictEqual(at15000m.temperatureK, TROPOPAUSE_TEMP);
  // Pressure drops exponentially
  assert.ok(at15000m.pressurePa < at12000m.pressurePa);
});

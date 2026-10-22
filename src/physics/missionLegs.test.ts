import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateMission,
  getEngineSFC,
  calculateAerodynamicLoverD,
  calculateOptimumLoiterLoverD,
  MISSION_PRESETS,
  type MissionLeg
} from './missionLegs.ts';
import {
  DEFAULT_CADET_DESIGN,
  calculateAircraftMassBudget,
  type CadetAircraftDesign
} from './aircraftDesign.ts';

describe('Mission Legs Engine & Breguet Fuel Burn', () => {
  const baseDesign: CadetAircraftDesign = { ...DEFAULT_CADET_DESIGN };
  const massBudget = calculateAircraftMassBudget(baseDesign);

  it('provides distinct engine SFC values for turboprop vs turbofan vs turbojet', () => {
    const sfcProp = getEngineSFC('turboprop', 'cruise');
    const sfcFan = getEngineSFC('low_bypass_turbofan', 'cruise');
    const sfcJetReheat = getEngineSFC('afterburning_turbojet', 'combat_reheat');

    assert.ok(sfcProp < sfcFan, 'Turboprop should have lower cruise SFC than low-bypass turbofan');
    assert.ok(sfcJetReheat > 1.8, 'Turbojet in reheat should have high SFC (> 1.8)');
  });

  it('calculates aerodynamic L/D from aircraft geometry and flight state', () => {
    const { lod, cl, cd } = calculateAerodynamicLoverD(
      massBudget.mtowKg,
      baseDesign.wingAreaM2,
      baseDesign.aspectRatio,
      massBudget.oswaldEfficiency,
      massBudget.cd0,
      25000,
      700
    );

    assert.ok(lod > 8 && lod < 22, `L/D (${lod}) should be in realistic aircraft range`);
    assert.ok(cl > 0.1 && cl < 1.0, `CL (${cl}) should be reasonable for cruise`);
    assert.ok(cd > 0.015 && cd < 0.08, `CD (${cd}) should be realistic`);
  });

  it('calculates optimum loiter L/D', () => {
    const lodLoiterProp = calculateOptimumLoiterLoverD(massBudget.cd0, baseDesign.aspectRatio, massBudget.oswaldEfficiency, 'turboprop');
    const lodLoiterFan = calculateOptimumLoiterLoverD(massBudget.cd0, baseDesign.aspectRatio, massBudget.oswaldEfficiency, 'low_bypass_turbofan');

    assert.ok(lodLoiterProp > 10, 'Prop loiter L/D should be high');
    assert.ok(lodLoiterFan > 8, 'Fan loiter L/D should be reasonable');
  });

  it('simulates a complete multi-leg mission and tracks mass sequentially', () => {
    const legs: MissionLeg[] = [
      { id: '1', name: 'Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 5 },
      { id: '2', name: 'Climb', type: 'climb', targetAltitudeFt: 25000, climbSpeedKmh: 500 },
      { id: '3', name: 'Cruise Out', type: 'cruise', distanceKm: 400, altitudeFt: 25000, speedKmh: 750 },
      { id: '4', name: 'Loiter', type: 'loiter', durationMin: 20, altitudeFt: 20000 },
      { id: '5', name: 'Cruise Back', type: 'cruise', distanceKm: 400, altitudeFt: 27000, speedKmh: 760 },
      { id: '6', name: 'Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 2000, headwindKts: 5 },
    ];

    const result = simulateMission(baseDesign, massBudget, legs);

    assert.equal(result.steps.length, 6);
    assert.ok(result.totalDistanceKm > 800, 'Total distance should exceed cruise sum');
    assert.ok(result.totalDurationMin > 60, 'Total duration should be over an hour');
    assert.ok(result.totalFuelBurnedKg > 1000, 'Fuel burned should be substantial');
    assert.ok(result.finalFuelKg < baseDesign.internalFuelKg, 'Fuel should decrease');
    assert.ok(result.steps[0].startWeightKg === massBudget.mtowKg, 'Mission starts at MTOW');
    assert.ok(result.steps[5].endWeightKg < massBudget.mtowKg, 'Ending weight is lighter than MTOW');
  });

  it('correctly reduces aircraft mass and payload when stores are dropped', () => {
    const legs: MissionLeg[] = [
      { id: '1', name: 'Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 0 },
      { id: '2', name: 'Cruise Out', type: 'cruise', distanceKm: 200, altitudeFt: 15000, speedKmh: 600 },
      {
        id: '3',
        name: 'Drop Munitions',
        type: 'payload_release',
        dropType: 'munitions',
        dropMassKg: 1500,
        altitudeFt: 15000,
        indicatedAirspeedKts: 300,
      },
      { id: '4', name: 'Cruise In', type: 'cruise', distanceKm: 200, altitudeFt: 15000, speedKmh: 600 },
      { id: '5', name: 'Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 2000, headwindKts: 0 },
    ];

    const result = simulateMission(baseDesign, massBudget, legs);

    assert.equal(result.payloadDeliveredKg, 1500);
    assert.equal(result.finalPayloadKg, baseDesign.payloadKg - 1500);
    assert.ok(result.steps[2].payloadRemainingKg === baseDesign.payloadKg - 1500);
  });

  it('correctly models Air-to-Air Refuelling (AAR) increasing fuel up to tank capacity', () => {
    const legs: MissionLeg[] = [
      { id: '1', name: 'Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 0 },
      { id: '2', name: 'Long Cruise', type: 'cruise', distanceKm: 1200, altitudeFt: 30000, speedKmh: 750 },
      { id: '3', name: 'AAR Hookup', type: 'air_refuel', fuelReceivedKg: 1500, altitudeFt: 22000 },
      { id: '4', name: 'Cruise Return', type: 'cruise', distanceKm: 600, altitudeFt: 32000, speedKmh: 750 },
      { id: '5', name: 'Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 2200, headwindKts: 0 },
    ];

    const result = simulateMission(baseDesign, massBudget, legs);

    assert.ok(result.totalFuelReceivedKg > 0, 'AAR should record received fuel');
    const aarStep = result.steps[2];
    assert.ok(aarStep.endWeightKg > aarStep.startWeightKg, 'Weight increases after taking on fuel');
  });

  it('detects fuel starvation when mission requirements exceed fuel capacity', () => {
    const extremeLegs: MissionLeg[] = [
      { id: '1', name: 'Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 0 },
      // 5,000 km cruise on 4,500 kg fuel on a fast jet will exhaust fuel
      { id: '2', name: 'Absurd Cruise', type: 'cruise', distanceKm: 6000, altitudeFt: 30000, speedKmh: 800 },
      { id: '3', name: 'Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 2000, headwindKts: 0 },
    ];

    const result = simulateMission(baseDesign, massBudget, extremeLegs);

    assert.equal(result.missionFeasible, false);
    assert.equal(result.verdict, 'FAILED_FUEL');
    assert.notEqual(result.starvationLegIndex, null);
  });

  it('runs all built-in mission presets without runtime crashes', () => {
    for (const [key, preset] of Object.entries(MISSION_PRESETS)) {
      const result = simulateMission(baseDesign, massBudget, preset.legs);
      assert.ok(result.steps.length > 0, `Preset ${key} should produce steps`);
      assert.ok(result.totalDistanceKm > 0, `Preset ${key} should have distance`);
      assert.ok(result.takeoffGroundRollM > 0, `Preset ${key} should have takeoff roll`);
    }
  });
});

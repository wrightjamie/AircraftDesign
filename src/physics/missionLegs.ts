import { GRAVITY, getAtmosphereAtAltitudeFeet } from './isa.ts';
import type { CadetAircraftDesign, AircraftMassBudget, EngineClass } from './aircraftDesign.ts';

export type MissionLegType =
  | 'takeoff'
  | 'climb'
  | 'cruise'
  | 'loiter'
  | 'combat_air_to_air'
  | 'combat_air_to_ground'
  | 'payload_release'
  | 'air_refuel'
  | 'landing';

export type PayloadDropType =
  | 'paratroopers'
  | 'munitions'
  | 'cargo_pallet'
  | 'external_fuel_tanks';

export interface BaseLegConfig {
  id: string;
  name: string;
  type: MissionLegType;
}

export interface TakeoffLegConfig extends BaseLegConfig {
  type: 'takeoff';
  runwayElevationFt: number; // Elevation above sea level (ft)
  headwindKts: number;       // Headwind component in knots
}

export interface ClimbLegConfig extends BaseLegConfig {
  type: 'climb';
  targetAltitudeFt: number;  // Target cruise altitude (ft)
  climbSpeedKmh: number;     // True airspeed during climb (km/h)
}

export interface CruiseLegConfig extends BaseLegConfig {
  type: 'cruise';
  distanceKm: number;        // Leg ground distance (km)
  altitudeFt: number;        // Cruise altitude (ft)
  speedKmh: number;          // Cruise true airspeed (km/h)
}

export interface LoiterLegConfig extends BaseLegConfig {
  type: 'loiter';
  durationMin: number;       // Loiter duration (minutes)
  altitudeFt: number;        // Loiter altitude (ft)
}

export interface CombatAtoALegConfig extends BaseLegConfig {
  type: 'combat_air_to_air';
  durationMin: number;       // Combat engagement duration (minutes)
  altitudeFt: number;        // Engagement altitude (ft)
  loadFactorG: number;       // Average sustained maneuver load factor (e.g. 4.0 - 7.0 g)
  reheatEngaged: boolean;    // Afterburner engaged for combat jet
}

export interface CombatAtoGLegConfig extends BaseLegConfig {
  type: 'combat_air_to_ground';
  ingressDistanceKm: number; // Low-level ingress distance (km)
  altitudeFt: number;        // Low-level ingress altitude (ft AGL, e.g. 500 ft)
  speedKmh: number;          // Ingress dash speed (km/h)
}

export interface PayloadReleaseLegConfig extends BaseLegConfig {
  type: 'payload_release';
  dropType: PayloadDropType;
  dropMassKg: number;        // Mass of stores/payload dropped (kg)
  altitudeFt: number;        // Drop altitude (ft)
  indicatedAirspeedKts: number; // Release airspeed (knots IAS)
}

export interface AirRefuelLegConfig extends BaseLegConfig {
  type: 'air_refuel';
  fuelReceivedKg: number;    // Fuel transferred from tanker (kg)
  altitudeFt: number;        // Tanker rendezvous altitude (ft)
}

export interface LandingLegConfig extends BaseLegConfig {
  type: 'landing';
  runwayElevationFt: number; // Landing field elevation (ft)
  availableRunwayM: number;  // Usable runway length (m)
  headwindKts: number;       // Headwind component (knots)
}

export type MissionLeg =
  | TakeoffLegConfig
  | ClimbLegConfig
  | CruiseLegConfig
  | LoiterLegConfig
  | CombatAtoALegConfig
  | CombatAtoGLegConfig
  | PayloadReleaseLegConfig
  | AirRefuelLegConfig
  | LandingLegConfig;

export interface LegSimulationStep {
  legIndex: number;
  legId: string;
  type: MissionLegType;
  title: string;
  startWeightKg: number;
  endWeightKg: number;
  fuelBurnedKg: number;
  fuelRemainingKg: number;
  fuelPercentRemaining: number;
  payloadRemainingKg: number;
  distanceKm: number;
  durationMin: number;
  cumulativeDistanceKm: number;
  cumulativeDurationMin: number;
  altitudeFt: number;
  speedKmh: number;
  status: 'nominal' | 'warning' | 'critical';
  notes: string[];
}

export interface MissionSimulationSummary {
  steps: LegSimulationStep[];
  totalDistanceKm: number;
  totalDurationMin: number;
  totalFuelBurnedKg: number;
  totalFuelReceivedKg: number;
  initialFuelKg: number;
  finalFuelKg: number;
  requiredReserveKg: number;
  reserveMarginKg: number;
  reserveMarginPercent: number;
  initialPayloadKg: number;
  finalPayloadKg: number;
  payloadDeliveredKg: number;
  takeoffGroundRollM: number;
  landingFieldReqM: number;
  missionFeasible: boolean;
  starvationLegIndex: number | null;
  verdict: 'SUCCESS' | 'MARGINAL' | 'FAILED_FUEL' | 'FAILED_LANDING' | 'FAILED_STALL';
  critique: string;
}

/**
 * Returns baseline engine SFC (1/hr) based on engine class and operational regime
 */
export function getEngineSFC(
  engineClass: EngineClass,
  regime: 'cruise' | 'loiter' | 'combat_dry' | 'combat_reheat'
): number {
  switch (engineClass) {
    case 'turboprop':
      switch (regime) {
        case 'loiter': return 0.42;
        case 'combat_dry':
        case 'combat_reheat': return 0.62;
        case 'cruise':
        default: return 0.48;
      }
    case 'high_bypass_turbofan':
      switch (regime) {
        case 'loiter': return 0.52;
        case 'combat_dry':
        case 'combat_reheat': return 0.82;
        case 'cruise':
        default: return 0.58;
      }
    case 'low_bypass_turbofan':
      switch (regime) {
        case 'loiter': return 0.70;
        case 'combat_reheat': return 1.90;
        case 'combat_dry': return 0.95;
        case 'cruise':
        default: return 0.78;
      }
    case 'afterburning_turbojet':
      switch (regime) {
        case 'loiter': return 0.88;
        case 'combat_reheat': return 2.15;
        case 'combat_dry': return 1.15;
        case 'cruise':
        default: return 0.95;
      }
  }
}

/**
 * Calculates aerodynamic Lift-to-Drag ratio (L/D) given current aircraft mass, wing geometry, and flight conditions
 */
export function calculateAerodynamicLoverD(
  massKg: number,
  wingAreaM2: number,
  aspectRatio: number,
  oswaldEfficiency: number,
  cd0: number,
  altitudeFt: number,
  speedKmh: number
): { lod: number; cl: number; cd: number } {
  const g = GRAVITY;
  const speedMs = Math.max(30, (speedKmh * 1000) / 3600);
  const atmos = getAtmosphereAtAltitudeFeet(altitudeFt);
  const q = 0.5 * atmos.densityKgM3 * speedMs * speedMs;

  const totalWeightN = massKg * g;
  const cl = totalWeightN / (q * Math.max(1, wingAreaM2));

  // Induced drag coefficient
  const kInduced = 1 / (Math.PI * Math.max(1, aspectRatio) * Math.max(0.4, oswaldEfficiency));
  const cdi = kInduced * cl * cl;
  const cd = cd0 + cdi;

  const lod = Math.max(2.0, Math.min(26.0, cl / Math.max(0.005, cd)));

  return {
    lod: Number(lod.toFixed(2)),
    cl: Number(cl.toFixed(3)),
    cd: Number(cd.toFixed(4)),
  };
}

/**
 * Calculates optimum loiter L/D
 */
export function calculateOptimumLoiterLoverD(
  cd0: number,
  aspectRatio: number,
  oswaldEfficiency: number,
  engineClass: EngineClass
): number {
  const lodMax = 1 / (2 * Math.sqrt((cd0) / (Math.PI * aspectRatio * oswaldEfficiency)));
  // Propeller optimum loiter is at (L/D)max; jet aircraft optimum loiter is at (sqrt(3)/2) * (L/D)max
  if (engineClass === 'turboprop') {
    return Number(lodMax.toFixed(2));
  }
  return Number((0.866 * lodMax).toFixed(2));
}

/**
 * Simulates an entire multi-leg mission profile step-by-step
 */
export function simulateMission(
  design: CadetAircraftDesign,
  massBudget: AircraftMassBudget,
  legs: MissionLeg[]
): MissionSimulationSummary {
  const g = GRAVITY;
  const steps: LegSimulationStep[] = [];

  let currentWeightKg = massBudget.mtowKg;
  let currentFuelKg = design.internalFuelKg;
  let currentPayloadKg = design.payloadKg;
  let cumulativeDistKm = 0;
  let cumulativeDurationMin = 0;
  let totalFuelBurnedKg = 0;
  let totalFuelReceivedKg = 0;
  let starvationLegIndex: number | null = null;
  let takeoffGroundRollM = 0;
  let landingFieldReqM = 0;
  let hasStallViolation = false;
  let hasLandingViolation = false;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const legStartWeight = currentWeightKg;
    let legFuelBurned = 0;
    let legDistanceKm = 0;
    let legDurationMin = 0;
    let altitudeFt = 0;
    let speedKmh = 0;
    let status: 'nominal' | 'warning' | 'critical' = 'nominal';
    const notes: string[] = [];

    // Check for prior fuel starvation
    if (currentFuelKg <= 0 && starvationLegIndex === null) {
      starvationLegIndex = i;
    }

    switch (leg.type) {
      case 'takeoff': {
        altitudeFt = leg.runwayElevationFt;
        speedKmh = 240; // ~130 kts rotation
        // Takeoff fuel fraction: Raymer empirical ~0.975 for jets, 0.985 for props
        const fuelFraction = design.engineClass === 'turboprop' ? 0.015 : 0.025;
        legFuelBurned = Math.round(currentFuelKg * fuelFraction);
        legDurationMin = 3;
        legDistanceKm = 5;

        // Ground roll calculation: S_g = 1.21 * (W/S) / (rho * g * CL_to * (T/W))
        const atmos = getAtmosphereAtAltitudeFeet(leg.runwayElevationFt);
        const wingLoading = (currentWeightKg * g) / design.wingAreaM2;
        const thrustToWeight = massBudget.thrustToWeight;
        const clTo = massBudget.clMaxFlaps * 0.8; // Takeoff flap setting
        const windFactor = Math.max(0.6, 1.0 - (leg.headwindKts / 100));

        let sg = (1.21 * wingLoading) / (atmos.densityKgM3 * g * clTo * Math.max(0.1, thrustToWeight));
        if (design.engineClass === 'turboprop') {
          sg *= 0.75; // Propeller low-speed static thrust advantage & propwash
        }
        takeoffGroundRollM = Math.round(sg * windFactor);
        notes.push(`Ground roll: ${takeoffGroundRollM}m (Takeoff W: ${Math.round(currentWeightKg)} kg)`);
        break;
      }

      case 'climb': {
        altitudeFt = leg.targetAltitudeFt;
        speedKmh = leg.climbSpeedKmh;
        // Climb fuel fraction based on altitude gained
        const altDeltaFt = Math.max(1000, leg.targetAltitudeFt);
        const climbFuelFraction = (altDeltaFt / 10000) * (design.engineClass === 'afterburning_turbojet' ? 0.025 : 0.018);
        legFuelBurned = Math.round(currentFuelKg * climbFuelFraction);
        legDurationMin = Math.round(altDeltaFt / 2500); // ~2500 ft/min climb rate
        legDistanceKm = Math.round((leg.climbSpeedKmh * (legDurationMin / 60)) * 0.85);
        notes.push(`Climbed to ${leg.targetAltitudeFt.toLocaleString()} ft in ${legDurationMin} min`);
        break;
      }

      case 'cruise': {
        altitudeFt = leg.altitudeFt;
        speedKmh = leg.speedKmh;
        legDistanceKm = leg.distanceKm;
        legDurationMin = Math.round((leg.distanceKm / Math.max(100, leg.speedKmh)) * 60);

        // Aerodynamic L/D and Breguet Range Equation
        const { lod } = calculateAerodynamicLoverD(
          currentWeightKg,
          design.wingAreaM2,
          design.aspectRatio,
          massBudget.oswaldEfficiency,
          massBudget.cd0,
          leg.altitudeFt,
          leg.speedKmh
        );

        const sfc = getEngineSFC(design.engineClass, 'cruise');
        // Breguet: W_end / W_start = exp( - (d_km * SFC) / (V_kmh * L/D) )
        const exponent = (leg.distanceKm * sfc) / (leg.speedKmh * lod);
        const endWeight = currentWeightKg * Math.exp(-exponent);
        legFuelBurned = Math.round(currentWeightKg - endWeight);
        notes.push(`Breguet Cruise L/D: ${lod.toFixed(1)} | Burn rate: ${Math.round((legFuelBurned / Math.max(1, legDurationMin)) * 60)} kg/hr`);
        break;
      }

      case 'loiter': {
        altitudeFt = leg.altitudeFt;
        speedKmh = 450; // Typical loiter IAS
        legDurationMin = leg.durationMin;
        legDistanceKm = Math.round((speedKmh * leg.durationMin) / 60);

        const lodLoiter = calculateOptimumLoiterLoverD(
          massBudget.cd0,
          design.aspectRatio,
          massBudget.oswaldEfficiency,
          design.engineClass
        );

        const sfc = getEngineSFC(design.engineClass, 'loiter');
        const durationHours = leg.durationMin / 60;
        // Breguet Loiter: W_end / W_start = exp( - (E_hr * SFC) / L/D )
        const exponent = (durationHours * sfc) / lodLoiter;
        const endWeight = currentWeightKg * Math.exp(-exponent);
        legFuelBurned = Math.round(currentWeightKg - endWeight);
        notes.push(`Optimum Loiter L/D: ${lodLoiter.toFixed(1)} over ${leg.durationMin} mins`);
        break;
      }

      case 'combat_air_to_air': {
        altitudeFt = leg.altitudeFt;
        speedKmh = 950; // Combat maneuvering speed
        legDurationMin = leg.durationMin;
        legDistanceKm = Math.round((speedKmh * leg.durationMin) / 60);

        const sfcRegime = leg.reheatEngaged && (design.engineClass === 'low_bypass_turbofan' || design.engineClass === 'afterburning_turbojet')
          ? 'combat_reheat'
          : 'combat_dry';
        const sfc = getEngineSFC(design.engineClass, sfcRegime);

        // High load-factor induced drag increases fuel burn by g-factor
        const gFactor = Math.max(1.0, leg.loadFactorG);
        const effectiveSfc = sfc * (1 + (gFactor - 1) * 0.35);
        const durationHours = leg.durationMin / 60;

        // At high throttle/combat, fuel burn is proportional to thrust and duration
        const thrustUsedN = massBudget.totalThrustN * (leg.reheatEngaged ? 1.0 : 0.85);
        // Thrust SFC: burnKg = (Thrust_N * SFC_hr * t_hr) / (g * 10)
        legFuelBurned = Math.round((thrustUsedN * effectiveSfc * durationHours) / (g * 9.81));
        notes.push(`High-G Combat (${leg.loadFactorG}g) | ${leg.reheatEngaged ? 'REHEAT ENGAGED' : 'DRY THRUST'}`);
        break;
      }

      case 'combat_air_to_ground': {
        altitudeFt = leg.altitudeFt;
        speedKmh = leg.speedKmh;
        legDistanceKm = leg.ingressDistanceKm;
        legDurationMin = Math.round((leg.ingressDistanceKm / Math.max(100, leg.speedKmh)) * 60);

        // Low altitude high dynamic pressure creates high parasite drag
        const { lod } = calculateAerodynamicLoverD(
          currentWeightKg,
          design.wingAreaM2,
          design.aspectRatio,
          massBudget.oswaldEfficiency,
          massBudget.cd0,
          leg.altitudeFt,
          leg.speedKmh
        );

        const sfc = getEngineSFC(design.engineClass, 'combat_dry');
        const exponent = (leg.ingressDistanceKm * sfc) / (leg.speedKmh * Math.max(3.0, lod * 0.8));
        const endWeight = currentWeightKg * Math.exp(-exponent);
        legFuelBurned = Math.round(currentWeightKg - endWeight);
        notes.push(`Low-Level Penetration at ${leg.altitudeFt} ft AGL | Dash speed: ${leg.speedKmh} km/h`);
        break;
      }

      case 'payload_release': {
        altitudeFt = leg.altitudeFt;
        speedKmh = Math.round((leg.indicatedAirspeedKts * 1.852));
        legDurationMin = 2;
        legDistanceKm = Math.round((speedKmh * 2) / 60);
        legFuelBurned = Math.round(currentFuelKg * 0.005); // Minor holding/release burn

        // Stall margin check: V_stall at drop altitude
        const atmos = getAtmosphereAtAltitudeFeet(leg.altitudeFt);
        const speedMs = (leg.indicatedAirspeedKts * 0.514444);
        const stallSpeedMs = Math.sqrt((2 * currentWeightKg * g) / (atmos.densityKgM3 * design.wingAreaM2 * massBudget.clMaxFlaps));
        const stallSpeedKts = stallSpeedMs * 1.94384;
        const dropMass = Math.min(currentPayloadKg, leg.dropMassKg);

        currentPayloadKg -= dropMass;
        notes.push(`Released ${dropMass.toLocaleString()} kg (${leg.dropType.replace(/_/g, ' ')})`);

        if (speedMs < stallSpeedMs * 1.15) {
          status = 'warning';
          hasStallViolation = true;
          notes.push(`⚠️ WARNING: Drop speed (${leg.indicatedAirspeedKts} kts) is close to stall speed (${Math.round(stallSpeedKts)} kts)!`);
        }
        break;
      }

      case 'air_refuel': {
        altitudeFt = leg.altitudeFt;
        speedKmh = 500;
        legDurationMin = 15;
        legDistanceKm = Math.round((speedKmh * 15) / 60);

        // Fuel burn during rendezvous & hookup
        legFuelBurned = Math.round(currentWeightKg * 0.01);

        // Tank capacity limit
        const roomInTanks = design.internalFuelKg - currentFuelKg;
        const fuelReceived = Math.min(roomInTanks, leg.fuelReceivedKg);
        totalFuelReceivedKg += fuelReceived;
        currentFuelKg += fuelReceived;
        currentWeightKg += fuelReceived;

        notes.push(`AAR Hookup: +${fuelReceived.toLocaleString()} kg fuel offloaded (Tank room: ${roomInTanks.toLocaleString()} kg)`);
        break;
      }

      case 'landing': {
        altitudeFt = leg.runwayElevationFt;
        speedKmh = 220;
        legDurationMin = 8;
        legDistanceKm = 25;
        legFuelBurned = Math.round(currentFuelKg * 0.015); // Descent, approach & taxi

        // Landing stall speed & required field length
        const atmos = getAtmosphereAtAltitudeFeet(leg.runwayElevationFt);
        const landingStallMs = Math.sqrt((2 * currentWeightKg * g) / (atmos.densityKgM3 * design.wingAreaM2 * massBudget.clMaxFlaps));
        const landingStallKts = landingStallMs * 1.94384;
        const vTouchdown = landingStallMs * 1.25;

        // Empirical landing roll and FAR field length (FAR 25: field length = 1.67 * ground roll)
        const windFactor = Math.max(0.65, 1.0 - (leg.headwindKts / 80));
        const groundRoll = (vTouchdown * vTouchdown) / (2 * 0.35 * g); // ~0.35g braking deceleration
        landingFieldReqM = Math.round(groundRoll * 1.67 * windFactor);

        notes.push(`Landing weight: ${Math.round(currentWeightKg).toLocaleString()} kg (Stall: ${Math.round(landingStallKts)} kts) | Req runway: ${landingFieldReqM}m`);

        if (landingFieldReqM > leg.availableRunwayM) {
          status = 'critical';
          hasLandingViolation = true;
          notes.push(`⛔ RUNWAY OVERRUN: Required runway (${landingFieldReqM}m) exceeds available (${leg.availableRunwayM}m)!`);
        }
        break;
      }
    }

    // Apply fuel burn
    totalFuelBurnedKg += legFuelBurned;
    currentFuelKg -= legFuelBurned;
    currentWeightKg -= legFuelBurned;

    // Fuel exhaustion verification
    if (currentFuelKg <= 0) {
      status = 'critical';
      if (starvationLegIndex === null) {
        starvationLegIndex = i;
      }
      notes.push(`⛔ FUEL STARVATION: All fuel tanks exhausted during this leg!`);
      currentFuelKg = 0;
    }

    cumulativeDistKm += legDistanceKm;
    cumulativeDurationMin += legDurationMin;

    const remainingFuelPercent = Math.max(0, Number(((currentFuelKg / design.internalFuelKg) * 100).toFixed(1)));

    steps.push({
      legIndex: i,
      legId: leg.id,
      type: leg.type,
      title: leg.name,
      startWeightKg: Math.round(legStartWeight),
      endWeightKg: Math.round(currentWeightKg),
      fuelBurnedKg: legFuelBurned,
      fuelRemainingKg: Math.round(currentFuelKg),
      fuelPercentRemaining: remainingFuelPercent,
      payloadRemainingKg: Math.round(currentPayloadKg),
      distanceKm: legDistanceKm,
      durationMin: legDurationMin,
      cumulativeDistanceKm: cumulativeDistKm,
      cumulativeDurationMin: cumulativeDurationMin,
      altitudeFt,
      speedKmh,
      status,
      notes,
    });
  }

  // Final summary statistics
  const finalFuelKg = Math.round(currentFuelKg);
  // Standard NATO 5% contingency + 30-min loiter reserve requirement
  const requiredReserveKg = Math.round(design.internalFuelKg * 0.05 + (massBudget.mtowKg * 0.015));
  const reserveMarginKg = finalFuelKg - requiredReserveKg;
  const reserveMarginPercent = Number(((reserveMarginKg / design.internalFuelKg) * 100).toFixed(1));
  const initialPayloadKg = design.payloadKg;
  const finalPayloadKg = Math.round(currentPayloadKg);
  const payloadDeliveredKg = initialPayloadKg - finalPayloadKg;

  // Determine overall verdict
  let verdict: MissionSimulationSummary['verdict'] = 'SUCCESS';
  let critique = '';
  let missionFeasible = true;

  if (starvationLegIndex !== null) {
    verdict = 'FAILED_FUEL';
    missionFeasible = false;
    critique = `Mission unviable: Fuel starvation reached at Leg ${starvationLegIndex + 1} (${steps[starvationLegIndex]?.title}). Increase internal fuel or schedule Tanker AAR rendezvous.`;
  } else if (hasLandingViolation) {
    verdict = 'FAILED_LANDING';
    missionFeasible = false;
    critique = `Landing hazard: Aircraft landing roll exceeds available runway length. Reduce landing weight or increase wing area/flaps.`;
  } else if (hasStallViolation) {
    verdict = 'FAILED_STALL';
    missionFeasible = false;
    critique = `Safety critical: Payload release airspeed approached stall threshold. Increase airspeed during release phase.`;
  } else if (reserveMarginKg < 0) {
    verdict = 'MARGINAL';
    missionFeasible = false;
    critique = `Marginal reserves: Aircraft reached destination but breached standard NATO 5% fuel reserve reserve margin by ${Math.abs(reserveMarginKg).toLocaleString()} kg.`;
  } else {
    verdict = 'SUCCESS';
    missionFeasible = true;
    critique = `Mission cleared: All operational requirements met with ${reserveMarginPercent}% safety fuel reserves intact upon touchdown.`;
  }

  return {
    steps,
    totalDistanceKm: cumulativeDistKm,
    totalDurationMin: cumulativeDurationMin,
    totalFuelBurnedKg,
    totalFuelReceivedKg,
    initialFuelKg: design.internalFuelKg,
    finalFuelKg,
    requiredReserveKg,
    reserveMarginKg,
    reserveMarginPercent,
    initialPayloadKg,
    finalPayloadKg,
    payloadDeliveredKg,
    takeoffGroundRollM,
    landingFieldReqM,
    missionFeasible,
    starvationLegIndex,
    verdict,
    critique,
  };
}

/**
 * Pre-configured Mission Profiles for Cadets to explore
 */
export const MISSION_PRESETS: Record<string, { id: string; name: string; description: string; legs: MissionLeg[] }> = {
  tactical_airdrop: {
    id: 'tactical_airdrop',
    name: 'Tactical Parachute Air Drop',
    description: 'Medium-range paradrop insertion: takeoff, cruise to drop zone, low-altitude cargo release, and return transit.',
    legs: [
      { id: 'leg-1', name: 'Takeoff & Departure', type: 'takeoff', runwayElevationFt: 0, headwindKts: 10 },
      { id: 'leg-2', name: 'Climb to Cruise Altitude', type: 'climb', targetAltitudeFt: 18000, climbSpeedKmh: 420 },
      { id: 'leg-3', name: 'Ingress Transit Cruise', type: 'cruise', distanceKm: 420, altitudeFt: 18000, speedKmh: 520 },
      { id: 'leg-4', name: 'Low-Level Parachute Drop', type: 'payload_release', dropType: 'paratroopers', dropMassKg: 1500, altitudeFt: 1500, indicatedAirspeedKts: 135 },
      { id: 'leg-5', name: 'Climb to Return Altitude', type: 'climb', targetAltitudeFt: 22000, climbSpeedKmh: 450 },
      { id: 'leg-6', name: 'Egress Transit Cruise', type: 'cruise', distanceKm: 420, altitudeFt: 22000, speedKmh: 540 },
      { id: 'leg-7', name: 'Recovery & Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1400, headwindKts: 10 },
    ],
  },
  combat_air_patrol: {
    id: 'combat_air_patrol',
    name: 'Combat Air Patrol (CAP) & Intercept',
    description: 'High-speed interceptor mission: rapid climb, supersonic transit, on-station combat loiter, dogfight engagement, and RTB.',
    legs: [
      { id: 'leg-1', name: 'Scramble Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 5 },
      { id: 'leg-2', name: 'High-Speed Intercept Climb', type: 'climb', targetAltitudeFt: 35000, climbSpeedKmh: 650 },
      { id: 'leg-3', name: 'Transit to Combat Zone', type: 'cruise', distanceKm: 380, altitudeFt: 35000, speedKmh: 920 },
      { id: 'leg-4', name: 'Combat Air Patrol Loiter', type: 'loiter', durationMin: 35, altitudeFt: 28000 },
      { id: 'leg-5', name: 'Air-to-Air Engagement', type: 'combat_air_to_air', durationMin: 5, altitudeFt: 22000, loadFactorG: 6.5, reheatEngaged: true },
      { id: 'leg-6', name: 'High-Altitude Return', type: 'cruise', distanceKm: 380, altitudeFt: 38000, speedKmh: 880 },
      { id: 'leg-7', name: 'Tactical Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1800, headwindKts: 5 },
    ],
  },
  deep_strike: {
    id: 'deep_strike',
    name: 'Deep Strike & Air Refuelling',
    description: 'Long-range precision strike: high-altitude ingress, low-level penetration, precision weapons drop, aerial tanker refuelling.',
    legs: [
      { id: 'leg-1', name: 'Heavy Gross Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 0 },
      { id: 'leg-2', name: 'Climb to En-Route Flight Level', type: 'climb', targetAltitudeFt: 28000, climbSpeedKmh: 550 },
      { id: 'leg-3', name: 'High-Altitude Cruise Ingress', type: 'cruise', distanceKm: 550, altitudeFt: 28000, speedKmh: 750 },
      { id: 'leg-4', name: 'Low-Level Strike Dash', type: 'combat_air_to_ground', ingressDistanceKm: 75, altitudeFt: 500, speedKmh: 850 },
      { id: 'leg-5', name: 'Precision Weapons Release', type: 'payload_release', dropType: 'munitions', dropMassKg: 2000, altitudeFt: 15000, indicatedAirspeedKts: 420 },
      { id: 'leg-6', name: 'Climb to Tanker Rendezvous', type: 'climb', targetAltitudeFt: 24000, climbSpeedKmh: 500 },
      { id: 'leg-7', name: 'Air-to-Air Refuelling (AAR)', type: 'air_refuel', fuelReceivedKg: 1800, altitudeFt: 24000 },
      { id: 'leg-8', name: 'Return Cruise to Base', type: 'cruise', distanceKm: 550, altitudeFt: 32000, speedKmh: 760 },
      { id: 'leg-9', name: 'Base Recovery Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 2000, headwindKts: 0 },
    ],
  },
  maritime_patrol: {
    id: 'maritime_patrol',
    name: 'Maritime Search & Surveillance',
    description: 'Long-endurance maritime surveillance: transit, extended search loiter over sea lanes, life-raft drop, and return.',
    legs: [
      { id: 'leg-1', name: 'Coastal Takeoff', type: 'takeoff', runwayElevationFt: 0, headwindKts: 15 },
      { id: 'leg-2', name: 'Climb to Transit Level', type: 'climb', targetAltitudeFt: 25000, climbSpeedKmh: 460 },
      { id: 'leg-3', name: 'Ocean Transit Cruise', type: 'cruise', distanceKm: 650, altitudeFt: 25000, speedKmh: 680 },
      { id: 'leg-4', name: 'Low-Altitude Search Loiter', type: 'loiter', durationMin: 75, altitudeFt: 5000 },
      { id: 'leg-5', name: 'SAR Pod Air Drop', type: 'payload_release', dropType: 'cargo_pallet', dropMassKg: 400, altitudeFt: 1000, indicatedAirspeedKts: 140 },
      { id: 'leg-6', name: 'Climb to Return Transit', type: 'climb', targetAltitudeFt: 29000, climbSpeedKmh: 480 },
      { id: 'leg-7', name: 'Homeward Transit Cruise', type: 'cruise', distanceKm: 650, altitudeFt: 29000, speedKmh: 700 },
      { id: 'leg-8', name: 'Coastal Runway Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1600, headwindKts: 15 },
    ],
  },
};

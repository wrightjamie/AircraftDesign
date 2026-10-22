/**
 * International Standard Atmosphere (ISA) Model
 * Valid from Sea Level up to the Tropopause (11,000 m / ~36,089 ft) and Stratosphere.
 */

export interface AtmosphericProperties {
  altitudeM: number;       // Altitude in meters
  altitudeFt: number;      // Altitude in feet
  temperatureK: number;    // Temperature in Kelvin
  temperatureC: number;    // Temperature in Celsius
  pressurePa: number;      // Ambient pressure in Pascals
  densityKgM3: number;     // Air density in kg/m^3
  densityRatio: number;    // sigma = rho / rho0
  speedOfSoundMs: number;  // Speed of sound in m/s
}

// Sea level constants
export const SEA_LEVEL_PRESSURE = 101325;     // Pa
export const SEA_LEVEL_DENSITY = 1.225;        // kg/m^3
export const SEA_LEVEL_TEMP = 288.15;          // K (15°C)
export const GRAVITY = 9.80665;                // m/s^2
export const GAS_CONSTANT = 287.05287;         // J/(kg·K)
export const TEMP_LAPSE_RATE = 0.0065;         // K/m in troposphere (up to 11,000m)
export const TROPOPAUSE_ALT = 11000;           // m
export const TROPOPAUSE_TEMP = 216.65;         // K (-56.5°C)

/**
 * Calculates atmospheric properties for a given altitude in meters
 */
export function getAtmosphereAtAltitudeMeters(altM: number): AtmosphericProperties {
  const altitudeM = Math.max(0, altM);
  const altitudeFt = altitudeM * 3.28084;
  
  let temperatureK: number;
  let pressurePa: number;

  if (altitudeM <= TROPOPAUSE_ALT) {
    // Troposphere
    temperatureK = SEA_LEVEL_TEMP - TEMP_LAPSE_RATE * altitudeM;
    pressurePa = SEA_LEVEL_PRESSURE * Math.pow(temperatureK / SEA_LEVEL_TEMP, GRAVITY / (TEMP_LAPSE_RATE * GAS_CONSTANT));
  } else {
    // Stratosphere (isothermal layer up to 20,000m)
    const tropopausePressure = SEA_LEVEL_PRESSURE * Math.pow(TROPOPAUSE_TEMP / SEA_LEVEL_TEMP, GRAVITY / (TEMP_LAPSE_RATE * GAS_CONSTANT));
    temperatureK = TROPOPAUSE_TEMP;
    pressurePa = tropopausePressure * Math.exp(-GRAVITY * (altitudeM - TROPOPAUSE_ALT) / (GAS_CONSTANT * TROPOPAUSE_TEMP));
  }

  const densityKgM3 = pressurePa / (GAS_CONSTANT * temperatureK);
  const densityRatio = densityKgM3 / SEA_LEVEL_DENSITY;
  const speedOfSoundMs = Math.sqrt(1.4 * GAS_CONSTANT * temperatureK);

  return {
    altitudeM,
    altitudeFt,
    temperatureK,
    temperatureC: temperatureK - 273.15,
    pressurePa,
    densityKgM3,
    densityRatio,
    speedOfSoundMs,
  };
}

/**
 * Convenience helper to compute ISA properties using feet
 */
export function getAtmosphereAtAltitudeFeet(altFt: number): AtmosphericProperties {
  return getAtmosphereAtAltitudeMeters(altFt / 3.28084);
}

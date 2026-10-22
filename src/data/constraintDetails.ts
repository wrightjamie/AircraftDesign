export interface FormulaVariable {
  symbol: string;
  name: string;
  units: string;
  description: string;
}

export interface ConstraintDetail {
  id: 'stall' | 'takeoff' | 'speed' | 'climb' | 'ceiling' | 'turn' | 'cruise';
  title: string;
  axisType: 'vertical' | 'horizontal' | 'curve' | 'line';
  colorVar: string;
  themeColorHex: string;
  shortRule: string;
  infeasibleSide: string;
  violationConsequence: string;
  summary: string;
  aerodynamicMechanics: string[];
  operationalContext: string;
  formulaLHS: string;
  equationStructure: 'stall' | 'takeoff' | 'speed' | 'climb' | 'ceiling' | 'turn' | 'cruise';
  variables: FormulaVariable[];
}

export const CONSTRAINT_DETAILS: Record<string, ConstraintDetail> = {
  stall: {
    id: 'stall',
    title: 'Stall Speed & Landing Field Length',
    axisType: 'vertical',
    colorVar: 'var(--color-stall)',
    themeColorHex: '#ef4444',
    shortRule: 'Restricts maximum wing loading (W/S) to guarantee low landing approach speed.',
    infeasibleSide: 'Right of the vertical boundary',
    violationConsequence: 'Aircraft will stall during approach or overshoot the designated runway length.',
    summary: 'Landing field length restricts approach speed (VA ≈ 1.23 to 1.30 Vstall). This imposes a strict ceiling on wing loading, because an aircraft with wings that are too small relative to its mass cannot produce sufficient lift at safe touchdown velocities.',
    aerodynamicMechanics: [
      'Lift equation: L = 0.5 · ρ · V² · S · CL. At touchdown, airspeed V is lowest, so lift must equal total aircraft weight W.',
      'Rearranging for Wing Loading: (W/S) = 0.5 · ρ · V_stall² · CL_max.',
      'Notice that Thrust (T) is not present in this equation. It forms a vertical wall on the constraint chart because no amount of engine thrust can compensate for an aerodynamic wing stall in unaccelerated steady landing flight.',
      'To push this boundary to the right, designers must either increase wing surface area (S) or deploy high-lift flaps/slats to boost CL_max.'
    ],
    operationalContext: 'Short-field operations impose stringent approach speed caps. Keeping wing loading within this limit ensures safe flare, touchdown, and braking distance within the available runway.',
    formulaLHS: '(W/S)max',
    equationStructure: 'stall',
    variables: [
      { symbol: 'W/S', name: 'Wing Loading', units: 'N/m²', description: 'Weight of the aircraft divided by total wing planform area' },
      { symbol: 'ρ₀', name: 'Sea-Level Air Density', units: 'kg/m³', description: 'Standard atmospheric density at sea level (1.225 kg/m³)' },
      { symbol: 'V_stall', name: 'Stall Airspeed', units: 'm/s', description: 'Minimum airspeed at which aerodynamic lift balances weight' },
      { symbol: 'C_L,max', name: 'Maximum Lift Coefficient', units: 'dimensionless', description: 'Peak lift capability of the aerofoil with flaps fully deployed' },
    ]
  },

  takeoff: {
    id: 'takeoff',
    title: 'Takeoff Ground Roll',
    axisType: 'line',
    colorVar: 'var(--color-takeoff)',
    themeColorHex: '#f59e0b',
    shortRule: 'Sets minimum T/W required to reach lift-off velocity within the available runway length.',
    infeasibleSide: 'Below the sloped line',
    violationConsequence: 'Aircraft cannot accelerate to lift-off speed within the available ground roll distance.',
    summary: 'Accelerating an aircraft from a standstill involves overcoming both aerodynamic drag and rolling ground resistance. As wing loading increases, lift-off speed rises, demanding proportionally more thrust.',
    aerodynamicMechanics: [
      'Newton’s second law along the runway: F_net = T - D - μ·(W - L). Net acceleration a = (g/W) · [T - D - μ·(W - L)].',
      'Integrating acceleration across distance: Ground roll S_TO is inversely proportional to acceleration.',
      'For conceptual sizing, the Raymer takeoff ground roll formulation simplifies to: (T/W)_TO = [1.21 / (g · ρ₀ · CL_TO · S_TO)] · (W/S) + μ.',
      'The y-intercept of the line is precisely equal to the rolling friction coefficient μ. On unpaved grass or rough strips, rolling resistance raises the baseline thrust required.'
    ],
    operationalContext: 'Airfields with short runways or unpaved surfaces demand rapid ground acceleration to unstick before the strip threshold.',
    formulaLHS: '(T/W)TO',
    equationStructure: 'takeoff',
    variables: [
      { symbol: 'T/W', name: 'Thrust-to-Weight Ratio', units: 'dimensionless', description: 'Total engine thrust divided by gross aircraft weight' },
      { symbol: 'S_TO', name: 'Takeoff Ground Roll', units: 'm', description: 'Required runway distance to reach lift-off speed' },
      { symbol: 'μ', name: 'Rolling Friction Coefficient', units: 'dimensionless', description: 'Ground resistance factor (0.02 tarmac, 0.06 rough unpaved field)' },
      { symbol: 'C_L,TO', name: 'Takeoff Lift Coefficient', units: 'dimensionless', description: 'Lift coefficient during rotation (typically 0.8 · CL_max)' },
      { symbol: 'g', name: 'Gravitational Acceleration', units: 'm/s²', description: 'Standard gravity (9.81 m/s²)' },
    ]
  },

  speed: {
    id: 'speed',
    title: 'Maximum Level Speed',
    axisType: 'curve',
    colorVar: 'var(--color-speed)',
    themeColorHex: '#8b5cf6',
    shortRule: 'Defines the engine thrust required to overcome total drag at maximum level speed.',
    infeasibleSide: 'Below the U-shaped curve',
    violationConsequence: 'Available thrust is insufficient to sustain the desired maximum level airspeed.',
    summary: 'In steady, level unaccelerated flight at maximum speed, engine thrust must exactly balance total aerodynamic drag (T = D). Total drag consists of parasitic zero-lift drag and lift-induced drag.',
    aerodynamicMechanics: [
      'Total drag equation: D = q · S · CD0 + (K · W²) / (q · S), where dynamic pressure q = 0.5 · ρ · V².',
      'Dividing by Weight yields: (T/W) = q · CD0 / (W/S) + (K / q) · (W/S).',
      'At low wing loading (large wing), parasitic surface friction dominates, driving required T/W up steeply.',
      'At high wing loading (small wing), high lift-induced drag at high angles of attack drives T/W up linearly.',
      'The result is a classic U-shaped curve with an optimal wing loading for top speed.'
    ],
    operationalContext: 'Dash speed is vital for rapid transit, intercept capability, and minimizing exposure time across transit corridors.',
    formulaLHS: '(T/W)Vmax',
    equationStructure: 'speed',
    variables: [
      { symbol: 'q', name: 'Dynamic Pressure', units: 'N/m²', description: '0.5 · ρ · V², kinetic energy per unit volume of moving air' },
      { symbol: 'C_D0', name: 'Zero-Lift Drag Coefficient', units: 'dimensionless', description: 'Parasitic friction and pressure drag of the airframe' },
      { symbol: 'K', name: 'Induced Drag Factor', units: 'dimensionless', description: '1 / (π · AR · e), penalty for generating lift' },
      { symbol: 'ρ/ρ₀', name: 'Thrust Lapse Ratio', units: 'dimensionless', description: 'Available engine thrust decrease with altitude density' },
    ]
  },

  climb: {
    id: 'climb',
    title: 'Rate of Climb',
    axisType: 'curve',
    colorVar: 'var(--color-climb)',
    themeColorHex: '#3b82f6',
    shortRule: 'Ensures excess engine power exists to climb at the required vertical velocity.',
    infeasibleSide: 'Below the upward-curving boundary',
    violationConsequence: 'Insufficient vertical climb rate increases time-to-climb and fuel burn.',
    summary: 'Rate of climb is governed by specific excess power (Ps = V · [T - D] / W). To climb vertically at velocity Vv, the engine must supply both the thrust to overcome drag and the vertical component of weight.',
    aerodynamicMechanics: [
      'Power balance: Rate of Climb (ROC) = V · sin(γ) = V · (T - D) / W.',
      'Rearranging: (T/W) = (ROC / V) + (D / W) = (ROC / V) + q · CD0 / (W/S) + (K / q) · (W/S).',
      'The first term (ROC / V) acts as a baseline vertical offset, representing the potential energy gained per second.',
      'The remaining terms account for aerodynamic drag at the optimal climb speed Vy.'
    ],
    operationalContext: 'Rapid climb capability allows aircraft to ascend expeditiously above lower weather turbulence, terrain obstacles, and ground hazards.',
    formulaLHS: '(T/W)ROC',
    equationStructure: 'climb',
    variables: [
      { symbol: 'ROC', name: 'Rate of Climb (Vv)', units: 'm/s or ft/min', description: 'Vertical velocity of the aircraft' },
      { symbol: 'V_y', name: 'Best Climb Airspeed', units: 'm/s', description: 'Airspeed yielding maximum specific excess power' },
      { symbol: 'C_D0', name: 'Zero-Lift Drag', units: 'dimensionless', description: 'Airframe parasite drag' },
      { symbol: 'K', name: 'Induced Drag Factor', units: 'dimensionless', description: '1 / (π · AR · e)' },
    ]
  },

  ceiling: {
    id: 'ceiling',
    title: 'Service Ceiling',
    axisType: 'curve',
    colorVar: 'var(--color-ceiling)',
    themeColorHex: '#06b6d4',
    shortRule: 'Guarantees residual climb capability at the specified operational altitude.',
    infeasibleSide: 'Below the baseline curve',
    violationConsequence: 'Aircraft cannot reach or sustain level flight at the specified altitude.',
    summary: 'At high altitudes, air density drops dramatically. Non-reheated jet engine thrust and propeller power decrease with this density drop, constraining the maximum usable flight ceiling.',
    aerodynamicMechanics: [
      'Service ceiling is defined aeronautically as the maximum altitude where climb rate drops to 100 ft/min (0.508 m/s).',
      'At ceiling altitude, the aircraft must operate at minimum drag velocity: (L/D)_max = 1 / [2 · √(CD0 · K)].',
      'Because engine thrust available lapses with altitude ratio (σ ≈ ρ/ρ₀), the required sea-level design T/W is scaled up by (1 / σ^0.85).',
      'This constraint ensures that when the aircraft reaches cruise altitude, it retains sufficient operational maneuvering margin.'
    ],
    operationalContext: 'High operational ceilings provide fuel efficiency, clear commercial air traffic layers, and provide terrain separation.',
    formulaLHS: '(T/W)Ceiling',
    equationStructure: 'ceiling',
    variables: [
      { symbol: 'h_ceil', name: 'Service Ceiling Altitude', units: 'ft', description: 'Specified operational altitude' },
      { symbol: 'σ_ceil', name: 'Atmospheric Density Ratio', units: 'dimensionless', description: 'Air density ratio at ceiling' },
      { symbol: 'ROC_residual', name: 'Residual Climb Rate', units: 'm/s', description: '100 ft/min (0.508 m/s)' },
      { symbol: '(L/D)max', name: 'Maximum Lift-to-Drag Ratio', units: 'dimensionless', description: 'Peak aerodynamic efficiency' },
    ]
  },

  turn: {
    id: 'turn',
    title: 'Sustained Maneuver / Turn',
    axisType: 'curve',
    colorVar: 'var(--color-turn)',
    themeColorHex: '#ec4899',
    shortRule: 'Provides the power necessary to maintain altitude during sustained banked turns.',
    infeasibleSide: 'Below the steep parabola',
    violationConsequence: 'Aircraft bleeds kinetic energy, loses speed, or loses altitude during sustained turns.',
    summary: 'In an unaccelerated banked turn at load factor n, the lift generated by the wings must increase to L = n · W to balance both gravity and centrifugal force. This produces an n² multiplier on lift-induced drag.',
    aerodynamicMechanics: [
      'Load factor in a banked turn: n = 1 / cos(θ). A 3g turn requires a bank angle of ~70.5°.',
      'Induced drag scales with the square of lift: D_i = K · (n · W)² / (q · S) = n² · (K / q) · (W/S) · W.',
      'Total thrust required: (T/W) = q · CD0 / (W/S) + (n² · K / q) · (W/S).',
      'Because of the n² term, high wing loading designs require massive thrust to sustain high-g turns without stalling or descending.'
    ],
    operationalContext: 'Maneuver load factor determines an aircraft’s sustained turn radius and agility without decaying altitude or airspeed.',
    formulaLHS: '(T/W)Turn',
    equationStructure: 'turn',
    variables: [
      { symbol: 'n', name: 'Load Factor', units: 'g', description: 'Ratio of total lift to aircraft weight' },
      { symbol: 'q', name: 'Dynamic Pressure', units: 'N/m²', description: '0.5 · ρ · V² during maneuver' },
      { symbol: 'K', name: 'Induced Drag Factor', units: 'dimensionless', description: '1 / (π · AR · e)' },
      { symbol: 'C_D0', name: 'Zero-Lift Drag', units: 'dimensionless', description: 'Parasitic airframe drag' },
    ]
  },

  cruise: {
    id: 'cruise',
    title: 'Cruise & Endurance Floor',
    axisType: 'horizontal',
    colorVar: 'var(--color-cruise)',
    themeColorHex: '#10b981',
    shortRule: 'Establishes the aerodynamic thrust floor required for steady level cruise.',
    infeasibleSide: 'Below the baseline floor',
    violationConsequence: 'Thrust is below minimum drag requirements, preventing steady level cruise.',
    summary: 'For maximum range and endurance, an aircraft cruises at or near its maximum Lift-to-Drag ratio (L/D)max. At this point, parasite drag equals induced drag, establishing a minimum horizontal thrust floor.',
    aerodynamicMechanics: [
      'In steady cruise: Thrust = Drag and Lift = Weight. Therefore (T/W) = Drag / Lift = 1 / (L/D).',
      'The minimum thrust required occurs at (L/D)_max: (T/W)_min = 2 · √(CD0 · K).',
      'Notice that this theoretical minimum is independent of wing loading; it forms a horizontal floor on the chart below which steady level flight is aerodynamically impossible.',
      'Designs operating close to this line enjoy the highest fuel efficiency and greatest operational range.'
    ],
    operationalContext: 'Operating near minimum thrust allows optimal fuel economy and extended range across long transit legs.',
    formulaLHS: '(T/W)Cruise',
    equationStructure: 'cruise',
    variables: [
      { symbol: '(L/D)max', name: 'Maximum Lift-to-Drag Ratio', units: 'dimensionless', description: 'Peak aerodynamic efficiency' },
      { symbol: 'C_D0', name: 'Zero-Lift Drag Coefficient', units: 'dimensionless', description: 'Parasitic friction and form drag' },
      { symbol: 'K', name: 'Induced Drag Factor', units: 'dimensionless', description: '1 / (π · AR · e)' },
    ]
  }
};

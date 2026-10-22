import { useState } from 'react';
import type { OperationalConstraints } from '../../physics/constraints.ts';
import { ConstraintDiagram } from '../chart/ConstraintDiagram.tsx';
import type { ConstraintDetail } from '../../data/constraintDetails.ts';
import type { BenchmarkAircraft } from '../../data/benchmarks.ts';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Compass,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface Step2LimitationsWizardProps {
  constraints: OperationalConstraints;
  onConstraintsChange: (updated: OperationalConstraints) => void;
  onProceedToStep3: () => void;
  onBackToStep1: () => void;
  onInspectConstraint: (detail: ConstraintDetail) => void;
  onSelectAircraft: (aircraft: BenchmarkAircraft) => void;
}

interface LimitationStep {
  id: string;
  number: number;
  name: string;
  equation: string;
  tagline: string;
  whyItMatters: string;
  consequenceOfBreach: string;
}

const LIMITATION_STEPS: LimitationStep[] = [
  {
    id: 'stall',
    number: 1,
    name: 'Stall Speed Limit (Landing Safety)',
    equation: '(W/S) ≤ 0.5 · ρ₀ · V_stall² · C_L,max',
    tagline: 'Defines the vertical right-hand boundary of the flight envelope.',
    whyItMatters:
      'When landing on an airfield, the aircraft must fly slowly enough to touch down safely and brake without overrunning the runway. Higher maximum lift (C_L,max from flaps) allows a smaller, faster wing to land at a safe speed.',
    consequenceOfBreach:
      'Breaching this boundary means landing approach speed is dangerously high, leading to catastrophic low-altitude stalls or runway overruns.',
  },
  {
    id: 'takeoff',
    number: 2,
    name: 'Takeoff Field Length (Unstick Roll)',
    equation: '(T/W) ≥ [ 1.21 / (g · ρ₀ · C_L,TO · S_TO) ] · (W/S) + μ',
    tagline: 'Higher wing loadings demand higher engine thrust to lift off in short distances.',
    whyItMatters:
      'The aircraft must accelerate from standstill to rotation speed within the available runway. Short, austere unpaved strips require high acceleration or lower wing loading.',
    consequenceOfBreach:
      'Insufficient thrust-to-weight prevents the aircraft from unsticking before reaching the end of the paved strip.',
  },
  {
    id: 'vmax',
    number: 3,
    name: 'Maximum Level Speed (Dash)',
    equation: '(T/W) ≥ q · C_D0 · (1/(W/S)) + (K / q) · (W/S)',
    tagline: 'Overcoming high parasite drag at high dynamic pressure.',
    whyItMatters:
      'Intercepting enemy targets or escaping hostile surface-to-air missiles requires high dash speed. At high speeds, parasite drag escalates with velocity squared (V²).',
    consequenceOfBreach:
      'The aircraft cannot reach its mission dash speed, leaving it vulnerable to interception.',
  },
  {
    id: 'climb',
    number: 4,
    name: 'Rate of Climb (Excess Specific Power)',
    equation: '(T/W) ≥ (ROC / V) + q · C_D0 · (1/(W/S)) + (K / q) · (W/S)',
    tagline: 'Excess engine power converted into vertical velocity.',
    whyItMatters:
      'Scramble interceptors must reach high altitudes quickly to engage incoming bombers or cruise missiles. Rate of climb is purely driven by specific excess power (Ps = V · [T - D] / W).',
    consequenceOfBreach:
      'Sluggish climb rate exposes the aircraft during departure and prevents rapid altitude acquisition.',
  },
  {
    id: 'ceiling',
    number: 5,
    name: 'Service Ceiling (Residual Climb Reserve)',
    equation: '(T/W)_ceil ≥ (1 / lapse) · [ (0.508 / V) + 2 · √(C_D0 · K) ]',
    tagline: 'Guaranteeing 100 ft/min climb capability at high altitude.',
    whyItMatters:
      'At 35,000–50,000 ft, air density drops to a fraction of sea level, severely reducing engine thrust. The service ceiling boundary guarantees the aircraft maintains altitude control and maneuverability above the weather.',
    consequenceOfBreach:
      'Aircraft cannot cruise at high operational altitudes, forcing it into congested lower airspace with higher fuel burn.',
  },
  {
    id: 'sustained_turn',
    number: 6,
    name: 'Sustained Turn Rate (Dogfight Energy)',
    equation: '(T/W) ≥ q · C_D0 · (1/(W/S)) + (K · n² / q) · (W/S)',
    tagline: 'Maintaining altitude and speed during continuous high-g turns.',
    whyItMatters:
      'In a dogfight, turning at high g-loads creates huge induced drag (proportional to n²). If engine thrust is insufficient, the aircraft bleeds airspeed and energy rapidly, losing the tactical advantage.',
    consequenceOfBreach:
      'Aircraft cannot sustain turns and falls into an energy deficit against enemy fighters.',
  },
  {
    id: 'instantaneous_turn',
    number: 7,
    name: 'Instantaneous Turn (Snap Pitch-Up)',
    equation: '(W/S) ≤ (q · C_L,max) / n_inst',
    tagline: 'Aerodynamic lift boundary for maximum instantaneous nose-pointing.',
    whyItMatters:
      'Unlike sustained turns, an instantaneous turn pulls maximum lift for a quick missile shot while temporarily bleeding speed. This sets an absolute upper limit on Wing Loading (W/S). Large wings are essential for high snap turn rates.',
    consequenceOfBreach:
      'Pulling hard on the stick results in an accelerated stall rather than a tight turn.',
  },
  {
    id: 'cruise',
    number: 8,
    name: 'Cruise Transit Floor (Aerodynamic Floor)',
    equation: '(T/W)_cruise ≥ 1 / (L/D)_max',
    tagline: 'Minimum baseline thrust for steady-state level flight.',
    whyItMatters:
      'The aircraft must cruise at its optimum lift-to-drag ratio (L/D_max) for long transit endurance. This establishes the absolute minimum thrust floor regardless of wing loading.',
    consequenceOfBreach:
      'Aircraft cannot maintain level flight even at optimum cruise speed.',
  },
];

export function Step2LimitationsWizard({
  constraints,
  onConstraintsChange,
  onProceedToStep3,
  onBackToStep1,
  onInspectConstraint,
  onSelectAircraft,
}: Step2LimitationsWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const step = LIMITATION_STEPS[currentStepIndex];

  const updateConstraint = <K extends keyof OperationalConstraints>(
    field: K,
    value: OperationalConstraints[K]
  ) => {
    onConstraintsChange({
      ...constraints,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Step Header */}
      <div className="bg-[var(--hud-panel-header)] border border-[var(--hud-border)] rounded-lg p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
            <Compass className="w-4 h-4" />
            STEP 2 OF 4 // FLIGHT ENVELOPE LIMITATIONS WIZARD
          </div>
          <h2 className="text-lg font-black text-white mt-0.5 tracking-tight">
            Establish Aerodynamic Constraints on the Chart
          </h2>
          <p className="text-slate-300 text-xs mt-0.5 max-w-2xl leading-relaxed">
            Step through each of the 8 flight limitations. As you adjust each parameter, watch its corresponding constraint line
            shift on the chart to carve out the viable white design space.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToStep1}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Mission</span>
          </button>
          <button
            onClick={onProceedToStep3}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span>Size Aircraft</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Side-by-Side Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 Cols): Master Constraint Diagram */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-3 shadow-lg">
            <ConstraintDiagram
              onInspectConstraint={onInspectConstraint}
              onSelectAircraft={onSelectAircraft}
              activeConstraints={constraints}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): The 8-Limitation Interactive Wizard */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-4 shadow-lg space-y-4">
            {/* Step Navigation Pill Indicator */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--hud-border)]">
              <span className="text-[10px] uppercase font-bold text-cyan-400">
                Limitation {step.number} of {LIMITATION_STEPS.length}
              </span>
              <div className="flex items-center gap-1">
                {LIMITATION_STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`w-5 h-5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      currentStepIndex === idx
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.number}
                  </button>
                ))}
              </div>
            </div>

            {/* Step Content & Formula */}
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">
                {step.name}
              </h3>
              <p className="text-[11px] text-cyan-300 font-mono mt-0.5">{step.tagline}</p>
              <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-[11px] text-slate-300 font-mono mt-2">
                {step.equation}
              </div>
            </div>

            {/* Why It Matters Pedagogical Explanation */}
            <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed bg-[var(--hud-bg)] p-3 rounded border border-[var(--hud-border)]">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                Aeronautical Principle:
              </span>
              <p>{step.whyItMatters}</p>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-red-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>{step.consequenceOfBreach}</span>
              </div>
            </div>

            {/* Interactive Sliders for this specific limitation */}
            <div className="bg-slate-950/90 p-3 rounded border border-slate-800 space-y-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Interactive Constraint Tuning
              </div>

              {step.id === 'stall' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Max Approach Stall Speed: {Math.round(constraints.maxStallSpeedMs * 1.94384)} kts ({Math.round(constraints.maxStallSpeedMs)} m/s)
                    </label>
                    <input
                      type="range"
                      min="35"
                      max="65"
                      step="1"
                      value={constraints.maxStallSpeedMs}
                      onChange={(e) => updateConstraint('maxStallSpeedMs', Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Flap Max Lift Coefficient (CL,max): {constraints.clMax.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="1.4"
                      max="2.8"
                      step="0.05"
                      value={constraints.clMax}
                      onChange={(e) => updateConstraint('clMax', Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {step.id === 'takeoff' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Target Takeoff Field Length: {constraints.takeoffFieldLengthM} m
                    </label>
                    <input
                      type="range"
                      min="400"
                      max="2200"
                      step="50"
                      value={constraints.takeoffFieldLengthM}
                      onChange={(e) => updateConstraint('takeoffFieldLengthM', Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Runway Surface Friction (μ): {constraints.groundFrictionMu}
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => updateConstraint('groundFrictionMu', 0.02)}
                        className={`p-1.5 rounded border text-[10px] font-bold ${
                          constraints.groundFrictionMu === 0.02
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        Paved Tarmac (μ = 0.02)
                      </button>
                      <button
                        onClick={() => updateConstraint('groundFrictionMu', 0.06)}
                        className={`p-1.5 rounded border text-[10px] font-bold ${
                          constraints.groundFrictionMu === 0.06
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        Unpaved Rough Grass (μ = 0.06)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step.id === 'vmax' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Max Level Dash Speed: {constraints.maxSpeedKts} kts (~Mach {(constraints.maxSpeedKts / 661).toFixed(2)})
                    </label>
                    <input
                      type="range"
                      min="220"
                      max="850"
                      step="10"
                      value={constraints.maxSpeedKts}
                      onChange={(e) => updateConstraint('maxSpeedKts', Number(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Speed Test Altitude: {constraints.maxSpeedAltitudeFt.toLocaleString()} ft
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="40000"
                      step="2500"
                      value={constraints.maxSpeedAltitudeFt}
                      onChange={(e) => updateConstraint('maxSpeedAltitudeFt', Number(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                  </div>
                </div>
              )}

              {step.id === 'climb' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Rate of Climb: {constraints.climbRateFpm.toLocaleString()} ft/min ({(constraints.climbRateFpm * 0.00508).toFixed(1)} m/s)
                    </label>
                    <input
                      type="range"
                      min="1500"
                      max="20000"
                      step="500"
                      value={constraints.climbRateFpm}
                      onChange={(e) => updateConstraint('climbRateFpm', Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {step.id === 'ceiling' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Service Ceiling: {constraints.serviceCeilingFt.toLocaleString()} ft
                    </label>
                    <input
                      type="range"
                      min="20000"
                      max="55000"
                      step="1000"
                      value={constraints.serviceCeilingFt}
                      onChange={(e) => updateConstraint('serviceCeilingFt', Number(e.target.value))}
                      className="w-full accent-purple-400"
                    />
                  </div>
                </div>
              )}

              {step.id === 'sustained_turn' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Sustained Load Factor (n): {constraints.turnLoadFactorG.toFixed(1)}g
                    </label>
                    <input
                      type="range"
                      min="2.0"
                      max="7.5"
                      step="0.5"
                      value={constraints.turnLoadFactorG}
                      onChange={(e) => updateConstraint('turnLoadFactorG', Number(e.target.value))}
                      className="w-full accent-red-400"
                    />
                  </div>
                </div>
              )}

              {step.id === 'instantaneous_turn' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Instantaneous Snap Turn Load Factor: {(constraints.instantaneousTurnG || 5.5).toFixed(1)}g
                    </label>
                    <input
                      type="range"
                      min="3.5"
                      max="9.0"
                      step="0.5"
                      value={constraints.instantaneousTurnG || 5.5}
                      onChange={(e) => updateConstraint('instantaneousTurnG', Number(e.target.value))}
                      className="w-full accent-rose-400"
                    />
                  </div>
                </div>
              )}

              {step.id === 'cruise' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-300 uppercase block">
                      Zero-Lift Parasite Drag CD0: {constraints.cd0.toFixed(4)}
                    </label>
                    <input
                      type="range"
                      min="0.015"
                      max="0.040"
                      step="0.001"
                      value={constraints.cd0}
                      onChange={(e) => updateConstraint('cd0', Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--hud-border)]">
              <button
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Limitation</span>
              </button>

              {currentStepIndex < LIMITATION_STEPS.length - 1 ? (
                <button
                  onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Next Limitation</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onProceedToStep3}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>Proceed to Step 3: Size Aircraft</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

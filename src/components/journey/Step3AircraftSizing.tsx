import { useState } from 'react';
import type { CadetAircraftDesign, AircraftMassBudget, EngineClass, HighLiftDeviceTier, StealthLevel } from '../../physics/aircraftDesign.ts';
import type { OperationalConstraints } from '../../physics/constraints.ts';
import type { FeasibilityAudit } from '../../physics/feasibility.ts';
import type { ProcurementEvaluation } from '../../physics/costRisk.ts';
import type { ConstraintDetail } from '../../data/constraintDetails.ts';
import type { BenchmarkAircraft } from '../../data/benchmarks.ts';
import { ConstraintDiagram } from '../chart/ConstraintDiagram.tsx';
import {
  Compass,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Zap,
  Shield,
  Sliders,
  AlertTriangle,
  Info
} from 'lucide-react';

interface Step3AircraftSizingProps {
  design: CadetAircraftDesign;
  budget: AircraftMassBudget;
  constraints: OperationalConstraints;
  audit: FeasibilityAudit;
  procurement: ProcurementEvaluation;
  onDesignChange: (updated: CadetAircraftDesign) => void;
  onProceedToStep4: () => void;
  onBackToStep2: () => void;
  onInspectConstraint: (detail: ConstraintDetail) => void;
  onSelectAircraft: (aircraft: BenchmarkAircraft) => void;
}

export function Step3AircraftSizing({
  design,
  budget,
  constraints,
  audit,
  procurement,
  onDesignChange,
  onProceedToStep4,
  onBackToStep2,
  onInspectConstraint,
  onSelectAircraft,
}: Step3AircraftSizingProps) {
  const [activeStage, setActiveStage] = useState<'wing' | 'airframe' | 'engine'>('wing');

  const updateField = <K extends keyof CadetAircraftDesign>(
    field: K,
    value: CadetAircraftDesign[K]
  ) => {
    onDesignChange({
      ...design,
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
            STEP 3 OF 4 // AIRCRAFT PARAMETRIC SIZING & OPTIMIZATION
          </div>
          <h2 className="text-lg font-black text-white mt-0.5 tracking-tight">
            Size Your Aircraft to Land in the Viable Envelope
          </h2>
          <p className="text-slate-300 text-xs mt-0.5 max-w-2xl leading-relaxed">
            Adjust your wing geometry, structural materials, and engine thrust. Watch your aircraft crosshair marker
            (W/S, T/W) navigate directly into the white viable flight envelope.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToStep2}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Flight Limits</span>
          </button>
          <button
            onClick={onProceedToStep4}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span>Fly Sortie & Debrief</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Side-by-Side Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 Cols): Master Constraint Diagram with Cadet Crosshair */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-3 shadow-lg">
            <ConstraintDiagram
              onInspectConstraint={onInspectConstraint}
              onSelectAircraft={onSelectAircraft}
              designPoint={{
                ws: budget.wingLoadingNm2,
                tw: budget.thrustToWeight,
                callsign: design.callsign,
              }}
              audit={audit}
              activeConstraints={constraints}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): The 3 Sizing Stages with Benchmark Hint Bars */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-4 shadow-lg space-y-4">
            {/* Stage Selector Tabs */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-1 text-xs">
              <button
                onClick={() => setActiveStage('wing')}
                className={`flex-1 py-1.5 rounded font-bold transition-all cursor-pointer ${
                  activeStage === 'wing'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Wing Planform
              </button>
              <button
                onClick={() => setActiveStage('airframe')}
                className={`flex-1 py-1.5 rounded font-bold transition-all cursor-pointer ${
                  activeStage === 'airframe'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Airframe & LO
              </button>
              <button
                onClick={() => setActiveStage('engine')}
                className={`flex-1 py-1.5 rounded font-bold transition-all cursor-pointer ${
                  activeStage === 'engine'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Propulsion
              </button>
            </div>

            {/* STAGE 1: WING DESIGN */}
            {activeStage === 'wing' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Wing Planform & High-Lift Geometry
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Wing area controls Wing Loading (W/S). Larger wings move the crosshair left toward docile stall speeds.
                  </p>
                </div>

                {/* Wing Area Slider */}
                <div className="space-y-1.5 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 uppercase font-bold">Wing Area (S):</span>
                    <span className="text-cyan-400 font-bold text-sm">{design.wingAreaM2.toFixed(1)} m²</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="220"
                    step="1"
                    value={design.wingAreaM2}
                    onChange={(e) => updateField('wingAreaM2', Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />

                  {/* Benchmark Wing Area Spectrum */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      RAF Aircraft Wing Area Reference:
                    </span>
                    <div className="relative w-full h-4 bg-slate-900 rounded border border-slate-700 flex items-center text-[9px] px-1 text-slate-400 overflow-hidden">
                      <span className="absolute left-[3%]">Tutor 12m²</span>
                      <span className="absolute left-[8%]">Hawk 17m²</span>
                      <span className="absolute left-[24%]">Typhoon 51m²</span>
                      <span className="absolute left-[70%]">Hercules 162m²</span>
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-cyan-400 shadow-md"
                        style={{ left: `${Math.min(98, Math.max(2, (design.wingAreaM2 / 220) * 100))}%` }}
                        title={`Your Aircraft: ${design.wingAreaM2} m²`}
                      />
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Slider */}
                <div className="space-y-1.5 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 uppercase font-bold">Aspect Ratio (AR = b²/S):</span>
                    <span className="text-cyan-400 font-bold text-sm">{design.aspectRatio.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="2.5"
                    max="11.5"
                    step="0.1"
                    value={design.aspectRatio}
                    onChange={(e) => updateField('aspectRatio', Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />

                  {/* Benchmark Aspect Ratio Spectrum */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Aspect Ratio Reference Spectrum:
                    </span>
                    <div className="relative w-full h-4 bg-slate-900 rounded border border-slate-700 flex items-center text-[9px] px-1 text-slate-400 overflow-hidden">
                      <span className="absolute left-[6%]">Typhoon 3.2</span>
                      <span className="absolute left-[30%]">Hawk 5.3</span>
                      <span className="absolute left-[65%]">Atlas 7.8</span>
                      <span className="absolute left-[85%]">Poseidon 10.5</span>
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-cyan-400 shadow-md"
                        style={{ left: `${Math.min(98, Math.max(2, ((design.aspectRatio - 2.5) / 9.0) * 100))}%` }}
                        title={`Your Aspect Ratio: ${design.aspectRatio}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Sweep Angle Slider */}
                <div className="space-y-1.5 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 uppercase font-bold">Wing Sweep Angle (Λ):</span>
                    <span className="text-cyan-400 font-bold text-sm">{design.sweepDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={design.sweepDeg}
                    onChange={(e) => updateField('sweepDeg', Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="text-[10px] text-slate-400">
                    Sweep delays transonic wave drag at Mach, but reduces low-speed CL,max (cos Λ) and increases landing ground roll.
                  </div>
                </div>

                {/* High-Lift Flap & Slat Suite */}
                <div className="space-y-2 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <span className="text-slate-300 uppercase font-bold block text-xs">
                    High-Lift Flap Suite:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'plain_clean', label: 'Plain Wing (Clean)', cl: '1.45', desc: 'No mechanical flap penalty' },
                      { id: 'single_slotted_flaps', label: 'Single-Slotted Flaps', cl: '1.95', desc: '+0.50 CL bonus' },
                      { id: 'fowler_slats', label: 'Fowler Flaps & Slats', cl: '2.45', desc: '+1.00 CL short-field boost' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => updateField('highLiftDevice', tier.id as HighLiftDeviceTier)}
                        className={`p-2 rounded border text-left cursor-pointer transition-all ${
                          design.highLiftDevice === tier.id
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{tier.label}</div>
                        <div className="text-[10px] text-cyan-300 mt-0.5">CLmax: {tier.cl}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-amber-300/80 flex items-start gap-1 mt-1">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Flap actuation penalty is larger on small wings (trainers) and becomes negligible on large transports.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: AIRFRAME, MATERIALS & STEALTH */}
            {activeStage === 'airframe' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Airframe Materials & Stealth Survivability
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Balance structural weight savings against manufacturing cost and Low Observable (LO) radar cross-section.
                  </p>
                </div>

                {/* Callsign Input */}
                <div className="flex items-center gap-2 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <span className="text-slate-300 uppercase font-bold text-xs">Callsign:</span>
                  <input
                    type="text"
                    value={design.callsign}
                    onChange={(e) => updateField('callsign', e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-white text-xs w-48 font-mono focus:border-cyan-400 outline-none"
                  />
                </div>

                {/* Composite Fraction Slider */}
                <div className="space-y-1.5 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 uppercase font-bold">Composite Airframe Fraction:</span>
                    <span className="text-cyan-400 font-bold text-sm">{design.compositePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={design.compositePercent}
                    onChange={(e) => updateField('compositePercent', Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />

                  {/* Benchmark Composite Adoption Spectrum */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Composite Adoption Spectrum:
                    </span>
                    <div className="relative w-full h-4 bg-slate-900 rounded border border-slate-700 flex items-center text-[9px] px-1 text-slate-400 overflow-hidden">
                      <span className="absolute left-[2%]">Aluminum 0%</span>
                      <span className="absolute left-[15%]">Tornado 15%</span>
                      <span className="absolute left-[50%]">Airliner 50%</span>
                      <span className="absolute left-[70%]">Typhoon 70%</span>
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-cyan-400 shadow-md"
                        style={{ left: `${Math.min(98, Math.max(2, design.compositePercent))}%` }}
                        title={`Your Composite: ${design.compositePercent}%`}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Empty weight fraction drops to {(budget.emptyWeightFraction * 100).toFixed(1)}%. Note: costs escalate exponentially above 60%.
                  </div>
                </div>

                {/* Low Observable (LO) Stealth Level */}
                <div className="space-y-2 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <span className="text-slate-300 uppercase font-bold block text-xs">
                    Low Observable (Stealth) Signature:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'conventional', label: 'Conventional', cost: '+£0M', desc: 'Standard radar cross-section' },
                      { id: 'reduced_signature', label: 'Reduced Signature', cost: '+£3.5M', desc: 'Edge alignment, S-ducts' },
                      { id: 'vlo_stealth', label: 'VLO Stealth', cost: '+£14.0M', desc: 'Internal weapons bays & RAM coating' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => updateField('stealthLevel', tier.id as StealthLevel)}
                        className={`p-2 rounded border text-left cursor-pointer transition-all ${
                          design.stealthLevel === tier.id
                            ? 'bg-amber-950 border-amber-400 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{tier.label}</div>
                        <div className="text-[10px] text-amber-300 mt-0.5">{tier.cost}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-amber-400 flex items-start gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Stealth is exponentially harder and costlier on large airframes (MTOW^1.4). Required for denied airspace.
                    </span>
                  </div>
                </div>

                {/* Fuel & Payload Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 uppercase font-bold">Internal Fuel:</span>
                      <span className="text-cyan-400 font-bold">{design.internalFuelKg.toLocaleString()} kg</span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="15000"
                      step="100"
                      value={design.internalFuelKg}
                      onChange={(e) => updateField('internalFuelKg', Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 uppercase font-bold">Mission Payload:</span>
                      <span className="text-amber-400 font-bold">{design.payloadKg.toLocaleString()} kg</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="12000"
                      step="100"
                      value={design.payloadKg}
                      onChange={(e) => updateField('payloadKg', Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 3: PROPULSION & ENGINES */}
            {activeStage === 'engine' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Propulsion Architecture & Thrust Rating
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Engine thrust sets Thrust-to-Weight (T/W). Moving your crosshair up provides the excess power needed for climb and turns.
                  </p>
                </div>

                {/* Engine Class Selector */}
                <div className="space-y-1 bg-slate-950/80 p-3 rounded border border-slate-800">
                  <span className="text-slate-300 uppercase font-bold block text-xs">
                    Engine Architecture:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'turboprop', label: 'Turboprop', desc: 'Superb unstick (+30%), lowest fuel burn' },
                      { id: 'high_bypass_turbofan', label: 'High-Bypass Turbofan', desc: 'Airliner/transport efficient cruise' },
                      { id: 'low_bypass_turbofan', label: 'Low-Bypass Turbofan', desc: 'Tactical fighter combat balance' },
                      { id: 'afterburning_turbojet', label: 'Afterburning Turbojet', desc: 'Extreme supersonic dash (Mach 2+)' },
                    ].map((eng) => (
                      <button
                        key={eng.id}
                        onClick={() => updateField('engineClass', eng.id as EngineClass)}
                        className={`p-2 rounded border text-left cursor-pointer transition-all ${
                          design.engineClass === eng.id
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{eng.label}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{eng.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Engine Count & Thrust per Engine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <span className="text-slate-300 uppercase font-bold block text-xs">Engine Count:</span>
                    <div className="flex gap-2">
                      {[1, 2, 4].map((count) => (
                        <button
                          key={count}
                          onClick={() => updateField('engineCount', count)}
                          className={`flex-1 py-1.5 rounded border text-xs font-bold cursor-pointer ${
                            design.engineCount === count
                              ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {count} {count === 1 ? 'Engine' : 'Engines'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 uppercase font-bold">Thrust per Engine:</span>
                      <span className="text-cyan-400 font-bold">{design.thrustPerEngineKn} kN</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="1"
                      value={design.thrustPerEngineKn}
                      onChange={(e) => updateField('thrustPerEngineKn', Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Engine Dry Weight & Tech Level */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 uppercase font-bold">Engine Dry Mass:</span>
                    <span className="text-white font-bold">{budget.engineWeightKg.toLocaleString()} kg (Combined)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Advanced Lightweight Turbine Metallurgy:</span>
                    <button
                      onClick={() =>
                        updateField(
                          'engineTechLevel',
                          design.engineTechLevel === 'advanced_lightweight' ? 'standard_proven' : 'advanced_lightweight'
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                        design.engineTechLevel === 'advanced_lightweight'
                          ? 'bg-amber-950 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {design.engineTechLevel === 'advanced_lightweight' ? 'HIGH-TECH (+15% RISK)' : 'STANDARD PROVEN'}
                    </button>
                  </div>
                </div>

                {/* Benchmark Thrust-to-Weight Spectrum */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 uppercase font-bold">Aircraft Thrust-to-Weight (T/W):</span>
                    <span className="text-cyan-400 font-bold text-sm">{budget.thrustToWeight.toFixed(2)}</span>
                  </div>
                  <div className="relative w-full h-4 bg-slate-900 rounded border border-slate-700 flex items-center text-[9px] px-1 text-slate-400 overflow-hidden mt-1">
                    <span className="absolute left-[15%]">Atlas 0.35</span>
                    <span className="absolute left-[38%]">Poseidon 0.50</span>
                    <span className="absolute left-[55%]">Hawk 0.65</span>
                    <span className="absolute left-[85%]">Typhoon 1.15</span>
                    <div
                      className="absolute top-0 bottom-0 w-1.5 bg-cyan-400 shadow-md"
                      style={{ left: `${Math.min(98, Math.max(2, (budget.thrustToWeight / 1.3) * 100))}%` }}
                      title={`Your T/W: ${budget.thrustToWeight}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stage Navigation & Final Step 4 CTA */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--hud-border)]">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>MTOW: <strong className="text-white">{budget.mtowKg.toLocaleString()} kg</strong></span>
                <span>|</span>
                <span>Unit Cost: <strong className={procurement.isOverBudget ? 'text-red-400' : 'text-cyan-300'}>£{procurement.unitCostM}M</strong></span>
              </div>

              <button
                onClick={onProceedToStep4}
                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Proceed to Step 4: Fly Sortie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

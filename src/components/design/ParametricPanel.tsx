import React from 'react';
import {
  type CadetAircraftDesign,
  type AircraftMassBudget,
  type EngineClass,
  DESIGN_PRESETS
} from '../../physics/aircraftDesign.ts';
import {
  calculateMaterialCostMultiplier,
  type ProcurementEvaluation
} from '../../physics/costRisk.ts';
import {
  Sliders,
  Wrench,
  Shield,
  Zap,
  Sparkles,
  Fuel,
  Weight,
  Coins,
  AlertTriangle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

export interface ParametricPanelProps {
  design: CadetAircraftDesign;
  budget: AircraftMassBudget;
  procurement?: ProcurementEvaluation;
  onChange: (updated: CadetAircraftDesign) => void;
  onHighlightViolations?: () => void;
}

export const ParametricPanel: React.FC<ParametricPanelProps> = ({
  design,
  budget,
  procurement,
  onChange,
}) => {
  const updateField = <K extends keyof CadetAircraftDesign>(
    field: K,
    value: CadetAircraftDesign[K]
  ) => {
    onChange({
      ...design,
      [field]: value,
    });
  };

  const loadPreset = (presetKey: string) => {
    const preset = DESIGN_PRESETS[presetKey];
    if (preset) {
      onChange({ ...preset.design });
    }
  };

  // Mass budget percentages for stacked bar
  const fuelPercent = (budget.fuelKg / budget.mtowKg) * 100;
  const payloadPercent = (budget.payloadKg / budget.mtowKg) * 100;
  const emptyPercent = 100 - fuelPercent - payloadPercent;

  const materialCostMult = calculateMaterialCostMultiplier(design.compositePercent);

  return (
    <div className="w-full bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-4 space-y-5 font-mono text-xs select-none">
      {/* Panel Header & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Parametric Design Suite
          </h3>
        </div>

        {/* Preset Selectors */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[10px] text-slate-500 uppercase mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Presets:
          </span>
          {Object.entries(DESIGN_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => loadPreset(key)}
              title={p.description}
              className="px-2 py-0.5 rounded-sm bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors cursor-pointer text-[10px]"
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Live Mass Budget & Calculated Design Point HUD Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Weight className="w-3.5 h-3.5 text-cyan-400" />
            Calculated Design Point
          </span>
          <span className="text-cyan-400 font-bold text-xs">
            {design.callsign}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-slate-950 p-2 rounded-xs border border-slate-800/80">
            <span className="text-[9px] text-slate-500 uppercase block">Wing Loading (W/S)</span>
            <span className="text-sm font-bold text-cyan-300">
              {Math.round(budget.wingLoadingNm2)} <span className="text-[10px] font-normal">N/m²</span>
            </span>
            <span className="text-[9px] text-slate-500 block">
              ({Math.round(budget.wingLoadingKgm2)} kg/m²)
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded-xs border border-slate-800/80">
            <span className="text-[9px] text-slate-500 uppercase block">Thrust-to-Weight</span>
            <span className="text-sm font-bold text-emerald-400">
              {budget.thrustToWeight.toFixed(3)}
            </span>
            <span className="text-[9px] text-slate-500 block">
              Total: {budget.totalThrustKn} kN
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded-xs border border-slate-800/80">
            <span className="text-[9px] text-slate-500 uppercase block">Max Takeoff Wt</span>
            <span className="text-sm font-bold text-slate-100">
              {budget.mtowKg.toLocaleString()} <span className="text-[10px] font-normal">kg</span>
            </span>
            <span className="text-[9px] text-slate-500 block">
              OEW: {budget.oewKg.toLocaleString()} kg
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded-xs border border-slate-800/80">
            <span className="text-[9px] text-slate-500 uppercase block">Empty Wt Fraction</span>
            <span className="text-sm font-bold text-amber-400">
              {(budget.emptyWeightFraction * 100).toFixed(1)}%
            </span>
            <span className="text-[9px] text-slate-500 block">
              CD0: {budget.cd0} // e: {budget.oswaldEfficiency}
            </span>
          </div>
        </div>

        {/* Stacked Mass Allocation Bar */}
        <div className="space-y-1 pt-1">
          <div className="w-full h-2 rounded-xs overflow-hidden flex bg-slate-950 border border-slate-800">
            <div
              style={{ width: `${emptyPercent}%` }}
              className="bg-slate-600 transition-all"
              title={`Structural Empty Weight: ${Math.round(emptyPercent)}%`}
            />
            <div
              style={{ width: `${fuelPercent}%` }}
              className="bg-amber-500 transition-all"
              title={`Fuel Weight: ${Math.round(fuelPercent)}%`}
            />
            <div
              style={{ width: `${payloadPercent}%` }}
              className="bg-cyan-500 transition-all"
              title={`Payload Weight: ${Math.round(payloadPercent)}%`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
              Empty: {budget.oewKg.toLocaleString()}kg
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Fuel: {budget.fuelKg.toLocaleString()}kg
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
              Payload: {budget.payloadKg.toLocaleString()}kg
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ======================================================== */}
        {/* SECTION 1: WING PLANFORM GEOMETRY                        */}
        {/* ======================================================== */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-md p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Wrench className="w-3.5 h-3.5" />
            1. Wing Planform Geometry
          </h4>

          {/* Wing Surface Area */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Wing Surface Area (S):</span>
              <span className="font-bold text-cyan-300">{design.wingAreaM2} m²</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="1"
              value={design.wingAreaM2}
              onChange={(e) => updateField('wingAreaM2', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>10 m² (Fighter)</span>
              <span>75 m² (Medium)</span>
              <span>150 m² (Transport)</span>
            </div>
          </div>

          {/* Wing Aspect Ratio */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Aspect Ratio (AR):</span>
              <span className="font-bold text-cyan-300">{design.aspectRatio.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="12.0"
              step="0.1"
              value={design.aspectRatio}
              onChange={(e) => updateField('aspectRatio', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>3.0 (Delta / Jet)</span>
              <span>7.5 (Standard)</span>
              <span>12.0 (High-Altitude Glider)</span>
            </div>
          </div>

          {/* Wing Sweep Angle */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Sweep Angle (Λ):</span>
              <span className="font-bold text-cyan-300">{design.sweepDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={design.sweepDeg}
              onChange={(e) => updateField('sweepDeg', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>0° (Straight Wing)</span>
              <span>25° (Transonic)</span>
              <span>50° (Supersonic Sweep)</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: POWERPLANT & PROPULSION                       */}
        {/* ======================================================== */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-md p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Zap className="w-3.5 h-3.5" />
            2. Propulsion System
          </h4>

          {/* Engine Class Selector */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase">Engine Architecture:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'turboprop', label: 'Turboprop (High Static T)' },
                { id: 'high_bypass_turbofan', label: 'High-Bypass Fan' },
                { id: 'low_bypass_turbofan', label: 'Low-Bypass Fan' },
                { id: 'afterburning_turbojet', label: 'Afterburning Jet' },
              ].map((eng) => (
                <button
                  key={eng.id}
                  onClick={() => updateField('engineClass', eng.id as EngineClass)}
                  className={`py-1 px-2 rounded-xs border text-left cursor-pointer transition-colors ${
                    design.engineClass === eng.id
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {eng.label}
                </button>
              ))}
            </div>
          </div>

          {/* Engine Count */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Engine Count:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 4].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => updateField('engineCount', cnt)}
                  className={`w-8 py-0.5 rounded-xs border font-bold cursor-pointer transition-colors ${
                    design.engineCount === cnt
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cnt}x
                </button>
              ))}
            </div>
          </div>

          {/* Thrust per engine */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Thrust per Engine:</span>
              <span className="font-bold text-amber-300">{design.thrustPerEngineKn} kN</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="1"
              value={design.thrustPerEngineKn}
              onChange={(e) => updateField('thrustPerEngineKn', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>5 kN (Trainer)</span>
              <span>75 kN (Transport)</span>
              <span>150 kN (Heavy Fighter)</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: COMPOSITE MATERIALS & TECH LEVEL              */}
        {/* ======================================================== */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-md p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Shield className="w-3.5 h-3.5" />
            3. Airframe Composite Fraction (%)
          </h4>

          {/* Continuous Composite Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-200">
              <span>Carbon-Composite Content:</span>
              <span className="font-bold text-emerald-300 text-sm">
                {design.compositePercent}% <span className="text-[10px] text-slate-400 font-normal">Matrix</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={design.compositePercent}
              onChange={(e) => updateField('compositePercent', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>0% (Full Aluminum)</span>
              <span>50% (Wings/Tail)</span>
              <span>100% (Monocoque)</span>
            </div>

            {/* Mass saving & Cost trade-off indicator */}
            <div className="bg-slate-950 p-2.5 rounded-sm border border-slate-800 space-y-1.5 text-[10px]">
              <div className="flex justify-between text-slate-300">
                <span>Airframe Empty Fraction:</span>
                <span className="font-bold text-emerald-400">
                  {(budget.emptyWeightFraction * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Mass Saved vs Aluminum:</span>
                <span className="font-bold text-cyan-300">
                  -{((0.53 - budget.emptyWeightFraction) * 100).toFixed(1)}% airframe weight
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800/80 pt-1">
                <span>Material Cost Factor (Exponential):</span>
                <span className="font-bold text-amber-400">
                  {materialCostMult}x baseline
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 4: FUEL & MISSION PAYLOAD                        */}
        {/* ======================================================== */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-md p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Fuel className="w-3.5 h-3.5" />
            4. Fuel Capacity & Payload Budget
          </h4>

          {/* Internal Fuel Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Internal Fuel Capacity:</span>
              <span className="font-bold text-amber-300">
                {design.internalFuelKg.toLocaleString()} kg
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="15000"
              step="100"
              value={design.internalFuelKg}
              onChange={(e) => updateField('internalFuelKg', Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>200 kg</span>
              <span>7,500 kg</span>
              <span>15,000 kg</span>
            </div>
          </div>

          {/* Mission Payload Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Mission Payload (Cargo / Troops):</span>
              <span className="font-bold text-cyan-300">
                {design.payloadKg.toLocaleString()} kg
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={design.payloadKg}
              onChange={(e) => updateField('payloadKg', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>100 kg (Trainer)</span>
              <span>2,500 kg (Airdrop)</span>
              <span>10,000 kg (Heavy)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5: AIR STAFF PROCUREMENT & RISK METER            */}
      {/* ======================================================== */}
      {procurement && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <h4 className="text-[11px] uppercase tracking-wider text-slate-100 font-bold">
                Air Staff Procurement & Technological Risk Audit
              </h4>
            </div>

            {/* Board Decision Pill */}
            <span
              className={`text-[9px] px-2.5 py-0.5 rounded-xs font-bold uppercase tracking-wider flex items-center gap-1 border ${
                procurement.boardStatus === 'approved'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : procurement.boardStatus === 'caution'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                  : 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
              }`}
            >
              {procurement.boardStatus === 'approved' && <CheckCircle2 className="w-3 h-3" />}
              {procurement.boardStatus === 'caution' && <TrendingUp className="w-3 h-3" />}
              {procurement.boardStatus === 'rejected' && <AlertTriangle className="w-3 h-3" />}
              {procurement.boardStatus === 'approved'
                ? 'PROGRAM APPROVED'
                : procurement.boardStatus === 'caution'
                ? 'ELEVATED RISK // REVIEW'
                : 'PROJECT CANCELLED BY AIR STAFF'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Unit Cost Gauge */}
            <div className="bg-slate-950 p-2.5 rounded-sm border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase">Estimated Unit Cost:</span>
                <span
                  className={`text-sm font-bold ${
                    procurement.isOverBudget ? 'text-red-400' : 'text-slate-100'
                  }`}
                >
                  £{procurement.unitCostM.toFixed(1)}M
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    / £{procurement.costBudgetLimitM}M Budget
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-xs overflow-hidden bg-slate-800">
                <div
                  style={{ width: `${Math.min(100, procurement.costBudgetUsedPercent)}%` }}
                  className={`h-full transition-all ${
                    procurement.isOverBudget
                      ? 'bg-red-500'
                      : procurement.costBudgetUsedPercent > 85
                      ? 'bg-amber-500'
                      : 'bg-cyan-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Airframe: £{procurement.airframeCostM}M</span>
                <span>Engines: £{procurement.enginesCostM}M</span>
                <span>Avionics: £{procurement.avionicsCostM}M</span>
              </div>
            </div>

            {/* Program Risk Gauge */}
            <div className="bg-slate-950 p-2.5 rounded-sm border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase">Technological Risk Index:</span>
                <span
                  className={`text-sm font-bold ${
                    procurement.programRiskPercent > 75
                      ? 'text-red-400'
                      : procurement.programRiskPercent > 55
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {procurement.programRiskPercent}%
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    (Max 75% Limit)
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-xs overflow-hidden bg-slate-800">
                <div
                  style={{ width: `${Math.min(100, procurement.programRiskPercent)}%` }}
                  className={`h-full transition-all ${
                    procurement.programRiskPercent > 75
                      ? 'bg-red-500'
                      : procurement.programRiskPercent > 55
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Composites: +{procurement.materialRiskPercent}%</span>
                <span>Powerplant: +{procurement.engineRiskPercent}%</span>
                <span>Aero: +{procurement.aeroComplexityRisk}%</span>
              </div>
            </div>
          </div>

          {/* Board Critique text */}
          <div className="p-2 rounded-xs bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300">
            <span className="text-amber-400 font-bold block uppercase text-[10px] mb-0.5">
              Procurement Board Briefing:
            </span>
            <p>{procurement.boardCritique}</p>
          </div>
        </div>
      )}
    </div>
  );
};

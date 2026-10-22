import { useState } from 'react';
import type { CadetAircraftDesign, AircraftMassBudget } from '../../physics/aircraftDesign.ts';
import {
  type MissionLeg,
  type MissionLegType,
  type PayloadDropType,
  type MissionSimulationSummary,
  simulateMission,
  MISSION_PRESETS
} from '../../physics/missionLegs.ts';
import {
  Plane,
  Fuel,
  Clock,
  Compass,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Zap
} from 'lucide-react';

interface MissionBuilderProps {
  design: CadetAircraftDesign;
  massBudget: AircraftMassBudget;
  legs: MissionLeg[];
  onLegsChange: (newLegs: MissionLeg[]) => void;
  onUpdateDesignPayload?: (payloadKg: number) => void;
  onUpdateDesignFuel?: (fuelKg: number) => void;
}

export function MissionBuilder({
  design,
  massBudget,
  legs,
  onLegsChange,
}: MissionBuilderProps) {
  // Currently selected / expanded leg for deep editing
  const [expandedLegId, setExpandedLegId] = useState<string | null>(legs[0]?.id || null);

  // Compute live multi-leg simulation
  const simulation: MissionSimulationSummary = simulateMission(design, massBudget, legs);

  // Handlers for leg manipulation
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...legs];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onLegsChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= legs.length - 1) return;
    const updated = [...legs];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onLegsChange(updated);
  };

  const handleDeleteLeg = (index: number) => {
    if (legs.length <= 1) return;
    const updated = legs.filter((_, i) => i !== index);
    onLegsChange(updated);
    if (expandedLegId === legs[index].id) {
      setExpandedLegId(updated[0]?.id || null);
    }
  };

  const handleAddLeg = (type: MissionLegType) => {
    const id = `leg-${Date.now()}`;
    let newLeg: MissionLeg;

    switch (type) {
      case 'takeoff':
        newLeg = { id, name: 'Takeoff & Departure', type: 'takeoff', runwayElevationFt: 0, headwindKts: 5 };
        break;
      case 'climb':
        newLeg = { id, name: 'Climb to Flight Level', type: 'climb', targetAltitudeFt: 25000, climbSpeedKmh: 480 };
        break;
      case 'cruise':
        newLeg = { id, name: 'Cruise Transit Leg', type: 'cruise', distanceKm: 400, altitudeFt: 25000, speedKmh: 720 };
        break;
      case 'loiter':
        newLeg = { id, name: 'Stationary Loiter', type: 'loiter', durationMin: 30, altitudeFt: 18000 };
        break;
      case 'combat_air_to_air':
        newLeg = { id, name: 'Air-to-Air Combat', type: 'combat_air_to_air', durationMin: 5, altitudeFt: 20000, loadFactorG: 6.0, reheatEngaged: true };
        break;
      case 'combat_air_to_ground':
        newLeg = { id, name: 'Air-to-Ground Ingress', type: 'combat_air_to_ground', ingressDistanceKm: 60, altitudeFt: 500, speedKmh: 850 };
        break;
      case 'payload_release':
        newLeg = { id, name: 'Stores Delivery', type: 'payload_release', dropType: 'munitions', dropMassKg: Math.min(1500, design.payloadKg), altitudeFt: 10000, indicatedAirspeedKts: 320 };
        break;
      case 'air_refuel':
        newLeg = { id, name: 'Aerial Refuelling (AAR)', type: 'air_refuel', fuelReceivedKg: 1500, altitudeFt: 22000 };
        break;
      case 'landing':
        newLeg = { id, name: 'Recovery & Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1800, headwindKts: 5 };
        break;
    }

    onLegsChange([...legs, newLeg]);
    setExpandedLegId(id);
  };

  const handleUpdateLeg = (index: number, updatedFields: Partial<MissionLeg>) => {
    const updated = [...legs];
    updated[index] = { ...updated[index], ...updatedFields } as MissionLeg;
    onLegsChange(updated);
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = MISSION_PRESETS[presetKey];
    if (preset) {
      onLegsChange(JSON.parse(JSON.stringify(preset.legs)));
      setExpandedLegId(preset.legs[0]?.id || null);
    }
  };

  // Helper icons and styles for leg types
  const getLegBadge = (type: MissionLegType) => {
    switch (type) {
      case 'takeoff': return { color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400', label: 'TAKEOFF' };
      case 'climb': return { color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400', label: 'CLIMB' };
      case 'cruise': return { color: 'border-blue-500/50 bg-blue-500/10 text-blue-400', label: 'CRUISE' };
      case 'loiter': return { color: 'border-purple-500/50 bg-purple-500/10 text-purple-400', label: 'LOITER' };
      case 'combat_air_to_air': return { color: 'border-red-500/50 bg-red-500/10 text-red-400', label: 'A-TO-A' };
      case 'combat_air_to_ground': return { color: 'border-orange-500/50 bg-orange-500/10 text-orange-400', label: 'A-TO-G' };
      case 'payload_release': return { color: 'border-amber-500/50 bg-amber-500/10 text-amber-400', label: 'PAYLOAD DROP' };
      case 'air_refuel': return { color: 'border-teal-500/50 bg-teal-500/10 text-teal-400', label: 'AAR TANKER' };
      case 'landing': return { color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400', label: 'LANDING' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mission Presets & Quick Action Controls */}
      <div className="bg-[var(--hud-panel-bg)] border border-[var(--hud-border)] rounded-lg p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--hud-border)]">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-cyan-300 uppercase tracking-wider">
              Sortie Flight Profile & Mission Legs Engine
            </h2>
          </div>

          {/* Mission Presets Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--hud-text-muted)] uppercase">Mission Preset:</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(MISSION_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleLoadPreset(key)}
                  className="text-xs px-2.5 py-1 rounded bg-[var(--hud-bg)] border border-[var(--hud-border)] hover:border-cyan-400 hover:text-cyan-300 transition-all font-mono"
                  title={preset.description}
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Feasibility & Fuel Reserve HUD Banner */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Verdict Status Card */}
          <div
            className={`md:col-span-2 p-3 rounded border flex items-center gap-3 ${
              simulation.verdict === 'SUCCESS'
                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                : simulation.verdict === 'MARGINAL'
                ? 'border-amber-500/50 bg-amber-950/20 text-amber-300'
                : 'border-red-500/50 bg-red-950/20 text-red-300'
            }`}
          >
            {simulation.verdict === 'SUCCESS' && <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />}
            {simulation.verdict === 'MARGINAL' && <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />}
            {simulation.verdict !== 'SUCCESS' && simulation.verdict !== 'MARGINAL' && (
              <XCircle className="w-7 h-7 text-red-400 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-bold uppercase tracking-wider text-sm">
                {simulation.verdict === 'SUCCESS' && 'MISSION FEASIBLE: RESERVES INTACT'}
                {simulation.verdict === 'MARGINAL' && 'CONTINGENCY FUEL RESERVE BREACHED'}
                {simulation.verdict === 'FAILED_FUEL' && 'CRITICAL: FUEL STARVATION'}
                {simulation.verdict === 'FAILED_LANDING' && 'CRITICAL: RUNWAY OVERRUN'}
                {simulation.verdict === 'FAILED_STALL' && 'CRITICAL: STALL SPEED HAZARD'}
              </div>
              <div className="text-[var(--hud-text-muted)] mt-0.5">{simulation.critique}</div>
            </div>
          </div>

          {/* Fuel Reserves Meter */}
          <div className="p-3 rounded border border-[var(--hud-border)] bg-[var(--hud-bg)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[var(--hud-text-muted)]">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-cyan-400" />
                REMAINING FUEL
              </span>
              <span className="font-bold text-cyan-300">{simulation.finalFuelKg.toLocaleString()} kg</span>
            </div>
            {/* Fuel Bar */}
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700 my-1.5">
              <div
                className={`h-full transition-all duration-300 ${
                  simulation.finalFuelKg <= simulation.requiredReserveKg
                    ? 'bg-red-500'
                    : simulation.finalFuelKg <= simulation.requiredReserveKg * 1.5
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (simulation.finalFuelKg / Math.max(1, design.internalFuelKg)) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--hud-text-muted)]">
              <span>Required NATO Reserve: {simulation.requiredReserveKg.toLocaleString()} kg</span>
              <span className={simulation.reserveMarginKg >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {simulation.reserveMarginPercent > 0 ? `+${simulation.reserveMarginPercent}%` : `${simulation.reserveMarginPercent}%`}
              </span>
            </div>
          </div>

          {/* Key Mission Telemetry */}
          <div className="p-3 rounded border border-[var(--hud-border)] bg-[var(--hud-bg)] grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-[var(--hud-text-muted)] uppercase flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" /> Sortie Dist
              </div>
              <div className="font-bold text-white text-sm">{simulation.totalDistanceKm.toLocaleString()} km</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--hud-text-muted)] uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Duration
              </div>
              <div className="font-bold text-white text-sm">
                {Math.floor(simulation.totalDurationMin / 60)}h {simulation.totalDurationMin % 60}m
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--hud-text-muted)] uppercase flex items-center gap-1">
                <Package className="w-3 h-3 text-amber-400" /> Delivered
              </div>
              <div className="font-bold text-amber-300">{simulation.payloadDeliveredKg.toLocaleString()} kg</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--hud-text-muted)] uppercase flex items-center gap-1">
                <Plane className="w-3 h-3 text-emerald-400" /> Landing Req
              </div>
              <div className="font-bold text-emerald-300">{simulation.landingFieldReqM.toLocaleString()} m</div>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Flight Profile Altitude & Mass Timeline Diagram */}
      <div className="bg-[var(--hud-panel-bg)] border border-[var(--hud-border)] rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--hud-border)]">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Sortie Altitude & Mass Trajectory Profile
          </div>
          <span className="text-[11px] text-[var(--hud-text-muted)]">
            Hover or click legs to inspect step telemetry
          </span>
        </div>

        {/* Profile Visualization SVG */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 900 180"
            className="w-full h-44 select-none bg-slate-950/60 rounded border border-slate-800"
          >
            {/* Altitude Grid lines */}
            {[0, 10000, 20000, 30000, 40000].map((alt) => {
              const y = 150 - (alt / 42000) * 125;
              return (
                <g key={alt}>
                  <line x1="40" y1={y} x2="880" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <text x="35" y={y + 3} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end" fontFamily="monospace">
                    {alt / 1000}k
                  </text>
                </g>
              );
            })}

            {/* Ground Runway Base Line */}
            <line x1="40" y1="150" x2="880" y2="150" stroke="rgba(100,116,139,0.5)" strokeWidth="1.5" />

            {/* Profile Polyline & Nodes */}
            {(() => {
              const stepCount = simulation.steps.length;
              if (stepCount === 0) return null;
              const xStep = 800 / Math.max(1, stepCount);

              const points = simulation.steps.map((step, idx) => {
                const x = 50 + idx * xStep + xStep * 0.5;
                const y = Math.max(25, 150 - (step.altitudeFt / 42000) * 125);
                return { x, y, step };
              });

              const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

              return (
                <g>
                  {/* Shaded Area Under Profile */}
                  <polygon
                    points={`50,150 ${polylinePoints} ${points[points.length - 1].x},150`}
                    fill="url(#missionProfileGradient)"
                    opacity="0.25"
                  />

                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="missionProfileGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Profile Flight Line */}
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Profile Step Waypoints */}
                  {points.map((pt, idx) => {
                    const isSelected = expandedLegId === pt.step.legId;
                    const isStarved = pt.step.status === 'critical';
                    const isWarning = pt.step.status === 'warning';

                    let markerColor = '#06b6d4';
                    if (isStarved) markerColor = '#ef4444';
                    else if (isWarning) markerColor = '#f59e0b';
                    else if (pt.step.type === 'combat_air_to_air') markerColor = '#f43f5e';
                    else if (pt.step.type === 'payload_release') markerColor = '#f97316';
                    else if (pt.step.type === 'air_refuel') markerColor = '#10b981';

                    return (
                      <g
                        key={pt.step.legId}
                        className="cursor-pointer transition-all"
                        onClick={() => setExpandedLegId(pt.step.legId)}
                      >
                        {/* Glow ring when selected */}
                        {isSelected && (
                          <circle cx={pt.x} cy={pt.y} r="9" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
                        )}

                        {/* Waypoint circle */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? '6' : '4.5'}
                          fill={markerColor}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />

                        {/* Leg Type Badge / Label */}
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          fill={markerColor}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          L{idx + 1}
                        </text>

                        {/* Fuel percentage below */}
                        <text
                          x={pt.x}
                          y="166"
                          fill="rgba(255,255,255,0.5)"
                          fontSize="8.5"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {pt.step.fuelPercentRemaining}%
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Main Mission Legs Sequencer & Editor Table */}
      <div className="bg-[var(--hud-panel-bg)] border border-[var(--hud-border)] rounded-lg p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[var(--hud-border)]">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider">
              Sortie Flight Legs Sequence ({legs.length} Legs)
            </h3>
          </div>

          {/* Quick Add Leg Action Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--hud-text-muted)] mr-1 uppercase">Insert Leg:</span>
            {(
              [
                ['cruise', '+ Cruise'],
                ['climb', '+ Climb'],
                ['loiter', '+ Loiter'],
                ['combat_air_to_air', '+ AtoA'],
                ['combat_air_to_ground', '+ AtoG'],
                ['payload_release', '+ Drop Payload'],
                ['air_refuel', '+ AAR Refuel'],
                ['landing', '+ Land'],
              ] as [MissionLegType, string][]
            ).map(([type, label]) => (
              <button
                key={type}
                onClick={() => handleAddLeg(type)}
                className="text-[11px] px-2 py-0.5 rounded bg-[var(--hud-bg)] border border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-400 transition-all font-mono"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Legs List */}
        <div className="space-y-2.5">
          {legs.map((leg, index) => {
            const stepResult = simulation.steps[index];
            const badge = getLegBadge(leg.type);
            const isExpanded = expandedLegId === leg.id;

            return (
              <div
                key={leg.id}
                className={`border rounded-lg transition-all ${
                  isExpanded
                    ? 'border-cyan-500 bg-cyan-950/15 shadow-md'
                    : 'border-[var(--hud-border)] bg-[var(--hud-bg)] hover:border-slate-600'
                }`}
              >
                {/* Leg Header Row */}
                <div
                  className="p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedLegId(isExpanded ? null : leg.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 font-mono w-6">#{index + 1}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs font-semibold text-white tracking-wide">{leg.name}</span>
                  </div>

                  {/* Step Output Quick Summary */}
                  {stepResult && (
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-[var(--hud-text-muted)] hidden sm:block">
                        Burn: <span className="text-cyan-300 font-bold">-{stepResult.fuelBurnedKg.toLocaleString()} kg</span>
                      </div>
                      <div className="text-[var(--hud-text-muted)] hidden md:block">
                        Weight: <span className="text-slate-300">{stepResult.endWeightKg.toLocaleString()} kg</span>
                      </div>
                      <div className="text-[var(--hud-text-muted)]">
                        Fuel:{' '}
                        <span
                          className={`font-bold ${
                            stepResult.fuelPercentRemaining <= 5
                              ? 'text-red-400'
                              : stepResult.fuelPercentRemaining <= 15
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {stepResult.fuelPercentRemaining}%
                        </span>
                      </div>

                      {/* Reorder and Delete Controls */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 transition-colors"
                          title="Move Leg Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={index === legs.length - 1}
                          onClick={() => handleMoveDown(index)}
                          className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 transition-colors"
                          title="Move Leg Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLeg(index)}
                          className="p-1 text-red-400/70 hover:text-red-300 transition-colors ml-1"
                          title="Remove Leg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Parameter Controls */}
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-[var(--hud-border)]/50 mt-1 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Leg Name Editor */}
                    <div className="md:col-span-3 flex items-center gap-2 mb-1">
                      <span className="text-[var(--hud-text-muted)] uppercase text-[10px]">Leg Title:</span>
                      <input
                        type="text"
                        value={leg.name}
                        onChange={(e) => handleUpdateLeg(index, { name: e.target.value })}
                        className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-white text-xs w-full max-w-sm font-mono focus:border-cyan-400 outline-none"
                      />
                    </div>

                    {/* Specific Leg Type Controls */}
                    {leg.type === 'takeoff' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Runway Elevation: {leg.runwayElevationFt} ft
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="8000"
                            step="500"
                            value={leg.runwayElevationFt}
                            onChange={(e) => handleUpdateLeg(index, { runwayElevationFt: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Headwind: {leg.headwindKts} kts
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="35"
                            step="5"
                            value={leg.headwindKts}
                            onChange={(e) => handleUpdateLeg(index, { headwindKts: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'climb' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Target Altitude: {leg.targetAltitudeFt.toLocaleString()} ft
                          </label>
                          <input
                            type="range"
                            min="5000"
                            max="45000"
                            step="1000"
                            value={leg.targetAltitudeFt}
                            onChange={(e) => handleUpdateLeg(index, { targetAltitudeFt: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Climb Airspeed: {leg.climbSpeedKmh} km/h
                          </label>
                          <input
                            type="range"
                            min="300"
                            max="800"
                            step="20"
                            value={leg.climbSpeedKmh}
                            onChange={(e) => handleUpdateLeg(index, { climbSpeedKmh: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'cruise' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Distance: {leg.distanceKm} km
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="2500"
                            step="50"
                            value={leg.distanceKm}
                            onChange={(e) => handleUpdateLeg(index, { distanceKm: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Altitude: {leg.altitudeFt.toLocaleString()} ft
                          </label>
                          <input
                            type="range"
                            min="5000"
                            max="45000"
                            step="1000"
                            value={leg.altitudeFt}
                            onChange={(e) => handleUpdateLeg(index, { altitudeFt: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            True Airspeed: {leg.speedKmh} km/h
                          </label>
                          <input
                            type="range"
                            min="350"
                            max="1100"
                            step="25"
                            value={leg.speedKmh}
                            onChange={(e) => handleUpdateLeg(index, { speedKmh: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'loiter' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Duration: {leg.durationMin} minutes
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="180"
                            step="5"
                            value={leg.durationMin}
                            onChange={(e) => handleUpdateLeg(index, { durationMin: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Altitude: {leg.altitudeFt.toLocaleString()} ft
                          </label>
                          <input
                            type="range"
                            min="3000"
                            max="35000"
                            step="1000"
                            value={leg.altitudeFt}
                            onChange={(e) => handleUpdateLeg(index, { altitudeFt: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'combat_air_to_air' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Combat Duration: {leg.durationMin} minutes
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="15"
                            step="1"
                            value={leg.durationMin}
                            onChange={(e) => handleUpdateLeg(index, { durationMin: Number(e.target.value) })}
                            className="w-full accent-red-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Sustained Load Factor: {leg.loadFactorG}g
                          </label>
                          <input
                            type="range"
                            min="2.0"
                            max="9.0"
                            step="0.5"
                            value={leg.loadFactorG}
                            onChange={(e) => handleUpdateLeg(index, { loadFactorG: Number(e.target.value) })}
                            className="w-full accent-red-400"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-3">
                          <input
                            type="checkbox"
                            id={`reheat-${leg.id}`}
                            checked={leg.reheatEngaged}
                            onChange={(e) => handleUpdateLeg(index, { reheatEngaged: e.target.checked })}
                            className="accent-red-500 w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor={`reheat-${leg.id}`} className="text-red-300 font-bold cursor-pointer">
                            Reheat (Afterburner)
                          </label>
                        </div>
                      </>
                    )}

                    {leg.type === 'combat_air_to_ground' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Ingress Distance: {leg.ingressDistanceKm} km
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="250"
                            step="10"
                            value={leg.ingressDistanceKm}
                            onChange={(e) => handleUpdateLeg(index, { ingressDistanceKm: Number(e.target.value) })}
                            className="w-full accent-orange-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Altitude (AGL): {leg.altitudeFt} ft
                          </label>
                          <input
                            type="range"
                            min="200"
                            max="5000"
                            step="100"
                            value={leg.altitudeFt}
                            onChange={(e) => handleUpdateLeg(index, { altitudeFt: Number(e.target.value) })}
                            className="w-full accent-orange-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Ingress Dash Speed: {leg.speedKmh} km/h
                          </label>
                          <input
                            type="range"
                            min="500"
                            max="1100"
                            step="25"
                            value={leg.speedKmh}
                            onChange={(e) => handleUpdateLeg(index, { speedKmh: Number(e.target.value) })}
                            className="w-full accent-orange-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'payload_release' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Stores Type:
                          </label>
                          <select
                            value={leg.dropType}
                            onChange={(e) => handleUpdateLeg(index, { dropType: e.target.value as PayloadDropType })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          >
                            <option value="paratroopers">Paratroopers & Jumpers</option>
                            <option value="munitions">Precision Guided Munitions</option>
                            <option value="cargo_pallet">Cargo Pallet / Humanitarian</option>
                            <option value="external_fuel_tanks">External Drop Tanks</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Drop Mass: {leg.dropMassKg.toLocaleString()} kg
                          </label>
                          <input
                            type="range"
                            min="100"
                            max={Math.max(100, design.payloadKg)}
                            step="100"
                            value={leg.dropMassKg}
                            onChange={(e) => handleUpdateLeg(index, { dropMassKg: Number(e.target.value) })}
                            className="w-full accent-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Release Speed: {leg.indicatedAirspeedKts} kts IAS
                          </label>
                          <input
                            type="range"
                            min="110"
                            max="450"
                            step="10"
                            value={leg.indicatedAirspeedKts}
                            onChange={(e) => handleUpdateLeg(index, { indicatedAirspeedKts: Number(e.target.value) })}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'air_refuel' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Fuel Offload: +{leg.fuelReceivedKg.toLocaleString()} kg
                          </label>
                          <input
                            type="range"
                            min="500"
                            max={design.internalFuelKg}
                            step="250"
                            value={leg.fuelReceivedKg}
                            onChange={(e) => handleUpdateLeg(index, { fuelReceivedKg: Number(e.target.value) })}
                            className="w-full accent-teal-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Tanker Rendezvous Alt: {leg.altitudeFt.toLocaleString()} ft
                          </label>
                          <input
                            type="range"
                            min="15000"
                            max="30000"
                            step="1000"
                            value={leg.altitudeFt}
                            onChange={(e) => handleUpdateLeg(index, { altitudeFt: Number(e.target.value) })}
                            className="w-full accent-teal-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'landing' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Available Runway: {leg.availableRunwayM.toLocaleString()} m
                          </label>
                          <input
                            type="range"
                            min="600"
                            max="3500"
                            step="100"
                            value={leg.availableRunwayM}
                            onChange={(e) => handleUpdateLeg(index, { availableRunwayM: Number(e.target.value) })}
                            className="w-full accent-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--hud-text-muted)] uppercase block">
                            Landing Elevation: {leg.runwayElevationFt} ft
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="8000"
                            step="500"
                            value={leg.runwayElevationFt}
                            onChange={(e) => handleUpdateLeg(index, { runwayElevationFt: Number(e.target.value) })}
                            className="w-full accent-yellow-400"
                          />
                        </div>
                      </>
                    )}

                    {/* Step telemetry notes and warnings */}
                    {stepResult && stepResult.notes.length > 0 && (
                      <div className="md:col-span-3 mt-1 bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px] text-cyan-200">
                        {stepResult.notes.map((note, nIdx) => (
                          <div key={nIdx} className="font-mono">
                            {note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

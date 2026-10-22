import { useState, useMemo } from 'react';
import type { MissionLeg, MissionLegType } from '../../physics/missionLegs.ts';
import { MISSION_PRESETS } from '../../physics/missionLegs.ts';
import {
  Compass,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';

interface Step1MissionBriefingProps {
  legs: MissionLeg[];
  onLegsChange: (newLegs: MissionLeg[]) => void;
  onProceedToStep2: () => void;
}

export function Step1MissionBriefing({
  legs,
  onLegsChange,
  onProceedToStep2,
}: Step1MissionBriefingProps) {
  const [expandedLegId, setExpandedLegId] = useState<string | null>(legs[0]?.id || null);

  // Derived operational requirements from active legs
  const derivedRequirements = useMemo(() => {
    let minRunwayM = 2000;
    let maxAltitudeFt = 25000;
    let maxSpeedKmh = 600;
    let maxG = 3.0;
    let totalPayloadKg = 0;
    let requiresStealth = false;
    let totalCruiseDistKm = 0;

    for (const leg of legs) {
      if (leg.type === 'takeoff') {
        // Assume default target unstick unless specified
      } else if (leg.type === 'landing') {
        minRunwayM = Math.min(minRunwayM, leg.availableRunwayM);
      } else if (leg.type === 'climb') {
        maxAltitudeFt = Math.max(maxAltitudeFt, leg.targetAltitudeFt);
      } else if (leg.type === 'cruise') {
        maxAltitudeFt = Math.max(maxAltitudeFt, leg.altitudeFt);
        maxSpeedKmh = Math.max(maxSpeedKmh, leg.speedKmh);
        totalCruiseDistKm += leg.distanceKm;
      } else if (leg.type === 'combat_air_to_air') {
        maxG = Math.max(maxG, leg.loadFactorG);
        maxAltitudeFt = Math.max(maxAltitudeFt, leg.altitudeFt);
      } else if (leg.type === 'combat_air_to_ground') {
        requiresStealth = true;
        maxSpeedKmh = Math.max(maxSpeedKmh, leg.speedKmh);
      } else if (leg.type === 'payload_release') {
        totalPayloadKg += leg.dropMassKg;
      }
    }

    return {
      minRunwayM,
      maxAltitudeFt,
      maxSpeedKts: Math.round(maxSpeedKmh / 1.852),
      maxG,
      totalPayloadKg: Math.max(1000, totalPayloadKg),
      requiresStealth,
      totalCruiseDistKm,
    };
  }, [legs]);

  const handleLoadPreset = (key: string) => {
    const preset = MISSION_PRESETS[key];
    if (preset) {
      onLegsChange(JSON.parse(JSON.stringify(preset.legs)));
      setExpandedLegId(preset.legs[0]?.id || null);
    }
  };

  const handleClearToBlank = () => {
    const initialBlank: MissionLeg[] = [
      { id: 'leg-1', name: 'Takeoff & Departure', type: 'takeoff', runwayElevationFt: 0, headwindKts: 5 },
      { id: 'leg-2', name: 'Climb to Flight Level', type: 'climb', targetAltitudeFt: 25000, climbSpeedKmh: 450 },
      { id: 'leg-3', name: 'Cruise Transit Outbound', type: 'cruise', distanceKm: 400, altitudeFt: 25000, speedKmh: 680 },
      { id: 'leg-4', name: 'Base Recovery & Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1800, headwindKts: 5 },
    ];
    onLegsChange(initialBlank);
    setExpandedLegId('leg-1');
  };

  const handleAddLeg = (type: MissionLegType) => {
    const id = `leg-${Date.now()}`;
    let newLeg: MissionLeg;
    switch (type) {
      case 'takeoff':
        newLeg = { id, name: 'Takeoff & Departure', type: 'takeoff', runwayElevationFt: 0, headwindKts: 5 };
        break;
      case 'climb':
        newLeg = { id, name: 'Climb to Transit Level', type: 'climb', targetAltitudeFt: 28000, climbSpeedKmh: 500 };
        break;
      case 'cruise':
        newLeg = { id, name: 'Cruise Transit Leg', type: 'cruise', distanceKm: 450, altitudeFt: 28000, speedKmh: 750 };
        break;
      case 'loiter':
        newLeg = { id, name: 'Tactical On-Station Loiter', type: 'loiter', durationMin: 45, altitudeFt: 18000 };
        break;
      case 'combat_air_to_air':
        newLeg = { id, name: 'Air-to-Air Combat Engagement', type: 'combat_air_to_air', durationMin: 5, altitudeFt: 22000, loadFactorG: 6.0, reheatEngaged: true };
        break;
      case 'combat_air_to_ground':
        newLeg = { id, name: 'Low-Level Strike Dash', type: 'combat_air_to_ground', ingressDistanceKm: 75, altitudeFt: 500, speedKmh: 850 };
        break;
      case 'payload_release':
        newLeg = { id, name: 'Release Mission Stores', type: 'payload_release', dropType: 'munitions', dropMassKg: 1500, altitudeFt: 15000, indicatedAirspeedKts: 320 };
        break;
      case 'air_refuel':
        newLeg = { id, name: 'Tanker Refuelling (AAR)', type: 'air_refuel', fuelReceivedKg: 1800, altitudeFt: 22000 };
        break;
      case 'landing':
        newLeg = { id, name: 'Field Landing & Recovery', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1600, headwindKts: 5 };
        break;
    }

    onLegsChange([...legs, newLeg]);
    setExpandedLegId(id);
  };

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
    if (expandedLegId === legs[index]?.id) {
      setExpandedLegId(updated[0]?.id || null);
    }
  };

  const handleUpdateLeg = (index: number, updatedFields: Partial<MissionLeg>) => {
    const updated = [...legs];
    updated[index] = { ...updated[index], ...updatedFields } as MissionLeg;
    onLegsChange(updated);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Step Banner */}
      <div className="bg-[var(--hud-panel-header)] border border-[var(--hud-border)] rounded-lg p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
            <Compass className="w-4 h-4" />
            STEP 1 OF 4 // STAFF TARGET (AIR) OPERATIONAL BRIEFING
          </div>
          <h2 className="text-xl font-black text-white mt-1 tracking-tight">
            Define Operational Mission Requirements
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
            Every aircraft design begins with the military mission. Define the legs of the sortie your aircraft must fly.
            The parameters you set here will dictate the aerodynamic limits required on the Constraint Diagram in Step 2.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onProceedToStep2}
          className="px-5 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wide uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:shadow-cyan-500/20"
        >
          <span>Configure Flight Limits</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mission Presets vs Blank Canvas Controls */}
      <div className="bg-[var(--hud-panel-bg)] border border-[var(--hud-border)] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white uppercase">Pre-Built RAF Profiles:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MISSION_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => handleLoadPreset(key)}
              className="px-3 py-1 rounded bg-[var(--hud-bg)] border border-slate-700 hover:border-cyan-400 hover:text-cyan-300 text-slate-300 transition-colors font-mono cursor-pointer"
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={handleClearToBlank}
            className="px-3 py-1 rounded bg-slate-900 border border-slate-700 hover:border-red-400 hover:text-red-300 text-slate-400 transition-colors font-mono cursor-pointer"
          >
            Reset to Blank Sortie
          </button>
        </div>
      </div>

      {/* Operational Requirements Derived Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-3 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block">Runway Limit</span>
          <span className="text-base font-bold text-emerald-400">{derivedRequirements.minRunwayM}m</span>
        </div>
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-3 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block">Ceiling Demand</span>
          <span className="text-base font-bold text-cyan-400">{derivedRequirements.maxAltitudeFt.toLocaleString()} ft</span>
        </div>
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-3 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block">Speed Demand</span>
          <span className="text-base font-bold text-white">{derivedRequirements.maxSpeedKts} kts</span>
        </div>
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-3 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block">Maneuver G</span>
          <span className="text-base font-bold text-red-400">{derivedRequirements.maxG.toFixed(1)}g</span>
        </div>
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-3 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block">Mission Payload</span>
          <span className="text-base font-bold text-amber-400">{derivedRequirements.totalPayloadKg.toLocaleString()} kg</span>
        </div>
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-3 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block">Stealth Tier</span>
          <span className={`text-xs font-bold ${derivedRequirements.requiresStealth ? 'text-amber-300' : 'text-slate-400'}`}>
            {derivedRequirements.requiresStealth ? 'REQUIRED (DENIED)' : 'STANDARD'}
          </span>
        </div>
      </div>

      {/* Interactive Legs Sequencer */}
      <div className="bg-[var(--hud-panel-bg)] border border-[var(--hud-border)] rounded-lg p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--hud-border)]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white uppercase text-sm">
              Sortie Flight Legs Sequence ({legs.length} Legs)
            </h3>
          </div>

          {/* Quick Insert Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase mr-1">Insert Leg:</span>
            {(
              [
                ['cruise', '+ Cruise'],
                ['climb', '+ Climb'],
                ['loiter', '+ Loiter'],
                ['combat_air_to_air', '+ AtoA'],
                ['combat_air_to_ground', '+ AtoG'],
                ['payload_release', '+ Drop Payload'],
                ['air_refuel', '+ AAR Tanker'],
                ['landing', '+ Land'],
              ] as [MissionLegType, string][]
            ).map(([type, label]) => (
              <button
                key={type}
                onClick={() => handleAddLeg(type)}
                className="text-[10px] px-2 py-0.5 rounded bg-[var(--hud-bg)] border border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition-colors font-mono cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Legs List */}
        <div className="space-y-2">
          {legs.map((leg, index) => {
            const isExpanded = expandedLegId === leg.id;
            return (
              <div
                key={leg.id}
                className={`border rounded-lg transition-all ${
                  isExpanded
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-md'
                    : 'border-[var(--hud-border)] bg-[var(--hud-bg)] hover:border-slate-600'
                }`}
              >
                {/* Header */}
                <div
                  className="p-3 flex items-center justify-between gap-2 cursor-pointer select-none"
                  onClick={() => setExpandedLegId(isExpanded ? null : leg.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-bold w-6">#{index + 1}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                      {leg.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white font-semibold">{leg.name}</span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={index === legs.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLeg(index)}
                      className="p-1 text-red-400/80 hover:text-red-300 cursor-pointer ml-1"
                      title="Delete Leg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Parameter Inputs */}
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-[var(--hud-border)]/60 mt-1 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-3 flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-400 uppercase">Title:</span>
                      <input
                        type="text"
                        value={leg.name}
                        onChange={(e) => handleUpdateLeg(index, { name: e.target.value })}
                        className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-white text-xs w-full max-w-sm font-mono focus:border-cyan-400 outline-none"
                      />
                    </div>

                    {leg.type === 'cruise' && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block">Distance: {leg.distanceKm} km</label>
                          <input
                            type="range"
                            min="50"
                            max="2000"
                            step="50"
                            value={leg.distanceKm}
                            onChange={(e) => handleUpdateLeg(index, { distanceKm: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block">Altitude: {leg.altitudeFt.toLocaleString()} ft</label>
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
                          <label className="text-[10px] text-slate-400 uppercase block">Speed: {leg.speedKmh} km/h</label>
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

                    {leg.type === 'climb' && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block">Target Altitude: {leg.targetAltitudeFt.toLocaleString()} ft</label>
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
                          <label className="text-[10px] text-slate-400 uppercase block">Climb Speed: {leg.climbSpeedKmh} km/h</label>
                          <input
                            type="range"
                            min="300"
                            max="800"
                            step="25"
                            value={leg.climbSpeedKmh}
                            onChange={(e) => handleUpdateLeg(index, { climbSpeedKmh: Number(e.target.value) })}
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'payload_release' && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block">Drop Mass: {leg.dropMassKg.toLocaleString()} kg</label>
                          <input
                            type="range"
                            min="200"
                            max="5000"
                            step="100"
                            value={leg.dropMassKg}
                            onChange={(e) => handleUpdateLeg(index, { dropMassKg: Number(e.target.value) })}
                            className="w-full accent-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block">Drop Altitude: {leg.altitudeFt.toLocaleString()} ft</label>
                          <input
                            type="range"
                            min="500"
                            max="30000"
                            step="500"
                            value={leg.altitudeFt}
                            onChange={(e) => handleUpdateLeg(index, { altitudeFt: Number(e.target.value) })}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </>
                    )}

                    {leg.type === 'landing' && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase block">Runway Available: {leg.availableRunwayM} m</label>
                          <input
                            type="range"
                            min="600"
                            max="3000"
                            step="100"
                            value={leg.availableRunwayM}
                            onChange={(e) => handleUpdateLeg(index, { availableRunwayM: Number(e.target.value) })}
                            className="w-full accent-yellow-400"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA to Step 2 */}
        <div className="pt-4 flex justify-end border-t border-[var(--hud-border)]">
          <button
            onClick={onProceedToStep2}
            className="px-6 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wide uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span>Proceed to Step 2: Configure Flight Limits</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import type { CadetAircraftDesign, AircraftMassBudget } from '../../physics/aircraftDesign.ts';
import type { OperationalConstraints } from '../../physics/constraints.ts';
import type { FeasibilityAudit } from '../../physics/feasibility.ts';
import type { ProcurementEvaluation } from '../../physics/costRisk.ts';
import type { MissionLeg, MissionSimulationSummary } from '../../physics/missionLegs.ts';
import { simulateMission } from '../../physics/missionLegs.ts';
import {
  Award,
  XCircle,
  Compass,
  ArrowLeft,
  RotateCcw,
  Fuel,
  Plane,
  Zap,
  Package
} from 'lucide-react';

interface Step4MissionDebriefProps {
  design: CadetAircraftDesign;
  budget: AircraftMassBudget;
  constraints: OperationalConstraints;
  audit: FeasibilityAudit;
  procurement: ProcurementEvaluation;
  legs: MissionLeg[];
  onBackToStep3: () => void;
  onBackToStep2: () => void;
  onBackToStep1: () => void;
}

export function Step4MissionDebrief({
  design,
  budget,
  audit,
  procurement,
  legs,
  onBackToStep3,
  onBackToStep1,
}: Step4MissionDebriefProps) {
  // Run live mission simulation
  const simulation: MissionSimulationSummary = useMemo(() => {
    return simulateMission(design, budget, legs);
  }, [design, budget, legs]);

  // Check for stealth requirement during denied ingress
  const hasDeniedIngress = legs.some((l) => l.type === 'combat_air_to_ground');
  const stealthViolation = hasDeniedIngress && design.stealthLevel === 'conventional';

  // Determine Cadet Wings Award Badge
  const cadetWings = useMemo(() => {
    const isEnvelopFeasible = audit.isFeasible;
    const isFuelSafe = simulation.verdict === 'SUCCESS' && simulation.reserveMarginPercent >= 5;
    const isBudgetSafe = !procurement.isOverBudget;
    const isRiskLow = procurement.programRiskPercent <= 50;

    if (!isEnvelopFeasible || simulation.starvationLegIndex !== null || simulation.verdict === 'FAILED_LANDING' || simulation.verdict === 'FAILED_STALL' || stealthViolation) {
      return {
        tier: 'grounded',
        title: 'FLIGHT LINE GROUNDING // REDESIGN REQUIRED',
        badgeColor: 'border-red-500 bg-red-950/40 text-red-300',
        icon: <XCircle className="w-10 h-10 text-red-400" />,
        critique: stealthViolation
          ? 'Air Defense Network Intercept: Aircraft penetrated denied airspace without Low Observable (LO) shaping and was intercepted. Upgrade stealth level to Reduced Signature or VLO.'
          : simulation.critique || audit.criticalConstraint.remedyHint,
      };
    }

    if (isFuelSafe && simulation.reserveMarginPercent >= 10 && isBudgetSafe && isRiskLow) {
      return {
        tier: 'gold',
        title: '🥇 RAF CADET GOLD WINGS // EXCELLENCE IN AEROSPACE DESIGN',
        badgeColor: 'border-amber-400 bg-amber-950/40 text-amber-200',
        icon: <Award className="w-10 h-10 text-amber-400" />,
        critique:
          'Outstanding aeronautical engineering. The aircraft satisfies all 7 constraint boundaries, clears the sortie with generous fuel reserves (+10%), meets budget targets, and maintains low technological risk.',
      };
    }

    if (isFuelSafe && isBudgetSafe) {
      return {
        tier: 'silver',
        title: '🥈 RAF CADET SILVER WINGS // MISSION ACCOMPLISHED',
        badgeColor: 'border-slate-300 bg-slate-900/60 text-slate-200',
        icon: <Award className="w-10 h-10 text-slate-300" />,
        critique:
          'Sortie requirements successfully satisfied. The aircraft is feasible across all operational limits with full NATO contingency fuel reserves intact upon recovery.',
      };
    }

    return {
      tier: 'bronze',
      title: '🥉 RAF CADET BRONZE WINGS // MARGINAL SORTIE CLEARANCE',
      badgeColor: 'border-amber-700 bg-amber-950/20 text-amber-300',
      icon: <Award className="w-10 h-10 text-amber-600" />,
      critique:
        'Aircraft completed the flight profile, but operated close to minimum safety reserves or slightly breached procurement budget targets. Minor optimization recommended.',
    };
  }, [audit, simulation, procurement, stealthViolation]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Step Header */}
      <div className="bg-[var(--hud-panel-header)] border border-[var(--hud-border)] rounded-lg p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
            <Compass className="w-4 h-4" />
            STEP 4 OF 4 // SORTIE EXECUTION & AIR STAFF DEBRIEF
          </div>
          <h2 className="text-xl font-black text-white mt-1 tracking-tight">
            Mission Debriefing & Flight Line Verification
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
            Review your aircraft performance along the chronological flight profile. Inspect takeoff ground roll, Breguet fuel burn,
            instantaneous payload drop, and landing field safety.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToStep3}
            className="px-4 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Modify Sizing in Step 3</span>
          </button>
        </div>
      </div>

      {/* Formal RAF Cadet Wings Award Card */}
      <div className={`p-5 rounded-lg border shadow-xl flex items-center gap-5 ${cadetWings.badgeColor}`}>
        <div className="shrink-0">{cadetWings.icon}</div>
        <div className="space-y-1">
          <div className="text-sm sm:text-base font-black tracking-wide uppercase">
            {cadetWings.title}
          </div>
          <p className="text-xs leading-relaxed text-slate-200">
            {cadetWings.critique}
          </p>
        </div>
      </div>

      {/* Sortie Trajectory Profile Diagram */}
      <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--hud-border)] pb-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase">
            <Zap className="w-4 h-4" />
            Sortie Flight Trajectory & Mass Timeline
          </div>
          <span className="text-[11px] text-slate-400">
            {simulation.steps.length} Flight Legs // {simulation.totalDistanceKm} km Sortie
          </span>
        </div>

        {/* Profile SVG */}
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 900 180" className="w-full h-44 select-none bg-slate-950/70 rounded border border-slate-800">
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
            <line x1="40" y1="150" x2="880" y2="150" stroke="rgba(100,116,139,0.5)" strokeWidth="1.5" />

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
                  <polygon
                    points={`50,150 ${polylinePoints} ${points[points.length - 1].x},150`}
                    fill="#06b6d4"
                    opacity="0.15"
                  />
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((pt, idx) => (
                    <g key={pt.step.legId}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#22d3ee" stroke="#0f172a" strokeWidth="1.5" />
                      <text x={pt.x} y={pt.y - 10} fill="#22d3ee" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        L{idx + 1}
                      </text>
                      <text x={pt.x} y="166" fill="rgba(255,255,255,0.5)" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                        {pt.step.fuelPercentRemaining}%
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Flight Verification Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Fuel Margin */}
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-bold">
            <Fuel className="w-3.5 h-3.5 text-cyan-400" />
            Remaining Fuel Reserves
          </div>
          <div className="text-xl font-bold text-white">
            {simulation.finalFuelKg.toLocaleString()} kg
          </div>
          <div className={`text-[11px] font-bold ${simulation.reserveMarginKg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {simulation.reserveMarginPercent > 0 ? `+${simulation.reserveMarginPercent}%` : `${simulation.reserveMarginPercent}%`} NATO Margin
          </div>
        </div>

        {/* Takeoff Roll */}
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-bold">
            <Plane className="w-3.5 h-3.5 text-emerald-400" />
            Takeoff Ground Roll
          </div>
          <div className="text-xl font-bold text-white">
            {simulation.takeoffGroundRollM} m
          </div>
          <div className="text-[11px] text-slate-400">
            Unstick rotation at MTOW
          </div>
        </div>

        {/* Landing Field Required */}
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-bold">
            <Plane className="w-3.5 h-3.5 text-yellow-400" />
            Landing Field Required
          </div>
          <div className="text-xl font-bold text-white">
            {simulation.landingFieldReqM} m
          </div>
          <div className="text-[11px] text-slate-400">
            FAR 25 landing runway limit
          </div>
        </div>

        {/* Payload Delivered */}
        <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-bold">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            Payload Delivered
          </div>
          <div className="text-xl font-bold text-amber-300">
            {simulation.payloadDeliveredKg.toLocaleString()} kg
          </div>
          <div className="text-[11px] text-slate-400">
            Of {design.payloadKg.toLocaleString()} kg capacity
          </div>
        </div>
      </div>

      {/* Step-by-Step Leg Telemetry Table */}
      <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-5 shadow-lg space-y-3">
        <h3 className="font-bold text-white uppercase text-sm border-b border-[var(--hud-border)] pb-2">
          Chronological Sortie Step Log
        </h3>
        <div className="space-y-2">
          {simulation.steps.map((st) => (
            <div key={st.legId} className="bg-slate-950/70 p-3 rounded border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 font-mono">#{st.legIndex + 1}</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-900 border border-slate-700 text-slate-300">
                  {st.type.replace(/_/g, ' ')}
                </span>
                <span className="text-white font-semibold">{st.title}</span>
              </div>

              <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
                <span>Burn: <strong className="text-cyan-300">-{st.fuelBurnedKg} kg</strong></span>
                <span>Fuel Left: <strong className="text-white">{st.fuelPercentRemaining}%</strong></span>
                <span>End Mass: <strong>{st.endWeightKg.toLocaleString()} kg</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--hud-border)]">
        <button
          onClick={onBackToStep1}
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Design New Mission</span>
        </button>

        <button
          onClick={onBackToStep3}
          className="px-5 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tweak Aircraft Sizing in Step 3</span>
        </button>
      </div>
    </div>
  );
}

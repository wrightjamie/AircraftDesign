import { useState, useMemo, type MouseEvent } from 'react';
import {
  DEFAULT_MISSION_CONSTRAINTS,
  generateConstraintCurves,
  type OperationalConstraints
} from '../../physics/constraints.ts';
import {
  BENCHMARK_AIRCRAFT,
  type BenchmarkAircraft,
  type AircraftCategory,
  BENCHMARK_CATEGORIES
} from '../../data/benchmarks.ts';
import { CONSTRAINT_DETAILS, type ConstraintDetail } from '../../data/constraintDetails.ts';
import { type FeasibilityAudit } from '../../physics/feasibility.ts';
import { TacticalPopover } from '../ui/TacticalPopover';
import { Layers, Filter, Info, ShieldCheck, AlertTriangle, Target } from 'lucide-react';

export type WingLoadingUnit = 'N/m²' | 'kg/m²' | 'lb/ft²';

export interface ConstraintDiagramProps {
  onInspectConstraint: (detail: ConstraintDetail) => void;
  onSelectAircraft: (aircraft: BenchmarkAircraft) => void;
  designPoint?: { ws: number; tw: number; callsign?: string };
  audit?: FeasibilityAudit;
  activeConstraints?: OperationalConstraints;
}

export const ConstraintDiagram = ({
  onInspectConstraint,
  onSelectAircraft,
  designPoint,
  audit,
  activeConstraints,
}: ConstraintDiagramProps) => {
  // Constraints state (use activeConstraints from parent or fallback)
  const constraints = activeConstraints || DEFAULT_MISSION_CONSTRAINTS;

  // Dynamic Axis Limits
  const [maxWS, setMaxWS] = useState<number>(8000); // N/m²
  const [maxTW, setMaxTW] = useState<number>(1.25);
  const [unit, setUnit] = useState<WingLoadingUnit>('N/m²');

  // Filter Categories for Benchmarks
  const [selectedCategories, setSelectedCategories] = useState<Set<AircraftCategory>>(
    new Set(BENCHMARK_CATEGORIES)
  );

  // Visibility toggle for individual constraint layers
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    stall: true,
    takeoff: true,
    speed: true,
    climb: true,
    ceiling: true,
    turn: true,
    cruise: true,
    benchmarks: true,
    shading: true,
  });

  // Hover states for interactive glowing
  const [hoveredConstraintId, setHoveredConstraintId] = useState<string | null>(null);
  const [hoveredAircraftId, setHoveredAircraftId] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<AircraftCategory | null>(null);

  // Click Popover State (Popups appear on click, not hover)
  const [popover, setPopover] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    type: 'constraint' | 'aircraft' | 'design_point';
    constraintDetail?: ConstraintDetail;
    aircraft?: BenchmarkAircraft;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    type: 'constraint',
  });

  // Unit conversion multipliers
  const wsDisplayMultiplier = useMemo(() => {
    switch (unit) {
      case 'kg/m²': return 1 / 9.80665;
      case 'lb/ft²': return 0.0208854;
      case 'N/m²':
      default: return 1;
    }
  }, [unit]);

  // SVG Chart Geometry
  const width = 940;
  const height = 540;
  const margin = { top: 35, right: 40, bottom: 65, left: 75 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scale Functions (data to pixel coordinates)
  const scaleX = (ws: number) => {
    return margin.left + (ws / maxWS) * innerWidth;
  };

  const scaleY = (tw: number) => {
    return margin.top + innerHeight - (tw / maxTW) * innerHeight;
  };

  // Generate physics constraint curves
  const curves = useMemo(() => {
    return generateConstraintCurves(constraints, 100, maxWS, 120);
  }, [constraints, maxWS]);

  // Convert points to SVG polyline / path strings
  const createPathString = (points: { ws: number; tw: number }[]) => {
    return points
      .map((p, idx) => {
        const x = scaleX(p.ws);
        const y = Math.max(margin.top, Math.min(margin.top + innerHeight, scaleY(p.tw)));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Create shaded non-viable polygon for curves bounded by chart bottom (T/W = 0)
  const createBelowCurvePolygon = (points: { ws: number; tw: number }[]) => {
    if (points.length === 0) return '';
    const firstX = scaleX(points[0].ws);
    const lastX = scaleX(points[points.length - 1].ws);
    const bottomY = margin.top + innerHeight;

    const curvePath = points
      .map((p) => {
        const x = scaleX(p.ws);
        const y = Math.max(margin.top, Math.min(bottomY, scaleY(p.tw)));
        return `L ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return `M ${firstX.toFixed(1)},${bottomY.toFixed(1)} ${curvePath} L ${lastX.toFixed(1)},${bottomY.toFixed(1)} Z`;
  };

  // Stall Speed shaded region (Right of vertical line)
  const stallX = scaleX(curves.stallWS);
  const stallShadedWidth = Math.max(0, margin.left + innerWidth - stallX);

  // Toggle Category
  const toggleCategory = (cat: AircraftCategory) => {
    const next = new Set(selectedCategories);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setSelectedCategories(next);
  };

  // Filtered Benchmark Aircraft
  const visibleAircraft = useMemo(() => {
    return BENCHMARK_AIRCRAFT.filter(
      (ac) => selectedCategories.has(ac.category) && ac.wingLoadingNm2 <= maxWS * 1.05
    );
  }, [selectedCategories, maxWS]);

  // Handle curve click (opens tactical popover on click)
  const handleCurveClick = (
    e: MouseEvent,
    constraintId: 'stall' | 'takeoff' | 'speed' | 'climb' | 'ceiling' | 'turn' | 'cruise'
  ) => {
    e.stopPropagation();
    const detail = CONSTRAINT_DETAILS[constraintId];
    setPopover({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'constraint',
      constraintDetail: detail,
    });
  };

  // Handle benchmark click (opens popover on click)
  const handleAircraftClick = (e: MouseEvent, ac: BenchmarkAircraft) => {
    e.stopPropagation();
    setPopover({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'aircraft',
      aircraft: ac,
    });
  };

  // Generate grid ticks
  const wsTicks = useMemo(() => {
    const count = 8;
    const step = maxWS / count;
    return Array.from({ length: count + 1 }, (_, i) => i * step);
  }, [maxWS]);

  const twTicks = useMemo(() => {
    const count = 5;
    const step = maxTW / count;
    return Array.from({ length: count + 1 }, (_, i) => Number((i * step).toFixed(2)));
  }, [maxTW]);

  return (
    <div className="w-full flex flex-col gap-4 font-mono select-none">
      {/* Top Tactical Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-3">
        {/* Category Filters with Interactive Glow on Hover */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[var(--hud-text-muted)] uppercase tracking-wider flex items-center gap-1 font-bold mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Fleet Filter:
          </span>
          {BENCHMARK_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                onMouseEnter={() => setHoveredCategory(cat)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`text-xs px-2.5 py-1 rounded-sm border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 font-semibold shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                } ${hoveredCategory === cat ? 'ring-1 ring-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : ''}`}
              >
                {cat} ({BENCHMARK_AIRCRAFT.filter(a => a.category === cat).length})
              </button>
            );
          })}
        </div>

        {/* Dynamic Scale & Unit Switchers */}
        <div className="flex items-center gap-3">
          {/* Unit Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-sm p-0.5 text-xs">
            {(['N/m²', 'kg/m²', 'lb/ft²'] as WingLoadingUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                  unit === u
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Dynamic Range Presets */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[10px] text-slate-500 uppercase">Scale:</span>
            <select
              value={maxWS}
              onChange={(e) => setMaxWS(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 text-cyan-300 rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value={4000}>Trainers / Gliders (4k)</option>
              <option value={8000}>Multi-Role Fleet (8k)</option>
              <option value={12000}>Heavy Supersonic (12k)</option>
            </select>

            <select
              value={maxTW}
              onChange={(e) => setMaxTW(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 text-cyan-300 rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value={0.8}>T/W 0.8 (Transports)</option>
              <option value={1.25}>T/W 1.25 (Standard)</option>
              <option value={1.6}>T/W 1.6 (Fast Interceptors)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Feasibility Audit Status Banner */}
      {audit && (
        <div
          className={`px-4 py-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
            audit.isFeasible
              ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
              : 'bg-red-950/70 border-red-500/80 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {audit.isFeasible ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <span className="font-bold tracking-wide uppercase text-slate-100 flex items-center gap-2">
                {audit.isFeasible
                  ? 'FEASIBLE DESIGN ENVELOPE // ALL REQUIREMENTS SATISFIED'
                  : `DESIGN VIOLATION DETECTED // ${audit.violationCount} CONSTRAINT${audit.violationCount > 1 ? 'S' : ''} BREACHED`}
                <span className="text-[10px] font-normal opacity-75">
                  ({designPoint?.callsign || 'CADET CRAFT'})
                </span>
              </span>
              <p className="text-[11px] opacity-85">
                {audit.isFeasible
                  ? `Design point sits safely within the valid flight envelope. Critical constraint: ${audit.criticalConstraint.name} (${audit.criticalConstraint.marginPercent > 0 ? '+' : ''}${audit.criticalConstraint.marginPercent}% margin).`
                  : audit.criticalConstraint.diagnosis}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {audit.results.map((r) => (
              <button
                key={r.id}
                onClick={() => setHoveredConstraintId(r.id)}
                className={`text-[10px] px-2 py-0.5 rounded-xs border font-mono font-semibold cursor-pointer transition-all ${
                  r.isViolated
                    ? 'bg-red-900 border-red-400 text-white shadow-xs'
                    : 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                } ${hoveredConstraintId === r.id ? 'ring-1 ring-white' : ''}`}
                title={`${r.name}: ${r.marginPercent > 0 ? '+' : ''}${r.marginPercent}% margin`}
              >
                {r.name.split(' ')[0]}: {r.marginPercent > 0 ? '+' : ''}{r.marginPercent}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div className="relative w-full bg-[var(--hud-bg)] border border-[var(--hud-border-bright)] rounded-lg p-2 shadow-2xl overflow-hidden">
        {/* Tactical Corner Crosshairs */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/80 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-500/80 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-500/80 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/80 pointer-events-none" />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          style={{ maxHeight: '680px' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="minorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--hud-grid)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect
            x={margin.left}
            y={margin.top}
            width={innerWidth}
            height={innerHeight}
            fill="url(#minorGrid)"
          />

          {/* Major Grid Lines */}
          {wsTicks.map((tick) => (
            <line
              key={`grid-ws-${tick}`}
              x1={scaleX(tick)}
              y1={margin.top}
              x2={scaleX(tick)}
              y2={margin.top + innerHeight}
              stroke="var(--hud-grid-major)"
              strokeWidth="0.8"
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
          ))}

          {twTicks.map((tick) => (
            <line
              key={`grid-tw-${tick}`}
              x1={margin.left}
              y1={scaleY(tick)}
              x2={margin.left + innerWidth}
              y2={scaleY(tick)}
              stroke="var(--hud-grid-major)"
              strokeWidth="0.8"
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
          ))}

          {/* ============================================================ */}
          {/* DEEP MUTED NON-VIABLE REGION SHADING & HOVER GLOWS           */}
          {/* Default fill is lower opacity (darker against hud-bg)        */}
          {/* Hovering line or button triggers glowing fill (15% opacity)  */}
          {/* ============================================================ */}
          {visibleLayers.shading && (
            <g className="transition-all duration-200">
              {/* 1. Stall Speed: Shaded non-viable region to the RIGHT */}
              {visibleLayers.stall && stallShadedWidth > 0 && (
                <rect
                  x={stallX}
                  y={margin.top}
                  width={stallShadedWidth}
                  height={innerHeight}
                  fill={
                    hoveredConstraintId === 'stall'
                      ? 'color-mix(in srgb, var(--color-stall) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-stall) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}

              {/* 2. Takeoff: Shaded non-viable region BELOW line */}
              {visibleLayers.takeoff && (
                <path
                  d={createBelowCurvePolygon(curves.takeoffPoints)}
                  fill={
                    hoveredConstraintId === 'takeoff'
                      ? 'color-mix(in srgb, var(--color-takeoff) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-takeoff) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}

              {/* 3. Max Speed: Shaded non-viable region BELOW U-curve */}
              {visibleLayers.speed && (
                <path
                  d={createBelowCurvePolygon(curves.maxSpeedPoints)}
                  fill={
                    hoveredConstraintId === 'speed'
                      ? 'color-mix(in srgb, var(--color-speed) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-speed) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}

              {/* 4. Rate of Climb: Shaded non-viable region BELOW curve */}
              {visibleLayers.climb && (
                <path
                  d={createBelowCurvePolygon(curves.climbPoints)}
                  fill={
                    hoveredConstraintId === 'climb'
                      ? 'color-mix(in srgb, var(--color-climb) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-climb) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}

              {/* 5. Service Ceiling: Shaded non-viable region BELOW curve */}
              {visibleLayers.ceiling && (
                <path
                  d={createBelowCurvePolygon(curves.ceilingPoints)}
                  fill={
                    hoveredConstraintId === 'ceiling'
                      ? 'color-mix(in srgb, var(--color-ceiling) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-ceiling) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}

              {/* 6. Sustained Turn: Shaded non-viable region BELOW parabola */}
              {visibleLayers.turn && (
                <path
                  d={createBelowCurvePolygon(curves.turnPoints)}
                  fill={
                    hoveredConstraintId === 'turn'
                      ? 'color-mix(in srgb, var(--color-turn) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-turn) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}

              {/* 7. Cruise Floor: Shaded non-viable region BELOW floor */}
              {visibleLayers.cruise && (
                <rect
                  x={margin.left}
                  y={scaleY(curves.cruiseTW)}
                  width={innerWidth}
                  height={margin.top + innerHeight - scaleY(curves.cruiseTW)}
                  fill={
                    hoveredConstraintId === 'cruise'
                      ? 'color-mix(in srgb, var(--color-cruise) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-cruise) 3.5%, transparent)'
                  }
                  className="transition-colors pointer-events-none"
                />
              )}
            </g>
          )}

          {/* ============================================================ */}
          {/* EXTENDED CONSTRAINT BOUNDARY LINES (STROKES)                 */}
          {/* Hovering causes glow and thickens line; Clicking opens popup */}
          {/* ============================================================ */}

          {/* 1. Stall Speed (Vertical Line extending full chart height) */}
          {visibleLayers.stall && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('stall')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'stall')}
            >
              <line
                x1={stallX}
                y1={margin.top}
                x2={stallX}
                y2={margin.top + innerHeight}
                stroke="transparent"
                strokeWidth="20"
              />
              <line
                x1={stallX}
                y1={margin.top}
                x2={stallX}
                y2={margin.top + innerHeight}
                stroke="var(--color-stall)"
                strokeWidth={hoveredConstraintId === 'stall' ? '3.5' : '2'}
                strokeDasharray="6 3"
                style={{
                  filter: hoveredConstraintId === 'stall' ? 'drop-shadow(0 0 8px var(--color-stall))' : undefined
                }}
                className="transition-all"
              />
              <g transform={`translate(${stallX - 10}, ${margin.top + 30}) rotate(-90)`}>
                <text
                  fill="var(--color-stall)"
                  fontSize="10"
                  fontWeight="bold"
                  className="tracking-wider uppercase"
                >
                  STALL SPEED / LANDING LIMIT ▶
                </text>
              </g>
            </g>
          )}

          {/* 2. Takeoff Field Length */}
          {visibleLayers.takeoff && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('takeoff')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'takeoff')}
            >
              <path
                d={createPathString(curves.takeoffPoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              <path
                d={createPathString(curves.takeoffPoints)}
                fill="none"
                stroke="var(--color-takeoff)"
                strokeWidth={hoveredConstraintId === 'takeoff' ? '3.5' : '2'}
                style={{
                  filter: hoveredConstraintId === 'takeoff' ? 'drop-shadow(0 0 8px var(--color-takeoff))' : undefined
                }}
                className="transition-all"
              />
            </g>
          )}

          {/* 3. Maximum Speed */}
          {visibleLayers.speed && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('speed')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'speed')}
            >
              <path
                d={createPathString(curves.maxSpeedPoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              <path
                d={createPathString(curves.maxSpeedPoints)}
                fill="none"
                stroke="var(--color-speed)"
                strokeWidth={hoveredConstraintId === 'speed' ? '3.5' : '2'}
                style={{
                  filter: hoveredConstraintId === 'speed' ? 'drop-shadow(0 0 8px var(--color-speed))' : undefined
                }}
                className="transition-all"
              />
            </g>
          )}

          {/* 4. Rate of Climb */}
          {visibleLayers.climb && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('climb')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'climb')}
            >
              <path
                d={createPathString(curves.climbPoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              <path
                d={createPathString(curves.climbPoints)}
                fill="none"
                stroke="var(--color-climb)"
                strokeWidth={hoveredConstraintId === 'climb' ? '3.5' : '2'}
                style={{
                  filter: hoveredConstraintId === 'climb' ? 'drop-shadow(0 0 8px var(--color-climb))' : undefined
                }}
                className="transition-all"
              />
            </g>
          )}

          {/* 5. Service Ceiling */}
          {visibleLayers.ceiling && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('ceiling')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'ceiling')}
            >
              <path
                d={createPathString(curves.ceilingPoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              <path
                d={createPathString(curves.ceilingPoints)}
                fill="none"
                stroke="var(--color-ceiling)"
                strokeWidth={hoveredConstraintId === 'ceiling' ? '3.5' : '2'}
                strokeDasharray="4 2"
                style={{
                  filter: hoveredConstraintId === 'ceiling' ? 'drop-shadow(0 0 8px var(--color-ceiling))' : undefined
                }}
                className="transition-all"
              />
            </g>
          )}

          {/* 6. Sustained Turn */}
          {visibleLayers.turn && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('turn')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'turn')}
            >
              <path
                d={createPathString(curves.turnPoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              <path
                d={createPathString(curves.turnPoints)}
                fill="none"
                stroke="var(--color-turn)"
                strokeWidth={hoveredConstraintId === 'turn' ? '3.5' : '2'}
                style={{
                  filter: hoveredConstraintId === 'turn' ? 'drop-shadow(0 0 8px var(--color-turn))' : undefined
                }}
                className="transition-all"
              />
            </g>
          )}

          {/* 7. Cruise Floor */}
          {visibleLayers.cruise && (
            <g
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredConstraintId('cruise')}
              onMouseLeave={() => setHoveredConstraintId(null)}
              onClick={(e) => handleCurveClick(e, 'cruise')}
            >
              <line
                x1={margin.left}
                y1={scaleY(curves.cruiseTW)}
                x2={margin.left + innerWidth}
                y2={scaleY(curves.cruiseTW)}
                stroke="transparent"
                strokeWidth="20"
              />
              <line
                x1={margin.left}
                y1={scaleY(curves.cruiseTW)}
                x2={margin.left + innerWidth}
                y2={scaleY(curves.cruiseTW)}
                stroke="var(--color-cruise)"
                strokeWidth={hoveredConstraintId === 'cruise' ? '3.5' : '2'}
                style={{
                  filter: hoveredConstraintId === 'cruise' ? 'drop-shadow(0 0 8px var(--color-cruise))' : undefined
                }}
                className="transition-all"
              />
            </g>
          )}

          {/* ============================================================ */}
          {/* BENCHMARK AIRCRAFT PLOT POINTS                               */}
          {/* Glow on hover directly OR when hovering category button      */}
          {/* Popover opens on CLICK                                       */}
          {/* ============================================================ */}
          {visibleLayers.benchmarks &&
            visibleAircraft.map((ac) => {
              const cx = scaleX(ac.wingLoadingNm2);
              const cy = scaleY(ac.thrustToWeight);

              // Skip if outside chart bounds
              if (cx < margin.left || cx > margin.left + innerWidth || cy < margin.top || cy > margin.top + innerHeight) {
                return null;
              }

              const isGlowing = hoveredAircraftId === ac.id || hoveredCategory === ac.category;

              return (
                <g
                  key={ac.id}
                  className="cursor-pointer group transition-transform"
                  onMouseEnter={() => setHoveredAircraftId(ac.id)}
                  onMouseLeave={() => setHoveredAircraftId(null)}
                  onClick={(e) => handleAircraftClick(e, ac)}
                >
                  {/* Invisible wide hit target for click/hover */}
                  <circle cx={cx} cy={cy} r="18" fill="transparent" />

                  {/* Target radar ring (Glows and expands on hover) */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isGlowing ? 12 : 8}
                    fill="none"
                    stroke={isGlowing ? 'var(--hud-accent)' : 'var(--color-benchmark)'}
                    strokeWidth={isGlowing ? '1.5' : '0.8'}
                    strokeDasharray={isGlowing ? undefined : '2 2'}
                    style={{
                      filter: isGlowing ? 'drop-shadow(0 0 6px var(--hud-accent))' : undefined
                    }}
                    className={`transition-all duration-200 ${isGlowing ? 'opacity-100' : 'opacity-60'}`}
                  />
                  {/* Inner Solid Marker */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isGlowing ? 5.5 : 4}
                    fill={isGlowing ? '#ffffff' : 'var(--color-benchmark)'}
                    stroke="#0b0f17"
                    strokeWidth="1.5"
                    style={{
                      filter: isGlowing ? 'drop-shadow(0 0 8px #38bdf8)' : undefined
                    }}
                    className="transition-all duration-200"
                  />
                  {/* Label tag */}
                  <text
                    x={cx + 8}
                    y={cy - 5}
                    fill={isGlowing ? '#38bdf8' : 'var(--hud-text)'}
                    fontSize={isGlowing ? '10' : '9'}
                    fontWeight={isGlowing ? 'bold' : '600'}
                    className="pointer-events-none transition-all drop-shadow-md"
                  >
                    {ac.designation}
                  </text>
                </g>
              );
            })}

          {/* ============================================================ */}
          {/* CADET ACTIVE AIRCRAFT DESIGN POINT                           */}
          {/* ============================================================ */}
          {designPoint && (() => {
            const cx = scaleX(designPoint.ws);
            const cy = scaleY(designPoint.tw);
            const isFeasible = audit?.isFeasible ?? true;
            const statusColor = isFeasible ? '#22c55e' : '#ef4444';

            const inBounds =
              cx >= margin.left &&
              cx <= margin.left + innerWidth &&
              cy >= margin.top &&
              cy <= margin.top + innerHeight;

            if (!inBounds) return null;

            return (
              <g
                key="cadet-design-point"
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopover({
                    isOpen: true,
                    x: e.clientX,
                    y: e.clientY,
                    type: 'design_point',
                  });
                }}
              >
                {/* Projection Lines to Axes */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={margin.top + innerHeight}
                  stroke={statusColor}
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  className="opacity-70 group-hover:opacity-100"
                />
                <line
                  x1={cx}
                  y1={cy}
                  x2={margin.left}
                  y2={cy}
                  stroke={statusColor}
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  className="opacity-70 group-hover:opacity-100"
                />

                {/* X-Axis Marker Value Badge */}
                <rect
                  x={cx - 24}
                  y={margin.top + innerHeight + 4}
                  width="48"
                  height="14"
                  rx="2"
                  fill="#0b0f17"
                  stroke={statusColor}
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={margin.top + innerHeight + 14}
                  textAnchor="middle"
                  fill={statusColor}
                  fontSize="8"
                  fontWeight="bold"
                >
                  {Math.round(designPoint.ws * wsDisplayMultiplier)}
                </text>

                {/* Y-Axis Marker Value Badge */}
                <rect
                  x={margin.left - 42}
                  y={cy - 7}
                  width="38"
                  height="14"
                  rx="2"
                  fill="#0b0f17"
                  stroke={statusColor}
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 23}
                  y={cy + 3}
                  textAnchor="middle"
                  fill={statusColor}
                  fontSize="8"
                  fontWeight="bold"
                >
                  {designPoint.tw.toFixed(3)}
                </text>

                {/* Pulsing Outer Radar Target Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="16"
                  fill="none"
                  stroke={statusColor}
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  style={{
                    filter: `drop-shadow(0 0 8px ${statusColor})`,
                  }}
                  className="opacity-90"
                />

                {/* Middle Target Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="10"
                  fill={`color-mix(in srgb, ${statusColor} 20%, transparent)`}
                  stroke={statusColor}
                  strokeWidth="2"
                  style={{ filter: `drop-shadow(0 0 6px ${statusColor})` }}
                />

                {/* Crosshair Spikes */}
                <line x1={cx - 15} y1={cy} x2={cx - 5} y2={cy} stroke={statusColor} strokeWidth="2" />
                <line x1={cx + 5} y1={cy} x2={cx + 15} y2={cy} stroke={statusColor} strokeWidth="2" />
                <line x1={cx} y1={cy - 15} x2={cx} y2={cy - 5} stroke={statusColor} strokeWidth="2" />
                <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 15} stroke={statusColor} strokeWidth="2" />

                {/* Solid Center Pip */}
                <circle cx={cx} cy={cy} r="3.5" fill="#ffffff" />

                {/* Callsign & Status Flag Floating Tag */}
                <g transform={`translate(${cx + 18}, ${cy - 12})`}>
                  <rect
                    x="-4"
                    y="-12"
                    width="142"
                    height="24"
                    rx="3"
                    fill="#0f172a"
                    stroke={statusColor}
                    strokeWidth="1.2"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))' }}
                  />
                  <text x="4" y="0" fill="#ffffff" fontSize="9" fontWeight="bold">
                    {designPoint.callsign || 'CADET DESIGN'}
                  </text>
                  <text
                    x="4"
                    y="8"
                    fill={statusColor}
                    fontSize="7.5"
                    fontWeight="bold"
                    className="uppercase tracking-wider"
                  >
                    {isFeasible ? '● FEASIBLE ENVELOPE' : '▲ CONSTRAINTS BREACHED'}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* ============================================================ */}
          {/* AXES LABELS & TICKS                                          */}
          {/* ============================================================ */}
          {/* Bottom Axis Line */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight}
            stroke="var(--hud-border-bright)"
            strokeWidth="1.5"
          />
          {/* Left Axis Line */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerHeight}
            stroke="var(--hud-border-bright)"
            strokeWidth="1.5"
          />

          {/* X-Axis Ticks & Values */}
          {wsTicks.map((tick) => (
            <g key={`x-tick-${tick}`} transform={`translate(${scaleX(tick)}, ${margin.top + innerHeight})`}>
              <line y2="6" stroke="var(--hud-border-bright)" strokeWidth="1.5" />
              <text
                y="20"
                textAnchor="middle"
                fill="var(--hud-text-muted)"
                fontSize="10"
                fontFamily="monospace"
              >
                {Math.round(tick * wsDisplayMultiplier).toLocaleString()}
              </text>
            </g>
          ))}

          {/* Y-Axis Ticks & Values */}
          {twTicks.map((tick) => (
            <g key={`y-tick-${tick}`} transform={`translate(${margin.left}, ${scaleY(tick)})`}>
              <line x2="-6" stroke="var(--hud-border-bright)" strokeWidth="1.5" />
              <text
                x="-12"
                y="4"
                textAnchor="end"
                fill="var(--hud-text-muted)"
                fontSize="10"
                fontFamily="monospace"
              >
                {tick.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          <text
            x={margin.left + innerWidth / 2}
            y={height - 15}
            textAnchor="middle"
            fill="var(--hud-text)"
            fontSize="12"
            fontWeight="bold"
            letterSpacing="0.08em"
          >
            WING LOADING (W/S) [{unit}] ➔
          </text>

          <text
            transform={`translate(22, ${margin.top + innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fill="var(--hud-text)"
            fontSize="12"
            fontWeight="bold"
            letterSpacing="0.08em"
          >
            THRUST-TO-WEIGHT RATIO (T/W) ➔
          </text>
        </svg>
      </div>

      {/* Layer Visibility & Quick Legend Bar with Hover Glow on Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--hud-panel)] border border-[var(--hud-border)] rounded-lg p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[10px] uppercase text-[var(--hud-text-muted)] font-bold flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            Constraints:
          </span>

          {[
            { id: 'stall', name: 'Stall Speed', color: 'var(--color-stall)' },
            { id: 'takeoff', name: 'Takeoff Roll', color: 'var(--color-takeoff)' },
            { id: 'speed', name: 'Max Speed', color: 'var(--color-speed)' },
            { id: 'climb', name: 'Climb Rate', color: 'var(--color-climb)' },
            { id: 'ceiling', name: 'Service Ceiling', color: 'var(--color-ceiling)' },
            { id: 'turn', name: 'Maneuver Turn', color: 'var(--color-turn)' },
            { id: 'cruise', name: 'Cruise Floor', color: 'var(--color-cruise)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() =>
                setVisibleLayers((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
              onMouseEnter={() => setHoveredConstraintId(item.id)}
              onMouseLeave={() => setHoveredConstraintId(null)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border cursor-pointer transition-all ${
                visibleLayers[item.id]
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-transparent border-transparent opacity-40 text-slate-600'
              } ${hoveredConstraintId === item.id ? 'ring-1 shadow-md scale-105' : ''}`}
              style={{
                borderColor: hoveredConstraintId === item.id ? item.color : undefined,
                boxShadow: hoveredConstraintId === item.id ? `0 0 10px ${item.color}` : undefined
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-xs inline-block"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Shading & Benchmarks master toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={visibleLayers.shading}
              onChange={(e) =>
                setVisibleLayers((prev) => ({ ...prev, shading: e.target.checked }))
              }
              className="rounded-xs accent-cyan-500"
            />
            <span className="text-[11px]">Shade Infeasible Zones</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={visibleLayers.benchmarks}
              onChange={(e) =>
                setVisibleLayers((prev) => ({ ...prev, benchmarks: e.target.checked }))
              }
              className="rounded-xs accent-cyan-500"
            />
            <span className="text-[11px]">Overlay Fleet ({visibleAircraft.length})</span>
          </label>
        </div>
      </div>

      {/* Reusable Click Popover */}
      <TacticalPopover
        isOpen={popover.isOpen}
        x={popover.x}
        y={popover.y}
        onClose={() => setPopover((prev) => ({ ...prev, isOpen: false }))}
        accentColor={
          popover.type === 'constraint'
            ? popover.constraintDetail?.colorVar
            : popover.type === 'design_point'
            ? (audit?.isFeasible ? '#22c55e' : '#ef4444')
            : 'var(--color-benchmark)'
        }
      >
        {popover.type === 'design_point' && designPoint && audit && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-slate-100">
                  {designPoint.callsign || 'CADET AIRCRAFT'}
                </span>
              </div>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-xs font-bold uppercase ${
                  audit.isFeasible
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                    : 'bg-red-950 border border-red-500 text-red-300'
                }`}
              >
                {audit.isFeasible ? 'FEASIBLE' : `${audit.violationCount} VIOLATIONS`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/90 p-2 rounded-sm border border-slate-800">
              <div>
                <span className="text-slate-500 uppercase block">Wing Loading</span>
                <span className="font-bold text-cyan-300 text-xs">
                  {Math.round(designPoint.ws * wsDisplayMultiplier).toLocaleString()} {unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block">Thrust-to-Weight</span>
                <span className="font-bold text-emerald-300 text-xs">
                  {designPoint.tw.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Checklist of all 7 constraints with margins */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Requirements Compliance Audit:
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {audit.results.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-1.5 rounded-xs border text-[10px] ${
                      r.isViolated
                        ? 'bg-red-950/40 border-red-800/80 text-red-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-semibold">{r.name}</span>
                    <span
                      className={`font-mono font-bold ${
                        r.isViolated ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {r.marginPercent > 0 ? '+' : ''}{r.marginPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {!audit.isFeasible && (
              <div className="bg-red-950/40 border border-red-800/80 p-2 rounded-xs text-[10px] space-y-1 text-red-300">
                <span className="font-bold block uppercase text-red-400">
                  Engineering Action Required:
                </span>
                <p>{audit.criticalConstraint.remedyHint}</p>
              </div>
            )}
          </div>
        )}
        {popover.type === 'constraint' && popover.constraintDetail && (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
              <span
                style={{ color: popover.constraintDetail.colorVar }}
                className="font-bold text-xs uppercase tracking-wider"
              >
                {popover.constraintDetail.title}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-normal">
              {popover.constraintDetail.shortRule}
            </p>

            <div className="bg-slate-900/80 p-2 rounded-sm border border-slate-800 text-[10px] space-y-1">
              <div>
                <span className="text-slate-500 uppercase">Non-Viable Region: </span>
                <span className="text-red-400 font-semibold">
                  {popover.constraintDetail.infeasibleSide}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase">Consequence: </span>
                <span className="text-slate-300">
                  {popover.constraintDetail.violationConsequence}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setPopover((prev) => ({ ...prev, isOpen: false }));
                onInspectConstraint(popover.constraintDetail!);
              }}
              className="w-full mt-2 py-1.5 px-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/80 hover:border-cyan-500 text-cyan-300 text-[11px] font-bold rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              Inspect Physics & Formula →
            </button>
          </div>
        )}

        {popover.type === 'aircraft' && popover.aircraft && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div>
                <span className="font-bold text-xs text-sky-400">
                  {popover.aircraft.name}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {popover.aircraft.designation} ({popover.aircraft.year})
                </span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-sky-950 border border-sky-800 text-sky-300 font-bold uppercase">
                {popover.aircraft.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-900/80 p-2 rounded-sm border border-slate-800">
              <div>
                <span className="text-slate-500 uppercase block">Wing Loading</span>
                <span className="font-bold text-cyan-300">
                  {Math.round(popover.aircraft.wingLoadingNm2 * wsDisplayMultiplier).toLocaleString()} {unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block">Thrust-to-Weight</span>
                <span className="font-bold text-emerald-300">
                  {popover.aircraft.thrustToWeight.toFixed(3)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block">MTOW</span>
                <span className="font-bold text-slate-200">
                  {popover.aircraft.mtowKg.toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block">Max Speed</span>
                <span className="font-bold text-purple-300">
                  {popover.aircraft.maxSpeedKts} kts
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              {popover.aircraft.role}
            </p>

            <button
              onClick={() => {
                setPopover((prev) => ({ ...prev, isOpen: false }));
                onSelectAircraft(popover.aircraft!);
              }}
              className="w-full mt-2 py-1.5 px-3 bg-sky-950 hover:bg-sky-900 border border-sky-700/80 hover:border-sky-500 text-sky-300 text-[11px] font-bold rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              Open Engineering Dossier →
            </button>
          </div>
        )}
      </TacticalPopover>
    </div>
  );
};

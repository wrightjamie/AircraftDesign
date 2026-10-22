import { useState, useMemo } from 'react';
import { ConstraintDiagram } from './components/chart/ConstraintDiagram';
import { ParametricPanel } from './components/design/ParametricPanel';
import { SlideDrawer } from './components/ui/SlideDrawer';
import { EquationDisplay } from './components/ui/EquationDisplay';
import { BenchmarkDossier } from './components/benchmarks/BenchmarkDossier';
import {
  DEFAULT_CADET_DESIGN,
  calculateAircraftMassBudget,
  type CadetAircraftDesign
} from './physics/aircraftDesign';
import { auditAircraftFeasibility } from './physics/feasibility';
import { DEFAULT_MISSION_CONSTRAINTS } from './physics/constraints';
import type { ConstraintDetail } from './data/constraintDetails';
import type { BenchmarkAircraft } from './data/benchmarks';
import {
  Compass,
  BookOpen,
  Plane,
  FileText,
  Sliders,
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';

export function App() {
  // Cadet Aircraft Design State (Milestone 2)
  const [cadetDesign, setCadetDesign] = useState<CadetAircraftDesign>(DEFAULT_CADET_DESIGN);

  // Active View Mode for Cadets (Full Console vs Focused Views)
  const [viewMode, setViewMode] = useState<'console' | 'chart' | 'sliders'>('console');

  // Compute Mass Budget & Design Point
  const massBudget = useMemo(() => {
    return calculateAircraftMassBudget(cadetDesign);
  }, [cadetDesign]);

  // Dynamically update mission constraints based on aircraft geometry (CD0, AR, e, CLmax)
  const activeConstraints = useMemo(() => {
    return {
      ...DEFAULT_MISSION_CONSTRAINTS,
      cd0: massBudget.cd0,
      aspectRatio: cadetDesign.aspectRatio,
      oswaldEfficiency: massBudget.oswaldEfficiency,
      clMax: massBudget.clMaxFlaps,
    };
  }, [cadetDesign, massBudget]);

  // Compute Real-Time Feasibility Audit
  const feasibilityAudit = useMemo(() => {
    return auditAircraftFeasibility(massBudget, activeConstraints);
  }, [massBudget, activeConstraints]);

  // Drawer state
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    mode: 'constraint' | 'aircraft';
    constraintDetail: ConstraintDetail | null;
    aircraft: BenchmarkAircraft | null;
  }>({
    isOpen: false,
    mode: 'constraint',
    constraintDetail: null,
    aircraft: null,
  });

  const handleInspectConstraint = (detail: ConstraintDetail) => {
    setDrawerState({
      isOpen: true,
      mode: 'constraint',
      constraintDetail: detail,
      aircraft: null,
    });
  };

  const handleSelectAircraft = (aircraft: BenchmarkAircraft) => {
    setDrawerState({
      isOpen: true,
      mode: 'aircraft',
      constraintDetail: null,
      aircraft: aircraft,
    });
  };

  const handleCloseDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-[var(--hud-bg)] text-[var(--hud-text)] flex flex-col font-mono selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Military HUD Navigation Bar */}
      <header className="border-b border-[var(--hud-border)] bg-[var(--hud-panel-header)] px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* RAFAC Brand & Title */}
          <div className="flex items-center gap-3">
            {/* RAF Target Roundel Emblem */}
            <div className="relative w-9 h-9 rounded-full bg-red-600 flex items-center justify-center p-0.5 shadow-md shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest text-cyan-400 font-bold uppercase">
                  ROYAL AIR FORCE AIR CADETS
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 border rounded-xs font-semibold ${
                    feasibilityAudit.isFeasible
                      ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                      : 'bg-red-950/80 border-red-700/60 text-red-400'
                  }`}
                >
                  {feasibilityAudit.isFeasible ? 'ENVELOPE VIABLE' : 'VIOLATION DETECTED'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                AEROSPACE DESIGN SIMULATION
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                  // PARAMETRIC SIZING & CONSTRAINTS
                </span>
              </h1>
            </div>
          </div>

          {/* Sizing Context Badge */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-md px-3 py-1.5 text-xs">
            <Compass className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[10px] uppercase text-slate-500 block leading-tight">
                Active Airframe Sizing
              </span>
              <span className="font-bold text-slate-200">
                {cadetDesign.callsign} ({massBudget.mtowKg.toLocaleString()} kg MTOW)
              </span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-sm p-0.5 text-xs">
            <button
              onClick={() => setViewMode('console')}
              className={`px-2.5 py-1 rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === 'console'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Full Console</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-2.5 py-1 rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === 'chart'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Chart Focus</span>
            </button>
            <button
              onClick={() => setViewMode('sliders')}
              className={`px-2.5 py-1 rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === 'sliders'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sliders Only</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Simulation Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Console View: Parametric Panel & Constraint Diagram */}
        {viewMode === 'console' && (
          <div className="space-y-6">
            {/* The Master Interactive SVG Constraint Diagram with Cadet Design Point */}
            <ConstraintDiagram
              onInspectConstraint={handleInspectConstraint}
              onSelectAircraft={handleSelectAircraft}
              designPoint={{
                ws: massBudget.wingLoadingNm2,
                tw: massBudget.thrustToWeight,
                callsign: cadetDesign.callsign,
              }}
              audit={feasibilityAudit}
              activeConstraints={activeConstraints}
            />

            {/* Parametric Input Sliders Panel */}
            <ParametricPanel
              design={cadetDesign}
              budget={massBudget}
              onChange={setCadetDesign}
            />
          </div>
        )}

        {/* Chart Focus View */}
        {viewMode === 'chart' && (
          <div className="space-y-4">
            <ConstraintDiagram
              onInspectConstraint={handleInspectConstraint}
              onSelectAircraft={handleSelectAircraft}
              designPoint={{
                ws: massBudget.wingLoadingNm2,
                tw: massBudget.thrustToWeight,
                callsign: cadetDesign.callsign,
              }}
              audit={feasibilityAudit}
              activeConstraints={activeConstraints}
            />
          </div>
        )}

        {/* Sliders Focus View */}
        {viewMode === 'sliders' && (
          <div className="space-y-4">
            <ParametricPanel
              design={cadetDesign}
              budget={massBudget}
              onChange={setCadetDesign}
            />
          </div>
        )}

        {/* Operational Sizing Guidance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <FileText className="w-4 h-4" />
              <span>1. Takeoff Field Length</span>
            </div>
            <p className="text-[11px] text-[var(--hud-text-muted)] leading-relaxed">
              Ground friction and rotation velocity dictate the minimum thrust-to-weight required to unstick safely within the available runway distance.
            </p>
          </div>

          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Plane className="w-4 h-4" />
              <span>2. Service Ceiling & Altitude Transit</span>
            </div>
            <p className="text-[11px] text-[var(--hud-text-muted)] leading-relaxed">
              Reduced air density at high altitude lowers engine thrust. The ceiling boundary guarantees residual climb capability is maintained.
            </p>
          </div>

          <div className="bg-[var(--hud-panel)] border border-[var(--hud-border)] p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <BookOpen className="w-4 h-4" />
              <span>3. Touchdown & Approach Safety</span>
            </div>
            <p className="text-[11px] text-[var(--hud-text-muted)] leading-relaxed">
              The vertical stall boundary caps wing loading so landing approach speeds remain docile and within runway braking limits.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--hud-border)] bg-[var(--hud-panel-header)] px-4 py-3 text-[11px] text-[var(--hud-text-muted)] font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>ROYAL AIR FORCE AIR CADETS // AEROSPACE ENGINEERING & PROJECT MANAGEMENT SIMULATION</span>
          <span className="text-cyan-500/80">AIR CADET TRAINING CORPS (RAFAC)</span>
        </div>
      </footer>

      {/* Reusable Slide-In Drawer for Physics & Aircraft Dossiers */}
      <SlideDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        title={
          drawerState.mode === 'constraint'
            ? drawerState.constraintDetail?.title || 'Constraint Physics'
            : drawerState.aircraft?.name || 'Aircraft Dossier'
        }
        badge={
          drawerState.mode === 'constraint' && drawerState.constraintDetail
            ? {
                text: drawerState.constraintDetail.id.toUpperCase(),
                variant: drawerState.constraintDetail.id,
              }
            : drawerState.aircraft
            ? {
                text: drawerState.aircraft.category.toUpperCase(),
                variant: 'benchmark',
              }
            : undefined
        }
        subtitle={
          drawerState.mode === 'constraint' && drawerState.constraintDetail
            ? `Mathematical formulation & aerodynamic mechanics (${drawerState.constraintDetail.infeasibleSide})`
            : drawerState.aircraft
            ? `${drawerState.aircraft.designation} // Service Entry: ${drawerState.aircraft.year} // ${drawerState.aircraft.operator}`
            : undefined
        }
      >
        {/* Mode 1: Detailed Constraint Physics & HTML/CSS Formula */}
        {drawerState.mode === 'constraint' && drawerState.constraintDetail && (
          <div className="space-y-6">
            <EquationDisplay
              structure={drawerState.constraintDetail.equationStructure}
              variables={drawerState.constraintDetail.variables}
              accentColor={drawerState.constraintDetail.colorVar}
            />

            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Aeronautical & Flight Mechanics Principles
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                {drawerState.constraintDetail.aerodynamicMechanics.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded-sm border border-slate-800/80">
                    <span className="text-cyan-400 font-bold shrink-0">▸</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-2">
              <h4 className="text-xs uppercase font-mono tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Aeronautical Operational Context
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {drawerState.constraintDetail.operationalContext}
              </p>
            </div>
          </div>
        )}

        {/* Mode 2: Benchmark Aircraft Engineering Dossier */}
        {drawerState.mode === 'aircraft' && drawerState.aircraft && (
          <BenchmarkDossier aircraft={drawerState.aircraft} />
        )}
      </SlideDrawer>
    </div>
  );
}

export default App;

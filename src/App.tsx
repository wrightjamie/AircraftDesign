import { useState, useMemo } from 'react';
import { AirStaffMiniBar } from './components/ui/AirStaffMiniBar';
import { Step1MissionBriefing } from './components/journey/Step1MissionBriefing';
import { Step2LimitationsWizard } from './components/journey/Step2LimitationsWizard';
import { Step3AircraftSizing } from './components/journey/Step3AircraftSizing';
import { Step4MissionDebrief } from './components/journey/Step4MissionDebrief';
import { SlideDrawer } from './components/ui/SlideDrawer';
import { EquationDisplay } from './components/ui/EquationDisplay';
import { BenchmarkDossier } from './components/benchmarks/BenchmarkDossier';
import {
  DEFAULT_CADET_DESIGN,
  calculateAircraftMassBudget,
  type CadetAircraftDesign
} from './physics/aircraftDesign';
import { auditAircraftFeasibility } from './physics/feasibility';
import { evaluateProcurementAndRisk } from './physics/costRisk';
import { DEFAULT_MISSION_CONSTRAINTS, type OperationalConstraints } from './physics/constraints';
import type { MissionLeg } from './physics/missionLegs';
import type { ConstraintDetail } from './data/constraintDetails';
import type { BenchmarkAircraft } from './data/benchmarks';
import {
  BookOpen,
  Sparkles
} from 'lucide-react';

export function App() {
  // Cadet Aircraft Design State (Milestone 2 & 5)
  const [cadetDesign, setCadetDesign] = useState<CadetAircraftDesign>(DEFAULT_CADET_DESIGN);

  // Active Flight Limitations / Constraints State (Step 2)
  const [missionConstraints, setMissionConstraints] = useState<OperationalConstraints>(DEFAULT_MISSION_CONSTRAINTS);

  // Cadet Mission Legs State (Option B & Step 1)
  const [missionLegs, setMissionLegs] = useState<MissionLeg[]>(() => [
    { id: 'leg-1', name: 'Takeoff & Departure', type: 'takeoff', runwayElevationFt: 0, headwindKts: 5 },
    { id: 'leg-2', name: 'Climb to Flight Level', type: 'climb', targetAltitudeFt: 25000, climbSpeedKmh: 450 },
    { id: 'leg-3', name: 'Cruise Transit Outbound', type: 'cruise', distanceKm: 400, altitudeFt: 25000, speedKmh: 680 },
    { id: 'leg-4', name: 'Base Recovery & Landing', type: 'landing', runwayElevationFt: 0, availableRunwayM: 1800, headwindKts: 5 },
  ]);

  // The 4-Step Guided Cadet Journey
  const [journeyStep, setJourneyStep] = useState<1 | 2 | 3 | 4>(1);

  // Compute Mass Budget & Design Point
  const massBudget = useMemo(() => {
    return calculateAircraftMassBudget(cadetDesign);
  }, [cadetDesign]);

  // Dynamically update mission constraints based on aircraft geometry (CD0, AR, e, CLmax, and engine architecture)
  const activeConstraints = useMemo(() => {
    return {
      ...missionConstraints,
      cd0: massBudget.cd0,
      aspectRatio: cadetDesign.aspectRatio,
      oswaldEfficiency: massBudget.oswaldEfficiency,
      clMax: massBudget.clMaxFlaps,
      engineClass: cadetDesign.engineClass,
    };
  }, [missionConstraints, cadetDesign, massBudget]);

  // Compute Real-Time Feasibility Audit
  const feasibilityAudit = useMemo(() => {
    return auditAircraftFeasibility(massBudget, activeConstraints);
  }, [massBudget, activeConstraints]);

  // Compute Air Staff Procurement & Program Risk Evaluation
  const procurementEval = useMemo(() => {
    return evaluateProcurementAndRisk(
      massBudget.oewKg,
      cadetDesign.compositePercent,
      cadetDesign.engineClass,
      cadetDesign.engineCount,
      cadetDesign.thrustPerEngineKn,
      cadetDesign.sweepDeg,
      cadetDesign.aspectRatio,
      45.0,
      cadetDesign.stealthLevel,
      cadetDesign.highLiftDevice,
      cadetDesign.wingAreaM2,
      massBudget.mtowKg,
      cadetDesign.engineTechLevel
    );
  }, [cadetDesign, massBudget]);

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
      <header className="border-b border-[var(--hud-border)] bg-[var(--hud-panel-header)] px-4 py-2.5 sticky top-0 z-30 shadow-md">
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
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                AEROSPACE DESIGN SIMULATION
                <span className="text-xs font-normal text-slate-400 hidden lg:inline">
                  // CADET APPRENTICESHIP
                </span>
              </h1>
            </div>
          </div>

          {/* Center: The 4-Step Journey Navigation Stepper */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs">
            {[
              { step: 1, label: '1. Mission', desc: 'Define Sortie' },
              { step: 2, label: '2. Limits', desc: 'Set Constraints' },
              { step: 3, label: '3. Sizing', desc: 'Size Aircraft' },
              { step: 4, label: '4. Debrief', desc: 'Fly & Score' },
            ].map((st) => (
              <button
                key={st.step}
                onClick={() => setJourneyStep(st.step as 1 | 2 | 3 | 4)}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  journeyStep === st.step
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{st.label}</span>
              </button>
            ))}
          </div>

          {/* Right: Persistent Air Staff Procurement Mini-Bar */}
          <AirStaffMiniBar procurement={procurementEval} />
        </div>
      </header>

      {/* Main Guided Cadet Journey Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Step 1: Define Mission Requirements */}
        {journeyStep === 1 && (
          <Step1MissionBriefing
            legs={missionLegs}
            onLegsChange={setMissionLegs}
            onProceedToStep2={() => setJourneyStep(2)}
          />
        )}

        {/* Step 2: Establish Flight Limitations Wizard */}
        {journeyStep === 2 && (
          <Step2LimitationsWizard
            constraints={missionConstraints}
            onConstraintsChange={setMissionConstraints}
            onProceedToStep3={() => setJourneyStep(3)}
            onBackToStep1={() => setJourneyStep(1)}
            onInspectConstraint={handleInspectConstraint}
            onSelectAircraft={handleSelectAircraft}
          />
        )}

        {/* Step 3: Cadet Aircraft Sizing */}
        {journeyStep === 3 && (
          <Step3AircraftSizing
            design={cadetDesign}
            budget={massBudget}
            constraints={activeConstraints}
            audit={feasibilityAudit}
            procurement={procurementEval}
            onDesignChange={setCadetDesign}
            onProceedToStep4={() => setJourneyStep(4)}
            onBackToStep2={() => setJourneyStep(2)}
            onInspectConstraint={handleInspectConstraint}
            onSelectAircraft={handleSelectAircraft}
          />
        )}

        {/* Step 4: Mission Execution, Fuel Audit & Cadet Wings */}
        {journeyStep === 4 && (
          <Step4MissionDebrief
            design={cadetDesign}
            budget={massBudget}
            constraints={activeConstraints}
            audit={feasibilityAudit}
            procurement={procurementEval}
            legs={missionLegs}
            onBackToStep3={() => setJourneyStep(3)}
            onBackToStep2={() => setJourneyStep(2)}
            onBackToStep1={() => setJourneyStep(1)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--hud-border)] bg-[var(--hud-panel-header)] px-4 py-3 text-[11px] text-[var(--hud-text-muted)] font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>ROYAL AIR FORCE AIR CADETS // AEROSPACE ENGINEERING & SIZING SIMULATION</span>
          <span className="text-cyan-500/80">AIR CADET TRAINING CORPS (RAFAC)</span>
        </div>
      </footer>

      {/* Slide-In Drawer for Detailed Physics Equations & Aircraft Benchmark Dossiers */}
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
                {drawerState.constraintDetail.aerodynamicMechanics.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded-sm border border-slate-800/80">
                    <span className="text-cyan-400 font-bold shrink-0">▸</span>
                    <span>{s}</span>
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

        {drawerState.mode === 'aircraft' && drawerState.aircraft && (
          <BenchmarkDossier aircraft={drawerState.aircraft} />
        )}
      </SlideDrawer>
    </div>
  );
}

export default App;

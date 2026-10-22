import { useState, useRef, useEffect } from 'react';
import type { ProcurementEvaluation } from '../../physics/costRisk.ts';
import { Shield, ChevronDown, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface AirStaffMiniBarProps {
  procurement: ProcurementEvaluation;
}

export function AirStaffMiniBar({ procurement }: AirStaffMiniBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getStatusBadge = () => {
    switch (procurement.boardStatus) {
      case 'approved':
        return {
          bg: 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'AIR STAFF: APPROVED',
        };
      case 'caution':
        return {
          bg: 'bg-amber-950/80 border-amber-600/70 text-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'AIR STAFF: UNDER SCRUTINY',
        };
      case 'rejected':
        return {
          bg: 'bg-red-950/80 border-red-600/70 text-red-300',
          icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,
          label: 'AIR STAFF: REJECTED',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="relative font-mono select-none" ref={popoverRef}>
      {/* Mini-Bar Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded border transition-all text-xs font-semibold cursor-pointer ${badge.bg} hover:brightness-110 shadow-sm`}
        title="Click to inspect Air Staff Procurement & Program Risk breakdown"
      >
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span className="tracking-wide hidden sm:inline">{badge.label}</span>
          <span className="tracking-wide sm:hidden">AIR STAFF</span>
        </div>

        <div className="h-3 w-px bg-white/20" />

        {/* Cost & Risk Summary */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className={procurement.isOverBudget ? 'text-red-300 font-bold' : 'text-slate-200'}>
            £{procurement.unitCostM.toFixed(1)}M / £{procurement.costBudgetLimitM}M
          </span>
          <span className="text-white/30 hidden md:inline">|</span>
          <span className={`hidden md:inline ${
            procurement.programRiskPercent > 65
              ? 'text-red-400 font-bold'
              : procurement.programRiskPercent > 45
              ? 'text-amber-300'
              : 'text-emerald-300'
          }`}>
            Risk: {procurement.programRiskPercent}%
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Popover Dossier */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[var(--hud-panel-header)] border border-[var(--hud-border)] rounded-lg shadow-2xl p-4 z-50 text-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--hud-border)]">
            <span className="font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              Air Staff Procurement Board
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${badge.bg}`}>
              {procurement.boardStatus}
            </span>
          </div>

          {/* Chief of the Air Staff Critique */}
          <div className="bg-[var(--hud-bg)] border border-[var(--hud-border)] p-2.5 rounded text-[11px] leading-relaxed text-slate-200">
            {procurement.boardCritique}
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded border border-slate-800 text-[11px]">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
              <span>Unit Procurement Breakdown</span>
              <span className="text-cyan-300">Total: £{procurement.unitCostM.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>• Airframe Structure:</span>
              <span>£{procurement.airframeCostM.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>• Powerplant Engines:</span>
              <span>£{procurement.enginesCostM.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>• Mission Avionics:</span>
              <span>£{procurement.avionicsCostM.toFixed(1)}M</span>
            </div>
            {procurement.highLiftCostM !== undefined && procurement.highLiftCostM > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>• High-Lift Flap Actuators:</span>
                <span>£{procurement.highLiftCostM.toFixed(1)}M</span>
              </div>
            )}
            {procurement.stealthCostM !== undefined && procurement.stealthCostM > 0 && (
              <div className="flex justify-between text-amber-300">
                <span>• Low Observable (LO) Stealth:</span>
                <span>£{procurement.stealthCostM.toFixed(1)}M</span>
              </div>
            )}
          </div>

          {/* Program Risk Gauge */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Total Technological Risk:</span>
              <span className={`font-bold ${
                procurement.programRiskPercent > 65
                  ? 'text-red-400'
                  : procurement.programRiskPercent > 45
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {procurement.programRiskPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full ${
                  procurement.programRiskPercent > 65
                    ? 'bg-red-500'
                    : procurement.programRiskPercent > 45
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, procurement.programRiskPercent)}%` }}
              />
            </div>
          </div>

          {/* Actionable Recommendations */}
          {procurement.recommendations.length > 0 && (
            <div className="space-y-1 text-[10px] text-slate-300 border-t border-[var(--hud-border)] pt-2">
              <span className="text-slate-400 uppercase font-bold block">Board Recommendations:</span>
              {procurement.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-cyan-200">
                  <span className="text-cyan-400">▸</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

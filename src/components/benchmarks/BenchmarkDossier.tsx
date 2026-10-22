import type { BenchmarkAircraft } from '../../data/benchmarks';
import { Plane, Gauge, Fuel, Shield, Award, Calendar } from 'lucide-react';

export interface BenchmarkDossierProps {
  aircraft: BenchmarkAircraft;
}

export const BenchmarkDossier = ({ aircraft }: BenchmarkDossierProps) => {
  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Overview Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-sm text-slate-100">{aircraft.name}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-sky-950/70 border border-sky-800/80 text-sky-300 font-bold uppercase tracking-wider">
            {aircraft.category}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-slate-300">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Official Designation</span>
            <p className="font-semibold">{aircraft.designation}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Primary Operator</span>
            <p className="font-semibold text-sky-300">{aircraft.operator}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Service Entry Year</span>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {aircraft.year}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Operational Role</span>
            <p className="font-semibold">{aircraft.role}</p>
          </div>
        </div>
      </div>

      {/* Sizing & Aerodynamic Metrics Grid */}
      <div className="space-y-2">
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          Aeronautical Sizing & Mass Properties
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* MTOW */}
          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-sm">
            <span className="text-[10px] text-slate-500 uppercase block">Max Takeoff Weight</span>
            <span className="text-sm font-bold text-slate-100">
              {aircraft.mtowKg.toLocaleString()} kg
            </span>
          </div>

          {/* OEW */}
          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-sm">
            <span className="text-[10px] text-slate-500 uppercase block">Operating Empty Wt</span>
            <span className="text-sm font-bold text-slate-100">
              {aircraft.oewKg.toLocaleString()} kg
            </span>
          </div>

          {/* Empty-to-MTOW fraction */}
          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-sm">
            <span className="text-[10px] text-slate-500 uppercase block">Empty Weight Fraction</span>
            <span className="text-sm font-bold text-amber-400">
              {(aircraft.emptyWeightFraction * 100).toFixed(1)}%
              <span className="text-[10px] text-slate-500 font-normal ml-1">
                ({aircraft.emptyWeightFraction.toFixed(3)})
              </span>
            </span>
          </div>

          {/* Wing Loading */}
          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-sm">
            <span className="text-[10px] text-slate-500 uppercase block">Wing Loading (W/S)</span>
            <span className="text-sm font-bold text-cyan-400">
              {Math.round(aircraft.wingLoadingNm2)} N/m²
            </span>
            <span className="text-[10px] text-slate-500 block">
              ({Math.round(aircraft.wingLoadingNm2 / 9.80665)} kg/m²)
            </span>
          </div>

          {/* Thrust-to-Weight */}
          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-sm">
            <span className="text-[10px] text-slate-500 uppercase block">Thrust / Weight (T/W)</span>
            <span className="text-sm font-bold text-emerald-400">
              {aircraft.thrustToWeight.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-500 block">at max takeoff weight</span>
          </div>

          {/* Max Speed */}
          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-sm">
            <span className="text-[10px] text-slate-500 uppercase block">Max Level Speed</span>
            <span className="text-sm font-bold text-purple-400">
              {aircraft.maxSpeedKts} kts
            </span>
            <span className="text-[10px] text-slate-500 block">
              (~{Math.round(aircraft.maxSpeedKts * 1.852)} km/h)
            </span>
          </div>
        </div>
      </div>

      {/* Propulsion & Powerplant */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-2">
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Fuel className="w-3.5 h-3.5 text-amber-400" />
          Powerplant Configuration
        </h4>
        <div className="grid grid-cols-2 gap-3 text-slate-300 pt-1">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Engine Architecture</span>
            <p className="font-semibold text-slate-100">{aircraft.engineType}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Total Maximum Thrust</span>
            <p className="font-semibold text-amber-400">
              {aircraft.maxThrustKn > 0 ? `${aircraft.maxThrustKn.toFixed(1)} kN` : 'Unpowered (Glider)'}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] text-slate-500 uppercase">Engine Model & Count</span>
            <p className="font-semibold text-slate-200">
              {aircraft.engineCount > 0 ? `${aircraft.engineCount}x ${aircraft.engineModel}` : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Airframe & Materials */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-2">
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Airframe Materials & Geometry
        </h4>
        <div className="space-y-2 pt-1 text-slate-300">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Structural Materials</span>
            <p className="font-semibold text-slate-100">{aircraft.materials}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Wing Surface Area (S)</span>
              <p className="font-semibold">{aircraft.wingAreaM2} m²</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Wing Aspect Ratio (AR)</span>
              <p className="font-semibold">{aircraft.aspectRatio}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Service Ceiling</span>
              <p className="font-semibold text-cyan-400">
                {aircraft.serviceCeilingFt.toLocaleString()} ft
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Operational Note & Design Takeaway */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
        <div>
          <h4 className="text-[11px] uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5" />
            RAF Historical / Operational Context
          </h4>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {aircraft.historicalNote}
          </p>
        </div>

        <div className="border-t border-slate-800 pt-2">
          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-0.5">
            Key Aerospace Engineering Insight:
          </span>
          <p className="text-slate-400 italic text-[11px] leading-relaxed">
            "{aircraft.designInsight}"
          </p>
        </div>
      </div>
    </div>
  );
};

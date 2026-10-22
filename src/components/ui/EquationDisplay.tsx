import type { FormulaVariable } from '../../data/constraintDetails';

export interface EquationDisplayProps {
  structure: 'stall' | 'takeoff' | 'speed' | 'climb' | 'ceiling' | 'turn' | 'cruise';
  variables?: FormulaVariable[];
  accentColor?: string;
}

export const EquationDisplay = ({
  structure,
  variables,
  accentColor = 'var(--hud-accent)',
}: EquationDisplayProps) => {
  const renderFormulaContent = () => {
    switch (structure) {
      case 'stall':
        return (
          <div className="flex items-center justify-center gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>W</var>/<var>S</var>)<sub>max</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">1</span>
              <span className="pt-0.5 px-2">2</span>
            </span>
            <span>·</span>
            <span>
              <var>ρ</var><sub>0</sub>
            </span>
            <span>·</span>
            <span>
              <var>V</var><sub>stall</sub><sup>2</sup>
            </span>
            <span>·</span>
            <span>
              <var>C</var><sub>L,max</sub>
            </span>
          </div>
        );

      case 'takeoff':
        return (
          <div className="flex items-center justify-center flex-wrap gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>T</var>/<var>W</var>)<sub>TO</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                1.21 · (<var>W</var>/<var>S</var>)
              </span>
              <span className="pt-0.5 px-2">
                <var>g</var> · <var>ρ</var><sub>0</sub> · <var>C</var><sub>L,TO</sub> · <var>S</var><sub>TO</sub>
              </span>
            </span>
            <span className="text-slate-400">+</span>
            <span>
              <var>μ</var>
            </span>
          </div>
        );

      case 'speed':
        return (
          <div className="flex items-center justify-center flex-wrap gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>T</var>/<var>W</var>)<sub>Vmax</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>ρ</var><sub>0</sub>
              </span>
              <span className="pt-0.5 px-2">
                <var>ρ</var>
              </span>
            </span>
            <span className="text-lg">[</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>q</var> · <var>C</var><sub>D0</sub>
              </span>
              <span className="pt-0.5 px-2">
                <var>W</var>/<var>S</var>
              </span>
            </span>
            <span className="text-slate-400">+</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>K</var> · (<var>W</var>/<var>S</var>)
              </span>
              <span className="pt-0.5 px-2">
                <var>q</var>
              </span>
            </span>
            <span className="text-lg">]</span>
          </div>
        );

      case 'climb':
        return (
          <div className="flex items-center justify-center flex-wrap gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>T</var>/<var>W</var>)<sub>ROC</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>ROC</var>
              </span>
              <span className="pt-0.5 px-2">
                <var>V</var><sub>y</sub>
              </span>
            </span>
            <span className="text-slate-400">+</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>q</var> · <var>C</var><sub>D0</sub>
              </span>
              <span className="pt-0.5 px-2">
                <var>W</var>/<var>S</var>
              </span>
            </span>
            <span className="text-slate-400">+</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>K</var> · (<var>W</var>/<var>S</var>)
              </span>
              <span className="pt-0.5 px-2">
                <var>q</var>
              </span>
            </span>
          </div>
        );

      case 'ceiling':
        return (
          <div className="flex items-center justify-center flex-wrap gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>T</var>/<var>W</var>)<sub>Ceil</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">1</span>
              <span className="pt-0.5 px-2">
                <var>σ</var><sup>0.85</sup>
              </span>
            </span>
            <span className="text-lg">[</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>ROC</var><sub>min</sub>
              </span>
              <span className="pt-0.5 px-2">
                <var>V</var><sub>clean</sub>
              </span>
            </span>
            <span className="text-slate-400">+</span>
            <span className="inline-flex items-center">
              2 · <span className="font-mono text-lg mr-0.5">√</span>
              <span className="border-t border-slate-400 px-1 pt-0.5">
                <var>K</var> · <var>C</var><sub>D0</sub>
              </span>
            </span>
            <span className="text-lg">]</span>
          </div>
        );

      case 'turn':
        return (
          <div className="flex items-center justify-center flex-wrap gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>T</var>/<var>W</var>)<sub>Turn</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">1</span>
              <span className="pt-0.5 px-2">
                <var>σ</var><sup>0.85</sup>
              </span>
            </span>
            <span className="text-lg">[</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>q</var> · <var>C</var><sub>D0</sub>
              </span>
              <span className="pt-0.5 px-2">
                <var>W</var>/<var>S</var>
              </span>
            </span>
            <span className="text-slate-400">+</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">
                <var>n</var><sup>2</sup> · <var>K</var> · (<var>W</var>/<var>S</var>)
              </span>
              <span className="pt-0.5 px-2">
                <var>q</var>
              </span>
            </span>
            <span className="text-lg">]</span>
          </div>
        );

      case 'cruise':
        return (
          <div className="flex items-center justify-center flex-wrap gap-2 text-base font-serif tracking-wide py-2">
            <span className="font-sans font-semibold">
              (<var>T</var>/<var>W</var>)<sub>Cruise</sub>
            </span>
            <span className="text-slate-400">=</span>
            <span className="inline-flex flex-col items-center justify-center align-middle px-1">
              <span className="border-b border-slate-500 pb-0.5 px-2">1</span>
              <span className="pt-0.5 px-2">
                (<var>L</var>/<var>D</var>)<sub>max</sub>
              </span>
            </span>
            <span className="text-slate-400">≈</span>
            <span className="inline-flex items-center">
              2 · <span className="font-mono text-lg mr-0.5">√</span>
              <span className="border-t border-slate-400 px-1 pt-0.5">
                <var>K</var> · <var>C</var><sub>D0</sub>
              </span>
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Mathematical Equation Card */}
      <div
        style={{
          borderColor: accentColor,
          backgroundColor: `color-mix(in srgb, ${accentColor} 4%, var(--hud-panel))`,
        }}
        className="p-4 rounded-lg border text-slate-100 shadow-inner flex flex-col items-center justify-center"
      >
        <span className="text-[10px] uppercase tracking-widest text-[var(--hud-text-muted)] font-mono mb-1">
          AERONAUTICAL CONSTRAINING RELATION
        </span>
        {renderFormulaContent()}
      </div>

      {/* Variable Breakdown Table */}
      {variables && variables.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-mono tracking-wider text-[var(--hud-text-muted)] font-bold">
            Variables & Physical Factors:
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {variables.map((v) => (
              <div
                key={v.symbol}
                className="flex items-start justify-between bg-slate-900/60 border border-[var(--hud-border)] rounded-sm p-2 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ color: accentColor }}
                    className="font-bold font-serif text-sm px-1.5 py-0.5 rounded-xs bg-slate-800"
                  >
                    {v.symbol}
                  </span>
                  <div>
                    <span className="text-slate-200 font-semibold">{v.name}</span>
                    <p className="text-[11px] text-[var(--hud-text-muted)] leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-cyan-400/90 whitespace-nowrap pl-2">
                  [{v.units}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: {
    text: string;
    variant?: 'stall' | 'takeoff' | 'climb' | 'ceiling' | 'speed' | 'turn' | 'cruise' | 'benchmark' | 'neutral';
  };
  subtitle?: string;
  children: ReactNode;
}

export const SlideDrawer = ({
  isOpen,
  onClose,
  title,
  badge,
  subtitle,
  children,
}: SlideDrawerProps) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getBadgeStyle = () => {
    switch (badge?.variant) {
      case 'stall': return 'bg-red-950 text-red-400 border-red-700/60';
      case 'takeoff': return 'bg-amber-950 text-amber-400 border-amber-700/60';
      case 'climb': return 'bg-blue-950 text-blue-400 border-blue-700/60';
      case 'ceiling': return 'bg-cyan-950 text-cyan-400 border-cyan-700/60';
      case 'speed': return 'bg-purple-950 text-purple-400 border-purple-700/60';
      case 'turn': return 'bg-pink-950 text-pink-400 border-pink-700/60';
      case 'cruise': return 'bg-emerald-950 text-emerald-400 border-emerald-700/60';
      case 'benchmark': return 'bg-sky-950 text-sky-400 border-sky-700/60';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-[var(--hud-panel)] border-l border-[var(--hud-border-bright)] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Tactical Corner Brackets */}
        <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-cyan-500/70 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-cyan-500/70 pointer-events-none" />

        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[var(--hud-border)] bg-[var(--hud-panel-header)] flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--hud-text-muted)] font-mono">
                RAFAC FLIGHT ENVELOPE BRIEFING
              </span>
              {badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-xs border font-mono tracking-wider uppercase font-semibold ${getBadgeStyle()}`}>
                  {badge.text}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--hud-text)]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--hud-text-muted)] font-mono">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--hud-text-muted)] hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500"
            title="Close drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3 border-t border-[var(--hud-border)] bg-[var(--hud-panel-header)] flex items-center justify-between text-xs text-[var(--hud-text-muted)] font-mono">
          <span>ROYAL AIR FORCE AIR CADETS</span>
          <span className="text-cyan-500/80">PRESS [ESC] TO CLOSE</span>
        </div>
      </div>
    </div>
  );
};

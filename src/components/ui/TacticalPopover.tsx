import { useEffect, useRef, type ReactNode } from 'react';

export interface TacticalPopoverProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  children: ReactNode;
}

export const TacticalPopover = ({
  x,
  y,
  isOpen,
  onClose,
  accentColor = 'var(--hud-accent)',
  children,
}: TacticalPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Window bounds safety check
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Offset slightly from cursor/point
  const popoverWidth = 320;
  let posX = x + 16;
  let posY = y - 40;

  // Keep within bounds
  if (posX + popoverWidth > viewportWidth - 20) {
    posX = x - popoverWidth - 16;
  }
  if (posY < 20) {
    posY = 20;
  }
  if (posY + 260 > viewportHeight) {
    posY = Math.max(20, viewportHeight - 280);
  }

  return (
    <div
      ref={popoverRef}
      style={{
        left: `${posX}px`,
        top: `${posY}px`,
        borderColor: accentColor,
        boxShadow: `0 8px 30px rgba(0, 0, 0, 0.7), 0 0 15px color-mix(in srgb, ${accentColor} 25%, transparent)`
      }}
      className="fixed z-40 w-80 bg-[var(--hud-panel)]/95 backdrop-blur-md border rounded-md p-4 text-xs font-mono transition-all animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
    >
      {/* Corner crosshairs */}
      <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/50" />
      <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-white/50" />
      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-white/50" />
      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/50" />

      {children}
    </div>
  );
};

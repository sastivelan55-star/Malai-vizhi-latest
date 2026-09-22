// src/components/UI/DemoPanel.tsx
// Compact, collapsible "See it in action" panel for SIH presentation context.
// Use inside existing feature pages — not a standalone page.

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

interface DemoPanelProps {
  title?: string;
  description: string;
  children?: React.ReactNode;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  title = 'See it in action',
  description,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#14B8A6]/30 bg-gradient-to-r from-teal-50/60 to-blue-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-teal-50/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-[#14B8A6] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <PlayCircle size={9} /> SIH Demo
          </span>
          <span className="text-xs font-semibold text-[#0F766E]">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
};

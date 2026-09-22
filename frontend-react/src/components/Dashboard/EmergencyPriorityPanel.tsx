import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { LocationData } from '../../types';
import { DemoPanel } from '../UI/DemoPanel';

interface EmergencyPriorityPanelProps {
  locations: LocationData[];
  onSelectLocation: (id: number) => void;
}

export const EmergencyPriorityPanel: React.FC<EmergencyPriorityPanelProps> = ({ locations, onSelectLocation }) => {
  // Sort locations by risk score descending
  const priorityList = [...locations]
    .filter(loc => loc.risk_level === 'HIGH' || loc.risk_level === 'MODERATE')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3); // Top 3 emergencies

  if (priorityList.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mt-4">
      <DemoPanel
        title="Emergency priority ranking"
        description="Locations are ranked using risk and impact so authorities can focus on the most urgent areas."
      />
      <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between bg-red-50/30">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <h3 className="text-xs font-semibold tracking-widest uppercase text-red-600">
            Emergency Prioritisation
          </h3>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {priorityList.map((loc, index) => (
          <div key={loc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                ${loc.risk_level === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}
              `}>
                {index + 1}
              </div>
              <div>
                <div className="font-semibold text-sm text-[#102A43]">{loc.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  Score: {loc.risk_score} <span className="mx-1">·</span> {loc.state}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onSelectLocation(loc.id)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
            >
              Dispatch <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

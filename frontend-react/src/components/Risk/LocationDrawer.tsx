// src/components/Risk/LocationDrawer.tsx
import React from 'react';
import {
  MapPin, Droplets, Thermometer, Wind, Clock, Database,
  BarChart2, X, ChevronRight, BrainCircuit
} from 'lucide-react';
import { RiskBadge } from '../UI/RiskBadge';
import type { LocationData } from '../../types';

interface LocationDrawerProps {
  location: LocationData | null;
  loading: boolean;
  onClose: () => void;
}

function DataRow({ icon: Icon, label, value, unit = '' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 gap-2">
      <div className="flex items-center gap-2 text-slate-500 min-w-0">
        <Icon size={14} className="flex-shrink-0" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#102A43] flex-shrink-0 text-right">
        {value}{unit}
      </span>
    </div>
  );
}

export const LocationDrawer: React.FC<LocationDrawerProps> = ({
  location,
  loading,
  onClose,
}) => {
  if (!location && !loading) return null;

  return (
    <aside
      className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
      aria-label="Location intelligence panel"
    >
      {/* Header */}
      <div className="bg-[#071A2B] px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-5 bg-white/20 rounded w-28 mb-2" />
              <div className="h-3 bg-white/10 rounded w-20" />
            </div>
          ) : location ? (
            <>
              <h2 className="text-white font-bold text-base truncate">{location.name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={12} className="text-[#14B8A6] flex-shrink-0" />
                <span className="text-[#14B8A6] text-xs font-medium">{location.state}</span>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/60 hover:text-white active:bg-white/10 transition-colors p-2 rounded-lg -mr-1 -mt-1 flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Close location panel"
        >
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 rounded" />
          ))}
        </div>
      ) : location ? (
        <div className="flex-1 overflow-y-auto">
          {/* Risk Score + Badge */}
          <div className="px-5 py-4 border-b border-slate-50">
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={location.risk_level} />
              <div className="text-right">
                <div className="text-3xl font-bold text-[#102A43]">{location.risk_score}</div>
                <div className="text-xs text-slate-400 font-medium">AI Risk Score</div>
              </div>
            </div>
            {/* Score bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={location.risk_score} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${location.risk_score}%`,
                  background: location.risk_level === 'HIGH' ? '#DC2626' : location.risk_level === 'MODERATE' ? '#F59E0B' : '#16A34A',
                }}
              />
            </div>
          </div>

          {/* Environmental Data */}
          <div className="px-5 py-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">
              Environmental Conditions
            </h3>
            <DataRow icon={Droplets} label="Rainfall" value={location.rainfall_mm.toFixed(1)} unit=" mm" />
            <DataRow icon={Droplets} label="Soil Moisture" value={location.soil_moisture.toFixed(1)} unit="%" />
            {location.temperature !== undefined && (
              <DataRow icon={Thermometer} label="Temperature" value={location.temperature.toFixed(1)} unit=" °C" />
            )}
            {location.humidity !== undefined && (
              <DataRow icon={Wind} label="Humidity" value={location.humidity.toFixed(1)} unit="%" />
            )}
            <DataRow icon={BarChart2} label="Slope" value={location.slope_deg.toFixed(1)} unit="°" />
          </div>

          {/* Metadata */}
          <div className="px-5 py-3 border-t border-slate-50">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">
              Station Metadata
            </h3>
            <DataRow icon={MapPin} label="Coordinates" value={`${location.latitude.toFixed(3)}°N, ${location.longitude.toFixed(3)}°E`} />
            <DataRow icon={Clock} label="Last Updated" value={location.last_updated?.split(' ')[1]?.slice(0, 5) || 'N/A'} />
            <DataRow icon={Database} label="Data Source" value={location.data_source || 'NASA POWER'} />
          </div>

          {/* AI Assessment */}
          {location.ai_assessment && (
            <div className="mx-5 mb-4 p-4 bg-[#071A2B]/4 rounded-xl border border-[#14B8A6]/15">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <BrainCircuit size={14} className="text-[#14B8A6]" />
                  <span className="text-xs font-semibold text-[#0F766E] tracking-wider uppercase">
                    AI Assessment
                  </span>
                </div>
                {location.ai_assessment.startsWith('[ML UNAVAILABLE - RULE ENGINE FALLBACK]') && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-widest">
                    ML Unavailable (Rule Engine)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {location.ai_assessment.replace('[ML UNAVAILABLE - RULE ENGINE FALLBACK] ', '')}
              </p>
            </div>
          )}

          {/* Coordinates footer */}
          <div className="mx-5 mb-4 flex items-center gap-1 text-xs text-slate-400">
            <ChevronRight size={12} />
            <span>
              {location.latitude.toFixed(4)}°N · {location.longitude.toFixed(4)}°E
            </span>
          </div>
        </div>
      ) : null}
    </aside>
  );
};

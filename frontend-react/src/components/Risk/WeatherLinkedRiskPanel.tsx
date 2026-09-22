import React from 'react';
import { CloudRain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LocationData } from '../../types';

interface WeatherLinkedRiskPanelProps {
  location: LocationData | null;
  allLocations: LocationData[];
}

export const WeatherLinkedRiskPanel: React.FC<WeatherLinkedRiskPanelProps> = ({ location, allLocations }) => {
  const target = location || (allLocations.length > 0 ? allLocations.reduce((prev, current) => (prev.rainfall_mm > current.rainfall_mm) ? prev : current) : null);

  if (!target) return null;

  // Derive a basic trend
  const trend = target.seven_day_trend;
  let trendIcon = <Minus size={16} className="text-slate-400" />;
  let trendText = "Stable";
  if (trend && trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (last > prev + 5) {
      trendIcon = <TrendingUp size={16} className="text-red-500" />;
      trendText = "Escalating";
    } else if (last < prev - 5) {
      trendIcon = <TrendingDown size={16} className="text-emerald-500" />;
      trendText = "Decreasing";
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-4">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain className="text-[#102A43]" size={18} />
          <h2 className="text-[#102A43] font-bold text-sm uppercase tracking-wider">
            Weather-Linked Risk
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest bg-blue-100 text-blue-700">
          Current Analysis
        </span>
      </div>
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Observation</p>
            <p className="text-xl font-bold text-[#102A43]">{target.rainfall_mm.toFixed(1)} mm</p>
            <p className="text-xs text-slate-500 mt-1">Precipitation Accumulation</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Trend Indicator</p>
            <div className="flex items-center gap-1 justify-end">
              {trendIcon}
              <p className="text-lg font-bold text-[#102A43]">{trendText}</p>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Analysis Timestamp</span>
            <span className="text-slate-700 font-medium">
              {new Date(target.last_updated.replace(' ', 'T')).toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">
            Note: This panel reflects current weather-linked ground risk conditions, not future meteorological forecasts.
          </p>
        </div>
      </div>
    </div>
  );
};

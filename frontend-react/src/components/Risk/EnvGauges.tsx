import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Wind, CloudRain, Activity, Battery } from 'lucide-react';
import type { LocationData } from '../../types';
import { API_BASE } from '../../services/api';

interface EnvGaugesProps {
  location: LocationData | null;
  allLocations: LocationData[];
}

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  max: number;
  icon: React.ElementType;
  color: string;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, unit, max, icon: Icon, color }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Icon size={13} style={{ color }} />
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">{label}</span>
        </div>
        <span className="text-lg font-bold text-[#102A43] tabular-nums">
          {value.toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={`${label}: ${value}${unit}`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-300">0</span>
        <span className="text-[10px] text-slate-300">{max}{unit}</span>
      </div>
    </div>
  );
};

export const EnvGauges: React.FC<EnvGaugesProps> = ({ location, allLocations }) => {
  // Use selected location or compute averages
  const target = location || null;
  const avgRain = allLocations.length ? allLocations.reduce((s, l) => s + l.rainfall_mm, 0) / allLocations.length : 0;
  const avgMoist = allLocations.length ? allLocations.reduce((s, l) => s + l.soil_moisture, 0) / allLocations.length : 0;

  const [sensorHealth, setSensorHealth] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      fetch(`${API_BASE}/api/sensors/${target.id}/history`)
        .then(r => r.json())
        .then(data => {
          if (data.health) setSensorHealth(data.health);
        })
        .catch(err => console.error(err));
    } else {
      setSensorHealth(null);
    }
  }, [target]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#102A43]">Environmental Conditions</h3>
        {!target ? (
          <span className="text-xs text-slate-400">Regional Average</span>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-amber-100 text-amber-700">
              DEMO SENSOR
            </span>
            {sensorHealth && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                sensorHealth === 'ONLINE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {sensorHealth}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Gauge
          label="Rainfall"
          value={target ? target.rainfall_mm : avgRain}
          unit=" mm"
          max={250}
          icon={CloudRain}
          color="#14B8A6"
        />
        <Gauge
          label="Soil Moisture"
          value={target ? target.soil_moisture : avgMoist}
          unit="%"
          max={100}
          icon={Droplets}
          color="#0F766E"
        />
        {target?.temperature !== undefined && (
          <Gauge
            label="Temperature"
            value={target.temperature}
            unit="°C"
            max={45}
            icon={Thermometer}
            color="#F59E0B"
          />
        )}
        {target?.humidity !== undefined && (
          <Gauge
            label="Humidity"
            value={target.humidity}
            unit="%"
            max={100}
            icon={Wind}
            color="#6366F1"
          />
        )}
        {target?.inclination_deg !== undefined && (
          <Gauge
            label="Inclination"
            value={target.inclination_deg}
            unit="°"
            max={15}
            icon={Activity}
            color="#8B5CF6"
          />
        )}
        {target?.battery !== undefined && (
          <Gauge
            label="Sensor Battery"
            value={target.battery}
            unit="%"
            max={100}
            icon={Battery}
            color="#10B981"
          />
        )}
      </div>
    </div>
  );
};

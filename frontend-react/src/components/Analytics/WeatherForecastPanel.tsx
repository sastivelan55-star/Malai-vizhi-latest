// src/components/Analytics/WeatherForecastPanel.tsx
// Shows CURRENT CONDITIONS and 7-day FORECAST clearly separated.
// Gracefully handles unavailable/partial data — never crashes.

import React, { useEffect, useState, useCallback } from 'react';
import { CloudRain, Wind, Thermometer, Droplets, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../services/api';

interface WeatherData {
  forecast_24h: number | null;
  seven_day_trend: number[] | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
}

type Status = 'loading' | 'ok' | 'unavailable' | 'partial';

interface WeatherForecastPanelProps {
  lat?: number;
  lon?: number;
}

function fmt(val: number | null | undefined, unit: string): string {
  if (val === null || val === undefined || isNaN(Number(val))) return 'N/A';
  return `${val}${unit}`;
}

export const WeatherForecastPanel: React.FC<WeatherForecastPanelProps> = ({ lat = 11.41, lon = 76.69 }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/weather/forecast?lat=${lat}&lon=${lon}`);
      if (!res.ok) { setStatus('unavailable'); return; }
      const json: WeatherData = await res.json();
      setData(json);
      setFetchedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      // Check if all fields are present
      const hasAll = json.temperature !== null && json.humidity !== null
        && json.wind_speed !== null && json.forecast_24h !== null;
      setStatus(hasAll ? 'ok' : 'partial');
    } catch {
      setStatus('unavailable');
    }
  }, [lat, lon]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-40 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-50 rounded-xl" />)}
        </div>
        <div className="h-24 bg-slate-50 rounded-xl" />
      </div>
    );
  }

  if (status === 'unavailable' || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center justify-center gap-3 min-h-[180px]">
        <AlertCircle size={24} className="text-slate-300" />
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-500">{t('analytics.weatherUnavailable', 'Weather Data Unavailable')}</div>
          <div className="text-xs text-slate-400 mt-1">{t('analytics.providerOffline', 'Provider offline or unreachable.')}</div>
        </div>
        <button onClick={fetchWeather} className="flex items-center gap-1 text-xs text-[#14B8A6] hover:underline">
          <RefreshCw size={12} /> {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  const trend = Array.isArray(data.seven_day_trend) && data.seven_day_trend.length > 0
    ? data.seven_day_trend
    : null;
  const maxTrend = trend ? Math.max(...trend, 1) : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-bold text-[#102A43]">{t('analytics.currentConditions', 'Current Conditions')}</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {t('analytics.near', 'Near')} {lat.toFixed(2)}°N, {lon.toFixed(2)}°E
            {status === 'partial' && <span className="ml-2 text-amber-500 font-semibold">· {t('analytics.limited', 'LIMITED')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={10} /> {fetchedAt}
            </span>
          )}
          <button
            onClick={fetchWeather}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            aria-label="Refresh weather"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Current condition tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-5">
        <div className="bg-orange-50/60 p-3.5 rounded-xl flex flex-col items-center gap-1">
          <Thermometer size={18} className="text-orange-400" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{t('weather.temperature', 'Temp')}</span>
          <span className="text-xl font-bold text-[#102A43]">{fmt(data.temperature, '°C')}</span>
        </div>
        <div className="bg-teal-50/60 p-3.5 rounded-xl flex flex-col items-center gap-1">
          <Droplets size={18} className="text-teal-500" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{t('weather.humidity', 'Humidity')}</span>
          <span className="text-xl font-bold text-[#102A43]">{fmt(data.humidity, '%')}</span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl flex flex-col items-center gap-1">
          <Wind size={18} className="text-slate-500" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{t('weather.wind', 'Wind')}</span>
          <span className="text-xl font-bold text-[#102A43]">{fmt(data.wind_speed, ' km/h')}</span>
        </div>
        <div className="bg-blue-50/60 p-3.5 rounded-xl flex flex-col items-center gap-1">
          <CloudRain size={18} className="text-blue-400" />
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{t('weather.rainfall', '24h Rain')}</span>
          <span className="text-xl font-bold text-[#102A43]">{fmt(data.forecast_24h, ' mm')}</span>
        </div>
      </div>

      {/* Forecast header */}
      <div className="px-5 pb-2 border-t border-slate-50 pt-4">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('analytics.forecast7Day', '7-Day Rainfall Forecast')}</h3>
      </div>

      {/* Bar chart */}
      {trend ? (
        <div className="flex items-end gap-1.5 h-20 px-5 pb-5">
          {trend.map((val, i) => {
            const h = maxTrend > 0 ? Math.max((val / maxTrend) * 100, 4) : 4;
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end group relative gap-0.5">
                <div
                  className="w-full rounded-t-sm bg-[#14B8A6] group-hover:bg-[#0F766E] transition-colors"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-slate-400">{days[i % 7]}</span>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-[#102A43] text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap pointer-events-none z-10">
                  {val} mm
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 pb-5 flex items-center gap-2 text-xs text-slate-400">
          <AlertCircle size={13} className="text-amber-400" />
          Forecast trend UNAVAILABLE — point data only
        </div>
      )}

      {/* Source */}
      <div className="bg-slate-50 px-5 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        {t('analytics.source', 'Source')}: Open-Meteo ERA5 Reanalysis · {status === 'partial' ? t('analytics.partialData', 'PARTIAL DATA') : t('analytics.live', 'LIVE')}
      </div>
    </div>
  );
};

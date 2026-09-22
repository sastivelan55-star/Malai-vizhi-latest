// src/components/Analytics/WeatherMap.tsx
// Interactive weather map with layer controls.
// Uses react-leaflet for real map tiles and proper rendering.

import React, { useState, useEffect, useCallback } from 'react';
import { Map, RefreshCw, AlertCircle, Thermometer, Droplets, Wind, CloudRain, Clock } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

type Layer = 'rainfall' | 'temperature' | 'humidity' | 'wind' | 'aqi';

interface LayerConfig {
  id: Layer;
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  getValue: (data: WeatherPoint) => number | null;
}

interface WeatherPoint {
  lat: number;
  lon: number;
  name: string;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  forecast_24h: number | null;
  aqi: number | null;
}

const MONITORED_POINTS = [
  { name: 'Cherrapunji, Meghalaya', lat: 25.28, lon: 91.73 },
  { name: 'Mawsynram, Meghalaya', lat: 25.30, lon: 91.58 },
  { name: 'Guwahati, Assam', lat: 26.14, lon: 91.74 },
  { name: 'Shillong, Meghalaya', lat: 25.57, lon: 91.88 },
  { name: 'Dibrugarh, Assam', lat: 27.48, lon: 94.91 },
  { name: 'Imphal, Manipur', lat: 24.82, lon: 93.94 },
  { name: 'Kohima, Nagaland', lat: 25.67, lon: 94.11 },
  { name: 'Aizawl, Mizoram', lat: 23.73, lon: 92.72 },
  { name: 'Agartala, Tripura', lat: 23.83, lon: 91.28 },
  { name: 'Itanagar, Arunachal', lat: 27.09, lon: 93.61 },
];

const LAYERS: LayerConfig[] = [
  { id: 'rainfall', label: 'Rainfall', unit: 'mm', icon: <CloudRain size={12} />, color: '#3B82F6', getValue: d => d.forecast_24h },
  { id: 'temperature', label: 'Temp', unit: '°C', icon: <Thermometer size={12} />, color: '#F97316', getValue: d => d.temperature },
  { id: 'humidity', label: 'Humidity', unit: '%', icon: <Droplets size={12} />, color: '#14B8A6', getValue: d => d.humidity },
  { id: 'wind', label: 'Wind', unit: 'km/h', icon: <Wind size={12} />, color: '#8B5CF6', getValue: d => d.wind_speed },
  { id: 'aqi', label: 'AQI', unit: '', icon: <AlertCircle size={12} />, color: '#EF4444', getValue: d => d.aqi },
];

export const WeatherMap: React.FC = () => {
  const { t } = useTranslation();
  const [activeLayer, setActiveLayer] = useState<Layer>('rainfall');
  const [points, setPoints] = useState<WeatherPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchAllPoints = useCallback(async () => {
    setLoading(true);
    const results: WeatherPoint[] = [];
    await Promise.all(
      MONITORED_POINTS.map(async (pt) => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pt.lat}&longitude=${pt.lon}&current_weather=true&daily=precipitation_sum&timezone=auto`);
          if (res.ok) {
            const data = await res.json();
            const d = data.current_weather || {};
            const daily = data.daily || {};
            results.push({
              ...pt,
              temperature: d.temperature ?? null,
              wind_speed: d.windspeed ?? null,
              humidity: null, // open-meteo current_weather doesn't have humidity directly without explicit hourly
              forecast_24h: daily.precipitation_sum?.[0] ?? null,
              aqi: null,
            });
          } else {
             results.push({ ...pt, temperature: null, wind_speed: null, humidity: null, forecast_24h: null, aqi: null });
          }
        } catch {
             results.push({ ...pt, temperature: null, wind_speed: null, humidity: null, forecast_24h: null, aqi: null });
        }
      })
    );
    setPoints(results);
    setFetchedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAllPoints(); }, [fetchAllPoints]);

  const activeLayerConfig = LAYERS.find(l => l.id === activeLayer)!;
  const values = points.map(p => activeLayerConfig.getValue(p)).filter(v => v !== null) as number[];
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 1;

  function getColor(val: number | null): string {
    if (val === null) return '#CBD5E1';
    if (maxVal === minVal) return activeLayerConfig.color;
    return activeLayerConfig.color; // Using constant color per layer for clarity on map
  }

  const isAqi = activeLayer === 'aqi';
  const MAP_CENTER: [number, number] = [26.0, 93.0];
  const MAP_ZOOM = 6;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Map size={14} className="text-[#14B8A6]" />
          <span className="text-xs font-bold text-[#102A43]">{t('analytics.regionalWeatherMap', 'Regional Weather Map')}</span>
        </div>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={9} /> {fetchedAt}
            </span>
          )}
          <button onClick={fetchAllPoints} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-3 py-2 overflow-x-auto flex-shrink-0 border-b border-slate-50">
        {LAYERS.map(l => (
          <button
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border ${activeLayer === l.id ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            style={activeLayer === l.id ? { backgroundColor: l.color, borderColor: l.color } : {}}
          >
            {l.icon} {t(`weather.${l.id}`, l.label)}
          </button>
        ))}
      </div>

      <div className="relative flex-1 bg-slate-100 overflow-hidden min-h-[300px]">
        {isAqi ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[400] bg-white/80">
            <AlertCircle size={22} className="text-slate-300" />
            <span className="text-xs font-semibold text-slate-400">{t('analytics.aqiNotConfigured', 'AQI — NOT CONFIGURED')}</span>
          </div>
        ) : loading ? (
          <div className="absolute inset-0 flex items-center justify-center z-[400] bg-white/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw size={14} className="animate-spin text-[#14B8A6]" />
              {t('analytics.loadingWeather', 'Loading weather...')}
            </div>
          </div>
        ) : (
          <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
            {points.map((pt) => {
              const val = activeLayerConfig.getValue(pt);
              if (val === null) return null; // Don't render points without data for the active layer
              
              const color = getColor(val);
              return (
                <CircleMarker
                  key={pt.name}
                  center={[pt.lat, pt.lon]}
                  radius={10}
                  pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 }}
                >
                  <Popup>
                    <div className="text-xs font-bold text-[#102A43]">{pt.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {t(`weather.${activeLayerConfig.id}`, activeLayerConfig.label)}: <span className="font-bold">{val}{activeLayerConfig.unit}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {!isAqi && !loading && values.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3">
          <span className="text-[10px] text-slate-400">{minVal}{activeLayerConfig.unit}</span>
          <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${activeLayerConfig.color}55, ${activeLayerConfig.color}ff)` }} />
          <span className="text-[10px] text-slate-400">{maxVal}{activeLayerConfig.unit}</span>
          <span className="text-[10px] text-slate-400 ml-2">{t(`weather.${activeLayer}`, activeLayerConfig.label)}</span>
        </div>
      )}

      <div className="bg-slate-50 px-4 py-1.5 text-[10px] text-slate-400 border-t border-slate-100">
        {t('analytics.source', 'Source')}: Open-Meteo · NE India Region
      </div>
    </div>
  );
};

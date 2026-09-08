// src/pages/FloodRisk.tsx — Prototype Flood Risk Monitoring Module for MALAI VIZHI
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import {
  Waves,
  Droplets,
  CloudRain,
  AlertTriangle,
  Info,
  Search,
  RefreshCw,
  MapPin,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layout } from '../components/Layout/Layout';
import { ToastContainer, useToast } from '../components/UI/Toast';
import { getFloodRiskData } from '../services/api';
import { MAP_CENTER, MAP_ZOOM } from '../data/constants';
import type { FloodStation, FloodRiskResponse } from '../types';

// Fix Leaflet icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function getFloodRiskColor(level: 'LOW' | 'MODERATE' | 'HIGH'): string {
  if (level === 'HIGH') return '#DC2626';     // Red for 70-100
  if (level === 'MODERATE') return '#F59E0B'; // Amber for 40-69
  return '#16A34A';                           // Green for 0-39
}

function getFloodRiskBadge(level: 'LOW' | 'MODERATE' | 'HIGH') {
  if (level === 'HIGH') {
    return {
      bg: 'bg-red-500/10 text-red-600 border-red-500/30',
      label: 'High Risk (70–100)',
      pillColor: '#DC2626',
    };
  }
  if (level === 'MODERATE') {
    return {
      bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      label: 'Moderate Risk (40–69)',
      pillColor: '#F59E0B',
    };
  }
  return {
    bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    label: 'Low Risk (0–39)',
    pillColor: '#16A34A',
  };
}

// Flood Map Component
interface FloodMapProps {
  stations: FloodStation[];
  selectedId: number | string | null;
  onSelectStation: (id: number | string) => void;
}

const FloodMap: React.FC<FloodMapProps> = memo(({ stations, selectedId, onSelectStation }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number | string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: true,
      attributionControl: true,
      tapHold: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stations.length) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    stations.forEach((st) => {
      const color = getFloodRiskColor(st.flood_risk_level);
      const isSelected = selectedId === st.id;
      const pulseAnim = st.flood_risk_level === 'HIGH' ? 'animation: pulse 1.5s ease-in-out infinite;' : '';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            ${st.flood_risk_level === 'HIGH' ? `
              <div style="position:absolute;width:38px;height:38px;border-radius:50%;background:${color}25;${pulseAnim}border:1.5px solid ${color}66;"></div>
            ` : ''}
            <div style="
              width:${isSelected ? '32px' : '28px'};
              height:${isSelected ? '32px' : '28px'};
              border-radius:50%;
              background:${color};
              border:2.5px solid white;
              box-shadow:0 3px 10px rgba(0,0,0,0.25);
              display:flex;align-items:center;justify-content:center;
              font-size:10px;font-weight:700;color:white;font-family:Inter,sans-serif;
              transition: all 0.2s ease;
            ">${st.flood_risk_score}</div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([st.latitude, st.longitude], {
        icon,
        title: `${st.name} - Flood Risk ${st.flood_risk_score}/100`,
      });

      marker.bindTooltip(
        `<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#102A43;padding:2px 4px;">
          🌊 ${st.name} (${st.state})<br/>
          <span style="font-weight:700;color:${color};font-size:11px;">Flood Score: ${st.flood_risk_score} (${st.flood_risk_level})</span><br/>
          <span style="font-weight:400;color:#64748b;font-size:10px;">Rain: ${st.rainfall_mm.toFixed(1)} mm · Runoff: ${st.runoff_index}%</span>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      marker.on('click', () => onSelectStation(st.id));
      marker.addTo(map);
      markersRef.current.set(st.id, marker);
    });
  }, [stations, selectedId, onSelectStation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const st = stations.find((s) => s.id === selectedId);
    if (!st) return;

    const marker = markersRef.current.get(selectedId);
    if (marker) {
      map.setView([st.latitude, st.longitude], Math.max(map.getZoom(), 8), { animate: true });
    }
  }, [selectedId, stations]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[320px] rounded-2xl overflow-hidden shadow-inner border border-slate-200/80"
      role="application"
      aria-label="Interactive Northeast India Flood Risk Station Map"
    />
  );
});

FloodMap.displayName = 'FloodMap';

export const FloodRisk: React.FC = () => {
  const [data, setData] = useState<FloodRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toasts, addToast, dismissToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getFloodRiskData();
      setData(res);
      if (res.stations.length > 0 && selectedStationId === null) {
        setSelectedStationId(res.stations[0].id ?? null);
      }
    } catch {
      addToast('error', 'Unable to Load Flood Data', 'Could not fetch flood risk assessment telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stations = data?.stations || [];
  const advisories = data?.advisories || [];
  const summary = data?.summary;

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase();
    return stations.filter(
      (s) => s.name.toLowerCase().includes(q) || s.state.toLowerCase().includes(q)
    );
  }, [stations, searchQuery]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || stations[0] || null;
  }, [stations, selectedStationId]);

  return (
    <Layout>
      <div className="space-y-6 max-w-screen-xl mx-auto">
        {/* Page Title & Module Notice */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#102A43] flex items-center gap-2.5">
                <Waves className="text-[#0284C7] flex-shrink-0" size={28} />
                <span>Flood Risk Monitoring</span>
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                Prototype Assessment
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Rainfall-runoff surface saturation assessment across Northeast India river basin catchments and Chennai urban flood monitoring stations (Tamil Nadu).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              aria-label="Refresh flood telemetry"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#0284C7]' : 'text-slate-500'} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Prototype Transparency Notice */}
        <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3.5 items-start">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0 text-[#0284C7] mt-0.5">
            <Info size={20} />
          </div>
          <div className="flex-1 text-xs text-sky-900 leading-relaxed">
            <div className="font-bold text-sky-950 text-sm mb-0.5">
              Hydrological Prototype Assessment Notice
            </div>
            <p>
              MALAI VIZHI's primary and core validated engine is <strong>Landslide Early Warning</strong>.
              This <strong>Flood Risk module is an extensible prototype</strong> calculated from existing
              environmental telemetry (NASA precipitation, antecedent soil moisture, and catchment topography).
              It is <em>not</em> a certified river-gauge flood prediction model.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
              <span>Stations Assessed</span>
              <MapPin size={16} className="text-[#0284C7]" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#102A43]">
              {summary ? summary.total_stations : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">12 NER Monitoring Stations</div>
          </div>

          <div className="bg-white rounded-2xl border border-red-100/80 bg-red-50/30 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-red-500 font-semibold uppercase tracking-wider mb-2">
              <span>High Risk (70–100)</span>
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-600">
              {summary ? summary.high_risk_count : '—'}
            </div>
            <div className="text-[11px] text-red-500/80 mt-1">Severe runoff accumulation</div>
          </div>

          <div className="bg-white rounded-2xl border border-amber-100/80 bg-amber-50/30 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-amber-600 font-semibold uppercase tracking-wider mb-2">
              <span>Moderate (40–69)</span>
              <Activity size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">
              {summary ? summary.moderate_risk_count : '—'}
            </div>
            <div className="text-[11px] text-amber-600/80 mt-1">Drainage advisory status</div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100/80 bg-emerald-50/30 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-2">
              <span>Low Risk (0–39)</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {summary ? summary.low_risk_count : '—'}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-1">Normal drainage capacity</div>
          </div>
        </div>

        {/* Main Workspace: Search & Selector + Map + Station Detail Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Interactive Map & Station Selector (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Search and Location Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search location or state (e.g. Chennai, Assam, Cherrapunji)..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7]"
                  />
                </div>

                <select
                  value={selectedStationId !== null ? String(selectedStationId) : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    // Numeric-only IDs (NER stations) stay as numbers; string codes (e.g. CHN-001) stay as strings
                    setSelectedStationId(/^\d+$/.test(v) ? Number(v) : v);
                  }}
                  className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 font-medium"
                >
                  {filteredStations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.state}) — Score {st.flood_risk_score}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station pills list for quick selection */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {filteredStations.slice(0, 8).map((st) => {
                  const isSelected = st.id === selectedStationId;
                  const color = getFloodRiskColor(st.flood_risk_level);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStationId(st.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-[#071A2B] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>{st.name}</span>
                      <span className="text-[10px] opacity-75 font-bold">({st.flood_risk_score})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Container */}
            <div className="h-[380px] sm:h-[450px] relative rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
              <FloodMap
                stations={stations}
                selectedId={selectedStationId}
                onSelectStation={setSelectedStationId}
              />

              {/* Map Legend */}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/80 px-3 py-2 flex items-center gap-3 text-xs shadow-md z-[400]">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Flood Risk:</span>
                {[
                  { color: '#DC2626', label: 'High (70–100)' },
                  { color: '#F59E0B', label: 'Mod (40–69)' },
                  { color: '#16A34A', label: 'Low (0–39)' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: color }} />
                    <span className="text-slate-600 font-medium text-[11px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Selected Station Deep Dive (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {selectedStation ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
                {/* Station Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin size={13} className="text-[#0284C7]" />
                      <span>{selectedStation.state} · Lat {selectedStation.latitude.toFixed(2)}, Lon {selectedStation.longitude.toFixed(2)}</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#102A43] mt-0.5">
                      {selectedStation.name}
                    </h2>
                  </div>

                  {(() => {
                    const badge = getFloodRiskBadge(selectedStation.flood_risk_level);
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Score & Gauge Card */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Flood Risk Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span
                        className="text-4xl font-extrabold"
                        style={{ color: getFloodRiskColor(selectedStation.flood_risk_level) }}
                      >
                        {selectedStation.flood_risk_score}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">/ 100</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Scale: 0–39 Low · 40–69 Moderate · 70–100 High
                    </p>
                  </div>

                  {/* Visual gauge bar */}
                  <div className="w-28 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${selectedStation.flood_risk_score}%`,
                          backgroundColor: getFloodRiskColor(selectedStation.flood_risk_level),
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-center font-bold text-slate-500">
                      {selectedStation.flood_risk_level} LEVEL
                    </span>
                  </div>
                </div>

                {/* Environmental Indicators Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <CloudRain size={13} className="text-[#0284C7]" />
                      <span>24h Rainfall</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-[#102A43] mt-1">
                      {selectedStation.rainfall_mm.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Droplets size={13} className="text-teal-600" />
                      <span>Soil Moisture</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-[#102A43] mt-1">
                      {selectedStation.soil_moisture.toFixed(1)} <span className="text-xs font-normal text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Waves size={13} className="text-blue-600" />
                      <span>Est. Runoff</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-[#102A43] mt-1">
                      {selectedStation.runoff_index} <span className="text-xs font-normal text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Recent / Previous Rainfall Trend (7-day) */}
                {selectedStation.seven_day_trend && selectedStation.seven_day_trend.length > 0 && (
                  <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <TrendingUp size={12} />
                        <span>Recent 7-Day Rainfall History</span>
                      </span>
                      <span className="text-[10px] text-slate-400">mm / day</span>
                    </div>

                    <div className="flex items-end gap-1.5 h-16 pt-2">
                      {selectedStation.seven_day_trend.map((val, idx) => {
                        const maxVal = Math.max(...(selectedStation.seven_day_trend || [100]), 100);
                        const heightPct = Math.min(100, Math.max(12, (val / maxVal) * 100));
                        const isLatest = idx === selectedStation.seven_day_trend!.length - 1;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="w-full bg-slate-200 rounded-t h-full flex items-end">
                              <div
                                className={`w-full rounded-t transition-all ${
                                  isLatest ? 'bg-[#0284C7]' : 'bg-slate-400/80 group-hover:bg-slate-500'
                                }`}
                                style={{ height: `${heightPct}%` }}
                                title={`Day ${idx + 1}: ${val} mm`}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">D{idx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hydrological Assessment Commentary */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <Activity size={13} className="text-[#0284C7]" />
                    <span>Hydrological Risk Assessment</span>
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedStation.flood_assessment}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                Select a station on the map to view flood risk analytics.
              </div>
            )}
          </div>
        </div>

        {/* Flood Warning & Advisories Section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-500" />
                <span>Flood Risk Warnings & Advisories</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated flood advisory notices separated from landslide emergency alerts.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
              {advisories.length} Active Advisories
            </span>
          </div>

          {advisories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No active flood warnings currently issued. All monitored stations are within manageable drainage baselines.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {advisories.map((adv) => {
                const isHigh = adv.severity === 'HIGH';
                return (
                  <div
                    key={adv.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isHigh
                        ? 'bg-red-50/40 border-red-200/80 hover:border-red-300'
                        : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isHigh ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-[#102A43]">{adv.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isHigh
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {adv.severity} FLOOD RISK
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {adv.message}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        <span>{adv.location_name}, {adv.state}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>{adv.timestamp}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Future Extensibility Architecture Section */}
        <div className="bg-[#071A2B] text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2.5">
            <Layers size={20} className="text-[#14B8A6]" />
            <h2 className="text-base sm:text-lg font-bold">
              Modular Architecture & Future Real-Dataset Integrations
            </h2>
          </div>
          <p className="text-xs text-white/70 leading-relaxed max-w-3xl">
            This Flood Risk engine is architected as an independent, extensible module.
            As physical river sensors and satellite hydrology feeds are deployed across Northeast India,
            the calculation engine is designed to seamlessly ingest:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {[
              {
                title: 'River Gauge Telemetry',
                desc: 'Central Water Commission (CWC) real-time stage & discharge levels.',
              },
              {
                title: 'Drainage & Elevation',
                desc: 'DEM hydro-routing models with low-lying urban drainage capacity.',
              },
              {
                title: 'Rainfall Intensity',
                desc: 'Sub-hourly Doppler radar nowcasting for flash flood triggers.',
              },
              {
                title: 'Satellite SAR Water Masks',
                desc: 'Sentinel-1 synthetic aperture radar surface water inundation maps.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white/5 rounded-xl border border-white/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-[#14B8A6] flex items-center gap-1.5">
                  <ArrowRight size={12} />
                  <span>{title}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </Layout>
  );
};

export default FloodRisk;

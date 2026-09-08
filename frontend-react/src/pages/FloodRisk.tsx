// src/pages/FloodRisk.tsx — Production-Grade Point-Level Multi-Hazard (Flood + Landslide) Risk Platform
import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import {
  Waves,
  Droplets,
  CloudRain,
  Info,
  Search,
  RefreshCw,
  MapPin,
  TrendingUp,
  Activity,
  ShieldCheck,
  Sparkles,
  Mountain,
  Crosshair,
  Navigation,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layout } from '../components/Layout/Layout';
import { ToastContainer, useToast } from '../components/UI/Toast';
import {
  getFloodRiskData,
  assessPointRisk,
  searchLocations,
} from '../services/api';
import { MAP_CENTER, MAP_ZOOM } from '../data/constants';
import type {
  FloodStation,
  FloodRiskResponse,
  PointRiskAssessment,
  LocationSearchResult,
} from '../types';

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

function getRiskColor(level: string | null | undefined): string {
  if (level === 'HIGH') return '#DC2626';     // Red for 70-100
  if (level === 'MODERATE') return '#F59E0B'; // Amber for 40-69
  if (level === 'LOW') return '#16A34A';      // Green for 0-39
  return '#94A3B8';
}

function getQualityBadge(quality: string | undefined) {
  if (quality === 'GOOD') {
    return {
      bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
      label: 'Data Quality: GOOD',
    };
  }
  if (quality === 'PARTIAL') {
    return {
      bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
      label: 'Data Quality: PARTIAL',
    };
  }
  return {
    bg: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
    label: 'Data Quality: INSUFFICIENT',
  };
}

// ─── Leaflet Map Component with Interactive Point Selection & Click ───────────

interface InteractiveRiskMapProps {
  stations: FloodStation[];
  selectedStationId: number | string | null;
  onSelectStation: (id: number | string) => void;
  pointAssessment: PointRiskAssessment | null;
  onMapClick: (lat: number, lon: number) => void;
}

const InteractiveRiskMap: React.FC<InteractiveRiskMapProps> = memo(
  ({ stations, selectedStationId, onSelectStation, pointAssessment, onMapClick }) => {
    const mapRef = useRef<L.Map | null>(null);
    const stationMarkersRef = useRef<Map<number | string, L.Marker>>(new Map());
    const pointMarkerRef = useRef<L.Marker | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize Map
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

      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, [onMapClick]);

    // Render Monitored Station Markers (Stations as data points)
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !stations.length) return;

      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current.clear();

      stations.forEach((st) => {
        const color = getRiskColor(st.flood_risk_level);
        const isSelected = selectedStationId === st.id && !pointAssessment;

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <div style="
                width:${isSelected ? '30px' : '26px'};
                height:${isSelected ? '30px' : '26px'};
                border-radius:50%;
                background:${color};
                border:2.5px solid white;
                box-shadow:0 3px 8px rgba(0,0,0,0.25);
                display:flex;align-items:center;justify-content:center;
                font-size:10px;font-weight:700;color:white;font-family:Inter,sans-serif;
                transition: all 0.2s ease;
              ">${st.flood_risk_score}</div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([st.latitude, st.longitude], {
          icon,
          title: `Station: ${st.name} — Risk ${st.flood_risk_score}/100`,
        });

        marker.bindTooltip(
          `<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#102A43;padding:2px 4px;">
            📡 <strong>${st.name}</strong> (${st.state})<br/>
            <span style="font-weight:700;color:${color};font-size:11px;">Flood: ${st.flood_risk_score}/100 (${st.flood_risk_level})</span><br/>
            <span style="font-weight:400;color:#64748b;font-size:10px;">Click to view station telemetry</span>
          </div>`,
          { direction: 'top', offset: [0, -10] }
        );

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectStation(st.id);
        });

        marker.addTo(map);
        stationMarkersRef.current.set(st.id, marker);
      });
    }, [stations, selectedStationId, pointAssessment, onSelectStation]);

    // Render Point Assessment Interactive Pin (User Clicked or Searched Coordinate)
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (pointMarkerRef.current) {
        pointMarkerRef.current.remove();
        pointMarkerRef.current = null;
      }

      if (!pointAssessment) return;

      const { latitude, longitude, name } = pointAssessment.location;
      const floodScore = pointAssessment.flood.score ?? '—';
      const landslideScore = pointAssessment.landslide.score ?? '—';
      const floodColor = getRiskColor(pointAssessment.flood.level);
      const landslideColor = getRiskColor(pointAssessment.landslide.level);

      const pinHtml = `
        <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
          <div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(2,132,199,0.25);animation:pulse 1.5s ease-in-out infinite;border:2px solid #0284C7;"></div>
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:#071A2B;
            border:3px solid white;
            box-shadow:0 4px 14px rgba(0,0,0,0.4);
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            color:white;font-family:Inter,sans-serif;
          ">
            <span style="font-size:11px;font-weight:800;color:#38BDF8;">📍</span>
          </div>
        </div>
      `;

      const pinIcon = L.divIcon({
        className: '',
        html: pinHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
      });

      const pointMarker = L.marker([latitude, longitude], {
        icon: pinIcon,
        zIndexOffset: 1000,
      });

      pointMarker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:12px;padding:4px 2px;min-width:180px;">
          <div style="font-weight:700;color:#102A43;font-size:13px;margin-bottom:4px;">📍 ${name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E</div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;margin-bottom:2px;">
            <span style="color:#0284C7;font-weight:600;">🌊 Flood Risk:</span>
            <strong style="color:${floodColor};">${floodScore}/100</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#D97706;font-weight:600;">⛰️ Landslide Risk:</span>
            <strong style="color:${landslideColor};">${landslideScore}/100</strong>
          </div>
        </div>`
      );

      pointMarker.addTo(map);
      pointMarkerRef.current = pointMarker;

      map.setView([latitude, longitude], Math.max(map.getZoom(), 10), { animate: true });
    }, [pointAssessment]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden shadow-inner border border-slate-200/80 cursor-crosshair relative"
        role="application"
        aria-label="Interactive India Point-Level Environmental Risk Map. Click anywhere to assess."
      />
    );
  }
);

InteractiveRiskMap.displayName = 'InteractiveRiskMap';

// ─── Quick Locations ──────────────────────────────────────────────────────────

const QUICK_LOCATIONS = [
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { name: 'Coimbatore', lat: 11.0055, lon: 76.9661, state: 'Tamil Nadu' },
  { name: 'Valparai', lat: 10.3280, lon: 76.9557, state: 'Tamil Nadu (Hill Tract)' },
  { name: 'Madurai', lat: 9.9190, lon: 78.1195, state: 'Tamil Nadu' },
  { name: 'Ooty', lat: 11.4102, lon: 76.6950, state: 'Tamil Nadu (Nilgiris)' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Munnar', lat: 10.0889, lon: 77.0595, state: 'Kerala (Western Ghats)' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Guwahati', lat: 26.1445, lon: 91.7362, state: 'Assam' },
];

// ─── Main FloodRisk / Point-Risk Assessment Page ──────────────────────────────

export const FloodRisk: React.FC = () => {
  const [data, setData] = useState<FloodRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<number | string | null>(null);

  // Point-level multi-hazard state
  const [pointAssessment, setPointAssessment] = useState<PointRiskAssessment | null>(null);
  const [pointLoading, setPointLoading] = useState(false);
  const [pointStep, setPointStep] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);

  const { toasts, addToast, dismissToast } = useToast();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch for baseline monitoring stations
  const fetchBaselineData = async () => {
    setLoading(true);
    try {
      const res = await getFloodRiskData();
      setData(res);
      if (res.stations.length > 0 && selectedStationId === null && !pointAssessment) {
        setSelectedStationId(res.stations[0].id ?? null);
      }
    } catch {
      addToast('error', 'Unable to Load Stations', 'Could not fetch baseline telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaselineData();
  }, []);

  // Point Risk Assessment Action
  const assessCoordinate = useCallback(
    async (lat: number, lon: number, name?: string) => {
      setPointLoading(true);
      setSelectedStationId(null); // Deselect station to focus on point
      setPointStep('Identifying location & coordinates...');

      try {
        await new Promise((r) => setTimeout(r, 200));
        setPointStep('Ingesting real-time weather & Copernicus DEM terrain...');

        const assessment = await assessPointRisk(lat, lon, name);

        setPointStep('Evaluating flood & landslide physics models...');
        await new Promise((r) => setTimeout(r, 150));

        setPointAssessment(assessment);
        setShowSuggestions(false);
        addToast(
          'success',
          `Point Assessed: ${assessment.location.name}`,
          `Flood Risk: ${assessment.flood.score ?? '—'}/100 (${assessment.flood.level}) · Landslide Risk: ${assessment.landslide.score ?? '—'}/100 (${assessment.landslide.level})`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to complete point assessment.';
        addToast('error', 'Assessment Error', msg);
      } finally {
        setPointLoading(false);
        setPointStep('');
      }
    },
    [addToast]
  );

  // Map Click Handler
  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      assessCoordinate(lat, lon);
    },
    [assessCoordinate]
  );

  // Autocomplete Search when typing
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!text.trim() || text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(text.trim(), 5);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  // Submit Search Form
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (suggestions.length > 0) {
      const top = suggestions[0];
      assessCoordinate(top.latitude, top.longitude, top.name);
    } else {
      // Direct geocode search
      setPointLoading(true);
      setPointStep(`Searching location '${q}'...`);
      try {
        const results = await searchLocations(q, 1);
        if (results.length > 0) {
          assessCoordinate(results[0].latitude, results[0].longitude, results[0].name);
        } else {
          addToast('warning', 'Location Not Found', `Unable to resolve '${q}'. Try another village, school, or town.`);
          setPointLoading(false);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Search failed.';
        addToast('error', 'Search Error', msg);
        setPointLoading(false);
      }
    }
  };

  // GPS Location Handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast('warning', 'Geolocation Unsupported', 'Your browser does not support GPS location.');
      return;
    }

    setPointLoading(true);
    setPointStep('Acquiring GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        assessCoordinate(latitude, longitude, 'My GPS Location');
      },
      (err) => {
        setPointLoading(false);
        setPointStep('');
        addToast('warning', 'GPS Access Denied', err.message || 'Could not retrieve GPS location.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const stations = data?.stations || [];
  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || stations[0] || null;
  }, [stations, selectedStationId]);

  return (
    <Layout>
      <div className="space-y-6 max-w-screen-xl mx-auto">
        {/* Page Title & Mission Notice */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#102A43] flex items-center gap-2.5">
                <Waves className="text-[#0284C7] flex-shrink-0" size={28} />
                <span>Point-Level Environmental Risk</span>
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-600" />
                Production Architecture
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Genuine coordinate-level assessment across India: click anywhere on the map, search any school, village, or town to evaluate independent Flood and Landslide risks using live weather and Copernicus DEM terrain physics.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={pointLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-800 text-xs font-semibold shadow-xs transition-colors"
              aria-label="Assess current GPS location"
            >
              <Navigation size={13} className={pointLoading ? 'animate-spin' : 'text-[#0284C7]'} />
              <span>Use My Location</span>
            </button>

            <button
              type="button"
              onClick={fetchBaselineData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              aria-label="Refresh telemetry"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#0284C7]' : 'text-slate-500'} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Location Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3 relative z-30">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 relative">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Search ANY village, school, locality, street, or city (e.g. Valparai, Pollachi, Stanes School)..."
                  className="w-full pl-9 pr-24 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7]"
                />
                <button
                  type="submit"
                  disabled={pointLoading || !searchQuery.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  aria-label="Assess location risk"
                >
                  {pointLoading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <span>Assess</span>
                  )}
                </button>

                {/* Search Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 divide-y divide-slate-100">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchQuery(s.name);
                          assessCoordinate(s.latitude, s.longitude, s.name);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-sky-50/70 flex items-start gap-2.5 transition-colors"
                      >
                        <MapPin size={14} className="text-[#0284C7] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#102A43] truncate">{s.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{s.display_name}</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                          {s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Station Quick Selector Dropdown */}
              <div className="sm:w-64">
                <select
                  value={pointAssessment ? 'point' : (selectedStationId !== null ? String(selectedStationId) : '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'point') return;
                    setPointAssessment(null);
                    setSelectedStationId(/^\d+$/.test(v) ? Number(v) : v);
                  }}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 font-medium"
                  aria-label="Select active monitoring station"
                >
                  {pointAssessment && (
                    <option value="point">📍 {pointAssessment.location.name} (Point Assessment)</option>
                  )}
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      📡 {st.name} ({st.state}) — Flood: {st.flood_risk_score}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Progressive Loading State Banner */}
            {pointLoading && (
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium animate-pulse">
                <RefreshCw size={13} className="animate-spin text-[#0284C7] flex-shrink-0" />
                <span>{pointStep || 'Processing point risk assessment...'}</span>
              </div>
            )}

            {/* Quick Location Pills */}
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Quick Preset Coordinates:</span>
                <span className="text-[10px] text-slate-400 font-normal">click to evaluate exact point live</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {QUICK_LOCATIONS.map((loc) => {
                  const isSelected =
                    pointAssessment &&
                    Math.abs(pointAssessment.location.latitude - loc.lat) < 0.05 &&
                    Math.abs(pointAssessment.location.longitude - loc.lon) < 0.05;

                  return (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setSearchQuery(loc.name);
                        assessCoordinate(loc.lat, loc.lon, loc.name);
                      }}
                      disabled={pointLoading}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-[#071A2B] text-white border-[#071A2B] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <MapPin size={11} className={isSelected ? 'text-sky-400' : 'text-slate-400'} />
                      <span>{loc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Main Interactive Workspace: Map + Risk Analysis Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Map (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Crosshair size={14} className="text-[#0284C7]" />
                <span>
                  {pointAssessment
                    ? `Selected: ${pointAssessment.location.name} (${pointAssessment.location.latitude.toFixed(4)}°N, ${pointAssessment.location.longitude.toFixed(4)}°E)`
                    : 'Click ANYWHERE on the map to evaluate point-level risk.'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Crosshair Active
              </span>
            </div>

            <div className="h-[460px] relative rounded-2xl overflow-hidden shadow-sm bg-slate-100 border border-slate-200">
              <InteractiveRiskMap
                stations={stations}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => {
                  setPointAssessment(null);
                  setSelectedStationId(id);
                }}
                pointAssessment={pointAssessment}
                onMapClick={handleMapClick}
              />

              {/* Map Legend */}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/80 px-3 py-2 flex items-center gap-3 text-xs shadow-md z-[400] flex-wrap">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Severity:</span>
                {[
                  { color: '#DC2626', label: 'High (70–100)' },
                  { color: '#F59E0B', label: 'Mod (40–69)' },
                  { color: '#16A34A', label: 'Low (0–39)' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: color }} />
                    <span className="text-slate-600 font-medium text-[10px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Location Risk Assessment Drawer (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {pointAssessment ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-5">
                {/* Location Header */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                      <Sparkles size={10} className="text-[#0284C7]" />
                      Point Assessment
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {pointAssessment.location.latitude.toFixed(4)}°N, {pointAssessment.location.longitude.toFixed(4)}°E
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-[#102A43] mt-1.5 leading-snug">
                    {pointAssessment.location.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2" title={pointAssessment.location.display_name}>
                    {pointAssessment.location.display_name}
                  </p>
                </div>

                {/* Dual Hazard Assessment Cards (Flood + Landslide) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* FLOOD RISK CARD */}
                  <div className="bg-sky-50/40 border border-sky-200/70 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                        <Waves size={15} className="text-[#0284C7]" />
                        <span>Flood Risk</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                        style={{
                          backgroundColor: `${getRiskColor(pointAssessment.flood.level)}20`,
                          color: getRiskColor(pointAssessment.flood.level),
                        }}
                      >
                        {pointAssessment.flood.level}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-3xl font-extrabold"
                        style={{ color: getRiskColor(pointAssessment.flood.level) }}
                      >
                        {pointAssessment.flood.score ?? '—'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ 100</span>
                    </div>

                    <div className="text-[10px] font-medium text-slate-600 flex items-center justify-between border-t border-sky-100 pt-1.5">
                      <span>{getQualityBadge(pointAssessment.flood.data_quality).label}</span>
                      <span>Confidence: {pointAssessment.flood.confidence_pct ?? 75}%</span>
                    </div>

                    {pointAssessment.flood.factors && pointAssessment.flood.factors.length > 0 && (
                      <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside pt-1">
                        {pointAssessment.flood.factors.slice(0, 2).map((f, i) => (
                          <li key={i} className="truncate" title={f}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* LANDSLIDE RISK CARD */}
                  <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <Mountain size={15} className="text-amber-600" />
                        <span>Landslide Risk</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                        style={{
                          backgroundColor: `${getRiskColor(pointAssessment.landslide.level)}20`,
                          color: getRiskColor(pointAssessment.landslide.level),
                        }}
                      >
                        {pointAssessment.landslide.level}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-3xl font-extrabold"
                        style={{ color: getRiskColor(pointAssessment.landslide.level) }}
                      >
                        {pointAssessment.landslide.score ?? '—'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ 100</span>
                    </div>

                    <div className="text-[10px] font-medium text-slate-600 flex items-center justify-between border-t border-amber-100 pt-1.5">
                      <span>{getQualityBadge(pointAssessment.landslide.data_quality).label}</span>
                      <span>Confidence: {pointAssessment.landslide.confidence_pct ?? 75}%</span>
                    </div>

                    {pointAssessment.landslide.factors && pointAssessment.landslide.factors.length > 0 && (
                      <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside pt-1">
                        {pointAssessment.landslide.factors.slice(0, 2).map((f, i) => (
                          <li key={i} className="truncate" title={f}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Environmental Telemetry Metrics Grid */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Point Environmental Telemetry:</span>
                    <span className="text-[10px] font-normal text-slate-400">ERA5 & Copernicus DEM</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <CloudRain size={11} className="text-[#0284C7]" />
                        <span>Rainfall 24h</span>
                      </div>
                      <div className="text-base font-bold text-[#102A43] mt-0.5">
                        {pointAssessment.environment.rainfall_24h.value !== null
                          ? `${pointAssessment.environment.rainfall_24h.value.toFixed(1)} mm`
                          : 'Unavailable'}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <CloudRain size={11} className="text-sky-600" />
                        <span>Rainfall 72h</span>
                      </div>
                      <div className="text-base font-bold text-[#102A43] mt-0.5">
                        {pointAssessment.environment.rainfall_72h.value !== null
                          ? `${pointAssessment.environment.rainfall_72h.value.toFixed(1)} mm`
                          : 'Unavailable'}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Droplets size={11} className="text-teal-600" />
                        <span>Soil Saturation</span>
                      </div>
                      <div className="text-base font-bold text-[#102A43] mt-0.5">
                        {pointAssessment.environment.soil_moisture.value !== null
                          ? `${pointAssessment.environment.soil_moisture.value.toFixed(1)}%`
                          : 'Unavailable'}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Mountain size={11} className="text-emerald-600" />
                        <span>Elevation (DEM)</span>
                      </div>
                      <div className="text-base font-bold text-[#102A43] mt-0.5">
                        {pointAssessment.environment.elevation.value !== null
                          ? `${pointAssessment.environment.elevation.value.toFixed(0)} m`
                          : 'Unavailable'}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Activity size={11} className="text-amber-600" />
                        <span>Terrain Slope</span>
                      </div>
                      <div className="text-base font-bold text-[#102A43] mt-0.5">
                        {pointAssessment.environment.slope.value !== null
                          ? `${pointAssessment.environment.slope.value.toFixed(1)}°`
                          : 'Unavailable'}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Waves size={11} className="text-blue-600" />
                        <span>Est. Runoff</span>
                      </div>
                      <div className="text-base font-bold text-[#102A43] mt-0.5">
                        {pointAssessment.environment.runoff_index !== null && pointAssessment.environment.runoff_index !== undefined
                          ? `${pointAssessment.environment.runoff_index}%`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7-Day Rainfall Trend History */}
                {pointAssessment.environment.seven_day_trend && pointAssessment.environment.seven_day_trend.length > 0 && (
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={11} />
                        <span>Recent 7-Day Precipitation Trend</span>
                      </span>
                      <span>mm / day</span>
                    </div>

                    <div className="flex items-end gap-1.5 h-14 pt-1">
                      {pointAssessment.environment.seven_day_trend.map((val, idx) => {
                        const maxVal = Math.max(...pointAssessment.environment.seven_day_trend, 40);
                        const heightPct = Math.min(100, Math.max(10, (val / maxVal) * 100));
                        const isLatest = idx === pointAssessment.environment.seven_day_trend.length - 1;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-slate-200 rounded-t h-full flex items-end">
                              <div
                                className={`w-full rounded-t transition-all ${
                                  isLatest ? 'bg-[#0284C7]' : 'bg-slate-400'
                                }`}
                                style={{ height: `${heightPct}%` }}
                                title={`Day ${idx + 1}: ${val} mm`}
                              />
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono">D{idx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expandable Geotechnical & Hydrological Explanations */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDetails(!expandedDetails)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-[#102A43] transition-colors"
                  >
                    <span>Detailed Hazard Models Commentary</span>
                    {expandedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {expandedDetails && (
                    <div className="p-3.5 text-xs text-slate-600 space-y-3 bg-white border-t border-slate-100 leading-relaxed">
                      <div>
                        <strong className="text-[#0284C7] block mb-0.5">🌊 Hydrological Assessment:</strong>
                        <p>{pointAssessment.flood.assessment}</p>
                      </div>
                      <div>
                        <strong className="text-amber-700 block mb-0.5">⛰️ Geotechnical Landslide Assessment:</strong>
                        <p>{pointAssessment.landslide.assessment}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audit & Metadata Transparency Card */}
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#102A43]">
                    <ShieldCheck size={14} className="text-[#0284C7]" />
                    <span>Decision-Support & Data Transparency</span>
                  </div>
                  <p className="leading-relaxed">
                    {pointAssessment.metadata.disclaimer}
                  </p>
                  <div className="pt-1.5 border-t border-slate-200/60 flex flex-col gap-0.5 text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Models:</span>
                      <span className="font-mono">
                        {pointAssessment.metadata.model_versions.flood} · {pointAssessment.metadata.model_versions.landslide}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Generated:</span>
                      <span>{pointAssessment.metadata.generated_at}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedStation ? (
              /* Predefined Monitoring Station Telemetry View */
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin size={13} className="text-[#0284C7]" />
                      <span>{selectedStation.state} · Lat {selectedStation.latitude.toFixed(2)}, Lon {selectedStation.longitude.toFixed(2)}</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#102A43] mt-0.5">
                      {selectedStation.name}
                    </h2>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Telemetry Station {selectedStation.station_code || selectedStation.id}
                    </span>
                  </div>

                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{
                      borderColor: `${getRiskColor(selectedStation.flood_risk_level)}40`,
                      color: getRiskColor(selectedStation.flood_risk_level),
                      backgroundColor: `${getRiskColor(selectedStation.flood_risk_level)}10`,
                    }}
                  >
                    {selectedStation.flood_risk_level} Risk
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Station Flood Risk Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span
                        className="text-4xl font-extrabold"
                        style={{ color: getRiskColor(selectedStation.flood_risk_level) }}
                      >
                        {selectedStation.flood_risk_score}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">/ 100</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => assessCoordinate(selectedStation.latitude, selectedStation.longitude, selectedStation.name)}
                    className="px-3 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={13} />
                    <span>Run Point Physics</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Rainfall</span>
                    <strong className="text-sm text-[#102A43]">{selectedStation.rainfall_mm.toFixed(1)} mm</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Soil Moisture</span>
                    <strong className="text-sm text-[#102A43]">{selectedStation.soil_moisture.toFixed(1)}%</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Est. Runoff</span>
                    <strong className="text-sm text-[#102A43]">{selectedStation.runoff_index}%</strong>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Station Hydrological Commentary
                  </span>
                  <p>{selectedStation.flood_assessment}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-slate-400 space-y-2">
                <Crosshair size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No Location Selected</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click any point on the map or search for a village, school, or town to run location-specific risk models.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Global Transparency Notice */}
        <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3.5 items-start">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0 text-[#0284C7] mt-0.5">
            <Info size={20} />
          </div>
          <div className="flex-1 text-xs text-sky-900 leading-relaxed">
            <div className="font-bold text-sky-950 text-sm mb-0.5">
              Production Point-Level Environmental Risk Architecture Notice
            </div>
            <p>
              MALAI VIZHI evaluates point-level multi-hazard risks for arbitrary coordinates using real telemetry
              (Open-Meteo ERA5 precipitation, Copernicus DEM finite-difference slope and elevation, and ground moisture saturation).
              This assessment is intended for technical decision-support, localized early awareness, and hazard prioritization.
              It is not a replacement for certified municipal warning systems.
            </p>
          </div>
        </div>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </Layout>
  );
};

export default FloodRisk;

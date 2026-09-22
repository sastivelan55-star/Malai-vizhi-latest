// src/components/Risk/PointRiskPanel.tsx — Phase 4 Advanced Point-Level Risk Intelligence Panel
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  AlertTriangle,
  Activity,
  Layers,
  Info,
  RefreshCw,
  X,
  Droplets,
  Mountain,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Database,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  SlidersHorizontal,
  Camera,
  History,
  Zap,
} from 'lucide-react';
import type {
  PointRiskAssessment,
  StructuredRiskFactor,
  SimulationResponseData,
  RiskReplayResponse,
  RiskTrendStatisticalResponse,
} from '../../types';
import {
  assessPointRisk,
  simulateScenario,
  getRiskReplay,
  getRiskTrend,
} from '../../services/api';

interface PointRiskPanelProps {
  point: { lat: number; lon: number };
  onClose: () => void;
  onAssessmentLoaded?: (data: PointRiskAssessment) => void;
}

type RainfallInterval = '1h' | '3h' | '6h' | '24h' | '3d' | '7d' | 'forecast';

export const PointRiskPanel: React.FC<PointRiskPanelProps> = ({
  point,
  onClose,
  onAssessmentLoaded,
}) => {
  const [assessment, setAssessment] = useState<PointRiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRainInterval, setSelectedRainInterval] = useState<RainfallInterval>('24h');
  const [showReplay, setShowReplay] = useState(false);

  // Phase 4 What-If Simulation State
  const [rainfallChangePct, setRainfallChangePct] = useState<number>(0);
  const [soilMoistureChangePct, setSoilMoistureChangePct] = useState<number>(0);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResponseData | null>(null);

  // Phase 4 Historical Replay and Trend State
  const [replayData, setReplayData] = useState<RiskReplayResponse | null>(null);
  const [statisticalTrend, setStatisticalTrend] = useState<RiskTrendStatisticalResponse | null>(null);

  const fetchAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assessPointRisk(point.lat, point.lon);
      setAssessment(data);
      if (onAssessmentLoaded) {
        onAssessmentLoaded(data);
      }

      // Concurrently fetch historical replay & statistical trend
      try {
        const [rep, tr] = await Promise.all([
          getRiskReplay(point.lat, point.lon, 48),
          getRiskTrend(point.lat, point.lon),
        ]);
        setReplayData(rep);
        setStatisticalTrend(tr);
      } catch {
        // Graceful non-blocking fallback
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assess location risk';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRainfallChangePct(0);
    setSoilMoistureChangePct(0);
    setSimulating(false);
    setSimResult(null);
    fetchAssessment();
  }, [point.lat, point.lon]);

  // Execute What-If Scenario simulation (non-destructive)
  const handleRunSimulation = async (rPct: number, smPct: number) => {
    setRainfallChangePct(rPct);
    setSoilMoistureChangePct(smPct);

    if (rPct === 0 && smPct === 0) {
      setSimulating(false);
      setSimResult(null);
      return;
    }

    setSimulating(true);
    try {
      const sim = await simulateScenario({
        lat: point.lat,
        lon: point.lon,
        rainfall_change_percent: rPct,
        soil_moisture_change_percent: smPct,
      });
      setSimResult(sim);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  };

  const getRiskBadgeColor = (level?: string) => {
    const l = (level || '').toUpperCase();
    if (l === 'HIGH') return 'bg-red-50 text-red-700 border-red-200';
    if (l === 'MODERATE') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (l === 'LOW') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getQualityBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'good':
        return {
          icon: <CheckCircle2 size={13} className="text-emerald-500" />,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Data Quality: GOOD',
        };
      case 'moderate':
      case 'partial':
        return {
          icon: <Info size={13} className="text-sky-500" />,
          color: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'Data Quality: MODERATE',
        };
      case 'limited':
        return {
          icon: <AlertTriangle size={13} className="text-amber-500" />,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Data Quality: LIMITED',
        };
      default:
        return {
          icon: <AlertCircle size={13} className="text-slate-400" />,
          color: 'bg-slate-50 text-slate-600 border-slate-200',
          label: 'Data Quality: UNAVAILABLE',
        };
    }
  };

  const getSelectedRainfallValue = () => {
    const rf = assessment?.environment?.rainfall;
    if (!rf) {
      const v = assessment?.environment?.rainfall_24h?.value;
      return {
        value: v !== null && v !== undefined ? `${v.toFixed(1)} mm` : 'Unavailable',
        label: '24-Hour Total',
        freshness: 'RECENT',
        quality: 'moderate',
        available: v !== null && v !== undefined,
      };
    }

    let targetObs = null;
    let label = '24-Hour Total';
    switch (selectedRainInterval) {
      case '1h':
        targetObs = rf.current_1h;
        label = '1-Hour Rate';
        break;
      case '3h':
        targetObs = rf.recent_3h;
        label = '3-Hour Accumulation';
        break;
      case '6h':
        targetObs = rf.recent_6h;
        label = '6-Hour Accumulation';
        break;
      case '24h':
        targetObs = rf.accumulated_24h;
        label = '24-Hour Total';
        break;
      case '3d':
        targetObs = rf.accumulated_3d;
        label = '3-Day Antecedent';
        break;
      case '7d':
        targetObs = rf.accumulated_7d;
        label = '7-Day Antecedent';
        break;
      case 'forecast':
        targetObs = rf.forecast_24h;
        label = '24h Expected Forecast';
        break;
    }

    if (targetObs && targetObs.value !== null && targetObs.value !== undefined) {
      return {
        value: `${targetObs.value.toFixed(1)} ${targetObs.unit || 'mm'}`,
        label,
        freshness: targetObs.freshness || 'LIVE',
        quality: targetObs.quality || 'good',
        available: targetObs.available !== false,
      };
    }

    return {
      value: 'Unavailable',
      label,
      freshness: 'STALE',
      quality: 'unavailable',
      available: false,
    };
  };

  const selectedRain = getSelectedRainfallValue();

  const slopeValue =
    assessment?.environment?.terrain?.slope?.value ??
    assessment?.environment?.slope?.value ??
    null;

  const elevationValue =
    assessment?.environment?.terrain?.elevation?.value ??
    assessment?.environment?.elevation?.value ??
    null;

  const aspectCompass =
    assessment?.environment?.terrain?.aspect_compass ??
    assessment?.environment?.aspect?.direction ??
    null;

  const soilSatValue =
    assessment?.environment?.soil?.saturation_percentage?.value ??
    assessment?.environment?.soil?.saturation_pct?.value ??
    assessment?.environment?.soil_moisture?.value ??
    null;

  const soilVolValue =
    assessment?.environment?.soil?.volumetric_0_7cm?.value ??
    (assessment?.environment?.soil?.volumetric_fraction !== undefined && assessment?.environment?.soil?.volumetric_fraction !== null
      ? assessment.environment.soil.volumetric_fraction
      : null);

  // Extract dominant factor
  const dominantFactor =
    assessment?.dominant_factor ||
    assessment?.overall_hazard_priority?.dominant_factor ||
    (assessment?.landslide?.structured_factors && assessment.landslide.structured_factors.length > 0
      ? assessment.landslide.structured_factors[0].name
      : 'Slope');

  // Trend detection from Phase 4 statistical endpoint
  const trendDir = statisticalTrend?.trend_direction || assessment?.trend?.direction || 'INSUFFICIENT DATA';
  const isRapidlyIncreasing = trendDir === 'RAPIDLY INCREASING';
  const isIncreasing = trendDir === 'INCREASING' || isRapidlyIncreasing;
  const isDecreasing = trendDir === 'DECREASING' || trendDir === 'RAPIDLY DECREASING';
  const isStable = trendDir === 'STABLE';

  // Consolidated factors for contribution bars
  const lsFactors: StructuredRiskFactor[] = (assessment?.landslide?.structured_factors || []) as StructuredRiskFactor[];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden animate-fadeIn">
      {/* ─── 1. SELECTED LOCATION HEADER ─────────────────────────────────────── */}
      <div className="bg-slate-900 text-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center text-[#14B8A6] flex-shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.5 rounded">
                  Point-Level Intelligence
                </span>
                <span className="text-[10px] text-teal-300 bg-teal-900/60 border border-teal-700/50 px-1.5 py-0.5 rounded font-mono">
                  Phase 4 What-If
                </span>
              </div>
              <h2 className="text-sm font-bold text-white truncate mt-0.5">
                {assessment?.location_name || assessment?.location?.name || 'Selected Coordinate'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close point assessment"
          >
            <X size={15} />
          </button>
        </div>

        {/* Coordinates Display */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="font-mono text-slate-300 flex items-center gap-1.5">
            <span className="text-[#14B8A6] font-bold">LAT</span> {point.lat.toFixed(5)}°
            <span className="text-slate-600">|</span>
            <span className="text-[#14B8A6] font-bold">LON</span> {point.lon.toFixed(5)}°
          </div>
          <button
            type="button"
            onClick={fetchAssessment}
            disabled={loading}
            className="text-[11px] font-medium text-slate-300 hover:text-[#14B8A6] flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Re-assess
          </button>
        </div>
      </div>

      {/* ─── BODY CONTENT ─────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
        {loading && (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#14B8A6] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-semibold text-slate-700">
              Evaluating Point Risk Intelligence & Telemetry...
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Analyzing coordinates using Explainable Risk Analysis Engine, Copernicus 30m DEM, and Open-Meteo feeds.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle size={15} />
              <span>Assessment Error</span>
            </div>
            <p className="text-xs text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchAssessment}
              className="mt-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Retry Assessment
            </button>
          </div>
        )}

        {assessment && !loading && !error && (
          <>
            {/* ─── 2. HAZARD RISK & OVERALL PRIORITY ──────────────────────────── */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Overall Hazard Priority
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-black px-2 py-0.5 rounded border ${getRiskBadgeColor(assessment.overall_hazard_status?.level || 'LOW')}`}>
                      {(assessment.overall_hazard_status?.level || 'LOW').toUpperCase()} PRIORITY
                    </span>
                    <span className="text-xs text-slate-600">
                      Primary: <strong>{assessment.overall_hazard_status?.primary_threat || 'Landslide'}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#102A43]">
                    {assessment.overall_hazard_status?.score ?? assessment.landslide?.score ?? '—'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">/ 100</span>
                </div>
              </div>

              {/* Dominant factor tag */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                <Zap size={13} className="text-amber-500" />
                <span>Dominant Contributing Driver: <strong>{dominantFactor}</strong></span>
              </div>
            </div>

            {/* ─── 3. SEPARATE LANDSLIDE & FLOOD RATINGS ───────────────────────── */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Landslide */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Mountain size={11} className="text-amber-600" />
                    Landslide
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRiskBadgeColor(assessment.landslide.level)}`}>
                    {assessment.landslide.level}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">{assessment.landslide.score ?? '—'}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Confidence: {assessment.landslide.confidence}%
                </div>
              </div>

              {/* Flood */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Droplets size={11} className="text-sky-500" />
                    Flood
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRiskBadgeColor(assessment.flood.level)}`}>
                    {assessment.flood.level}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">{assessment.flood.score ?? '—'}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Confidence: {assessment.flood.confidence}%
                </div>
              </div>
            </div>

            {/* ─── 4. "WHY THIS RISK?" FACTOR CONTRIBUTION BARS ───────────────── */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={13} className="text-[#14B8A6]" />
                  <span>Why This Risk? (Factor Contributions)</span>
                </span>
                <span className="text-[10px] text-slate-400">Data-Backed</span>
              </div>

              {/* Progress bars representation */}
              <div className="space-y-2">
                {lsFactors.map((f, idx) => {
                  const pts = typeof f.contribution === 'number' ? f.contribution : f.pts || 0;
                  const pct = Math.min(100, Math.max(8, (pts / 45) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{f.name}</span>
                          {f.available === false && (
                            <span className="text-[9px] px-1 bg-slate-200 text-slate-500 rounded">
                              Omitted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 font-mono">
                            {f.value !== null && f.value !== undefined ? `${f.value} ${f.unit || ''}` : '—'}
                          </span>
                          <span className="text-[10px] font-bold px-1 rounded bg-slate-200/80 text-slate-700 font-mono">
                            +{pts} pts
                          </span>
                        </div>
                      </div>
                      {/* Visual contribution bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            f.impact?.toLowerCase() === 'high'
                              ? 'bg-red-500'
                              : f.impact?.toLowerCase() === 'moderate'
                              ? 'bg-amber-500'
                              : 'bg-[#14B8A6]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/60 leading-snug">
                Scores are determined by deterministic physical thresholds using Copernicus DEM and Open-Meteo observations.
              </p>
            </div>

            {/* ─── 5. DATA FRESHNESS & QUALITY MATRIX ─────────────────────────── */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={13} className="text-slate-500" />
                  <span>Data Freshness & Quality</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getQualityBadge(assessment.data_quality.status).color}`}>
                  {assessment.data_quality.status.toUpperCase()}
                </span>
              </div>

              {/* Source Quality Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Precipitation</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">RECENT</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {assessment.data_quality.sources?.rainfall?.status_text || 'Open-Meteo ERA5 / NWP'}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Soil Moisture</span>
                    <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 rounded">RECENT</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {assessment.data_quality.sources?.soil_moisture?.status_text || 'ERA5-Land 0-7cm'}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Terrain (DEM)</span>
                    <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 rounded">AVAILABLE</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Copernicus 30m DEM
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Zonation</span>
                    <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 rounded">AVAILABLE</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    GSI Macro-Zonation
                  </div>
                </div>
              </div>

              {/* Confidence Notice */}
              <div className="text-[10px] text-slate-500 italic bg-white p-2 rounded border border-slate-100 leading-snug">
                Assessment confidence indicates the completeness and freshness of available data. It does not guarantee prediction accuracy.
              </div>
            </div>

            {/* ─── 6. RISK TREND ANALYSIS ──────────────────────────────────────── */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={13} className="text-[#14B8A6]" />
                  <span>Risk Trend Analysis</span>
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                    isIncreasing
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : isDecreasing
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isStable
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isIncreasing && <TrendingUp size={12} />}
                  {isDecreasing && <TrendingDown size={12} />}
                  {isStable && <Minus size={12} />}
                  <span>{trendDir}</span>
                </span>
              </div>

              {statisticalTrend && statisticalTrend.trend_direction !== 'INSUFFICIENT DATA' ? (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="font-bold text-slate-800">
                    Net Score Change: {statisticalTrend.score_change !== undefined && statisticalTrend.score_change > 0 ? `+${statisticalTrend.score_change}` : statisticalTrend.score_change} points
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Calculated over {statisticalTrend.observation_count} genuine assessments ({statisticalTrend.time_window}).
                  </div>
                </div>
              ) : (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px] text-slate-500 italic">
                  Historical data unavailable for this location. Trend will appear when multiple assessments are recorded.
                </div>
              )}
            </div>

            {/* ─── 7. WHAT-IF RISK SIMULATION ─────────────────────────────────── */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal size={13} className="text-[#14B8A6]" />
                  <span>What-If Risk Simulation</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Non-Destructive</span>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Simulate how environmental stresses alter hazard classifications at this exact coordinate without mutating real records.
              </p>

              {/* Rainfall Scenario Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Rainfall Increase:
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {[0, 10, 30, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleRunSimulation(pct, soilMoistureChangePct)}
                      className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                        rainfallChangePct === pct
                          ? 'bg-[#102A43] text-white border-[#102A43] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pct === 0 ? 'Base' : `+${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soil Moisture Scenario Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Soil Moisture Increase:
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 10, 20, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleRunSimulation(rainfallChangePct, pct)}
                      className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                        soilMoistureChangePct === pct
                          ? 'bg-[#102A43] text-white border-[#102A43] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pct === 0 ? 'Base' : `+${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── SCENARIO COMPARISON RESULT ─────────────────────────────── */}
              {simResult && simulating && (
                <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-3 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                      Scenario Comparison
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-mono">
                      SIMULATION — NOT A FORECAST
                    </span>
                  </div>

                  {/* Comparison numbers */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-white p-2.5 rounded-lg border border-amber-200/60">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">Current</span>
                      <div className="text-base font-black text-slate-800 mt-0.5">
                        {simResult.comparison.overall.baseline_score}
                      </div>
                      <span className={`text-[9px] font-bold px-1 rounded ${getRiskBadgeColor(simResult.comparison.overall.baseline_level)}`}>
                        {simResult.comparison.overall.baseline_level}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-amber-600 block">Scenario</span>
                      <div className="text-base font-black text-amber-900 mt-0.5">
                        {simResult.comparison.overall.scenario_score}
                      </div>
                      <span className={`text-[9px] font-bold px-1 rounded ${getRiskBadgeColor(simResult.comparison.overall.scenario_level)}`}>
                        {simResult.comparison.overall.scenario_level}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">Change</span>
                      <div className="text-base font-black text-red-600 mt-0.5">
                        +{simResult.comparison.overall.score_delta}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">Points</span>
                    </div>
                  </div>

                  {/* Factor changes breakdown */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">
                      Factor Point Trajectories:
                    </span>
                    {simResult.factor_changes.map((fc, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/80 p-1.5 rounded border border-amber-100 text-[11px]">
                        <span className="font-semibold text-slate-700">{fc.factor_name}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-slate-500">{fc.baseline_points} pts</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-800">{fc.scenario_points} pts</span>
                          {fc.points_delta > 0 && (
                            <span className="text-red-600 font-bold">(+{fc.points_delta})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={() => handleRunSimulation(0, 0)}
                    className="w-full py-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                  >
                    Reset to Real Baseline
                  </button>
                </div>
              )}
            </div>

            {/* ─── 8. HISTORICAL RISK REPLAY TIMELINE ─────────────────────────── */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={13} className="text-[#14B8A6]" />
                  <span>Historical Risk Replay</span>
                </span>
                {replayData && replayData.replay_available && (
                  <button
                    type="button"
                    onClick={() => setShowReplay(!showReplay)}
                    className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-0.5"
                  >
                    <span>{showReplay ? 'Collapse' : `View ${replayData.observation_count} Records`}</span>
                    {showReplay ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              {replayData && replayData.replay_available ? (
                <>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Observation Span</span>
                    <div className="font-mono text-[11px] text-slate-700 mt-0.5">
                      {replayData.earliest_timestamp} → {replayData.latest_timestamp}
                    </div>
                  </div>

                  {showReplay && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 pt-1">
                      {replayData.timeline.map((pt, idx) => (
                        <div
                          key={pt.id || idx}
                          className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="font-mono text-[10px] text-slate-500">
                            {pt.timestamp}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">{pt.score} pts</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRiskBadgeColor(pt.level)}`}>
                              {pt.level}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px] text-slate-500 italic">
                  Historical data unavailable for this location. Replay timeline will appear when sufficient assessments are recorded.
                </div>
              )}
            </div>

            {/* ─── 9. PHYSICAL OBSERVATION TELEMETRY ──────────────────────────── */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-500" />
                  <span>Physical Observation Telemetry</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Copernicus + ERA5</span>
              </div>

              {/* Rain interval selector */}
              <div className="grid grid-cols-7 gap-1 bg-slate-200/70 p-1 rounded-lg text-center">
                {(['1h', '3h', '6h', '24h', '3d', '7d', 'forecast'] as RainfallInterval[]).map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setSelectedRainInterval(interval)}
                    className={`text-[9px] font-bold py-1 rounded transition-all ${
                      selectedRainInterval === interval
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {interval}
                  </button>
                ))}
              </div>

              {/* Selected rain stat */}
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">{selectedRain.label}</div>
                  <div className="text-base font-black text-slate-800">{selectedRain.value}</div>
                </div>
                {selectedRain.freshness && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      {selectedRain.freshness}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      <span>{selectedRain.quality}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terrain & Soil physical grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Slope Gradient</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {slopeValue !== null ? `${slopeValue.toFixed(1)}°` : 'Unavailable'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Elevation & Aspect</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-800 text-sm">
                    <span>{elevationValue !== null ? `${elevationValue.toFixed(0)} m` : 'Unavailable'}</span>
                    {aspectCompass && (
                      <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded border border-teal-200 flex items-center gap-0.5">
                        <Compass size={10} />
                        {aspectCompass}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Soil Saturation</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {soilSatValue !== null ? `${soilSatValue.toFixed(1)}%` : 'Estimated'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Volumetric Water</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {soilVolValue !== null ? `${soilVolValue.toFixed(3)} m³/m³` : 'Simulated'}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 10. CITIZEN GROUND EVIDENCE ─────────────────────────────────── */}
            {assessment.citizen_evidence && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={13} className="text-teal-600" />
                    <span>Ground Citizen Evidence</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {assessment.citizen_evidence.report_count} nearby report(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {assessment.citizen_evidence.summary}
                </p>
                <p className="text-[10px] text-slate-400 italic bg-white p-2 rounded border border-slate-100 leading-tight">
                  {assessment.citizen_evidence.disclaimer}
                </p>
              </div>
            )}

            {/* ─── 11. MODEL PROVENANCE ────────────────────────────────────────── */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Model Information & Transparency
              </span>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1 font-mono text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Landslide Model:</span>
                  <span className="font-bold text-slate-800">{assessment.metadata.model_versions.landslide}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Flood Model:</span>
                  <span className="font-bold text-slate-800">{assessment.metadata.model_versions.flood}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assessment Time:</span>
                  <span className="text-slate-700 truncate">{assessment.timestamp}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                Risk score is generated by the current MALAI VIZHI Explainable Risk Analysis Engine using available environmental inputs.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

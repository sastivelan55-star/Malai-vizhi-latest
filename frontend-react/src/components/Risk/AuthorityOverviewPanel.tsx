// src/components/Risk/AuthorityOverviewPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Camera,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
  Droplets,
  CloudRain
} from 'lucide-react';
import { getAuthorityOverview } from '../../services/api';
import type { AuthorityOverview } from '../../types';

interface AuthorityOverviewPanelProps {
  onSelectLocation?: (lat: number, lon: number) => void;
}

export const AuthorityOverviewPanel: React.FC<AuthorityOverviewPanelProps> = ({ onSelectLocation }) => {
  const [data, setData] = useState<AuthorityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuthorityOverview();
      if (res && res.highest_risk_locations) {
        setData(res);
      } else {
        setError('Unable to load authority overview metrics.');
      }
    } catch {
      setError('Failed to reach authority overview service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Aggregating Operational Risk Intelligence…
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-red-700">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = data?.summary_metrics;

  return (
    <div className="space-y-6">
      {/* Overview Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#071A2B] to-[#0d2a44] p-5 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center text-[#14B8A6]">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              Authority Operational Overview
            </h2>
            <p className="text-xs text-slate-300">
              Real-time regional priority, active escalations, and verified ground evidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {data?.timestamp && (
            <span className="text-[11px] text-slate-300 flex items-center gap-1 font-mono">
              <Clock size={12} /> {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
            title="Refresh overview"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Monitored Stations
          </div>
          <div className="text-2xl font-black text-[#071A2B]">
            {metrics?.total_monitored_stations ?? '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Operational in network</div>
        </div>

        <div className="bg-white rounded-xl border border-red-200/80 p-4 shadow-sm bg-red-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-1 flex items-center justify-between">
            <span>High Risk Active</span>
            <AlertTriangle size={14} />
          </div>
          <div className="text-2xl font-black text-red-600">
            {metrics?.high_risk_stations_count ?? 0}
          </div>
          <div className="text-[10px] text-red-500 mt-1">Requires immediate attention</div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200/80 p-4 shadow-sm bg-amber-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1 flex items-center justify-between">
            <span>Unacknowledged Alerts</span>
            <Clock size={14} />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {metrics?.unacknowledged_alerts_count ?? 0}
          </div>
          <div className="text-[10px] text-amber-600 mt-1">Pending operator review</div>
        </div>

        <div className="bg-white rounded-xl border border-teal-200/80 p-4 shadow-sm bg-teal-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] mb-1 flex items-center justify-between">
            <span>Verified Field Reports</span>
            <CheckCircle2 size={14} />
          </div>
          <div className="text-2xl font-black text-[#0F766E]">
            {metrics?.verified_reports_count ?? 0}
          </div>
          <div className="text-[10px] text-teal-600 mt-1">Citizen photo evidence</div>
        </div>
      </div>

      {/* Main Grid: Highest-Risk Locations & Rapidly Increasing Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest-Risk Locations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#071A2B] flex items-center gap-1.5">
              <ShieldAlert size={15} className="text-red-500" />
              Highest-Risk Priority Locations
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">
              {data?.highest_risk_locations?.length || 0} Listed
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.highest_risk_locations && data.highest_risk_locations.length > 0 ? (
              data.highest_risk_locations.map((loc) => {
                const isHigh = loc.risk_level === 'HIGH';
                return (
                  <div
                    key={loc.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#071A2B]">{loc.name}</span>
                        <span className="text-[10px] text-slate-400">({loc.state})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CloudRain size={12} className="text-blue-500" />
                          {loc.rainfall_mm.toFixed(1)} mm
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets size={12} className="text-teal-600" />
                          {loc.soil_moisture.toFixed(1)}%
                        </span>
                        {loc.dominant_factor && (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            Driver: {loc.dominant_factor}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded ${
                          isHigh ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-950'
                        }`}
                      >
                        {loc.risk_score} / 100
                      </span>
                      {onSelectLocation && (
                        <button
                          type="button"
                          onClick={() => onSelectLocation(loc.latitude, loc.longitude)}
                          className="text-[10px] font-bold text-[#0F766E] hover:underline flex items-center gap-0.5"
                        >
                          Inspect <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No high-risk locations currently detected.</p>
            )}
          </div>
        </div>

        {/* Rapidly Increasing Risk Locations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#071A2B] flex items-center gap-1.5">
              <TrendingUp size={15} className="text-amber-500" />
              Rapid Risk Escalation Watchlist
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              Statistical Velocity
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.rapidly_increasing_locations && data.rapidly_increasing_locations.length > 0 ? (
              data.rapidly_increasing_locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3 rounded-xl border border-amber-200/70 bg-amber-50/20 hover:bg-amber-50/40 transition-all flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#071A2B]">{loc.name}</span>
                      <span className="text-[10px] text-slate-400">({loc.state})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                        <TrendingUp size={11} />
                        {loc.trend}
                      </span>
                      <span className="text-[11px] font-bold text-amber-700">
                        {loc.score_delta > 0 ? `+${loc.score_delta}` : loc.score_delta} pts delta
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Score: {loc.risk_score}
                    </span>
                    {onSelectLocation && (
                      <button
                        type="button"
                        onClick={() => onSelectLocation(loc.latitude, loc.longitude)}
                        className="text-[10px] font-bold text-[#0F766E] hover:underline flex items-center gap-0.5"
                      >
                        Inspect <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-xs font-semibold text-slate-500">No Rapid Escalations Active</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Stations are exhibiting stable or gradual risk variance across recent observation epochs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Active Emergency Alerts & Recent Verified Field Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Emergency Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#071A2B] flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-red-500" />
              Active System Emergency Alerts
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {data?.active_emergency_alerts?.length || 0} Alerts
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data?.active_emergency_alerts && data.active_emergency_alerts.length > 0 ? (
              data.active_emergency_alerts.map((al) => {
                const isRed = al.alert_level?.toUpperCase().includes('RED') || al.alert_level?.toUpperCase().includes('HIGH');
                return (
                  <div
                    key={al.id}
                    className="p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#071A2B]">{al.location_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Alert #{al.id} · {new Date(al.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isRed ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {al.alert_level}
                      </span>
                      {al.acknowledged ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 size={12} /> Ack
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">Unack</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No active emergency alerts recorded.</p>
            )}
          </div>
        </div>

        {/* Recent Verified Citizen Photo Evidence */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#071A2B] flex items-center gap-1.5">
              <Camera size={15} className="text-[#0F766E]" />
              Recent Verified Field Evidence
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-[#0F766E]">
              Ground Truth
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data?.recent_verified_evidence && data.recent_verified_evidence.length > 0 ? (
              data.recent_verified_evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex items-start gap-3 text-xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center flex-shrink-0 border border-teal-100">
                    <Camera size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#071A2B] uppercase text-[11px]">
                        {ev.hazard_type || 'Landslide Observation'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-2 mt-0.5">
                      {ev.description || 'Verified ground observation with geotagged photographic confirmation.'}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{ev.latitude.toFixed(4)}° N, {ev.longitude.toFixed(4)}° E</span>
                      {onSelectLocation && (
                        <button
                          type="button"
                          onClick={() => onSelectLocation(ev.latitude, ev.longitude)}
                          className="font-bold text-[#0F766E] hover:underline"
                        >
                          View Location
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No verified citizen photo reports available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

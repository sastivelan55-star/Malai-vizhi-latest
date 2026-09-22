import React, { useEffect, useState } from 'react';
import { BellRing, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE } from '../../services/api';

interface Alert {
  id: number;
  location_id: number;
  location_name: string;
  severity: string;
  message: string;
  timestamp: string;
  status: string;
  trigger_type: string;
  recipient_type: string;
  acknowledged_at: string | null;
}

export const ActiveWarningsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alerts`);
        if (res.ok) {
          const json = await res.json();
          setAlerts(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    // Poll every 30s
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="text-red-600" size={18} />
          <h2 className="text-[#102A43] font-bold text-sm uppercase tracking-wider">
            Active Early Warnings
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest bg-red-100 text-red-700">
          Live Dispatch
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto p-2">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-slate-50 h-24 rounded-lg"></div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active early warnings.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                      alert.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-widest">
                      {alert.trigger_type || 'RISK_ESCALATION'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm font-semibold text-[#102A43] mb-1">
                  <MapPin size={14} className="text-teal-600" />
                  {alert.location_name || `Location #${alert.location_id}`}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
                  {alert.message}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Recipients: {alert.recipient_type || 'ALL'}</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      SMS/PUSH: 
                      {alert.status === 'NOT_CONFIGURED' ? (
                        <span className="text-amber-600 flex items-center gap-0.5"><XCircle size={10}/> NOT CONFIGURED</span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle size={10}/> {alert.status}</span>
                      )}
                    </span>
                  </div>
                  <div>
                    {alert.acknowledged_at ? (
                      <span className="text-emerald-600">Ack: {new Date(alert.acknowledged_at).toLocaleTimeString()}</span>
                    ) : (
                      <button className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors">
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { History, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { getHistoricalEvents } from '../../services/api';
import type { HistoricalEvent } from '../../types';
import { DemoPanel } from '../UI/DemoPanel';

export const HistoricalLandslidesPanel: React.FC = () => {
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchEvents = async () => {
      try {
        const data = await getHistoricalEvents();
        if (mounted) {
          setEvents(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load historical events');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchEvents();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-5 w-32 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 w-full bg-slate-100 rounded-lg"></div>
          <div className="h-16 w-full bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-96">
      <DemoPanel
        title="Historical event context"
        description="Compare present risk areas with nearby historical events."
      />
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-[#102A43] flex items-center gap-2 text-sm">
          <History size={16} className="text-indigo-500" />
          Historical Landslide Context
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
          Context Only
        </span>
      </div>
      
      <div className="p-3 overflow-y-auto space-y-3">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No historical records found.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="border border-slate-100 rounded-lg p-3 bg-white hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#102A43]">
                  <MapPin size={12} className="text-slate-400" />
                  {ev.location}
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  ev.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  ev.severity === 'MAJOR' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {ev.severity}
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-2 line-clamp-2">{ev.description}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar size={10} />
                  {ev.date}
                </div>
                <div className="flex items-center gap-1 truncate max-w-[120px]">
                  <AlertTriangle size={10} />
                  {ev.source}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

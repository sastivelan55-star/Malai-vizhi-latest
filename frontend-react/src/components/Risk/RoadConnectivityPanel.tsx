import React, { useEffect, useState } from 'react';
import { Route, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { getRoads } from '../../services/api';
import type { RoadStatus } from '../../types';
import { DemoPanel } from '../UI/DemoPanel';
import { useTranslation } from 'react-i18next';

export const RoadConnectivityPanel: React.FC = () => {
  const { t } = useTranslation();
  const [roads, setRoads] = useState<RoadStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getRoads()
      .then((data) => {
        if (mounted) {
          setRoads(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <ShieldCheck size={14} className="text-[#16A34A]" />;
      case 'RESTRICTED':
        return <AlertTriangle size={14} className="text-[#F59E0B]" />;
      case 'BLOCKED':
        return <AlertTriangle size={14} className="text-[#DC2626]" />;
      default:
        return <HelpCircle size={14} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'text-[#16A34A] bg-green-50 border-green-200';
      case 'RESTRICTED':
        return 'text-[#F59E0B] bg-amber-50 border-amber-200';
      case 'BLOCKED':
        return 'text-[#DC2626] bg-red-50 border-red-200';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 w-32 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (roads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <div className="text-center py-4 text-xs text-slate-400">
          {t('common.noData', 'No route data available.')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-shrink-0">
      <div className="mb-3">
        <DemoPanel
          title={t('demo.roads.title', 'Compare route risk and connectivity')}
          description={t('demo.roads.desc', 'Roads dynamically block based on simulated landslide events.')}
        />
      </div>
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
        <Route size={16} className="text-[#14B8A6]" />
        <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-500">
          {t('roads.connectivity', 'Road Connectivity')}
        </h3>
      </div>
      <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
        {roads.map((road) => (
          <div key={road.id} className="p-3 hover:bg-slate-50 transition-colors">
            <div className="flex justify-between items-start gap-2 mb-1">
              <div className="font-semibold text-xs text-[#102A43] truncate">{road.road_name}</div>
              <div
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${getStatusColor(road.status)}`}
              >
                {getStatusIcon(road.status)}
                {t(`status.${road.status.toLowerCase()}`, road.status)}
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>{t('roads.risk', 'Risk')}: {road.risk_score}</span>
              <span>{t('roads.impact', 'Impact')}: {road.impact_priority}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

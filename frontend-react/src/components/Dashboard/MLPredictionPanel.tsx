import React, { useEffect, useState } from 'react';
import { BrainCircuit, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../services/api';

interface MLPrediction {
  status: string;
  prediction: string;
  confidence: number;
  model: string;
  version: string;
  timestamp: string;
  message: string;
}

export const MLPredictionPanel: React.FC = () => {
  const [data, setData] = useState<MLPrediction | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ml/predict`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrediction();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-[#102A43]" size={18} />
          <h2 className="text-[#102A43] font-bold text-sm uppercase tracking-wider">
            ML Landslide Prediction
          </h2>
        </div>
        {data && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
            data.status === 'NOT_CONFIGURED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {data.status}
          </span>
        )}
      </div>

      <div className="p-5">
        {data ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Prediction</p>
                <p className={`text-xl font-bold ${
                  data.prediction === 'UNAVAILABLE' ? 'text-slate-400' : 'text-[#102A43]'
                }`}>
                  {data.prediction}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Confidence</p>
                <p className="text-xl font-bold text-slate-400">
                  {(data.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Model</span>
                <span className="text-slate-700 font-medium">{data.model} v{data.version}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Timestamp</span>
                <span className="text-slate-700 font-medium">
                  {new Date(data.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {data.status === 'NOT_CONFIGURED' && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-xs text-amber-700 leading-relaxed">
                  {data.message} <br/>
                  <strong className="mt-1 block text-[10px] uppercase tracking-wider">
                    Rule Engine Fallback Active
                  </strong>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          </div>
        )}
      </div>
    </div>
  );
};

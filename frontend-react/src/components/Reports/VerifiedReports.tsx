// src/components/Reports/VerifiedReports.tsx
import React from 'react';
import { MapPin, Clock, Tag, Image, Video, CheckCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CitizenReport } from '../../types';
import { getUploadUrl } from '../../services/api';

interface VerifiedReportsProps {
  reports: CitizenReport[];
  loading: boolean;
  onUpdateStatus?: (id: number, status: 'SUBMITTED' | 'VERIFIED' | 'RESOLVED') => void;
}

export const VerifiedReports: React.FC<VerifiedReportsProps> = ({ reports, loading, onUpdateStatus }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-40 mb-2" />
            <div className="h-3 bg-slate-50 rounded w-full mb-1" />
            <div className="h-3 bg-slate-50 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-10 text-center">
        <MapPin size={28} className="text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No community reports submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#14B8A6]" />
                <span className="text-sm font-semibold text-[#102A43]">{report.location}</span>
              </div>
              {report.latitude && report.longitude && (
                <span className="text-xs text-slate-400 ml-5">
                  {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {report.photo_path && (
                <a
                  href={getUploadUrl(report.photo_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View photo evidence"
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700"
                >
                  <Image size={14} />
                </a>
              )}
              {report.video_path && (
                <a
                  href={getUploadUrl(report.video_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View video evidence"
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700"
                >
                  <Video size={14} />
                </a>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">
            {report.description}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Tag size={10} />
                {report.category}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={10} />
                {report.submitted_at}
              </div>
            </div>
            
            {/* Status Timeline */}
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${
                report.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600' :
                report.status === 'VERIFIED' ? 'bg-blue-50 text-blue-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {report.status === 'RESOLVED' ? <CheckCircle2 size={12} /> :
                 report.status === 'VERIFIED' ? <CheckCircle size={12} /> :
                 <AlertCircle size={12} />}
                {report.status || 'SUBMITTED'}
              </span>
            </div>
          </div>
          
          {/* Action Buttons for Authorities */}
          {onUpdateStatus && report.status !== 'RESOLVED' && (
            <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Update Status</span>
              {report.status !== 'VERIFIED' && (
                <button 
                  onClick={() => onUpdateStatus(report.id, 'VERIFIED')}
                  className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  Mark Verified
                </button>
              )}
              <button 
                onClick={() => onUpdateStatus(report.id, 'RESOLVED')}
                className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              >
                Mark Resolved
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

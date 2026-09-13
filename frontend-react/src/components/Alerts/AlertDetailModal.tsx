// src/components/Alerts/AlertDetailModal.tsx
import React from 'react';
import { Modal } from '../UI/Modal';
import { RiskBadge } from '../UI/RiskBadge';
import { MapPin, Clock, MessageSquare, Hash, CheckCircle } from 'lucide-react';
import type { AlertItem } from '../../types';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onAcknowledge: (id: number, status: 'Acknowledged' | 'Resolved') => Promise<void>;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onAcknowledge,
}) => {
  const [acting, setActing] = React.useState(false);

  if (!alert) return null;

  const handleAction = async (status: 'Acknowledged' | 'Resolved') => {
    setActing(true);
    try {
      await onAcknowledge(alert.id, status);
      onClose();
    } finally {
      setActing(false);
    }
  };

  const statusColor = {
    GENERATED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    Sent: 'bg-red-50 text-[#DC2626] border-[#DC2626]/20',
    Acknowledged: 'bg-amber-50 text-[#F59E0B] border-[#F59E0B]/20',
    Resolved: 'bg-green-50 text-[#16A34A] border-[#16A34A]/20',
    NOT_CONFIGURED: 'bg-slate-100 text-slate-500 border-slate-300',
    FAILED: 'bg-red-100 text-red-800 border-red-300',
  }[alert.status];

  return (
    <Modal isOpen={!!alert} onClose={onClose} title="Alert Details">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <RiskBadge level={alert.severity} />
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
            {alert.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 font-medium block">Alert ID</span>
              <span className="text-[#102A43] font-semibold">#{alert.id}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 font-medium block">Location</span>
              <span className="text-[#102A43] font-semibold">{alert.location_name}</span>
              {alert.location_state && (
                <span className="text-slate-400 text-xs block">{alert.location_state}</span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 font-medium block">Timestamp</span>
              <span className="text-[#102A43] font-semibold">{alert.timestamp}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 font-medium block">Alert Message</span>
              <p className="text-[#102A43] text-sm leading-relaxed">{alert.message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {alert.status !== 'Resolved' && (
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            {alert.status === 'Sent' && (
              <button
                onClick={() => handleAction('Acknowledged')}
                disabled={acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                  bg-amber-50 text-[#F59E0B] border border-[#F59E0B]/30 text-sm font-semibold
                  hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} />
                Acknowledge
              </button>
            )}
            <button
              onClick={() => handleAction('Resolved')}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                bg-green-50 text-[#16A34A] border border-[#16A34A]/30 text-sm font-semibold
                hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              Mark Resolved
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

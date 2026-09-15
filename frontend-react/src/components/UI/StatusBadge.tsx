// src/components/UI/StatusBadge.tsx
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  online: boolean;
  lastUpdated?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ online, lastUpdated }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border
          ${online
            ? 'bg-green-50 text-[#16A34A] border-[#16A34A]/30'
            : 'bg-red-50 text-[#DC2626] border-[#DC2626]/30'
          }`}
        role="status"
        aria-label={online ? 'System operational' : 'Backend offline'}
      >
        {online ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse flex-shrink-0" />
            <Wifi size={10} className="flex-shrink-0" />
            <span className="whitespace-nowrap truncate max-w-[120px]">{t('status.systemOperational')}</span>
          </>
        ) : (
          <>
            <WifiOff size={10} className="flex-shrink-0" />
            <span className="whitespace-nowrap truncate max-w-[120px]">{t('status.backendOffline')}</span>
          </>
        )}
      </span>
      {lastUpdated && online && (
        <span className="text-xs text-slate-400 hidden md:inline">
          {lastUpdated}
        </span>
      )}
    </div>
  );
};

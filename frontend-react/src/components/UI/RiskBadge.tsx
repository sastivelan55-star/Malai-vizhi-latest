// src/components/UI/RiskBadge.tsx
import React from 'react';
import type { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const config: Record<RiskLevel, { bg: string; text: string; border: string; dot: string; label: string }> = {
  CRITICAL: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-300',
    dot: 'bg-indigo-600',
    label: 'Critical Risk',
  },
  HIGH: {
    bg: 'bg-red-50',
    text: 'text-[#DC2626]',
    border: 'border-[#DC2626]/30',
    dot: 'bg-[#DC2626]',
    label: 'High Risk',
  },
  MODERATE: {
    bg: 'bg-amber-50',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/30',
    dot: 'bg-[#F59E0B]',
    label: 'Moderate Risk',
  },
  LOW: {
    bg: 'bg-green-50',
    text: 'text-[#16A34A]',
    border: 'border-[#16A34A]/30',
    dot: 'bg-[#16A34A]',
    label: 'Low Risk',
  },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showDot = true,
}) => {
  const c = config[level];
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${paddingClass} ${c.bg} ${c.text} ${c.border}`}
      role="status"
      aria-label={`Risk level: ${c.label}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${level === 'HIGH' ? 'animate-pulse' : ''}`} />
      )}
      {c.label}
    </span>
  );
};

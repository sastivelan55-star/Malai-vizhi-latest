// src/pages/Alerts.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Activity, CheckCircle, Bell, BellRing, Volume2, Vibrate } from 'lucide-react';
import { Layout } from '../components/Layout/Layout';
import { AlertList } from '../components/Alerts/AlertList';
import { AlertDetailModal } from '../components/Alerts/AlertDetailModal';
import { ToastContainer, useToast } from '../components/UI/Toast';
import { DemoPanel } from '../components/UI/DemoPanel';
import { useAlerts } from '../hooks/useAlerts';
import {
  getNotificationPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  triggerAlertVibration,
  playAlertSound,
  notifyAlert,
} from '../services/notificationService';
import type { AlertItem, AlertStatus } from '../types';

export const Alerts: React.FC = () => {
  const { t } = useTranslation();
  const { data: alerts, loading, acknowledge } = useAlerts();
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const { toasts, addToast, dismissToast } = useToast();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(getNotificationPermission());

  useEffect(() => {
    checkNotificationPermission().then(setNotifPerm).catch(() => {});
  }, []);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      addToast('success', 'Notifications Enabled', 'You will receive mobile alert notifications for high-risk hazards.');
      notifyAlert({
        id: `perm-test-${Date.now()}`,
        title: 'Notifications Active',
        message: 'MALAI VIZHI Early Warning alerts will now notify you with sound and vibration.',
        severity: 'LOW',
      });
    } else {
      addToast('warning', 'Permission Denied', 'Notifications are blocked. You can enable them in device settings.');
    }
  };

  const handleTestAlert = () => {
    triggerAlertVibration('HIGH');
    playAlertSound('HIGH');
    notifyAlert({
      id: `test-feedback-${Date.now()}`,
      title: 'HIGH Risk Test: Guwahati Ridge',
      message: 'Test simulation alert — High landslide hazard detected. Audible chime and vibration triggered.',
      severity: 'HIGH',
    });
    addToast('warning', 'Test Alert Triggered', 'Tested high-risk warning sound, vibration, and notification.');
  };

  const active = alerts.filter((a) => a.status === 'Sent').length;
  const acknowledged = alerts.filter((a) => a.status === 'Acknowledged').length;
  const resolved = alerts.filter((a) => a.status === 'Resolved').length;

  const handleAcknowledge = async (id: number, status: AlertStatus) => {
    try {
      await acknowledge(id, status);
      addToast('success', 'Alert Updated', `Alert #${id} marked as ${status}.`);
    } catch {
      addToast('error', 'Update Failed', 'Could not update alert status. Check backend.');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#102A43]">{t('alerts.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('alerts.subtitle')}</p>
          </div>

          {/* Notification & Sound/Vibration Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {notifPerm !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071A2B] hover:bg-[#0B3948] active:bg-[#040f1a] text-white text-xs font-semibold tracking-wide transition-all shadow-sm min-h-[44px]"
              >
                <Bell size={15} className="text-[#14B8A6]" />
                Enable Device Alerts
              </button>
            ) : (
              <span className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold min-h-[44px]">
                <BellRing size={15} className="text-emerald-600" />
                Alerts Active
              </span>
            )}

            <button
              type="button"
              onClick={handleTestAlert}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors min-h-[44px]"
              title="Test Alert Chime & Vibration"
            >
              <Volume2 size={15} className="text-slate-500" />
              <Vibrate size={15} className="text-slate-500" />
              Test Feedback
            </button>
          </div>
        </div>

        {/* Summary cards — responsive grid for mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-[#DC2626]/15 bg-red-50/50 p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-[#DC2626]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#DC2626] leading-none mb-1">{active}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#F59E0B]/15 bg-amber-50/50 p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Activity size={20} className="text-[#F59E0B]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F59E0B] leading-none mb-1">{acknowledged}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acknowledged</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#16A34A]/15 bg-green-50/50 p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={20} className="text-[#16A34A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#16A34A] leading-none mb-1">{resolved}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</div>
            </div>
          </div>
        </div>

        {/* SIH Demo Panel */}
        <DemoPanel
          title="Test the alert escalation workflow"
          description="Watch a risk escalation generate an early warning. Click 'Test Feedback' above to experience sound + vibration notification — exactly as it fires for a real HIGH risk event. Acknowledge and Resolve alerts to track response workflow."
        />

        {/* Alert list */}
        <AlertList alerts={alerts} loading={loading} onSelect={setSelected} />

        {/* Detail modal */}
        <AlertDetailModal
          alert={selected}
          onClose={() => setSelected(null)}
          onAcknowledge={handleAcknowledge}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </Layout>
  );
};

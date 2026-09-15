// src/pages/CitizenReports.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout/Layout';
import { ReportForm } from '../components/Reports/ReportForm';
import { VerifiedReports } from '../components/Reports/VerifiedReports';
import { ToastContainer, useToast } from '../components/UI/Toast';
import { DemoPanel } from '../components/UI/DemoPanel';
import { getReports, updateReportStatus } from '../services/api';
import type { CitizenReport } from '../types';

export const CitizenReports: React.FC = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, dismissToast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getReports();
      setReports(data);
    } catch {
      // Silent fail — show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSuccess = () => {
    addToast('success', 'Report Submitted', 'Your hazard report has been received for verification.');
    fetchReports();
  };

  const handleError = (msg: string) => {
    addToast('error', 'Submission Failed', msg);
  };

  const handleUpdateStatus = async (id: number, status: 'SUBMITTED' | 'VERIFIED' | 'RESOLVED') => {
    try {
      await updateReportStatus(id, status);
      addToast('success', 'Status Updated', `Report status changed to ${status}.`);
      fetchReports();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left — form */}
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#102A43]">{t('reports.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('reports.subtitle')}</p>
          </div>
          <DemoPanel
            title="Submit a geo-tagged report"
            description="Fill in the report form below and submit a geo-tagged landslide or road hazard observation. Your report enters the verification pipeline. View the status in the Community Reports panel on the right — it updates to Verified or Resolved as authorities respond."
          />
          <ReportForm onSuccess={handleSuccess} onError={handleError} />
        </div>

        {/* Right — verified reports */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
                <Users size={16} className="text-[#14B8A6]" />
                Community Reports
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Recent field observations from the monitoring network.
              </p>
            </div>
            <button
              onClick={fetchReports}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              aria-label="Refresh reports"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <VerifiedReports reports={reports} loading={loading} onUpdateStatus={handleUpdateStatus} />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </Layout>
  );
};

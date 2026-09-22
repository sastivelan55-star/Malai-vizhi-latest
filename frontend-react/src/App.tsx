// src/App.tsx — Root Router & Application Shell for MALAI VIZHI
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { CitizenReports } from './pages/CitizenReports';
import { FloodRisk } from './pages/FloodRisk';
import { Analytics } from './pages/Analytics';
import { HowItWorks } from './pages/HowItWorks';
import { AdminLogin } from './pages/AdminLogin';

export const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Main Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/reports" element={<CitizenReports />} />
        <Route path="/report" element={<Navigate to="/reports" replace />} />
        <Route path="/flood-risk" element={<FloodRisk />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/about" element={<Navigate to="/how-it-works" replace />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/login" element={<Navigate to="/admin" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

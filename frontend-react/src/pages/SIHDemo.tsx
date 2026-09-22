import React from 'react';
import { NavLink } from 'react-router-dom';
import { CloudOff } from 'lucide-react';

export const SIHDemo: React.FC = () => {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="bg-[#0B2D42] rounded-2xl border border-white/10 p-6 sm:p-10 text-white shadow-2xl">
        <h1 className="text-3xl font-bold text-[#14B8A6] mb-4">SIH Demo Walkthrough</h1>
        <p className="text-white/70 mb-8 max-w-2xl text-sm leading-relaxed">
          Welcome to the MALAI VIZHI guided demo. This page demonstrates the core functionality 
          and workflows of the application for Smart India Hackathon (SIH) judges. 
          MALAI VIZHI works through: 
          <span className="font-bold text-white ml-2">DATA → ANALYSIS → RISK → ALERT → RESPONSE</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 & 2 & 3: Risk Assessment */}
          <div className="bg-[#071A2B] border border-white/10 rounded-xl p-5 hover:border-[#14B8A6]/50 transition-colors">
            <h3 className="font-bold text-lg mb-2 text-[#14B8A6] flex items-center gap-2">
              <span className="bg-[#14B8A6]/20 text-[#14B8A6] w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
              Risk Assessment
            </h3>
            <p className="text-xs text-white/60 mb-4">Select high-risk locations, view rainfall, soil moisture, slope, and computed risk scores.</p>
            <NavLink to="/dashboard" className="text-xs font-semibold text-white bg-[#14B8A6]/20 px-3 py-1.5 rounded hover:bg-[#14B8A6]/30 inline-block">
              Open Dashboard
            </NavLink>
          </div>

          {/* Step 4 & 5: Context & Impact */}
          <div className="bg-[#071A2B] border border-white/10 rounded-xl p-5 hover:border-amber-500/50 transition-colors">
            <h3 className="font-bold text-lg mb-2 text-amber-500 flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-500 w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
              Historical & Impact
            </h3>
            <p className="text-xs text-white/60 mb-4">View historical context, road, village, and infrastructure impact for comprehensive analysis.</p>
            <NavLink to="/analytics" className="text-xs font-semibold text-white bg-amber-500/20 px-3 py-1.5 rounded hover:bg-amber-500/30 inline-block">
              Open Analytics
            </NavLink>
          </div>

          {/* Step 6 & 7 & 8: Alerts & Priorities */}
          <div className="bg-[#071A2B] border border-white/10 rounded-xl p-5 hover:border-red-500/50 transition-colors">
            <h3 className="font-bold text-lg mb-2 text-red-500 flex items-center gap-2">
              <span className="bg-red-500/20 text-red-500 w-6 h-6 rounded flex items-center justify-center text-xs">3</span>
              Alerts & Notifications
            </h3>
            <p className="text-xs text-white/60 mb-4">View emergency priorities, trigger demo alerts, and check real-time notifications.</p>
            <NavLink to="/alerts" className="text-xs font-semibold text-white bg-red-500/20 px-3 py-1.5 rounded hover:bg-red-500/30 inline-block">
              Open Alerts
            </NavLink>
          </div>

          {/* Step 9 & 10: Reports & Evidence */}
          <div className="bg-[#071A2B] border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition-colors">
            <h3 className="font-bold text-lg mb-2 text-blue-500 flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-500 w-6 h-6 rounded flex items-center justify-center text-xs">4</span>
              Citizen Reports
            </h3>
            <p className="text-xs text-white/60 mb-4">Submit citizen reports, attach photos/videos, and view the evidence history.</p>
            <NavLink to="/reports" className="text-xs font-semibold text-white bg-blue-500/20 px-3 py-1.5 rounded hover:bg-blue-500/30 inline-block">
              Open Reports
            </NavLink>
          </div>

          {/* Step 11: Sensor Status */}
          <div className="bg-[#071A2B] border border-white/10 rounded-xl p-5 hover:border-purple-500/50 transition-colors">
            <h3 className="font-bold text-lg mb-2 text-purple-500 flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-500 w-6 h-6 rounded flex items-center justify-center text-xs">5</span>
              Sensor Status
            </h3>
            <p className="text-xs text-white/60 mb-4">View live hardware sensor data, battery status, and node health across deployed locations.</p>
            <NavLink to="/dashboard" className="text-xs font-semibold text-white bg-purple-500/20 px-3 py-1.5 rounded hover:bg-purple-500/30 inline-block">
              View Dashboard Nodes
            </NavLink>
          </div>

          {/* Step 12: Offline Sync */}
          <div className="bg-[#071A2B] border border-white/10 rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
            <h3 className="font-bold text-lg mb-2 text-emerald-500 flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-500 w-6 h-6 rounded flex items-center justify-center text-xs">6</span>
              Offline & Sync Status
            </h3>
            <p className="text-xs text-white/60 mb-4">Experience the offline-first capability. Disconnect your network and submit a report to see queueing in action.</p>
            <div className="flex gap-2">
              <span className="text-xs font-semibold text-white bg-emerald-500/20 px-3 py-1.5 rounded inline-flex items-center gap-1">
                <CloudOff size={12} /> Sync Engine Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

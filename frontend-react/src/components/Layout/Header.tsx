import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, LayoutDashboard, AlertTriangle, FileText, Waves, BarChart2, HelpCircle, ShieldCheck, LogOut, User } from 'lucide-react';
import { Logo } from '../UI/Logo';
import { StatusBadge } from '../UI/StatusBadge';
import { InstallPWA } from '../UI/InstallPWA';
import { useSystemStatus } from '../../hooks/useSystemStatus';
import { getStoredToken, getStoredUser, logout } from '../../services/api';
import type { AuthUser } from '../../types';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/flood-risk', label: 'Flood Risk', icon: Waves },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/how-it-works', label: 'How It Works', icon: HelpCircle },
];

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const { data, online } = useSystemStatus();

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      navigate('/admin');
    } catch {
      setCurrentUser(null);
      navigate('/admin');
    }
  };

  const lastInf = data?.last_inference
    ? new Date(data.last_inference).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  return (
    <header className="bg-[#071A2B] border-b border-white/5 sticky top-0 z-50" role="banner">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex-shrink-0" aria-label="MALAI VIZHI Home">
          <Logo size="sm" variant="light" />
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* System status - desktop */}
          <div className="hidden sm:block">
            <StatusBadge online={online} lastUpdated={lastInf} />
          </div>

          {/* Active alerts indicator */}
          {data && data.active_alerts_count > 0 && (
            <NavLink
              to="/alerts"
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#DC2626]/20 text-[#DC2626] hover:bg-[#DC2626]/30 active:scale-95 transition-all"
              aria-label={`${data.active_alerts_count} active alerts`}
            >
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 min-w-4 h-4 flex items-center justify-center bg-[#DC2626] text-white text-[10px] font-bold rounded-full px-1">
                {data.active_alerts_count}
              </span>
            </NavLink>
          )}

          {/* PWA Install Button */}
          <InstallPWA variant="button" className="hidden md:flex" />

          {/* User Status / Login / Logout (Desktop) */}
          {currentUser ? (
            <div className="hidden sm:flex items-center gap-2">
              <NavLink
                to="/admin"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors border border-white/10"
                title={`Logged in as ${currentUser.name} (${currentUser.role})`}
              >
                <User size={13} className="text-[#14B8A6]" />
                <span className="max-w-[90px] truncate">{currentUser.user_id}</span>
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs font-semibold tracking-wider transition-colors"
                title="Logout"
              >
                <LogOut size={12} />
                LOGOUT
              </button>
            </div>
          ) : (
            <NavLink
              to="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#14B8A6]/40 text-[#14B8A6] text-xs font-semibold tracking-wider hover:bg-[#14B8A6]/10 transition-colors"
            >
              <ShieldCheck size={13} />
              LOGIN
            </NavLink>
          )}

          {/* Mobile toggle — 44px min touch target */}
          <button
            type="button"
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav — scrollable overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden border-t border-white/5 bg-[#0B2D42] px-4 py-3 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px]
                  ${isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}

            {currentUser ? (
              <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-white/10">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-[#14B8A6]" />
                    <span className="font-semibold text-white">{currentUser.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#14B8A6]">{currentUser.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-500/20 text-red-300 font-semibold text-xs tracking-wider uppercase hover:bg-red-500/30 active:bg-red-500/40 transition-colors min-h-[44px]"
                >
                  <LogOut size={15} />
                  LOGOUT
                </button>
              </div>
            ) : (
              <NavLink
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#14B8A6] hover:bg-white/5 active:bg-white/10 transition-all mt-1 border-t border-white/10 pt-3 min-h-[44px]"
              >
                <ShieldCheck size={18} />
                Admin Portal / Login
              </NavLink>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-3">
            <InstallPWA variant="banner" />
            <div className="flex justify-start">
              <StatusBadge online={online} lastUpdated={lastInf} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// src/components/Layout/Header.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, LayoutDashboard, AlertTriangle, FileText, Waves, BarChart2, HelpCircle, ShieldCheck, LogOut, User, Globe } from 'lucide-react';
import { Logo } from '../UI/Logo';
import { StatusBadge } from '../UI/StatusBadge';
import { InstallPWA } from '../UI/InstallPWA';
import { NotificationsPanel } from '../Notifications/NotificationsPanel';
import { useSystemStatus } from '../../hooks/useSystemStatus';
import { getStoredToken, getStoredUser, logout } from '../../services/api';
import type { AuthUser } from '../../types';
import { useTranslation } from 'react-i18next';

// SIH Demo tab intentionally removed — demo content lives inside each existing page.
const NAV_ITEMS = [
  { to: '/dashboard',  tKey: 'nav.dashboard',  icon: LayoutDashboard },
  { to: '/alerts',     tKey: 'nav.alerts',     icon: AlertTriangle   },
  { to: '/reports',    tKey: 'nav.reports',    icon: FileText        },
  { to: '/flood-risk', tKey: 'nav.floodRisk',  icon: Waves           },
  { to: '/analytics',  tKey: 'nav.analytics',  icon: BarChart2       },
  { to: '/how-it-works', tKey: 'nav.howItWorks', icon: HelpCircle    },
];

// Native-script labels for compact language selector
const LANGUAGES = [
  { code: 'en', label: 'EN',         title: 'English'    },
  { code: 'hi', label: 'हि',         title: 'Hindi'      },
  { code: 'ta', label: 'த',          title: 'Tamil'      },
  { code: 'te', label: 'తె',         title: 'Telugu'     },
  { code: 'bn', label: 'বা',         title: 'Bengali'    },
  { code: 'mr', label: 'म',          title: 'Marathi'    },
  { code: 'gu', label: 'ગ',          title: 'Gujarati'   },
  { code: 'kn', label: 'ಕ',          title: 'Kannada'    },
  { code: 'ml', label: 'മ',          title: 'Malayalam'  },
  { code: 'pa', label: 'ਪੰ',         title: 'Punjabi'    },
  { code: 'ur', label: 'اُ',         title: 'Urdu'       },
];

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const { data, online } = useSystemStatus();

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user) setCurrentUser(user);
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    setCurrentUser(null);
    navigate('/admin');
  };

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
    try { localStorage.setItem('mv_language', code); } catch { /* ignore */ }
  };

  const lastInf = data?.last_inference
    ? new Date(data.last_inference).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <header className="bg-[#071A2B] border-b border-white/5 sticky top-0 z-50" role="banner">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo */}
        <NavLink to="/" className="flex-shrink-0" aria-label="MALAI VIZHI Home">
          <Logo size="sm" variant="light" />
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0" role="navigation" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, tKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`
              }
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="truncate max-w-[80px]">{t(tKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

          {/* Compact custom language selector */}
          <div className="relative hidden sm:block z-[2000]">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center justify-center gap-1.5 w-14 h-9 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-colors rounded-xl text-xs font-bold"
              aria-label={t('language.select')}
              title={`${t('language.label')}: ${currentLang.title}`}
            >
              <Globe size={14} />
              <span className="uppercase">{currentLang.label}</span>
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-40 bg-[#0B2D42] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => handleLangChange(l.code)}
                    className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-between ${i18n.language === l.code ? 'text-[#14B8A6] bg-white/5' : 'text-white/80'}`}
                  >
                    <span>{l.title}</span>
                    <span className="text-[10px] uppercase font-bold opacity-50">{l.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="hidden sm:block">
            <StatusBadge online={online} lastUpdated={lastInf} />
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setNotifsOpen(v => !v)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {data && data.active_alerts_count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 flex items-center justify-center bg-[#DC2626] text-white text-[9px] font-bold rounded-full px-1">
                  {data.active_alerts_count}
                </span>
              )}
            </button>
            {notifsOpen && <NotificationsPanel onClose={() => setNotifsOpen(false)} />}
          </div>

          {/* PWA Install */}
          <InstallPWA variant="button" className="hidden md:flex" />

          {/* Auth (Desktop) */}
          {currentUser ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <NavLink
                to="/admin"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors border border-white/10"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                <User size={12} className="text-[#14B8A6]" />
                <span className="max-w-[70px] truncate">{currentUser.user_id}</span>
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs font-semibold transition-colors"
              >
                <LogOut size={11} />
                {t('auth.logout')}
              </button>
            </div>
          ) : (
            <NavLink
              to="/admin"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#14B8A6]/40 text-[#14B8A6] text-xs font-semibold tracking-wider hover:bg-[#14B8A6]/10 transition-colors"
            >
              <ShieldCheck size={12} />
              {t('auth.login')}
            </NavLink>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div
          className="lg:hidden border-t border-white/5 bg-[#0B2D42] px-4 py-3 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(({ to, tKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px]
                  ${isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10'}`
                }
              >
                <Icon size={18} />
                {t(tKey)}
              </NavLink>
            ))}

            {currentUser ? (
              <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-white/10">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[#14B8A6]" />
                    <span className="font-semibold text-white">{currentUser.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#14B8A6]">{currentUser.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-500/20 text-red-300 font-semibold text-xs tracking-wider uppercase hover:bg-red-500/30 transition-colors min-h-[44px]"
                >
                  <LogOut size={14} />
                  {t('auth.logout')}
                </button>
              </div>
            ) : (
              <NavLink
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#14B8A6] hover:bg-white/5 active:bg-white/10 transition-all mt-1 border-t border-white/10 pt-3 min-h-[44px]"
              >
                <ShieldCheck size={18} />
                {t('auth.adminPortal')}
              </NavLink>
            )}
          </div>

          {/* Mobile bottom: language picker + status */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-3">
            <InstallPWA variant="banner" />
            <div className="flex items-center justify-between">
              <StatusBadge online={online} lastUpdated={lastInf} />
            </div>
            {/* Mobile Language Selection */}
            <div className="pt-2 border-t border-white/10">
              <h3 className="text-xs font-semibold text-white/40 mb-3 px-2 uppercase tracking-widest">{t('language.label')}</h3>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => {
                      handleLangChange(l.code);
                      setMobileOpen(false);
                    }}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      i18n.language === l.code
                        ? 'bg-[#14B8A6] text-white shadow-md'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

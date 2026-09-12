// src/services/api.ts — Centralized API service layer for MALAI VIZHI

import type {
  LocationData,
  AlertItem,
  SystemStatus,
  CitizenReport,
  SimulationResponse,
  AnalyticsData,
  AuthUser,
  AuthResponse,
  FloodStation,
  FloodRiskResponse,
  DynamicFloodRiskResult,
  PointRiskAssessment,
  LocationSearchResult,
  RiskHistoryResponse,
  SimulationRequest,
  SimulationResponseData,
  RiskReplayResponse,
  RiskTrendStatisticalResponse,
  AuthorityOverview,
} from '../types';

// Configurable API base URL: respects VITE_API_BASE_URL / VITE_API_URL / VITE_API_BASE.
// Intelligently adapts to runtime environment:
// - In Capacitor (Android APK): connects to the live production backend URL
// - In local browser (localhost / 127.0.0.1): uses relative paths '' to directly hit the local Flask backend
// - In deployed full-stack (Flask serving React dist on Render): uses relative paths '' to hit same-origin API
// - In separate static deployment (e.g. Vercel, Netlify, Render Static): uses configured production backend URL
export function resolveApiBase(): string {
  // 1. Native Capacitor mobile environment
  const isCapacitor = typeof window !== 'undefined' && typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined';
  if (isCapacitor) {
    const envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '').trim();
    return (envUrl || 'https://backend-malaivizhi2-0.onrender.com').replace(/\/+$/, '');
  }

  // 2. Browser runtime: if served from same origin (localhost, 127.0.0.1, or malai-vizhi.onrender.com),
  // use relative paths '' to guarantee 100% reliable zero-CORS communication.
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    ) {
      return 'https://backend-malaivizhi2-0.onrender.com';
    }
    if (hostname === 'malai-vizhi.onrender.com') {
      return '';
    }
  }

  // 3. Separate static deployment or fallback
  const raw = ((import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE) as string | undefined)?.trim();
  return (raw || 'https://backend-malaivizhi2-0.onrender.com').replace(/\/+$/, '');
}

export const API_BASE = resolveApiBase();
const BASE = API_BASE;

// ─── Local Auth Storage ────────────────────────────────────────────────────────
const AUTH_TOKEN_KEY = 'mv_auth_token';
const AUTH_USER_KEY = 'mv_auth_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // ignore
  }
}

export function getUploadUrl(photoPath?: string): string {
  if (!photoPath) return '';
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
  const clean = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `${BASE}${clean}`;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Risk Data ────────────────────────────────────────────────────────────────

export async function getRiskData(): Promise<LocationData[]> {
  return request<LocationData[]>('/api/risk-data');
}

export async function getLocation(id: number): Promise<LocationData> {
  return request<LocationData>(`/api/risk-data/${id}`);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<AlertItem[]> {
  return request<AlertItem[]>('/api/alerts');
}

export async function updateAlertStatus(
  id: number,
  status: 'Sent' | 'Acknowledged' | 'Resolved'
): Promise<{ success: boolean; alert: AlertItem }> {
  return request(`/api/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export async function simulateRain(locationId: number): Promise<SimulationResponse> {
  return request<SimulationResponse>('/api/simulate-rain', {
    method: 'POST',
    body: JSON.stringify({ location_id: locationId }),
  });
}

// ─── Citizen Reports ──────────────────────────────────────────────────────────

export async function submitReport(formData: FormData): Promise<{
  success: boolean;
  report_id: number;
  submitted_at: string;
  message: string;
}> {
  const res = await fetch(`${BASE}/api/submit-report`, {
    method: 'POST',
    body: formData, // multipart/form-data — no Content-Type header; browser sets boundary
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getReports(): Promise<CitizenReport[]> {
  return request<CitizenReport[]>('/api/reports');
}

// ─── System Status ────────────────────────────────────────────────────────────

export async function getSystemStatus(): Promise<SystemStatus> {
  return request<SystemStatus>('/api/system-status');
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/api/analytics');
}

// ─── Flood Risk (Optional Module) ─────────────────────────────────────────────

export async function getFloodRiskData(): Promise<FloodRiskResponse> {
  return request<FloodRiskResponse>('/api/flood-risk');
}

export async function getFloodStation(id: number | string): Promise<FloodStation> {
  return request<FloodStation>(`/api/flood-risk/${id}`);
}

export async function searchFloodLocation(query: string): Promise<DynamicFloodRiskResult> {
  return request<DynamicFloodRiskResult>(`/api/flood-risk/search?query=${encodeURIComponent(query)}`);
}

export async function getDynamicFloodRisk(
  lat: number,
  lon: number,
  name?: string,
  state?: string
): Promise<DynamicFloodRiskResult> {
  let url = `/api/flood-risk/location?lat=${lat}&lon=${lon}`;
  if (name) url += `&name=${encodeURIComponent(name)}`;
  if (state) url += `&state=${encodeURIComponent(state)}`;
  return request<DynamicFloodRiskResult>(url);
}

export async function assessPointRisk(
  lat: number,
  lon: number,
  name?: string
): Promise<PointRiskAssessment> {
  let url = `/api/risk/assess?lat=${lat}&lon=${lon}`;
  if (name) url += `&name=${encodeURIComponent(name)}`;
  return request<PointRiskAssessment>(url);
}

export async function getRiskHistory(
  lat: number,
  lon: number,
  hazardType: string = 'landslide',
  hours: number = 24
): Promise<RiskHistoryResponse> {
  const url = `/api/risk/history?lat=${lat}&lon=${lon}&hazard_type=${hazardType}&hours=${hours}`;
  return request<RiskHistoryResponse>(url);
}

export async function simulateRiskScenario(
  lat: number,
  lon: number,
  rainfallMultiplier: number = 1.0,
  rainfallOverride?: number
): Promise<PointRiskAssessment> {
  let url = `/api/risk/simulate-scenario?lat=${lat}&lon=${lon}&rainfall_multiplier=${rainfallMultiplier}`;
  if (rainfallOverride !== undefined) {
    url += `&rainfall_override=${rainfallOverride}`;
  }
  return request<PointRiskAssessment>(url);
}

export async function simulateScenario(
  req: SimulationRequest
): Promise<SimulationResponseData> {
  return request<SimulationResponseData>('/api/risk/simulate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getRiskReplay(
  lat: number,
  lon: number,
  hours: number = 48
): Promise<RiskReplayResponse> {
  return request<RiskReplayResponse>(`/api/risk/replay?lat=${lat}&lon=${lon}&hours=${hours}`);
}

export async function getRiskTrend(
  lat: number,
  lon: number
): Promise<RiskTrendStatisticalResponse> {
  return request<RiskTrendStatisticalResponse>(`/api/risk/trend?lat=${lat}&lon=${lon}`);
}

export async function getAuthorityOverview(): Promise<AuthorityOverview> {
  return request<AuthorityOverview>('/api/authority/overview');
}

export async function searchLocations(
  query: string,
  limit: number = 5
): Promise<LocationSearchResult[]> {
  return request<LocationSearchResult[]>(
    `/api/location/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<LocationSearchResult> {
  return request<LocationSearchResult>(`/api/location/reverse?lat=${lat}&lon=${lon}`);
}


// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; version: string }> {
  return request<{ status: string; version: string }>('/api/health');
}

// ─── Authentication & Access Control ──────────────────────────────────────────

export async function login(userId: string, password: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, password }),
  });
  if (res.success && res.token && res.user) {
    setStoredAuth(res.token, res.user);
  }
  return res;
}

export async function logout(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    });
    clearStoredAuth();
    return res;
  } catch {
    clearStoredAuth();
    return { success: true, message: 'Logged out.' };
  }
}

export async function getAuthMe(): Promise<{ authenticated: boolean; user: AuthUser }> {
  return request<{ authenticated: boolean; user: AuthUser }>('/api/auth/me');
}

export async function forgotPassword(userId: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function resetPassword(
  userId: string,
  resetCode: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return request<{ success: boolean; message?: string; error?: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      reset_code: resetCode,
      new_password: newPassword,
    }),
  });
}

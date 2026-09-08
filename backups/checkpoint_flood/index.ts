// src/types/index.ts — Shared TypeScript interfaces for MALAI VIZHI

export interface LocationData {
  id: number;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  rainfall_mm: number;
  soil_moisture: number;
  temperature?: number;
  humidity?: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  risk_score: number;
  slope_deg: number;
  last_updated: string;
  ai_assessment?: string;
  data_source?: string;
  alerts?: AlertItem[];
  seven_day_trend?: number[];
}

export interface AlertItem {
  id: number;
  location_id: number;
  location_name: string;
  location_state?: string;
  latitude?: number;
  longitude?: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  message: string;
  timestamp: string;
  status: 'Sent' | 'Acknowledged' | 'Resolved';
}

export interface SystemStatus {
  system_status: string;
  last_inference: string;
  stations_monitored: number;
  active_alerts_count: number;
  citizen_reports_count: number;
  nasa_power_connection: string;
  telemetry_grid: {
    satellite_feed: string;
    ground_sensors: string;
    prediction_interval: string;
    model_confidence: string;
  };
  risk_breakdown: {
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
}

export interface CitizenReport {
  id: number;
  location: string;
  description: string;
  latitude?: number;
  longitude?: number;
  category: string;
  photo_path?: string;
  submitted_at: string;
}

export interface SimulationResponse {
  success: boolean;
  location_id: number;
  location_name: string;
  state: string;
  rainfall_mm: number;
  soil_moisture: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  risk_score: number;
  last_updated: string;
  ai_assessment: string;
  is_simulated: boolean;
  alert_created?: boolean;
  alert_id?: number;
  alert_message?: string;
}

export interface AnalyticsData {
  regional_comparison: RegionalComparison[];
  total_monitored: number;
  total_alerts_issued: number;
  model_accuracy: number;
  lead_time_hours: number;
}

export interface RegionalComparison {
  state: string;
  avg_rainfall: number;
  avg_moisture: number;
  high_risk_count: number;
  stations: number;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type AlertStatus = 'Sent' | 'Acknowledged' | 'Resolved';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface AuthUser {
  user_id: string;
  name: string;
  email?: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  message?: string;
  reset_code?: string;
}

// ─── Flood Risk Types (Optional Module) ────────────────────────────────────────

export interface FloodStation {
  id: number | string;
  station_code?: string;
  name: string;
  state: string;
  country?: string;
  latitude: number;
  longitude: number;
  rainfall_mm: number;
  rainfall_24h?: number;
  soil_moisture: number;
  slope_deg?: number;
  flood_risk_score: number;
  risk_score?: number;
  flood_risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH';
  runoff_index: number;
  flood_assessment: string;
  seven_day_trend?: number[];
  last_updated: string;
  data_source?: string;
  is_prototype?: boolean;
  assessment_type?: string;
  basin?: string;
}

export interface FloodAdvisory {
  id: string;
  location_id: number | string;
  location_name: string;
  state: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  title: string;
  message: string;
  timestamp: string;
  hazard_type: string;
}

export interface FloodRiskSummary {
  total_stations: number;
  high_risk_count: number;
  moderate_risk_count: number;
  low_risk_count: number;
  avg_runoff_index: number;
}

export interface FloodRiskResponse {
  stations: FloodStation[];
  advisories: FloodAdvisory[];
  summary: FloodRiskSummary;
  is_prototype: boolean;
  prototype_disclaimer: string;
  future_integrations: string[];
}


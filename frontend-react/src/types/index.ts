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
  dominant_factor?: string;
  ai_assessment?: string;
  data_source?: string;
  alerts?: AlertItem[];
  seven_day_trend?: number[];
  node_id?: string;
  inclination_deg?: number;
  battery?: number;
}

export interface AlertItem {
  id: number;
  location_id: number;
  location_name: string;
  location_state?: string;
  latitude?: number;
  longitude?: number;
  risk_score?: number;
  trigger_type?: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged_at?: string;
  recipient_type?: string;
  status: 'GENERATED' | 'Sent' | 'Acknowledged' | 'Resolved' | 'NOT_CONFIGURED' | 'FAILED';
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
  video_path?: string;
  submitted_at: string;
  status?: 'SUBMITTED' | 'VERIFIED' | 'RESOLVED';
  verified_at?: string;
  resolved_at?: string;
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

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'GENERATED' | 'Sent' | 'Acknowledged' | 'Resolved' | 'NOT_CONFIGURED' | 'FAILED';
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
  soil_moisture_source?: string;
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
  is_dynamic?: boolean;
  assessment_type?: string;
  basin?: string;
  elevation?: number;
  prototype_disclaimer?: string;
}

export interface DynamicFloodRiskResult {
  location: {
    name: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    elevation?: number;
  };
  assessment_type: string;
  risk_score: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  inputs: {
    rainfall_24h: number;
    previous_rainfall: number;
    soil_moisture: number | null;
    soil_moisture_source?: string;
    runoff_index: number;
  };
  station: FloodStation;
  prototype_disclaimer: string;
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

// ─── Point-Level Production Multi-Hazard Risk Types ──────────────────────────

export interface TelemetryValue {
  value: number | null;
  unit?: string;
  source?: string;
  timestamp?: string | null;
  quality?: string;
  direction?: string;
  available?: boolean;
}

export interface ObservationTelemetry {
  value: number | null;
  unit?: string;
  source?: string;
  timestamp?: string | null;
  spatial_resolution?: string;
  quality?: string;
  available?: boolean;
  direction?: string;
  freshness?: string;
}

export interface RainfallTelemetryPackage {
  current_1h: ObservationTelemetry;
  recent_3h: ObservationTelemetry;
  recent_6h: ObservationTelemetry;
  accumulated_24h: ObservationTelemetry;
  accumulated_3d: ObservationTelemetry;
  accumulated_7d: ObservationTelemetry;
  forecast_24h?: ObservationTelemetry;
  seven_day_trend: number[];
  freshness: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE' | string;
  available: boolean;
}

export interface SoilTelemetryPackage {
  saturation_percentage?: ObservationTelemetry;
  volumetric_0_7cm?: ObservationTelemetry;
  saturation_pct?: ObservationTelemetry;
  volumetric_fraction?: number | null;
  trend_24h?: 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN' | string;
  delta_24h_m3?: number;
  freshness?: string;
  quality?: string;
  available: boolean;
}

export interface TerrainTelemetryPackage {
  elevation: ObservationTelemetry;
  slope: ObservationTelemetry;
  aspect: ObservationTelemetry;
  aspect_compass?: string;
  source: string;
  timestamp?: string | null;
  quality?: string;
  available: boolean;
}

export interface EnvironmentalTelemetry {
  rainfall_1h: TelemetryValue;
  rainfall_3h?: TelemetryValue;
  rainfall_6h?: TelemetryValue;
  rainfall_24h: TelemetryValue;
  rainfall_72h: TelemetryValue;
  antecedent_rainfall: TelemetryValue;
  forecast_24h?: TelemetryValue;
  seven_day_trend: number[];
  soil_moisture: TelemetryValue;
  elevation: TelemetryValue;
  slope: TelemetryValue;
  aspect: TelemetryValue;
  runoff_index?: number | null;
  rainfall?: RainfallTelemetryPackage;
  terrain?: TerrainTelemetryPackage;
  soil?: SoilTelemetryPackage;
}

export interface StructuredRiskFactor {
  name: string;
  value?: number | string | null;
  unit?: string;
  impact: 'high' | 'moderate' | 'low' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  contribution: number | string;
  pts?: number;
  available?: boolean;
  description?: string;
}

export interface RiskTimelinePoint {
  id?: number;
  timestamp: string;
  score: number;
  level: string;
  confidence: number;
  model_version?: string;
}

export interface RiskTrendInfo {
  direction: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data' | string;
  change?: number;
  change_formatted?: string;
  observations_count?: number;
  description?: string;
  message?: string;
  timeline_available?: boolean;
}

export interface RiskHistoryResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  hazard_type: string;
  history: RiskTimelinePoint[];
  trend: RiskTrendInfo;
}

export interface AlertState {
  status: 'monitor' | 'watch' | 'warning' | string;
  reason: string;
  triggered_by?: string[];
  escalation_ready?: boolean;
}

export interface CitizenReportContext {
  id: number;
  location: string;
  description: string;
  category: string;
  distance_km?: number;
  submitted_at: string;
}

export interface CitizenEvidenceInfo {
  report_count: number;
  summary: string;
  disclaimer: string;
  reports: CitizenReportContext[];
}

export interface SimulationRequest {
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  rainfall_change_percent?: number;
  soil_moisture_change_percent?: number;
}

export interface FactorChangeItem {
  factor_name: string;
  baseline_value?: number | string | null;
  scenario_value?: number | string | null;
  unit?: string;
  baseline_points: number;
  scenario_points: number;
  points_delta: number;
  impact: string;
}

export interface ScenarioComparisonDetail {
  baseline_score: number;
  scenario_score: number;
  score_delta: number;
  baseline_level: string;
  scenario_level: string;
  dominant_factor?: string;
}

export interface SimulationResponseData {
  latitude: number;
  longitude: number;
  location_name: string;
  parameters: {
    rainfall_change_percent: number;
    soil_moisture_change_percent: number;
  };
  comparison: {
    overall: ScenarioComparisonDetail;
    landslide: ScenarioComparisonDetail;
    flood: ScenarioComparisonDetail;
  };
  factor_changes: FactorChangeItem[];
  simulation: boolean;
  disclaimer: string;
}

export interface RiskReplayResponse {
  latitude: number;
  longitude: number;
  replay_available: boolean;
  message?: string;
  observation_count: number;
  timeline: RiskTimelinePoint[];
  earliest_timestamp?: string;
  latest_timestamp?: string;
}

export interface RiskTrendStatisticalResponse {
  trend_direction: 'STABLE' | 'INCREASING' | 'RAPIDLY INCREASING' | 'DECREASING' | 'RAPIDLY DECREASING' | 'INSUFFICIENT DATA' | string;
  trend_strength: number;
  score_change?: number;
  observation_count: number;
  earliest_score?: number;
  latest_score?: number;
  time_window?: string;
  confidence?: string;
  message?: string;
}

export interface AuthorityOverviewLocation extends LocationData {
  rainfall_mm: number;
  soil_moisture: number;
  dominant_factor?: string;
}

export interface AuthorityIncreasingLocation {
  id: number;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  risk_level: string;
  risk_score: number;
  trend: string;
  score_delta: number;
}

export interface AuthorityAlertItem {
  id: number;
  location_id?: number;
  location_name: string;
  alert_level: string;
  created_at: string;
  acknowledged: boolean;
}

export interface AuthorityEvidenceItem {
  id: number;
  latitude: number;
  longitude: number;
  hazard_type: string;
  description: string;
  created_at: string;
  photo_url?: string;
}

export interface AuthorityOverview {
  status?: string;
  timestamp: string;
  highest_risk_locations: AuthorityOverviewLocation[];
  rapidly_increasing_locations?: AuthorityIncreasingLocation[];
  active_emergency_alerts?: AuthorityAlertItem[];
  active_alerts_count?: number;
  active_alerts?: any[];
  recent_verified_evidence: AuthorityEvidenceItem[];
  recent_point_assessments?: any[];
  summary_metrics?: {
    total_monitored_stations: number;
    high_risk_stations_count: number;
    unacknowledged_alerts_count: number;
    verified_reports_count: number;
  };
  system_status: string;
}

export interface SourceQualityDetail {
  name: string;
  available: boolean;
  status_text: string;
  provider: string;
}

export interface OverallHazardStatus {
  score: number;
  level: string;
  primary_threat: 'Landslide' | 'Flood' | string;
  summary_note: string;
}

export interface ProviderProvenance {
  name?: string;
  provider?: string;
  status: 'ONLINE' | 'OFFLINE' | 'ESTIMATED' | 'UNAVAILABLE' | string;
  spatial_resolution?: string;
  freshness?: string;
  timestamp?: string | null;
}

export interface AssessmentConfidenceDetails {
  score: number;
  level: 'High' | 'Moderate' | 'Low' | string;
  status?: string;
  label: string;
  explanation: string;
  inputs_available: number;
  inputs_total: number;
  freshness_score?: number;
  available_feeds?: string[];
  missing_feeds?: string[];
  freshness?: string;
}

export interface HazardAssessment {
  score: number | null;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'UNAVAILABLE' | string;
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | number | string;
  confidence_pct?: number;
  data_quality: 'GOOD' | 'PARTIAL' | 'INSUFFICIENT' | string;
  factors: string[] | StructuredRiskFactor[];
  structured_factors?: StructuredRiskFactor[];
  model_version?: string;
  assessment?: string;
  terrain_available?: boolean;
  status: string;
}

export interface PointDataQuality {
  status: 'good' | 'moderate' | 'limited' | 'unavailable' | 'GOOD' | 'PARTIAL' | 'INSUFFICIENT' | string;
  message: string;
  transparency_note?: string;
  sources?: Record<string, SourceQualityDetail>;
  missing_sources?: string[];
  available_feeds?: string[];
  missing_feeds?: string[];
  warnings?: string[];
}

export interface PointHazardAssessment {
  score: number | null;
  level: 'Low' | 'Moderate' | 'High' | 'LOW' | 'MODERATE' | 'HIGH' | 'UNAVAILABLE' | string;
  confidence: number | string;
  confidence_status?: string;
  confidence_pct?: number;
  dominant_factor?: string;
  status?: string;
  assessment?: string;
  factors?: StructuredRiskFactor[] | string[];
  structured_factors?: StructuredRiskFactor[];
  factor_descriptions?: string[];
  data_quality?: string;
  terrain_available?: boolean;
  runoff_index?: number | null;
  model_version?: string;
  trend?: string;
}

export interface PointRiskAssessment {
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  latitude: number;
  longitude: number;
  location_name: string;
  display_name?: string;
  state?: string;
  country?: string;
  dominant_factor?: string;
  overall_hazard_status?: OverallHazardStatus;
  overall_hazard_priority?: {
    score: number;
    level: string;
    dominant_hazard: string;
    dominant_factor: string;
  };
  confidence_score?: number;
  confidence?: AssessmentConfidenceDetails | number;
  data_quality: PointDataQuality;
  landslide: PointHazardAssessment;
  flood: PointHazardAssessment;
  trend?: RiskTrendInfo;
  alert_state?: AlertState;
  citizen_evidence?: CitizenEvidenceInfo;
  factors: string[];
  structured_factors?: StructuredRiskFactor[];
  providers?: Record<string, ProviderProvenance>;
  assessment_timestamp?: string;
  timestamp: string;
  model_version: string;
  is_simulation?: boolean;
  simulation_parameters?: Record<string, any> | null;
  location: {
    name: string;
    display_name: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  environment: EnvironmentalTelemetry;
  metadata: {
    generated_at: string;
    model_version?: string;
    model_versions: {
      flood: string;
      landslide: string;
    };
    data_sources: Record<string, string>;
    disclaimer: string;
  };
}

export interface LocationSearchResult {
  name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  type?: string;
  state?: string;
  country?: string;
  source?: string;
}

// ─── Phase 7 Types ────────────────────────────────────────────────────────────

export interface HistoricalEvent {
  id: number;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  severity: 'MODERATE' | 'MAJOR' | 'CRITICAL';
  source: string;
  description: string;
  status: string;
}

export interface RoadStatus {
  id: number;
  road_name: string;
  latitude: number;
  longitude: number;
  status: 'OPEN' | 'RESTRICTED' | 'BLOCKED' | 'UNKNOWN';
  risk_score: number;
  impact_priority: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  last_updated: string;
  data_source: string;
}

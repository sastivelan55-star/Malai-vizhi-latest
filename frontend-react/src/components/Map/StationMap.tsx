// src/components/Map/StationMap.tsx
import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationData, RoadStatus } from '../../types';
import { COLORS, MAP_CENTER, MAP_ZOOM } from '../../data/constants';
import { getRoads, API_BASE } from '../../services/api';
import { DemoPanel } from '../UI/DemoPanel';

// Fix Leaflet default icon path issues in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface StationMapProps {
  locations: LocationData[];
  selectedId: number | null;
  onSelectLocation: (id: number) => void;
  selectedPoint?: { lat: number; lon: number } | null;
  onMapClick?: (lat: number, lon: number) => void;
  pointAssessment?: import('../../types').PointRiskAssessment | null;
}

function riskColor(level: string): string {
  if (level === 'HIGH') return COLORS.risk.HIGH;
  if (level === 'MODERATE') return COLORS.risk.MODERATE;
  return COLORS.risk.LOW;
}

function createRiskMarker(level: string, score: number): L.DivIcon {
  const color = riskColor(level);
  const pulseAnim = level === 'HIGH' ? 'animation: pulse 1.5s ease-in-out infinite;' : '';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${level === 'HIGH' ? `
          <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:${color}22;${pulseAnim}border:1.5px solid ${color}55;"></div>
        ` : ''}
        <div style="
          width:26px;height:26px;border-radius:50%;
          background:${color};
          border:2.5px solid white;
          box-shadow:0 2px 8px ${color}66;
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:700;color:white;font-family:Inter,sans-serif;
        ">${score}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function createSelectedPointMarker(riskLevel?: string): L.DivIcon {
  const isHigh = riskLevel?.toUpperCase() === 'HIGH';
  const isMod = riskLevel?.toUpperCase() === 'MODERATE';
  const ringColor = isHigh ? '#DC2626' : isMod ? '#D97706' : '#14B8A6';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="position:absolute;width:38px;height:38px;border-radius:50%;background:${ringColor}33;animation:pulse 1.8s ease-in-out infinite;border:2px solid ${ringColor}88;"></div>
        <div style="
          width:24px;height:24px;border-radius:50%;
          background:#102A43;
          border:2.5px solid ${ringColor};
          box-shadow:0 3px 10px ${ringColor}88;
          display:flex;align-items:center;justify-content:center;
          color:${ringColor};
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

export const StationMap: React.FC<StationMapProps> = memo(({
  locations,
  selectedId,
  onSelectLocation,
  selectedPoint,
  onMapClick,
  pointAssessment,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const pointMarkerRef = useRef<L.Marker | null>(null);
  const lastCenteredPointRef = useRef<string | null>(null);
  const lastCenteredStationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);


  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: true,
      attributionControl: true,
      tapHold: false,
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    });
    osmLayer.addTo(map);

    const roadsLayer = L.featureGroup();
    getRoads().then((roads: RoadStatus[]) => {
      roads.forEach((road: RoadStatus) => {
        const color = road.status === 'OPEN' ? '#16A34A' : road.status === 'RESTRICTED' ? '#F59E0B' : road.status === 'BLOCKED' ? '#DC2626' : '#64748b';
        L.circleMarker([road.latitude, road.longitude], {
            radius: 7,
            color: 'white',
            weight: 2,
            fillColor: color,
            fillOpacity: 0.9
        }).bindPopup(`
          <div style="font-family:Inter,sans-serif;font-size:12px;">
            <b>${road.road_name}</b><br>
            Status: <strong style="color:${color}">${road.status}</strong><br>
            Impact Priority: ${road.impact_priority}<br>
            Risk Score: ${road.risk_score}
          </div>
        `).addTo(roadsLayer);
      });
    }).catch(() => {});

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    });

    const villagesLayer = L.featureGroup();
    const infraLayer = L.featureGroup();

    fetch(`${API_BASE}/api/gis/layers`)
      .then(r => r.json())
      .then(data => {
        if (data.villages) {
          data.villages.forEach((v: any) => {
            L.circleMarker([v.latitude, v.longitude], {
              radius: 6, color: 'white', weight: 1, fillColor: '#8B5CF6', fillOpacity: 0.8
            }).bindPopup(`<b>${v.name}</b><br/>Pop: ${v.population}<br/>Risk: ${v.risk_exposure}<br/><i>${v.data_source}</i>`).addTo(villagesLayer);
          });
        }
        if (data.infrastructure) {
          data.infrastructure.forEach((i: any) => {
            L.circleMarker([i.latitude, i.longitude], {
              radius: 6, color: 'white', weight: 1, fillColor: '#EC4899', fillOpacity: 0.8
            }).bindPopup(`<b>${i.name}</b><br/>Type: ${i.type}<br/>Status: ${i.status}<br/><i>${i.data_source}</i>`).addTo(infraLayer);
          });
        }
      })
      .catch(console.error);

    const baseMaps = {
      "Map View": osmLayer,
      "Satellite Imagery [AVAILABLE]": satelliteLayer
    };

    const overlayMaps = {
      "Vulnerable Roads": roadsLayer,
      "Villages GIS": villagesLayer,
      "Critical Infra GIS": infraLayer,
      "Satellite Analytics [NOT CONFIGURED]": L.layerGroup(),
      "Citizen Reports": L.layerGroup(),
      "Historical Events": L.layerGroup(),
    };
    L.control.layers(baseMaps, overlayMaps, { collapsed: true, position: 'topright' }).addTo(map);


    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(
          parseFloat(e.latlng.lat.toFixed(5)),
          parseFloat(e.latlng.lng.toFixed(5))
        );
      }
    };
    map.on('click', handleMapClick);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !locations.length) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    locations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: createRiskMarker(loc.risk_level, loc.risk_score),
        title: loc.name,
        alt: `${loc.name} - ${loc.risk_level} risk`,
      });

      marker.bindTooltip(
        `<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#102A43;padding:2px 4px;">
          ${loc.name}<br/>
          <span style="font-weight:400;color:#64748b;font-size:11px;">${loc.state}</span>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectLocation(loc.id);
      });
      marker.addTo(map);
      markersRef.current.set(loc.id, marker);
    });
  }, [locations, onSelectLocation]);

  // Update or create point marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedPoint) {
      const latLng: [number, number] = [selectedPoint.lat, selectedPoint.lon];
      const peakLevel = pointAssessment?.overall_hazard_status?.level || pointAssessment?.landslide?.level;

      if (pointMarkerRef.current) {
        pointMarkerRef.current.setLatLng(latLng);
        pointMarkerRef.current.setIcon(createSelectedPointMarker(peakLevel));
      } else {
        const marker = L.marker(latLng, {
          icon: createSelectedPointMarker(peakLevel),
          zIndexOffset: 1000,
          title: `Selected Location (${selectedPoint.lat.toFixed(4)}, ${selectedPoint.lon.toFixed(4)})`,
        });
        marker.addTo(map);
        pointMarkerRef.current = marker;
      }

      // Build rich popup
      const confVal = typeof pointAssessment?.confidence === 'object'
        ? pointAssessment.confidence.score
        : pointAssessment?.confidence_score ?? pointAssessment?.confidence;

      const popupHtml = `
        <div style="font-family:Inter,sans-serif;font-size:12px;padding:4px;min-width:180px;">
          <div style="font-weight:700;color:#102A43;margin-bottom:2px;">
            ${pointAssessment?.location_name || 'Selected Point'}
          </div>
          <div style="color:#0f766e;font-size:11px;font-weight:600;margin-bottom:4px;">
            ${selectedPoint.lat.toFixed(4)}° N, ${selectedPoint.lon.toFixed(4)}° E
          </div>
          ${pointAssessment ? `
            <div style="font-size:11px;border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;line-height:1.4;">
              <div><strong>Landslide:</strong> <span style="color:#b45309;font-weight:700;">${pointAssessment.landslide?.level || 'Low'}</span> (${pointAssessment.landslide?.score ?? '—'}/100)</div>
              <div><strong>Flood:</strong> <span style="color:#0284c7;font-weight:700;">${pointAssessment.flood?.level || 'Low'}</span> (${pointAssessment.flood?.score ?? '—'}/100)</div>
              ${pointAssessment.dominant_factor ? `
                <div style="color:#0f766e;margin-top:2px;"><strong>Dominant Factor:</strong> ${pointAssessment.dominant_factor}</div>
              ` : ''}
              ${confVal !== undefined ? `<div style="color:#0f766e;margin-top:2px;"><strong>Confidence:</strong> ${confVal}%</div>` : ''}
              ${pointAssessment.trend?.direction && pointAssessment.trend.direction !== 'insufficient_data' ? `
                <div style="color:#475569;margin-top:2px;"><strong>Trend:</strong> ${pointAssessment.trend.direction} (${pointAssessment.trend.change_formatted})</div>
              ` : ''}
            </div>
          ` : `
            <div style="font-size:10px;color:#64748b;margin-top:2px;">Evaluating multi-hazard risk...</div>
          `}
        </div>
      `;

      pointMarkerRef.current.bindPopup(popupHtml, { offset: [0, -18] }).openPopup();

      // Smoothly pan and center the map on the searched/clicked point
      const pointKey = `${selectedPoint.lat.toFixed(4)},${selectedPoint.lon.toFixed(4)}`;
      if (lastCenteredPointRef.current !== pointKey) {
        map.setView(latLng, Math.max(map.getZoom(), 10), { animate: true });
        lastCenteredPointRef.current = pointKey;
      }
    } else {
      lastCenteredPointRef.current = null;
      if (pointMarkerRef.current) {
        pointMarkerRef.current.remove();
        pointMarkerRef.current = null;
      }
    }
  }, [selectedPoint, pointAssessment]);

  // Highlight selected station marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) {
      lastCenteredStationRef.current = null;
      return;
    }

    const loc = locations.find((l) => l.id === selectedId);
    if (!loc) return;

    const marker = markersRef.current.get(selectedId);
    if (marker && lastCenteredStationRef.current !== selectedId) {
      map.setView([loc.latitude, loc.longitude], Math.max(map.getZoom(), 9), { animate: true });
      lastCenteredStationRef.current = selectedId;
    }
  }, [selectedId, locations]);

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-inner">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm pointer-events-auto shadow-lg rounded-xl">
        <DemoPanel
          title="Interactive regional map"
          description="Toggle roads, villages, infrastructure and historical landslides to understand local exposure."
        />
      </div>
      <div
        ref={containerRef}
        className="w-full h-full"
        role="application"
        aria-label="Interactive Northeast India monitoring station map"
      />
    </div>
  );
});

StationMap.displayName = 'StationMap';

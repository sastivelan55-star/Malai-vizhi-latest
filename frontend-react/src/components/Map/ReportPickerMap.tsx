// src/components/Map/ReportPickerMap.tsx
import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CENTER } from '../../data/constants';

interface ReportPickerMapProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}

export const ReportPickerMap: React.FC<ReportPickerMapProps> = memo(({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_CENTER,
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width:28px;height:28px;border-radius:50% 50% 50% 0;
              background:#DC2626;border:2px solid white;
              box-shadow:0 2px 8px #DC262688;
              transform:rotate(-45deg);
            "></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          }),
        }).addTo(map);
      }

      onChange({ lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) });
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [onChange]);

  // Sync marker to value prop
  useEffect(() => {
    if (!mapRef.current || !value) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    } else {
      markerRef.current = L.marker([value.lat, value.lng]).addTo(mapRef.current);
    }
  }, [value]);

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-slate-200"
        style={{ height: '280px' }}
        role="application"
        aria-label="Click on the map to select the incident location"
      />
      <p className="text-xs text-slate-400 mt-1.5">
        Click anywhere on the map to mark the incident location.
      </p>
    </div>
  );
});

ReportPickerMap.displayName = 'ReportPickerMap';

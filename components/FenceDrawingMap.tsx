'use client';

import { useEffect, useRef, useState } from 'react';

const SATELLITE_TILES = 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';

export interface Segment {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
}

interface FenceDrawingMapProps {
  segments: Segment[];
  center?: [number, number];
  className?: string;
}

function safeRemoveMap(map: import('leaflet').Map | null) {
  if (!map) return;
  try {
    map.off();
    map.remove();
  } catch {
    // Ignore _leaflet_pos / DOM errors when unmounting
  }
}

export function FenceDrawingMap({ segments, center, className = '' }: FenceDrawingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !containerRef.current || segments.length === 0)
      return;

    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      safeRemoveMap(mapRef.current);
      mapRef.current = null;

      const map = L.default.map(containerRef.current!, { attributionControl: false }).setView(
        center ?? [Number(segments[0].start_lat), Number(segments[0].start_lng)],
        18
      );
      mapRef.current = map;

      L.default.tileLayer(SATELLITE_TILES, {
        subdomains: '0123',
        maxZoom: 21,
      }).addTo(map);

      const latlngs: [number, number][] = [];
      segments.forEach((seg, i) => {
        if (i === 0) latlngs.push([Number(seg.start_lat), Number(seg.start_lng)]);
        latlngs.push([Number(seg.end_lat), Number(seg.end_lng)]);
      });

      if (latlngs.length >= 2) {
        L.default.polyline(latlngs, { color: '#eab308', weight: 5 }).addTo(map);
        segments.forEach((seg, i) => {
          const midLat = (Number(seg.start_lat) + Number(seg.end_lat)) / 2;
          const midLng = (Number(seg.start_lng) + Number(seg.end_lng)) / 2;
          const num = i + 1;
          L.default
            .marker([midLat, midLng], {
              icon: L.default.divIcon({
                html: `<div style="
                  width: 24px; height: 24px; border-radius: 50%;
                  background: #eab308; color: #000; font-weight: 700; font-size: 12px;
                  display: flex; align-items: center; justify-content: center;
                  border: 2px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.4);
                  font-family: system-ui, sans-serif;
                ">${num}</div>`,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              }),
            })
            .addTo(map);
        });
        map.fitBounds(latlngs, { padding: [20, 20] });
      }
    });

    return () => {
      cancelled = true;
      const map = mapRef.current;
      mapRef.current = null;
      safeRemoveMap(map);
    };
  }, [mounted, segments, center]);

  if (segments.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg2)] ${className}`}>
        <span className="text-sm text-[var(--muted)]">No fence drawing saved</span>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className={`flex min-h-[280px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg2)] ${className}`}>
        <span className="text-sm text-[var(--muted)]">Loading map…</span>
      </div>
    );
  }

  return <div ref={containerRef} className={`min-h-[280px] w-full rounded-lg border border-[var(--line)] ${className}`} />;
}

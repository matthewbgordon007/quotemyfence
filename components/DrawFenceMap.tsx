'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const METERS_TO_FEET = 3.28084;
const LINE_COLOR = '#FFD700'; // yellow
/** Max gap between two clicks to count as "double-click" and end the current line (ms) */
const DOUBLE_CLICK_MS = 650;

const SATELLITE_TILES = 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

function roundUpFeet(feet: number): number {
  if (!Number.isFinite(feet) || feet <= 0) return 0;
  return Math.ceil(feet);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface DrawFenceMapRef {
  appendSegmentByLength: (lengthFt: number) => void;
}

export interface DrawFenceMapProps {
  center?: [number, number];
  onReset?: () => void;
  onDrawingComplete: (data: {
    points: { lat: number; lng: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number; lat?: number; lng?: number }[];
    total_length_ft: number;
  }) => void;
  initialDrawing?: {
    points: { lat: number; lng: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number; lat?: number; lng?: number }[];
    total_length_ft: number;
  } | null;
  /** Geocoded address from the previous step — shows a clear “your home” pin on the lot */
  propertyPin?: { lat: number; lng: number } | null;
  propertyLabel?: string | null;
  tileVariant?: 'satellite' | 'light';
}

// Gate placed on map: { type, lat, lng }
type PlacedGate = { type: 'single' | 'double'; lat: number; lng: number };

export const DrawFenceMap = forwardRef<DrawFenceMapRef, DrawFenceMapProps>(function DrawFenceMap({
  center = [45.42, -75.7],
  onReset,
  onDrawingComplete,
  initialDrawing,
  propertyPin = null,
  propertyLabel = null,
  tileVariant = 'satellite',
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const layersRef = useRef<{ remove: () => void }[]>([]);
  // Segments: each segment is a list of points. Double-click ends current segment.
  const [segments, setSegments] = useState<{ lat: number; lng: number }[][]>(() => {
    const pts = initialDrawing?.points ?? [];
    if (pts.length === 0) return [];
    return [pts];
  });
  const [placedGates, setPlacedGates] = useState<PlacedGate[]>(() => {
    const gates = initialDrawing?.gates ?? [];
    const pts = initialDrawing?.points ?? [];
    const result: PlacedGate[] = [];
    let i = 0;
    const anchor = pts.length >= 1 ? pts[pts.length - 1] : { lat: 0, lng: 0 };
    for (const g of gates) {
      for (let q = 0; q < (g.quantity || 0); q++) {
        result.push({
          type: g.type,
          lat: anchor.lat + 0.00005 * (i % 5),
          lng: anchor.lng + 0.00005 * Math.floor(i / 5),
        });
        i++;
      }
    }
    return result;
  });
  const [totalFeet, setTotalFeet] = useState(initialDrawing?.total_length_ft ?? 0);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'draw' | 'place_single_gate' | 'place_double_gate'>('draw');
  const [mousePos, setMousePos] = useState<{ lat: number; lng: number } | null>(null);
  const [dragFeet, setDragFeet] = useState<number | null>(null);
  const lastClickTime = useRef(0);
  const previewLayersRef = useRef<{ remove: () => void }[]>([]);
  /** Cached after first load — avoids repeated dynamic import on every redraw (Esc / finish line). */
  const leafletLibRef = useRef<typeof import('leaflet') | null>(null);
  const mousePosRef = useRef<{ lat: number; lng: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const endLineRef = useRef<() => void>(() => {});
  endLineRef.current = () => {
    if (modeRef.current !== 'draw') return;
    lastClickTime.current = 0;
    // Remove dashed preview immediately (don’t wait for React re-render + dynamic import).
    const map = mapRef.current;
    if (map) {
      previewLayersRef.current.forEach((l) => l.remove());
      previewLayersRef.current = [];
    }
    setDragFeet(null);
    setSegments((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.length < 2) return prev;
      return [...prev, []];
    });
  };

  const initialZoom = center ? 20 : 17;
  const maxZoom = 21;

  const allPoints = segments.flat();
  const onCompleteRef = useRef(onDrawingComplete);
  onCompleteRef.current = onDrawingComplete;

  function buildAndNotify(segs: { lat: number; lng: number }[][], gates: PlacedGate[]) {
    const segLengths: { length_ft: number }[] = [];
    let total = 0;
    const flatPts: { lat: number; lng: number }[] = [];
    for (const seg of segs) {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = seg[i];
        const b = seg[i + 1];
        const m = distanceMeters(a.lat, a.lng, b.lat, b.lng);
        const ft = roundUpFeet(m * METERS_TO_FEET);
        segLengths.push({ length_ft: ft });
        total += ft;
      }
      flatPts.push(...seg);
    }
    setTotalFeet(total);
    onCompleteRef.current({
      points: flatPts,
      segments: segLengths,
      gates: gates.map((g) => ({
        type: g.type,
        quantity: 1,
        lat: g.lat,
        lng: g.lng,
      })),
      total_length_ft: total,
    });
  }

  const propertyMarkerRef = useRef<import('leaflet').Marker | null>(null);

  // Property / “your home” pin (separate from fence layers)
  useEffect(() => {
    if (!ready || !mapRef.current) {
      propertyMarkerRef.current?.remove();
      propertyMarkerRef.current = null;
      return;
    }
    if (!propertyPin || !Number.isFinite(propertyPin.lat) || !Number.isFinite(propertyPin.lng)) {
      propertyMarkerRef.current?.remove();
      propertyMarkerRef.current = null;
      return;
    }

    let cancelled = false;
    const place = (L: typeof import('leaflet')) => {
      if (cancelled || !mapRef.current) return;
      propertyMarkerRef.current?.remove();
      const title = (propertyLabel || 'Your address').trim() || 'Your address';
      const html = `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        <div style="width:26px;height:26px;border-radius:50%;background:#b91c1c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;">🏠</div>
        <div style="width:0;height:0;margin-top:-3px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #b91c1c;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));"></div>
      </div>`;
      const m = L.marker([propertyPin.lat, propertyPin.lng], {
        icon: L.divIcon({
          className: 'property-home-pin',
          html,
          iconSize: [28, 34],
          iconAnchor: [14, 34],
        }),
        zIndexOffset: 800,
        interactive: true,
      }).addTo(mapRef.current);
      m.bindTooltip(escapeHtml(title), { direction: 'top', offset: [0, -6] });
      propertyMarkerRef.current = m;
    };
    const L0 = leafletLibRef.current;
    if (L0) {
      place(L0);
    } else {
      import('leaflet').then((L) => {
        if (cancelled || !mapRef.current) return;
        leafletLibRef.current = L;
        place(L);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [ready, propertyPin?.lat, propertyPin?.lng, propertyLabel]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletLibRef.current = L;
      // Avoid "Map container is already initialized" (e.g. React Strict Mode or re-mount)
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(containerRef.current!, {
        zoomControl: true,
        maxZoom,
      }).setView(center, initialZoom);

      if (map.doubleClickZoom && typeof map.doubleClickZoom.disable === 'function') {
        map.doubleClickZoom.disable();
      }

      const tileUrl = tileVariant === 'light' ? LIGHT_TILES : SATELLITE_TILES;
      const tileOpts = tileVariant === 'light'
        ? { attribution: '© CARTO', maxZoom }
        : { attribution: '© Google', maxZoom, subdomains: '0123' };
      L.tileLayer(tileUrl, tileOpts).addTo(map);

      map.on('dblclick', (e: L.LeafletMouseEvent) => {
        if (modeRef.current !== 'draw') return;
        const ev = e.originalEvent;
        if (ev) {
          L.DomEvent.preventDefault(ev);
          L.DomEvent.stopPropagation(ev);
        }
        endLineRef.current();
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const m = modeRef.current;
        if (m === 'place_single_gate') {
          setPlacedGates((prev) => [...prev, { type: 'single', lat, lng }]);
          setMode('draw');
          return;
        }
        if (m === 'place_double_gate') {
          setPlacedGates((prev) => [...prev, { type: 'double', lat, lng }]);
          setMode('draw');
          return;
        }
        const now = Date.now();
        if (now - lastClickTime.current < DOUBLE_CLICK_MS) {
          endLineRef.current();
          return;
        }
        lastClickTime.current = now;
        setSegments((prev) => {
          if (prev.length === 0) return [[{ lat, lng }]];
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), [...last, { lat, lng }]];
        });
      });

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        mousePosRef.current = { lat, lng };
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setMousePos(mousePosRef.current);
        });
      });

      map.on('mouseout', () => {
        mousePosRef.current = null;
        setMousePos(null);
        setDragFeet(null);
      });

      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      propertyMarkerRef.current?.remove();
      propertyMarkerRef.current = null;
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];
      previewLayersRef.current.forEach((l) => l.remove());
      previewLayersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [tileVariant]);

  // Update drag distance when mouse moves
  useEffect(() => {
    if (!mousePos || segments.length === 0) {
      setDragFeet(null);
      return;
    }
    const last = segments[segments.length - 1];
    if (!last || last.length === 0) {
      setDragFeet(null);
      return;
    }
    const lastPt = last[last.length - 1];
    const m = distanceMeters(lastPt.lat, lastPt.lng, mousePos.lat, mousePos.lng);
    setDragFeet(roundUpFeet(m * METERS_TO_FEET));
  }, [mousePos, segments]);

  // Pan to center when it changes
  useEffect(() => {
    if (!ready || !mapRef.current || !center) return;
    mapRef.current.setView(center as [number, number], 20);
  }, [ready, center?.[0], center?.[1]]);

  // Expose panTo for map search
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    (window as unknown as { __drawMapPanTo?: (lat: number, lng: number) => void }).__drawMapPanTo = (lat, lng) => {
      mapRef.current?.setView([lat, lng], 20);
    };
    return () => {
      delete (window as unknown as { __drawMapPanTo?: (lat: number, lng: number) => void }).__drawMapPanTo;
    };
  }, [ready]);

  // Redraw permanent layers only when segments or gates change (not on mouse move)
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const segs = segments;
    const gates = placedGates;
    let cancelled = false;

    const runRedraw = (L: typeof import('leaflet')) => {
      const map = mapRef.current;
      if (!map || cancelled) return;
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];

      for (const seg of segs) {
        if (seg.length >= 2) {
          const line = L.polyline(
            seg.map((p) => [p.lat, p.lng] as L.LatLngExpression),
            { color: LINE_COLOR, weight: 5 }
          ).addTo(map);
          layersRef.current.push(line);
          for (let i = 0; i < seg.length - 1; i++) {
            const a = seg[i];
            const b = seg[i + 1];
            const m = distanceMeters(a.lat, a.lng, b.lat, b.lng);
            const ft = roundUpFeet(m * METERS_TO_FEET);
            const midLat = (a.lat + b.lat) / 2;
            const midLng = (a.lng + b.lng) / 2;
            const label = L.marker([midLat, midLng], {
              icon: L.divIcon({
                className: 'segment-length-label',
                html: `<div style="background:rgba(0,0,0,0.85);color:#FFD700;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:800;white-space:nowrap;pointer-events:none;">${ft} ft</div>`,
                iconSize: [60, 24],
                iconAnchor: [30, 12],
              }),
            }).addTo(map);
            layersRef.current.push(label);
          }
        }
      }

      for (const seg of segs) {
        for (const p of seg) {
          const m = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: 'fence-point-marker',
              html: '<div style="width:12px;height:12px;border-radius:50%;background:#FFD700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            }),
          }).addTo(map);
          layersRef.current.push(m);
        }
      }

      for (const g of gates) {
        const m = L.marker([g.lat, g.lng], {
          icon: L.divIcon({
            className: 'gate-marker',
            html: `<div style="width:20px;height:20px;border-radius:50%;background:${g.type === 'single' ? '#22c55e' : '#3b82f6'};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${g.type === 'single' ? 'S' : 'D'}</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(map);
        layersRef.current.push(m);
      }

      queueMicrotask(() => {
        if (cancelled) return;
        buildAndNotify(segs, gates);
      });
    };

    const L0 = leafletLibRef.current;
    if (L0) {
      runRedraw(L0);
    } else {
      import('leaflet').then((L) => {
        if (cancelled || !mapRef.current) return;
        leafletLibRef.current = L;
        runRedraw(L);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [segments, placedGates, ready]);

  // Preview line + distance: separate effect, only updates transient layers (no notify)
  useEffect(() => {
    if (!ready || !mapRef.current || mode !== 'draw' || !mousePos || segments.length === 0) {
      previewLayersRef.current.forEach((l) => l.remove());
      previewLayersRef.current = [];
      return;
    }

    const last = segments[segments.length - 1];
    if (!last || last.length === 0) return;

    let cancelled = false;
    const runPreview = (L: typeof import('leaflet')) => {
      const map = mapRef.current;
      if (!map || cancelled) return;
      previewLayersRef.current.forEach((l) => l.remove());
      previewLayersRef.current = [];

      const lastPt = last[last.length - 1];
      const previewLine = L.polyline(
        [[lastPt.lat, lastPt.lng], [mousePos.lat, mousePos.lng]] as L.LatLngExpression[],
        { color: LINE_COLOR, weight: 4, dashArray: '8, 8', opacity: 0.9 }
      ).addTo(map);
      previewLayersRef.current.push(previewLine);

      if (dragFeet != null) {
        const midLat = (lastPt.lat + mousePos.lat) / 2;
        const midLng = (lastPt.lng + mousePos.lng) / 2;
        const label = L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: 'distance-label',
            html: `<div style="background:rgba(0,0,0,0.85);color:#FFD700;padding:4px 8px;border-radius:6px;font-size:13px;font-weight:800;white-space:nowrap;">${dragFeet} ft</div>`,
            iconSize: [80, 30],
            iconAnchor: [40, 15],
          }),
        }).addTo(map);
        previewLayersRef.current.push(label);
      }
    };

    const L0 = leafletLibRef.current;
    if (L0) {
      runPreview(L0);
    } else {
      import('leaflet').then((L) => {
        if (cancelled || !mapRef.current) return;
        leafletLibRef.current = L;
        runPreview(L);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [ready, mode, mousePos, dragFeet, segments]);

  // Expose appendSegmentByLength for layout tool
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  useImperativeHandle(ref, () => ({
    appendSegmentByLength(lengthFt: number) {
      const segs = segmentsRef.current;
      const [cLat] = center;
      const feetToMeters = lengthFt / METERS_TO_FEET;
      const latRad = (cLat * Math.PI) / 180;
      const metersPerDegLng = 111320 * Math.cos(latRad);
      const deltaLng = feetToMeters / metersPerDegLng;
      let start: { lat: number; lng: number };
      const flat = segs.flat();
      if (flat.length >= 1) {
        start = flat[flat.length - 1];
      } else {
        start = { lat: cLat, lng: center[1] };
      }
      const end = { lat: start.lat, lng: start.lng + deltaLng };
      setSegments((prev) => [...prev, [start, end]]);
    },
  }), [center]);

  function undo() {
    setSegments((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.length > 0) {
        const newLast = last.slice(0, -1);
        if (newLast.length === 0 && prev.length > 1) return prev.slice(0, -1);
        return [...prev.slice(0, -1), newLast];
      }
      return prev.slice(0, -1);
    });
  }

  function startPlaceGate(type: 'single' | 'double') {
    setMode(type === 'single' ? 'place_single_gate' : 'place_double_gate');
  }

  const lastSeg = segments.length > 0 ? segments[segments.length - 1] : null;
  const canFinishLine = mode === 'draw' && (lastSeg?.length ?? 0) >= 2;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = e.target as HTMLElement;
      if (el.closest('input') || el.closest('textarea') || el.closest('select')) return;
      e.preventDefault();
      endLineRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapSearchOverlay />
      {mode === 'place_single_gate' && (
        <div className="absolute left-3 top-16 z-[1000] rounded-lg bg-black/80 px-3 py-2 text-sm font-bold text-yellow-300">
          Click on the fence line to place single gate
        </div>
      )}
      {mode === 'place_double_gate' && (
        <div className="absolute left-3 top-16 z-[1000] rounded-lg bg-black/80 px-3 py-2 text-sm font-bold text-yellow-300">
          Click on the fence line to place double gate
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow hover:bg-red-50"
          >
            Reset all
          </button>
        )}
        <button
          type="button"
          onClick={() => endLineRef.current()}
          disabled={!canFinishLine}
          title="Use when you’re done with this fence run (same as double-click or Esc)"
          className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950 shadow hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Finish line
        </button>
        <button
          type="button"
          onClick={undo}
          className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold shadow hover:bg-slate-50"
        >
          Undo point
        </button>
        <button
          type="button"
          onClick={() => startPlaceGate('single')}
          className={`rounded-xl border px-4 py-2 text-sm font-bold shadow ${mode === 'place_single_gate' ? 'border-green-500 bg-green-100' : 'border-[var(--line)] bg-white hover:bg-slate-50'}`}
        >
          + Single gate
        </button>
        <button
          type="button"
          onClick={() => startPlaceGate('double')}
          className={`rounded-xl border px-4 py-2 text-sm font-bold shadow ${mode === 'place_double_gate' ? 'border-blue-500 bg-blue-100' : 'border-[var(--line)] bg-white hover:bg-slate-50'}`}
        >
          + Double gate
        </button>
        <span className="flex items-center rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold shadow">
          Total: {totalFeet.toFixed(0)} ft
        </span>
      </div>
    </div>
  );
});

/** Search box overlay */
function MapSearchOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) return;

    const init = () => {
      const input = inputRef.current;
      if (!input || !window.google?.maps?.places) return;

      const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ['geometry'],
        types: ['address'],
        componentRestrictions: { country: ['ca', 'us'] },
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const loc = place?.geometry?.location;
        const panTo = (window as unknown as { __drawMapPanTo?: (a: number, b: number) => void }).__drawMapPanTo;
        if (loc && typeof panTo === 'function') {
          panTo(loc.lat(), loc.lng());
        }
      });
    };

    if (window.google?.maps?.places) {
      init();
      return;
    }

    const existing = document.getElementById('google-maps-script');
    if (existing) {
      const handler = () => setTimeout(init, 50);
      existing.addEventListener('load', handler);
      return () => existing.removeEventListener('load', handler);
    }

    window.initPlacesAutocomplete = () => setTimeout(init, 50);
    const s = document.createElement('script');
    s.id = 'google-maps-script';
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=initPlacesAutocomplete`;
    document.head.appendChild(s);
  }, [mounted]);

  return (
    <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-2 shadow-lg">
        <span className="text-sm opacity-75">🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search address to zoom to..."
          className="min-w-[200px] border-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          autoComplete="off"
        />
      </div>
      <span className="max-w-[min(100vw-2rem,22rem)] text-xs leading-snug text-white drop-shadow-md">
        <strong className="text-red-200">Red pin</strong> = your address • <strong>Finish a section:</strong> <strong>Finish line</strong>, double‑click, or{' '}
        <kbd className="rounded bg-black/30 px-1">Esc</kbd> • Yellow = fence
      </span>
    </div>
  );
}

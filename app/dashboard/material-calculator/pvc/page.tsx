'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  DEFAULT_PVC_PROFILE,
  estimatePvcMaterial,
  normalizePvcFenceMaterialProfile,
  type PvcFenceMaterialProfileV1,
  type PvcPanelLineItem,
} from '@/lib/pvc-fence-material';
import type { PlanarDrawingInput } from '@/lib/layout-drawing-planar';

const card =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const h2 = 'text-base font-semibold text-slate-900';
const field =
  'rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';
const btn =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50';
const btnAlt = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50';

type LayoutRow = { id: string; title: string };

function newItemId(i: number) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `pi_${Date.now()}_${i}`;
}

export default function PvcMaterialCalculatorPage() {
  const searchParams = useSearchParams();
  const fromLayout = searchParams.get('from_layout');

  const [profile, setProfile] = useState<PvcFenceMaterialProfileV1>(
    normalizePvcFenceMaterialProfile(null)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState('');

  const [lineFeet, setLineFeet] = useState<string[]>(['']);
  const [layoutPlanar, setLayoutPlanar] = useState<PlanarDrawingInput | null>(null);
  const [cornersManual, setCornersManual] = useState('');

  const canEditProfile = userRole && ['owner', 'admin'].includes(userRole);

  useEffect(() => {
    fetch('/api/contractor/pvc-material-profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profile) setProfile(normalizePvcFenceMaterialProfile(d.profile));
        else setProfile(normalizePvcFenceMaterialProfile(null));
      })
      .catch(() => setProfile(normalizePvcFenceMaterialProfile(null)))
      .finally(() => setLoading(false));

    fetch('/api/contractor/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user_role) setUserRole(d.user_role);
      })
      .catch(() => {});

    fetch('/api/contractor/layouts', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = (d?.layouts || []) as LayoutRow[];
        setLayouts(list);
      })
      .catch(() => {});
  }, []);

  const loadLayoutById = useCallback((id: string) => {
    if (!id) {
      setLayoutPlanar(null);
      return;
    }
    fetch(`/api/contractor/layouts/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.drawing_data) return;
        const dd = data.drawing_data as {
          points?: { x: number; y: number }[];
          segments?: { length_ft: number }[];
        };
        const pts = dd.points;
        const segs = dd.segments;
        if (pts && pts.length >= 2 && Array.isArray(segs)) {
          setLayoutPlanar({ points: pts, segments: segs });
          const lens = segs.map((s) => String(Number(s.length_ft) || ''));
          setLineFeet(lens.length ? lens : ['']);
        } else if (Array.isArray(segs) && segs.length) {
          setLayoutPlanar(null);
          setLineFeet(segs.map((s) => String(Number(s.length_ft) || '')));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (fromLayout) {
      setSelectedLayoutId(fromLayout);
      loadLayoutById(fromLayout);
    }
  }, [fromLayout, loadLayoutById]);

  const lengthsNum = useMemo(
    () => lineFeet.map((s) => Math.max(0, Number(String(s).replace(/,/g, '')) || 0)),
    [lineFeet]
  );

  const manualCornersNum = useMemo(() => {
    const t = cornersManual.trim();
    if (t === '') return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [cornersManual]);

  const estimate = useMemo(
    () =>
      estimatePvcMaterial({
        profile,
        line_lengths_ft: lengthsNum,
        layout_planar: layoutPlanar,
        manual_structural_corners: manualCornersNum,
      }),
    [profile, lengthsNum, layoutPlanar, manualCornersNum]
  );

  const bomTsv = useMemo(() => {
    const rows = estimate.bom_rows.map((r) => `${r.name}\t${r.quantity}`);
    return ['Item\tQty', ...rows].join('\n');
  }, [estimate.bom_rows]);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/contractor/pvc-material-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      if (d.profile) setProfile(normalizePvcFenceMaterialProfile(d.profile));
      alert('Saved panel template.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function addLineInput() {
    setLineFeet((p) => [...p, '']);
  }

  function updatePanelItem(index: number, updates: Partial<PvcPanelLineItem>) {
    setProfile((prev) => {
      const next = normalizePvcFenceMaterialProfile(prev);
      const pi = [...next.panel_items];
      pi[index] = { ...pi[index], ...updates };
      return { ...next, panel_items: pi };
    });
  }

  function addPanelItem() {
    setProfile((prev) => {
      const next = normalizePvcFenceMaterialProfile(prev);
      return {
        ...next,
        panel_items: [
          ...next.panel_items,
          { id: newItemId(next.panel_items.length), name: 'New item', quantity_per_panel: 1 },
        ],
      };
    });
  }

  function removePanelItem(index: number) {
    setProfile((prev) => {
      const next = normalizePvcFenceMaterialProfile(prev);
      const pi = next.panel_items.filter((_, i) => i !== index);
      return { ...next, panel_items: pi.length ? pi : DEFAULT_PVC_PROFILE.panel_items };
    });
  }

  async function copyBom() {
    try {
      await navigator.clipboard.writeText(bomTsv);
      alert('BOM copied as TSV.');
    } catch {
      prompt('Copy this BOM:', bomTsv);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        Loading…
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-4xl space-y-6 pb-24">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">PVC material takeoff</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Build your panel BOM once (pieces per bay), set nominal panel width, then enter each run length. Bends are
          estimated from a saved <strong className="font-semibold text-slate-800">Draw</strong> layout when you load
          it, or you can override structural corners manually. H-post and U-channel counts are directional‑change
          heuristics for PVC—tune with your field rules.
        </p>
      </div>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-emerald-50/30 px-5 py-4">
          <h2 className={h2}>Panel template</h2>
          <p className="mt-1 text-xs text-slate-500">Saved to your company. Only admins can edit.</p>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Panel width (ft)</label>
              <input
                type="number"
                step={0.1}
                min={0.5}
                disabled={!canEditProfile}
                value={profile.panel_width_ft}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setProfile((p) => ({ ...normalizePvcFenceMaterialProfile(p), panel_width_ft: v }));
                }}
                className={`${field} w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Corner angle threshold (°)
              </label>
              <input
                type="number"
                step={1}
                min={0}
                max={90}
                disabled={!canEditProfile}
                value={profile.corner_angle_threshold_deg}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setProfile((p) => ({ ...normalizePvcFenceMaterialProfile(p), corner_angle_threshold_deg: v }));
                }}
                className={`${field} w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">H-post label</label>
              <input
                type="text"
                disabled={!canEditProfile}
                value={profile.h_post_display_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...normalizePvcFenceMaterialProfile(p), h_post_display_name: e.target.value }))
                }
                className={`${field} w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">U-channel label</label>
              <input
                type="text"
                disabled={!canEditProfile}
                value={profile.u_channel_display_name}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...normalizePvcFenceMaterialProfile(p),
                    u_channel_display_name: e.target.value,
                  }))
                }
                className={`${field} w-full`}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">Items per panel bay</p>
            <div className="space-y-2">
              {profile.panel_items.map((row, i) => (
                <div key={row.id} className="flex flex-wrap items-end gap-2">
                  <input
                    type="text"
                    disabled={!canEditProfile}
                    value={row.name}
                    onChange={(e) => updatePanelItem(i, { name: e.target.value })}
                    placeholder="Item name"
                    className={`${field} min-w-[12rem] flex-1`}
                  />
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    disabled={!canEditProfile}
                    value={row.quantity_per_panel}
                    onChange={(e) => updatePanelItem(i, { quantity_per_panel: Number(e.target.value) || 0 })}
                    className={`${field} w-28`}
                    aria-label="Qty per panel"
                  />
                  {canEditProfile && (
                    <button type="button" onClick={() => removePanelItem(i)} className={btnAlt}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {canEditProfile && (
                <button type="button" onClick={addPanelItem} className={btnAlt}>
                  + Add item
                </button>
              )}
            </div>
          </div>

          {canEditProfile && (
            <button type="button" onClick={saveProfile} disabled={saving} className={btn}>
              {saving ? 'Saving…' : 'Save panel template'}
            </button>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-5 py-4">
          <h2 className={h2}>Run lengths and corners</h2>
          <p className="mt-1 text-xs text-slate-500">
            One row per continuous straight run. Loading a Draw layout with vertex coordinates enables bend detection.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Load Draw layout
              </label>
              <select
                value={selectedLayoutId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedLayoutId(id);
                  loadLayoutById(id);
                }}
                className={`${field} w-full`}
              >
                <option value="">—</option>
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
            <p className="pb-2 text-xs text-slate-500">
              Manage drawings on{' '}
              <Link href="/dashboard/layout" className="font-medium text-blue-600 hover:underline">
                Draw
              </Link>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Length each line (ft)</p>
            {lineFeet.map((v, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-8 text-sm text-slate-500">{i + 1}</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={v}
                  onChange={(e) =>
                    setLineFeet((rows) => {
                      const next = [...rows];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  className={`${field} w-36`}
                />
                <button
                  type="button"
                  className={btnAlt}
                  onClick={() =>
                    setLineFeet((rows) => (rows.length <= 1 ? rows : rows.filter((_, j) => j !== i)))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addLineInput} className={btnAlt}>
              + Add line
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Manual structural corners (optional override)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Auto from layout geometry if empty"
              value={cornersManual}
              onChange={(e) => setCornersManual(e.target.value)}
              className={`${field} max-w-xs`}
            />
            <p className="mt-1 text-xs text-slate-500">
              U-channels track structural direction changes. Leave blank to use layout bends (threshold{' '}
              {profile.corner_angle_threshold_deg}°).
            </p>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className={h2}>Bill of materials (estimate)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Source: <span className="font-medium text-slate-700">{estimate.corner_detection}</span>
            {layoutPlanar ? (
              <span className="ml-2 text-emerald-700">• Layout geometry loaded</span>
            ) : (
              <span className="ml-2 text-amber-700">• No linked layout (lengths only)</span>
            )}
          </p>
        </div>
        <div className="overflow-x-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {estimate.bom_rows.map((r, i) => (
                <tr key={`${r.name}-${i}`} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-900">{r.name}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-800">{r.quantity}</td>
                  <td className="px-2 py-2 text-xs text-slate-500">{r.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copyBom} className={btn}>
              Copy BOM (TSV)
            </button>
          </div>
          {estimate.turn_angles_deg.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Junction angles (°): {estimate.turn_angles_deg.map((d) => d.toFixed(1)).join(', ')}
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Panel-line math uses <code className="rounded bg-slate-100 px-1">line ft ÷ {profile.panel_width_ft} ft</code>{' '}
            for pickets and other per-panel items (proportional when the last bay is partial). Rails use the same bay
            split: full bays get your rails-per-panel count; the last partial bay uses{' '}
            <strong className="font-medium text-slate-700">1</strong> rail if the remainder is under half a panel
            (one cut does top and bottom), otherwise a full pair. Each counted corner adds{' '}
            <strong className="font-medium text-slate-700">one</strong> U-channel; H-posts follow spacing along each
            run with shared posts where runs meet.
          </p>
        </div>
      </section>
    </div>
  );
}

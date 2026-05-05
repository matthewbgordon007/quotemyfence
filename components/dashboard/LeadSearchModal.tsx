'use client';

import { useEffect, useRef, useState } from 'react';

export type LeadSearchRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  address: string | null;
};

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  excludeSessionIds?: string[];
  onPick: (quoteSessionId: string) => Promise<void>;
  showUnlink?: boolean;
  onUnlink?: () => Promise<void>;
};

export function LeadSearchModal({
  open,
  title,
  onClose,
  excludeSessionIds = [],
  onPick,
  showUnlink,
  onUnlink,
}: Props) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LeadSearchRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) {
      setQ('');
      setRows([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = q.trim();
    if (t.length < 2) {
      setRows([]);
      return;
    }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/contractor/customers?q=${encodeURIComponent(t)}&limit=24`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((d: { customers?: LeadSearchRow[] }) => {
          setRows(Array.isArray(d.customers) ? d.customers : []);
        })
        .catch(() => setRows([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [open, q]);

  const exclude = new Set(excludeSessionIds);
  const visible = rows.filter((r) => !exclude.has(r.id));

  const handlePick = async (id: string) => {
    setBusyId(id);
    try {
      await onPick(id);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-search-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 id="lead-search-modal-title" className="text-lg font-semibold leading-snug text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-5">
          <label className="block text-xs font-medium text-slate-600">Search leads</label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, phone, or address…"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500/30 focus:ring-2"
            autoFocus
          />
          <p className="mt-1.5 text-xs text-slate-500">Type at least 2 characters.</p>
          {loading && <p className="mt-2 text-xs text-slate-500">Searching…</p>}
          <ul className="mt-3 max-h-[min(50vh,22rem)] overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
            {visible.length === 0 && q.trim().length >= 2 && !loading && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">No matches.</li>
            )}
            {visible.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handlePick(r.id)}
                  className="flex w-full flex-col gap-0.5 px-3 py-3 text-left text-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="font-medium text-slate-900">
                    {r.first_name} {r.last_name}
                    {busyId === r.id && <span className="ml-2 text-xs font-normal text-slate-500">Linking…</span>}
                  </span>
                  <span className="text-xs text-slate-500">{r.email}</span>
                  {r.address && <span className="text-xs text-slate-400">{r.address}</span>}
                </button>
              </li>
            ))}
          </ul>
          {showUnlink && onUnlink && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={unlinkBusy}
                className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                onClick={async () => {
                  if (!confirm('Remove this layout from the lead? The drawing stays saved.')) return;
                  setUnlinkBusy(true);
                  try {
                    await onUnlink();
                    onClose();
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Unlink failed');
                  } finally {
                    setUnlinkBusy(false);
                  }
                }}
              >
                {unlinkBusy ? 'Removing…' : 'Unlink from lead'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

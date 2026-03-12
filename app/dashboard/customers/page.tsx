'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CustomerRow {
  id: string;
  status: string;
  current_step: string;
  lead_status: string;
  started_at: string;
  last_active_at: string;
  contractor_viewed_at: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  total_length_ft: number | null;
  has_removal: boolean | null;
  subtotal_low: number | null;
  subtotal_high: number | null;
}

function stepLabel(step: string, status: string): string {
  if (status === 'submitted') return 'Submitted';
  if (status === 'abandoned') return 'Abandoned';
  const labels: Record<string, string> = {
    contact: 'Contact only',
    location: 'Address',
    draw: 'Drawing',
    design: 'Design',
    review: 'Review',
  };
  return labels[step] ?? step;
}

function formatDate(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_TABS = [
  { value: 'new' as const, label: 'Needs follow-up' },
  { value: 'contacted' as const, label: 'Contacted' },
  { value: 'quoted' as const, label: 'Quoted' },
  { value: 'won' as const, label: 'Won' },
  { value: 'lost' as const, label: 'Lost' },
  { value: 'all' as const, label: 'All' },
];

type LeadFilter = 'all' | 'new' | 'contacted' | 'quoted' | 'won' | 'lost';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_source: '',
    formatted_address: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const params = leadFilter === 'all' ? '' : `?lead_filter=${leadFilter}`;
    fetch(`/api/contractor/customers${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers || []);
        if (data.counts) setCounts(data.counts);
      })
      .finally(() => setLoading(false));
  }, [leadFilter]);

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    const address = (c.address || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const phone = (c.phone || '').toLowerCase();

    return fullName.includes(query) || address.includes(query) || email.includes(query) || phone.includes(query);
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val && leadFilter !== 'all') {
      setLeadFilter('all');
    }
  };

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLead.first_name.trim() || !newLead.last_name.trim() || !newLead.email.trim()) {
      alert('First name, last name, and email are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/contractor/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: newLead.first_name.trim(),
          last_name: newLead.last_name.trim(),
          email: newLead.email.trim(),
          phone: newLead.phone.trim() || undefined,
          lead_source: newLead.lead_source.trim() || undefined,
          formatted_address: newLead.formatted_address.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create lead');
      }
      const { id } = await res.json();
      setShowNewLead(false);
      setNewLead({ first_name: '', last_name: '', email: '', phone: '', lead_source: '', formatted_address: '' });
      router.push(`/dashboard/customers/${id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Everyone who started or completed a quote. Create new leads manually or track submissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewLead(true)}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + New lead
        </button>
      </div>

      {showNewLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !creating && setShowNewLead(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Create new lead</h2>
            <form onSubmit={handleCreateLead} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">First name *</label>
                <input
                  type="text"
                  value={newLead.first_name}
                  onChange={(e) => setNewLead((p) => ({ ...p, first_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Last name *</label>
                <input
                  type="text"
                  value={newLead.last_name}
                  onChange={(e) => setNewLead((p) => ({ ...p, last_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Email *</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Phone</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Address</label>
                <input
                  type="text"
                  value={newLead.formatted_address}
                  onChange={(e) => setNewLead((p) => ({ ...p, formatted_address: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="123 Main St, City, Province"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Lead source</label>
                <input
                  type="text"
                  value={newLead.lead_source}
                  onChange={(e) => setNewLead((p) => ({ ...p, lead_source: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="e.g. Referral, Website"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                >
                  {creating ? 'Creating…' : 'Create lead'}
                </button>
                <button
                  type="button"
                  onClick={() => !creating && setShowNewLead(false)}
                  disabled={creating}
                  className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)] disabled:opacity-50 hover:bg-[var(--bg2)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setLeadFilter(tab.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
                leadFilter === tab.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg2)] text-[var(--muted)] hover:bg-[var(--line)]'
              }`}
            >
              {tab.label}
              {counts[tab.value] !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  leadFilter === tab.value
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--line)] text-[var(--text)]'
                }`}>
                  {counts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name or address..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            {searchQuery ? 'No customers found matching your search.' : 'No quote submissions yet. They will appear here when customers use your quote page.'}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {filteredCustomers.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/customers/${c.id}`}
                  className="block px-6 py-4 transition hover:bg-[var(--bg2)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        {c.first_name} {c.last_name}
                        {!c.contractor_viewed_at && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
                            New
                          </span>
                        )}
                        {c.lead_status !== 'new' && (
                          <span className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                            {STATUS_TABS.find((t) => t.value === c.lead_status)?.label ?? c.lead_status}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        {c.email}
                        {c.phone && ` • ${c.phone}`}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-[var(--text)]">
                        {stepLabel(c.current_step ?? '', c.status)}
                      </div>
                      <div className="text-[var(--muted)]">
                        {c.total_length_ft != null
                          ? `${c.total_length_ft.toFixed(0)} ft`
                          : '—'}
                        {c.has_removal && ' • Removal'}
                        {c.subtotal_low != null && c.subtotal_high != null && (
                          <> • ${c.subtotal_low.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}–${c.subtotal_high.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {formatDate(c.last_active_at)}
                      </div>
                    </div>
                  </div>
                  {c.address && (
                    <div className="mt-1 truncate text-sm text-[var(--muted)]">
                      {c.address}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

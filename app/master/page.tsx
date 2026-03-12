'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MaterialRequest {
  id: string;
  layout_drawing_id: string;
  quote_session_id: string | null;
  contractor_name: string;
  layout_title: string;
  customer_name: string;
  address: string;
  description: string;
  status: string;
  created_at: string;
}

export default function MasterPage() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/master/requests', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Material quote requests</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Incoming layouts from contractors. Click to view full customer details and prepare their material quote.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            No material quote requests yet. Contractors will appear here when they submit layouts.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/master/requests/${r.id}`}
                  className="block px-6 py-4 transition hover:bg-[var(--bg2)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{r.layout_title}</div>
                      <div className="text-sm text-[var(--muted)]">
                        {r.customer_name} • {r.contractor_name}
                      </div>
                      {r.address && r.address !== '—' && (
                        <div className="mt-1 text-sm text-[var(--muted)] truncate">{r.address}</div>
                      )}
                      {r.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--text)]">{r.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'quoted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

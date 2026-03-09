'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Contractor {
  id: string;
  company_name: string;
  slug: string;
}

export function HomeownerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/public/contractors/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.contractors || []))
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const showResults = focused && query.length >= 2;

  return (
    <div className="relative">
      <label htmlFor="contractor-search" className="sr-only">
        Search for your contractor
      </label>
      <input
        id="contractor-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search by contractor name..."
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg2)] px-4 py-3.5 text-[15px] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
      />
      {showResults && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1.5 max-h-60 overflow-auto rounded-xl border border-[var(--line)] bg-white shadow-lg ring-1 ring-black/5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-[var(--muted)]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">No contractors found. Try a different search.</p>
          ) : (
            <ul>
              {results.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/estimate/${c.slug}/contact`}
                    className="block border-b border-[var(--line)] px-4 py-3 text-sm font-medium transition hover:bg-[var(--bg2)] last:border-b-0"
                  >
                    <span className="font-bold">{c.company_name}</span>
                    <span className="ml-2 text-[var(--muted)]">— Get quote</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

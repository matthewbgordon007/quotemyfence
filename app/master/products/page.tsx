'use client';

import { useState, useEffect } from 'react';

interface CatalogType { name: string; standard_height_ft?: number }
interface CatalogStyle { type_index: number; style_name: string; photo_url?: string }
interface CatalogColour { style_index: number; color_name: string }

export default function MasterProductsPage() {
  const [types, setTypes] = useState<CatalogType[]>([]);
  const [styles, setStyles] = useState<CatalogStyle[]>([]);
  const [colours, setColours] = useState<CatalogColour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/master/products', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setTypes(d.types ?? []);
        setStyles(d.styles ?? []);
        setColours(d.colours ?? []);
      })
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
      <h1 className="text-2xl font-bold">Product catalog</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Standard fence types, styles, and colours for reference when preparing material quotes.
      </p>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Fence types</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {types.map((t, i) => (
              <span key={i} className="rounded-full bg-[var(--bg2)] px-3 py-1 text-sm">
                {t.name} {t.standard_height_ft ? `(${t.standard_height_ft} ft)` : ''}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Styles</h2>
          <ul className="mt-3 space-y-2">
            {styles.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {s.photo_url && (
                  <img src={s.photo_url} alt="" className="h-12 w-12 rounded object-cover" />
                )}
                <span>{s.style_name} (Type {s.type_index + 1})</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Colours</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {colours.map((c, i) => (
              <span key={i} className="rounded-full bg-[var(--bg2)] px-3 py-1 text-sm">
                {c.color_name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

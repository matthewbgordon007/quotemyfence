#!/usr/bin/env node
/**
 * Bulk-insert install-length pricing tiers for "Cedar GoodNeighbor style 6'" (or closest name match).
 *
 * Bands (from your table):
 *   8–24'  $144.99/ft  single gate $549.99
 *   25–47' $114.99/ft
 *   48–64' $94.99/ft
 *   65–800' $84.99/ft
 *   801'+  $79.99/ft
 *
 * Double gate = single_gate * 2 - 100 (same for all bands here).
 *
 * Usage (from project root, with .env.local containing SUPABASE_SERVICE_ROLE_KEY):
 *   node scripts/bulk-cedar-goodneighbor-6-tiers.mjs
 *   node scripts/bulk-cedar-goodneighbor-6-tiers.mjs --contractor-slug=gordon-landscaping
 *   node scripts/bulk-cedar-goodneighbor-6-tiers.mjs --dry-run
 *
 * Optional:
 *   --style-name="Exact style name in dashboard"  (required if auto-match fails)
 *
 * Auto-match looks for style names containing: cedar + goodneighbor/good neighbour + 6
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
  try {
    const content = readFileSync('.env.local', 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

const SINGLE_GATE = 549.99;
const DOUBLE_GATE = SINGLE_GATE * 2 - 100;

/** @type {Array<{ min: number; max: number | null; pricePerFt: number }>} */
const BANDS = [
  { min: 8, max: 24, pricePerFt: 144.99 },
  { min: 25, max: 47, pricePerFt: 114.99 },
  { min: 48, max: 64, pricePerFt: 94.99 },
  { min: 65, max: 800, pricePerFt: 84.99 },
  { min: 801, max: null, pricePerFt: 79.99 },
];

function parseArgs(argv) {
  const out = { dryRun: false, contractorSlug: null, styleName: null };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    const cs = a.match(/^--contractor-slug=(.+)$/);
    if (cs) out.contractorSlug = cs[1].trim();
    const sn = a.match(/^--style-name=(.+)$/);
    if (sn) out.styleName = sn[1].trim();
  }
  return out;
}

function matchesCedarGoodNeighbor6(name) {
  const n = (name || '').toLowerCase().replace(/\s+/g, ' ');
  const hasNeighbour = /good\s*neighbou?r/.test(n);
  const hasCedar = n.includes('cedar');
  const has6 = n.includes("6'") || n.includes('6 ft') || n.includes('6ft') || /\b6\s*'/.test(n) || /\b6\b/.test(n);
  return hasNeighbour && hasCedar && has6;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { dryRun, contractorSlug: slugArg, styleName: exactName } = parseArgs(process.argv.slice(2));
  const contractorSlug =
    slugArg ||
    process.env.TEMPLATE_CONTRACTOR_SLUG ||
    process.env.BULK_TIERS_CONTRACTOR_SLUG ||
    'gordon-landscaping';

  const supabase = createClient(url, key);

  const { data: contractor, error: cErr } = await supabase
    .from('contractors')
    .select('id, company_name, slug')
    .eq('slug', contractorSlug)
    .maybeSingle();

  if (cErr || !contractor) {
    console.error('Contractor not found for slug:', contractorSlug, cErr?.message || '');
    process.exit(1);
  }

  const { data: types } = await supabase.from('fence_types').select('id').eq('contractor_id', contractor.id);
  const typeIds = (types || []).map((t) => t.id);
  if (!typeIds.length) {
    console.error('No fence_types for this contractor.');
    process.exit(1);
  }

  const { data: styles, error: sErr } = await supabase
    .from('fence_styles')
    .select('id, style_name')
    .in('fence_type_id', typeIds)
    .eq('is_active', true);

  if (sErr) {
    console.error(sErr.message);
    process.exit(1);
  }

  let style = null;
  if (exactName) {
    style = (styles || []).find((s) => s.style_name.trim() === exactName);
    if (!style) {
      console.error('No style with exact name:', exactName);
      console.error('Available styles:', (styles || []).map((s) => s.style_name).join(' | '));
      process.exit(1);
    }
  } else {
    const candidates = (styles || []).filter((s) => matchesCedarGoodNeighbor6(s.style_name));
    if (candidates.length === 1) {
      style = candidates[0];
    } else if (candidates.length > 1) {
      console.error('Multiple Cedar GoodNeighbor 6\' styles — pass --style-name="..."');
      candidates.forEach((s) => console.error(' -', s.id, s.style_name));
      process.exit(1);
    } else {
      console.error('No style matched (cedar + good neighbour + 6). Available:');
      (styles || []).forEach((s) => console.error(' -', s.style_name));
      console.error('\nRename the style in Products to include "Cedar", "Good Neighbour", and 6\' — or run:');
      console.error(
        `  node scripts/bulk-cedar-goodneighbor-6-tiers.mjs --style-name="Your exact style name"`
      );
      process.exit(1);
    }
  }

  const rows = BANDS.map((b, i) => ({
    contractor_id: contractor.id,
    fence_style_id: style.id,
    min_ft: b.min,
    max_ft: b.max,
    display_order: i,
    base_price_per_ft_low: b.pricePerFt,
    base_price_per_ft_high: b.pricePerFt,
    single_gate_low: SINGLE_GATE,
    single_gate_high: SINGLE_GATE,
    double_gate_low: DOUBLE_GATE,
    double_gate_high: DOUBLE_GATE,
    removal_price_per_ft_low: 0,
    removal_price_per_ft_high: 0,
    minimum_job_low: 0,
    minimum_job_high: 0,
    tax_mode: 'excluded',
    is_active: true,
  }));

  console.log('Contractor:', contractor.company_name, `(${contractor.slug})`);
  console.log('Style:', style.style_name, style.id);
  console.log('Single gate:', SINGLE_GATE, '| Double gate:', DOUBLE_GATE, '(single*2 - 100)');
  console.log('Bands:', BANDS.map((b) => `${b.min}-${b.max ?? '∞'} @ $${b.pricePerFt}/ft`).join(', '));

  if (dryRun) {
    console.log('[dry-run] No database changes.');
    process.exit(0);
  }

  const { error: delErr } = await supabase
    .from('style_install_length_tiers')
    .delete()
    .eq('fence_style_id', style.id)
    .eq('contractor_id', contractor.id);

  if (delErr) {
    console.error('Delete existing tiers failed:', delErr.message);
    process.exit(1);
  }

  const { data: inserted, error: insErr } = await supabase
    .from('style_install_length_tiers')
    .insert(rows)
    .select('id, min_ft, max_ft, base_price_per_ft_low');

  if (insErr) {
    console.error('Insert failed:', insErr.message);
    console.error('Did you run supabase/style-install-length-tiers.sql in Supabase?');
    process.exit(1);
  }

  console.log('Inserted', inserted?.length || 0, 'tiers.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * For the FMS contractor: add five install-length pricing bands (placeholder $0)
 * to every fence style that does not already have pricing configured.
 *
 * Bands (feet):
 *   8–24, 25–47, 48–64, 65–800, 801+ (no max)
 *
 * Placeholder row defaults: removal $5/ft, min job $0, gates $0 (double = single×2−100 once you set single).
 *
 * A style is skipped if EITHER:
 *   - It already has any row in style_install_length_tiers, OR
 *   - It has style_pricing_rules with base_price_per_ft_low or _high > 0
 *     (so we do not override existing single-price rules with zero tiers).
 *
 * Override contractor: --contractor-slug=  or BULK_TIERS_CONTRACTOR_SLUG
 *
 *   --tiers-only     Skip only when tiers exist (ignore style_pricing_rules; risky)
 *   --dry-run        Print plan, no DB writes
 *
 * Usage:
 *   node scripts/seed-fms-length-tier-skeletons.mjs --dry-run
 *   node scripts/seed-fms-length-tier-skeletons.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { getContractorForBulkTiers } from './lib/bulk-tiers-contractor.mjs';

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

const BANDS = [
  { min_ft: 8, max_ft: 24 },
  { min_ft: 25, max_ft: 47 },
  { min_ft: 48, max_ft: 64 },
  { min_ft: 65, max_ft: 800 },
  { min_ft: 801, max_ft: null },
];

function parseArgs(argv) {
  const out = { dryRun: false, slugArg: null, tiersOnly: false };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    if (a === '--tiers-only') out.tiersOnly = true;
    const cs = a.match(/^--contractor-slug=(.+)$/);
    if (cs) out.slugArg = cs[1].trim();
  }
  return out;
}

function hasMeaningfulStyleRule(rule) {
  if (!rule) return false;
  const low = Number(rule.base_price_per_ft_low);
  const high = Number(rule.base_price_per_ft_high);
  return (Number.isFinite(low) && low > 0) || (Number.isFinite(high) && high > 0);
}

function tierRow(contractorId, fenceStyleId, band, order) {
  return {
    contractor_id: contractorId,
    fence_style_id: fenceStyleId,
    min_ft: band.min_ft,
    max_ft: band.max_ft,
    display_order: order,
    base_price_per_ft_low: 0,
    base_price_per_ft_high: 0,
    single_gate_low: 0,
    single_gate_high: 0,
    double_gate_low: 0,
    double_gate_high: 0,
    removal_price_per_ft_low: 5,
    removal_price_per_ft_high: 5,
    minimum_job_low: 0,
    minimum_job_high: 0,
    tax_mode: 'excluded',
    is_active: true,
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { dryRun, slugArg, tiersOnly } = parseArgs(process.argv.slice(2));
  const supabase = createClient(url, key);

  const { contractor, error: cErr } = await getContractorForBulkTiers(supabase, slugArg);
  if (cErr || !contractor) {
    console.error(cErr || 'Contractor not found');
    process.exit(1);
  }

  const { data: types, error: tErr } = await supabase
    .from('fence_types')
    .select('id')
    .eq('contractor_id', contractor.id)
    .eq('is_active', true);

  if (tErr || !types?.length) {
    console.error(tErr?.message || 'No fence_types for contractor');
    process.exit(1);
  }

  const typeIds = types.map((t) => t.id);

  const { data: styles, error: sErr } = await supabase
    .from('fence_styles')
    .select('id, style_name, fence_type_id')
    .in('fence_type_id', typeIds)
    .eq('is_active', true);

  if (sErr) {
    console.error(sErr.message);
    process.exit(1);
  }

  const styleIds = (styles || []).map((s) => s.id);
  if (!styleIds.length) {
    console.log('No styles found.');
    process.exit(0);
  }

  const { data: existingTiers, error: tierErr } = await supabase
    .from('style_install_length_tiers')
    .select('fence_style_id')
    .eq('contractor_id', contractor.id)
    .in('fence_style_id', styleIds);

  if (tierErr) {
    console.error(tierErr.message);
    process.exit(1);
  }

  const stylesWithTiers = new Set((existingTiers || []).map((r) => r.fence_style_id));

  const { data: styleRules, error: rErr } = await supabase
    .from('style_pricing_rules')
    .select('fence_style_id, base_price_per_ft_low, base_price_per_ft_high')
    .eq('contractor_id', contractor.id)
    .in('fence_style_id', styleIds);

  if (rErr) {
    console.error(rErr.message);
    process.exit(1);
  }

  const ruleByStyle = new Map((styleRules || []).map((r) => [r.fence_style_id, r]));

  const toSeed = [];
  const skippedTiers = [];
  const skippedRule = [];

  for (const s of styles || []) {
    if (stylesWithTiers.has(s.id)) {
      skippedTiers.push(s.style_name);
      continue;
    }
    if (!tiersOnly) {
      const rule = ruleByStyle.get(s.id);
      if (hasMeaningfulStyleRule(rule)) {
        skippedRule.push(s.style_name);
        continue;
      }
    }
    toSeed.push(s);
  }

  console.log('Contractor:', contractor.company_name, `(${contractor.slug})`);
  console.log('Mode:', tiersOnly ? '--tiers-only (ignores style_pricing_rules)' : 'skip if tiers OR style rule has $/ft > 0');
  console.log('Styles to seed:', toSeed.length);
  console.log('Skipped (already have length tiers):', skippedTiers.length);
  if (!tiersOnly) console.log('Skipped (style_pricing_rules has price):', skippedRule.length);

  if (toSeed.length && dryRun) {
    console.log('\nWould add 5 bands each to:');
    toSeed.forEach((s) => console.log(' -', s.style_name));
  }

  if (!toSeed.length) {
    console.log(dryRun ? '[dry-run] Nothing to do.' : 'Nothing to insert.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('[dry-run] No database changes.');
    process.exit(0);
  }

  const rows = [];
  for (const s of toSeed) {
    BANDS.forEach((band, i) => {
      rows.push(tierRow(contractor.id, s.id, band, i));
    });
  }

  let inserted = 0;
  for (const batch of chunk(rows, 200)) {
    const { error: insErr } = await supabase.from('style_install_length_tiers').insert(batch);
    if (insErr) {
      console.error('Insert failed:', insErr.message);
      console.error('Did you run supabase/style-install-length-tiers.sql?');
      process.exit(1);
    }
    inserted += batch.length;
  }

  console.log('Inserted', inserted, 'tier rows for', toSeed.length, 'styles.');
  console.log('Edit prices under Dashboard → Products → Pricing → By install length.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

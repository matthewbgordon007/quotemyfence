#!/usr/bin/env node
/**
 * Import FMS HomeOwner Price Guide PDF into the FMS contractor account.
 *
 * Usage:
 * node scripts/import-fms-price-guide.mjs "/absolute/path/to/guide.pdf"
 *
 * Notes:
 * - Replaces existing FMS product hierarchy (fence_types -> styles -> colours/pricing).
 * - Creates one fence type per base product name.
 * - Creates one style per length range row.
 * - Creates colour options from "(Color1, Color2)" when present; otherwise "Default".
 * - Writes both style_pricing_rules and colour_pricing_rules with fixed low/high values.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { PDFParse } from 'pdf-parse';

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
    // ignore
  }
}

function parseHeightFt(name) {
  // Examples: 7', 6'4", 7.5'w 5'H -> pick first feet/inches token.
  const m = name.match(/(\d+(?:\.\d+)?)'\s*(?:(\d{1,2})")?/);
  if (!m) return 6;
  const feet = Number(m[1] || 0);
  const inches = Number(m[2] || 0);
  return Math.max(1, Math.min(20, feet + inches / 12));
}

function normalizeRange(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ')')
    .trim();
}

function parseColoursAndBaseName(rawStyle) {
  const m = rawStyle.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { baseName: rawStyle.trim(), colours: ['Default'] };
  const base = m[1].trim();
  const colours = m[2]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { baseName: base, colours: colours.length ? colours : ['Default'] };
}

function parseRows(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\u00A0/g, ' ').trim())
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    if (line.startsWith('-- ') || /^2026 HomeOwner Price guide/i.test(line) || /^Styles:/i.test(line)) continue;
    // style | range | $linear | $gate
    const m = line.match(/^(.*?)\s{2,}(.+?)\s{2,}\$([0-9]+(?:\.[0-9]{1,2})?)\s{2,}\$([0-9]+(?:\.[0-9]{1,2})?)$/);
    if (!m) continue;
    const rawStyle = m[1].trim();
    const range = normalizeRange(m[2]);
    const linear = Number(m[3]);
    const gate = Number(m[4]);
    if (!rawStyle || !range || !Number.isFinite(linear) || !Number.isFinite(gate)) continue;

    const { baseName, colours } = parseColoursAndBaseName(rawStyle);
    rows.push({ rawStyle, baseName, colours, range, linear, gate });
  }
  return rows;
}

async function main() {
  loadEnv();
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Missing PDF path. Example: node scripts/import-fms-price-guide.mjs "/path/to/file.pdf"');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const buffer = readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  const rows = parseRows(parsed.text || '');
  await parser.destroy();
  if (!rows.length) {
    console.error('No price rows parsed from PDF.');
    process.exit(1);
  }
  console.log(`Parsed ${rows.length} rows from PDF.`);

  const { data: candidates, error: cErr } = await supabase
    .from('contractors')
    .select('id, slug, company_name')
    .eq('is_active', true)
    .or('company_name.ilike.%fence material supply%,slug.ilike.%fms%');
  if (cErr) throw cErr;
  if (!candidates?.length) {
    throw new Error('Could not find FMS contractor (company_name ~ "Fence Material Supply" or slug containing "fms").');
  }
  const contractor =
    candidates.find((c) => (c.company_name || '').toLowerCase().includes('fence material supply')) ?? candidates[0];
  console.log(`Target contractor: ${contractor.company_name} (${contractor.slug})`);

  // Replace existing hierarchy for this contractor.
  const { data: existingTypes } = await supabase
    .from('fence_types')
    .select('id')
    .eq('contractor_id', contractor.id);
  if (existingTypes?.length) {
    const typeIds = existingTypes.map((t) => t.id);
    const { error: delErr } = await supabase.from('fence_types').delete().in('id', typeIds);
    if (delErr) throw delErr;
    console.log(`Removed ${typeIds.length} existing fence types for contractor.`);
  }

  const typeMap = new Map(); // baseName -> { id, nextOrder }
  for (const row of rows) {
    if (!typeMap.has(row.baseName)) {
      const { data: ft, error: ftErr } = await supabase
        .from('fence_types')
        .insert({
          contractor_id: contractor.id,
          name: row.baseName,
          standard_height_ft: parseHeightFt(row.baseName),
          display_order: typeMap.size,
          is_active: true,
        })
        .select('id')
        .single();
      if (ftErr || !ft) throw ftErr || new Error(`Failed creating fence_type: ${row.baseName}`);
      typeMap.set(row.baseName, { id: ft.id, nextOrder: 0 });
    }
  }

  let stylesCount = 0;
  let coloursCount = 0;
  for (const row of rows) {
    const t = typeMap.get(row.baseName);
    const { data: fs, error: fsErr } = await supabase
      .from('fence_styles')
      .insert({
        fence_type_id: t.id,
        style_name: row.range,
        display_order: t.nextOrder++,
        is_active: true,
      })
      .select('id')
      .single();
    if (fsErr || !fs) throw fsErr || new Error(`Failed creating style for ${row.baseName} ${row.range}`);
    stylesCount++;

    const { error: sprErr } = await supabase.from('style_pricing_rules').insert({
      contractor_id: contractor.id,
      fence_style_id: fs.id,
      base_price_per_ft_low: row.linear,
      base_price_per_ft_high: row.linear,
      single_gate_low: row.gate,
      single_gate_high: row.gate,
      double_gate_low: row.gate,
      double_gate_high: row.gate,
      removal_price_per_ft_low: 0,
      removal_price_per_ft_high: 0,
      minimum_job_low: 0,
      minimum_job_high: 0,
      is_active: true,
    });
    if (sprErr) throw sprErr;

    for (const colorName of row.colours) {
      const { data: co, error: coErr } = await supabase
        .from('colour_options')
        .insert({
          fence_style_id: fs.id,
          color_name: colorName,
          display_order: coloursCount,
          is_active: true,
        })
        .select('id')
        .single();
      if (coErr || !co) throw coErr || new Error(`Failed creating colour ${colorName} for ${row.baseName} ${row.range}`);
      coloursCount++;

      const { error: cprErr } = await supabase.from('colour_pricing_rules').insert({
        contractor_id: contractor.id,
        colour_option_id: co.id,
        base_price_per_ft_low: row.linear,
        base_price_per_ft_high: row.linear,
        single_gate_low: row.gate,
        single_gate_high: row.gate,
        double_gate_low: row.gate,
        double_gate_high: row.gate,
        removal_price_per_ft_low: 0,
        removal_price_per_ft_high: 0,
        minimum_job_low: 0,
        minimum_job_high: 0,
        is_active: true,
      });
      if (cprErr) throw cprErr;
    }
  }

  console.log(
    `Done. Created ${typeMap.size} types, ${stylesCount} styles, ${coloursCount} colours for ${contractor.company_name}.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

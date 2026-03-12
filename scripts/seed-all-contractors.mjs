#!/usr/bin/env node
/**
 * One-time script: seed the standard catalog to ALL existing contractors.
 * Run: node scripts/seed-all-contractors.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Skip contractors who already have fence types (to avoid duplicates).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // .env.local not found
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

const catalogPath = join(__dirname, '..', 'lib', 'standard-catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const types = catalog?.types || [];
const styles = catalog?.styles || [];
const colours = catalog?.colours || [];

async function seedContractor(contractorId, companyName) {
  const typeIdMap = [];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const { data: newType, error: typeErr } = await supabase
      .from('fence_types')
      .insert({
        contractor_id: contractorId,
        name: t.name,
        standard_height_ft: t.standard_height_ft ?? 6,
        display_order: t.display_order ?? i,
        is_active: true,
      })
      .select('id')
      .single();

    if (typeErr || !newType) {
      console.error('  Failed fence_type:', t.name, typeErr?.message);
      return false;
    }
    typeIdMap[i] = newType.id;
  }

  const styleIdMap = [];

  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    const newTypeId = typeIdMap[s.type_index];
    if (!newTypeId) continue;

    const { data: newStyle, error: styleErr } = await supabase
      .from('fence_styles')
      .insert({
        fence_type_id: newTypeId,
        style_name: s.style_name,
        photo_url: s.photo_url || null,
        display_order: s.display_order ?? i,
        is_active: true,
      })
      .select('id')
      .single();

    if (styleErr || !newStyle) {
      console.error('  Failed fence_style:', s.style_name, styleErr?.message);
      continue;
    }
    styleIdMap[i] = newStyle.id;
  }

  for (const c of colours) {
    const newStyleId = styleIdMap[c.style_index];
    if (!newStyleId) continue;

    const { data: newColour, error: colourErr } = await supabase
      .from('colour_options')
      .insert({
        fence_style_id: newStyleId,
        color_name: c.color_name,
        photo_url: c.photo_url || null,
        display_order: c.display_order ?? 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (colourErr || !newColour) {
      console.error('  Failed colour:', c.color_name, colourErr?.message);
      continue;
    }

    await supabase.from('colour_pricing_rules').insert({
      contractor_id: contractorId,
      colour_option_id: newColour.id,
      base_price_per_ft_low: 0,
      base_price_per_ft_high: 0,
      single_gate_low: 0,
      single_gate_high: 0,
      double_gate_low: 0,
      double_gate_high: 0,
      removal_price_per_ft_low: 0,
      removal_price_per_ft_high: 0,
      minimum_job_low: 0,
      minimum_job_high: 0,
      is_active: true,
    });
  }

  return true;
}

async function main() {
  if (!types.length) {
    console.error('Standard catalog has no types. Run: npm run export-catalog gordon-landscaping');
    process.exit(1);
  }

  const { data: contractors, error } = await supabase
    .from('contractors')
    .select('id, company_name')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch contractors:', error.message);
    process.exit(1);
  }

  let seeded = 0;
  let skipped = 0;

  for (const contractor of contractors || []) {
    const { data: existing } = await supabase
      .from('fence_types')
      .select('id')
      .eq('contractor_id', contractor.id)
      .limit(1);

    if (existing?.length) {
      console.log(`Skip ${contractor.company_name || contractor.id} (already has products)`);
      skipped++;
      continue;
    }

    console.log(`Seeding ${contractor.company_name || contractor.id}...`);
    const ok = await seedContractor(contractor.id, contractor.company_name);
    if (ok) {
      seeded++;
      console.log(`  Done`);
    } else {
      console.log(`  Failed`);
    }
  }

  console.log(`\nSeeded ${seeded} contractor(s), skipped ${skipped} (already had products)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

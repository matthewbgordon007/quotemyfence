#!/usr/bin/env node
/**
 * One-time script: export a contractor's catalog to lib/standard-catalog.json
 * Run: node scripts/export-standard-catalog.mjs <contractor-slug>
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
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
    // .env.local not found, use existing env
  }
}

loadEnv();

const slug = process.argv[2] || process.env.TEMPLATE_CONTRACTOR_SLUG;
if (!slug) {
  console.error('Usage: node scripts/export-standard-catalog.mjs <contractor-slug>');
  console.error('Example: node scripts/export-standard-catalog.mjs gordon-landscaping');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!contractor) {
    console.error(`Contractor with slug "${slug}" not found.`);
    process.exit(1);
  }

  const templateId = contractor.id;

  let { data: types } = await supabase
    .from('fence_types')
    .select('id, name, standard_height_ft, display_order')
    .eq('contractor_id', templateId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!types?.length) {
    const { data: heights } = await supabase
      .from('fence_heights')
      .select('id')
      .eq('contractor_id', templateId)
      .eq('is_active', true);
    if (heights?.length) {
      const { data } = await supabase
        .from('fence_types')
        .select('id, name, standard_height_ft, display_order')
        .in('height_id', heights.map((h) => h.id))
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      types = data || [];
    }
  }

  if (!types?.length) {
    console.error('No fence types found for this contractor.');
    process.exit(1);
  }

  const typeIds = types.map((t) => t.id);

  const { data: styles } = await supabase
    .from('fence_styles')
    .select('id, fence_type_id, style_name, photo_url, display_order')
    .in('fence_type_id', typeIds)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const styleIds = (styles || []).map((s) => s.id);

  const { data: colours } = await supabase
    .from('colour_options')
    .select('id, fence_style_id, color_name, photo_url, display_order')
    .in('fence_style_id', styleIds)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const catalog = {
    exportedAt: new Date().toISOString(),
    source: slug,
    types: types.map((t) => ({
      name: t.name,
      standard_height_ft: t.standard_height_ft ?? 6,
      display_order: t.display_order ?? 0,
    })),
    styles: (styles || []).map((s) => {
      const typeIndex = types.findIndex((t) => t.id === s.fence_type_id);
      return {
        type_index: typeIndex >= 0 ? typeIndex : 0,
        style_name: s.style_name,
        photo_url: s.photo_url,
        display_order: s.display_order ?? 0,
      };
    }),
    colours: (colours || []).map((c) => {
      const styleIndex = (styles || []).findIndex((s) => s.id === c.fence_style_id);
      return {
        style_index: styleIndex >= 0 ? styleIndex : 0,
        color_name: c.color_name,
        photo_url: c.photo_url,
        display_order: c.display_order ?? 0,
      };
    }),
  };

  const outPath = join(__dirname, '..', 'lib', 'standard-catalog.json');
  writeFileSync(outPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Wrote ${catalog.types.length} types, ${catalog.styles.length} styles, ${catalog.colours.length} colours to lib/standard-catalog.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

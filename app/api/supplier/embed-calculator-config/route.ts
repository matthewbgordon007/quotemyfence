import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';
import {
  parseEmbedCalculatorConfig,
  validateEmbedCalculatorConfig,
} from '@/lib/supplier-embed-calculator-config';

export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error } = await supabase
    .from('contractors')
    .select('supplier_embed_calculator_config')
    .eq('id', sess.contractorId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const config = parseEmbedCalculatorConfig(row?.supplier_embed_calculator_config);
  return NextResponse.json({ config });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const next = parseEmbedCalculatorConfig(body);
  const validated = validateEmbedCalculatorConfig(next);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('contractors')
    .update({
      supplier_embed_calculator_config: validated.config,
      updated_at: now,
    })
    .eq('id', sess.contractorId);

  if (error) {
    if (error.message?.includes('supplier_embed_calculator_config') || error.code === '42703') {
      return NextResponse.json(
        {
          error:
            'Database column missing. Run supabase/supplier-embed-calculator-config.sql on your Supabase project, then try again.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config: validated.config });
}

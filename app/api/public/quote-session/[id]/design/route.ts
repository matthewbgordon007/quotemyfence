import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { product_option_id, colour_option_id, subtotal_low, subtotal_high, total_low, total_high } = body;

    const optionId = colour_option_id || product_option_id;
    if (!sessionId || !optionId) {
      return NextResponse.json(
        { error: 'Missing session id or product/colour option' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fence } = await supabase
      .from('fences')
      .select('id')
      .eq('quote_session_id', sessionId)
      .limit(1)
      .single();

    const fenceUpdate: Record<string, unknown> = {
      subtotal_low: Number(subtotal_low) || 0,
      subtotal_high: Number(subtotal_high) || 0,
    };
    if (colour_option_id) {
      fenceUpdate.selected_colour_option_id = colour_option_id;
      fenceUpdate.selected_product_option_id = null;
    } else {
      fenceUpdate.selected_product_option_id = product_option_id;
      fenceUpdate.selected_colour_option_id = null;
    }

    if (fence) {
      await supabase.from('fences').update(fenceUpdate).eq('id', fence.id);
    }

    await supabase.from('quote_totals').upsert(
      {
        quote_session_id: sessionId,
        subtotal_low: Number(subtotal_low) || 0,
        subtotal_high: Number(subtotal_high) || 0,
        tax_low: 0,
        tax_high: 0,
        total_low: Number(total_low) || 0,
        total_high: Number(total_high) || 0,
      },
      { onConflict: 'quote_session_id' }
    );

    await supabase
      .from('quote_sessions')
      .update({
        status: 'design_saved',
        current_step: 'review',
        last_active_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('design POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

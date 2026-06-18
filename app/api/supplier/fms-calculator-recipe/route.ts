import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeFmsCalculatorRecipe,
  type FmsCalculatorRecipeV1,
} from '@/lib/fms-calculator-recipe';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

async function getSupplierRole(supabase: Awaited<ReturnType<typeof createClient>>, contractorId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .eq('contractor_id', contractorId)
    .eq('is_active', true)
    .single();
  return ur?.role ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error } = await supabase
    .from('contractors')
    .select('fms_calculator_recipe')
    .eq('id', sess.contractorId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipe = normalizeFmsCalculatorRecipe(row?.fms_calculator_recipe);
  return NextResponse.json({ recipe });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getSupplierRole(supabase, sess.contractorId);
  if (!['owner', 'admin'].includes(role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { recipe?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const recipe: FmsCalculatorRecipeV1 = normalizeFmsCalculatorRecipe(body.recipe ?? {});

  const { error } = await supabase
    .from('contractors')
    .update({ fms_calculator_recipe: recipe })
    .eq('id', sess.contractorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ recipe });
}

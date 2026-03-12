import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import catalogData from '@/lib/standard-catalog.json';

async function getMasterAdminId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ma } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  return ma?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const catalog = catalogData as { types: { name: string; standard_height_ft?: number }[]; styles: { type_index: number; style_name: string; photo_url?: string }[]; colours: { style_index: number; color_name: string }[] };
  return NextResponse.json({
    types: catalog.types ?? [],
    styles: catalog.styles ?? [],
    colours: catalog.colours ?? [],
  });
}

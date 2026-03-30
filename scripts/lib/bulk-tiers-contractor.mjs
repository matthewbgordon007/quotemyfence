/**
 * Resolve which contractor to use for bulk install-length tier scripts.
 * Defaults to FMS (Fence Material Supply / slug contains "fms") — same as import-fms-price-guide.mjs.
 *
 * Override: --contractor-slug=my-slug  or  BULK_TIERS_CONTRACTOR_SLUG=my-slug in .env.local
 */

export async function getContractorForBulkTiers(supabase, slugArg) {
  if (slugArg) {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, company_name, slug')
      .eq('slug', slugArg)
      .eq('is_active', true)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: `No contractor with slug: ${slugArg}` };
    return { contractor: data };
  }

  const envSlug = process.env.BULK_TIERS_CONTRACTOR_SLUG?.trim();
  if (envSlug) {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, company_name, slug')
      .eq('slug', envSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: `BULK_TIERS_CONTRACTOR_SLUG not found: ${envSlug}` };
    return { contractor: data };
  }

  const { data: candidates, error: cErr } = await supabase
    .from('contractors')
    .select('id, slug, company_name')
    .eq('is_active', true)
    .or('company_name.ilike.%fence material supply%,slug.ilike.%fms%');

  if (cErr) return { error: cErr.message };
  if (!candidates?.length) {
    return {
      error:
        'Could not find FMS contractor (company_name ~ "Fence Material Supply" or slug containing "fms"). Set BULK_TIERS_CONTRACTOR_SLUG or use --contractor-slug=.',
    };
  }

  const contractor =
    candidates.find((c) => (c.company_name || '').toLowerCase().includes('fence material supply')) ??
    candidates[0];

  return { contractor };
}

import { createClient } from '@/lib/supabase/server';
import type { Contractor, Product, ProductOption, PricingRule, SalesTeamMember, LeadSource } from '@/lib/types';

export async function getContractorBySlug(slug: string): Promise<Contractor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error || !data) return null;
  return data as Contractor;
}

export async function getContractorPublicConfig(slug: string) {
  const contractor = await getContractorBySlug(slug);
  if (!contractor) return null;

  const supabase = await createClient();

  const [productsRes, teamRes, leadSourcesRes] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        product_options (
          id,
          height_ft,
          color,
          style_name,
          is_active
        )
      `)
      .eq('contractor_id', contractor.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('sales_team_members')
      .select('*')
      .eq('contractor_id', contractor.id)
      .eq('is_visible', true)
      .order('display_order'),
    supabase
      .from('lead_sources')
      .select('*')
      .eq('contractor_id', contractor.id)
      .eq('is_active', true)
      .order('display_order'),
  ]);

  const productIds = (productsRes.data || []).flatMap((p) =>
    (p.product_options || []).map((o: { id: string }) => o.id)
  );

  let pricingRules: PricingRule[] = [];
  if (productIds.length > 0) {
    const { data: rules } = await supabase
      .from('pricing_rules')
      .select('*')
      .in('product_option_id', productIds)
      .eq('is_active', true);
    pricingRules = (rules || []) as PricingRule[];
  }

  let fenceTypes: { id: string; height_id: string | null; name: string; standard_height_ft?: number }[] = [];
  let fenceStyles: { id: string; fence_type_id: string; style_name: string }[] = [];
  let colourOptions: { id: string; fence_style_id: string; color_name: string; photo_url: string | null }[] = [];
  let colourPricingRules: { colour_option_id: string; [k: string]: unknown }[] = [];
  let stylePricingRules: { fence_style_id: string; [k: string]: unknown }[] = [];

  const { data: types } = await supabase
    .from('fence_types')
    .select('*')
    .eq('contractor_id', contractor.id)
    .eq('is_active', true)
    .order('display_order');
  fenceTypes = types || [];

  const typeIds = fenceTypes.map((t) => t.id);
  if (typeIds.length > 0) {
    const { data: styles } = await supabase
      .from('fence_styles')
      .select('*')
      .in('fence_type_id', typeIds)
      .eq('is_active', true)
      .eq('is_hidden', false)
      .order('display_order');
    fenceStyles = styles || [];

    const styleIds = fenceStyles.map((s) => s.id);
    if (styleIds.length > 0) {
      const { data: colours } = await supabase
        .from('colour_options')
        .select('*')
        .in('fence_style_id', styleIds)
        .eq('is_active', true)
        .order('display_order');
      colourOptions = colours || [];
    }

    const colourIds = colourOptions.map((c) => c.id);
    if (colourIds.length > 0) {
      const { data: rules } = await supabase
        .from('colour_pricing_rules')
        .select('*')
        .in('colour_option_id', colourIds)
        .eq('is_active', true);
      colourPricingRules = rules || [];
    }
    if (styleIds.length > 0) {
      const { data: rules } = await supabase
        .from('style_pricing_rules')
        .select('*')
        .in('fence_style_id', styleIds)
        .eq('is_active', true);
      stylePricingRules = rules || [];
    }
  }

  return {
    contractor,
    products: (productsRes.data || []) as (Product & { product_options: ProductOption[] })[],
    pricingRules,
    salesTeam: (teamRes.data || []) as SalesTeamMember[],
    leadSources: (leadSourcesRes.data || []) as LeadSource[],
    productHierarchy: {
      heights: [],
      fenceTypes,
      fenceStyles,
      colourOptions,
      colourPricingRules,
      stylePricingRules,
    },
  };
}

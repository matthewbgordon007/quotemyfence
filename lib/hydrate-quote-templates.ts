import {
  clearLegacyBrowserQuoteTemplates,
  contractorHasServerQuoteTemplates,
  quoteTemplatesFromCompanyAccount,
  readLegacyBrowserQuoteTemplates,
  saveQuoteTemplatesToCompanyAccount,
} from '@/lib/quote-template';

type ContractorRow = {
  id: string;
  company_name?: string | null;
  slug?: string | null;
  quote_template_text?: string | null;
  quote_template_scoped?: unknown;
};

/**
 * Load quote templates from the company account. If the account has none yet,
 * upload any legacy per-browser copy once, then clear browser storage.
 */
export async function hydrateQuoteTemplatesFromCompany(
  contractor: ContractorRow
): Promise<{ globalText: string; scoped: Record<string, string> }> {
  const id = contractor.id;
  const hasServer = contractorHasServerQuoteTemplates(
    contractor.quote_template_text,
    contractor.quote_template_scoped
  );

  if (!hasServer) {
    const legacy = readLegacyBrowserQuoteTemplates(id);
    if (legacy) {
      const saved = await saveQuoteTemplatesToCompanyAccount({
        quote_template_text: legacy.globalText,
        quote_template_scoped: legacy.scoped,
      });
      if (saved.ok) {
        clearLegacyBrowserQuoteTemplates(id);
        return { globalText: legacy.globalText, scoped: legacy.scoped };
      }
    }
  } else {
    clearLegacyBrowserQuoteTemplates(id);
  }

  return quoteTemplatesFromCompanyAccount({
    companyName: contractor.company_name,
    slug: contractor.slug,
    serverTemplateText: contractor.quote_template_text,
    serverScoped: contractor.quote_template_scoped,
  });
}

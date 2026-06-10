export type QuoteTokenId =
  | 'brand'
  | 'homeowner'
  | 'location'
  | 'product'
  | 'style'
  | 'color'
  | 'gateInstalledLength'
  | 'lengthExpression'
  | 'privateLengths'
  | 'sharedLengths'
  | 'pricePerLinearFt'
  | 'gateKitPrice'
  | 'gates'
  | 'lengths'
  | 'privateTotal'
  | 'sharedTotal'
  | 'gateTotal'
  | 'removalTotal'
  | 'subtotal'
  | 'taxLine'
  | 'grandTotal'
  | 'deposit';

export type QuoteBlock =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'token'; token: QuoteTokenId };

export const QUOTE_TOKEN_DEFS: { token: QuoteTokenId; label: string }[] = [
  { token: 'brand', label: 'Brand' },
  { token: 'homeowner', label: 'Homeowner name' },
  { token: 'location', label: 'Quote address' },
  { token: 'product', label: 'Product label' },
  { token: 'style', label: 'Style' },
  { token: 'color', label: 'Color' },
  { token: 'gateInstalledLength', label: 'Gate installed length' },
  { token: 'lengthExpression', label: 'Length expression' },
  { token: 'privateLengths', label: 'Private lengths breakdown' },
  { token: 'sharedLengths', label: 'Shared lengths breakdown' },
  { token: 'pricePerLinearFt', label: 'Price per linear foot' },
  { token: 'gateKitPrice', label: 'Gate conversion kit price' },
  { token: 'gates', label: 'Gate + removal summary' },
  { token: 'lengths', label: 'Lengths + line totals' },
  { token: 'privateTotal', label: 'Private fence total' },
  { token: 'sharedTotal', label: 'Shared fence total' },
  { token: 'gateTotal', label: 'Gates total' },
  { token: 'removalTotal', label: 'Removal total' },
  { token: 'subtotal', label: 'Subtotal' },
  { token: 'taxLine', label: 'Tax line' },
  { token: 'grandTotal', label: 'Grand total' },
  { token: 'deposit', label: 'Deposit' },
];

export const DEFAULT_QUOTE_BLOCKS: QuoteBlock[] = [
  { id: 'b1', type: 'text', text: 'Fence Quote Summary\n' },
  { id: 'b2', type: 'text', text: 'Prepared for:' },
  { id: 'b3', type: 'token', token: 'homeowner' },
  { id: 'b4', type: 'text', text: 'Location:' },
  { id: 'b5', type: 'token', token: 'location' },
  { id: 'b6', type: 'text', text: 'Product:' },
  { id: 'b7', type: 'token', token: 'product' },
  { id: 'b8', type: 'text', text: 'Gates:' },
  { id: 'b9', type: 'token', token: 'gates' },
  { id: 'b10', type: 'text', text: '\nLengths & line totals:' },
  { id: 'b11', type: 'token', token: 'lengths' },
  { id: 'b12', type: 'text', text: '\nTotals:' },
  { id: 'b13', type: 'text', text: '- Private fence:' },
  { id: 'b14', type: 'token', token: 'privateTotal' },
  { id: 'b15', type: 'text', text: '- Shared fence:' },
  { id: 'b16', type: 'token', token: 'sharedTotal' },
  { id: 'b17', type: 'text', text: '- Gates:' },
  { id: 'b18', type: 'token', token: 'gateTotal' },
  { id: 'b19', type: 'text', text: '- Removal:' },
  { id: 'b20', type: 'token', token: 'removalTotal' },
  { id: 'b21', type: 'text', text: '- Subtotal:' },
  { id: 'b22', type: 'token', token: 'subtotal' },
  { id: 'b23', type: 'text', text: '- Tax:' },
  { id: 'b24', type: 'token', token: 'taxLine' },
  { id: 'b25', type: 'text', text: '- Total:' },
  { id: 'b26', type: 'token', token: 'grandTotal' },
  { id: 'b27', type: 'text', text: '\nDeposit (10% incl. tax):' },
  { id: 'b28', type: 'token', token: 'deposit' },
];

export function tokenPlaceholder(token: QuoteTokenId): string {
  return `{{${token}}}`;
}

export const DEFAULT_QUOTE_TEMPLATE_TEXT = `Fence Quote Summary

Location: {{location}}
Brand: {{brand}}
Height: 7'
Style: {{style}}
Install Type: Level & Stepped
Post spacing: 8'
Footings: Concrete 48" Depth
Color: {{color}}
Cap style: Pyramid
Gates: x{{gates}} (installed in {{gateInstalledLength}} length)

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared lengths:

{{sharedLengths}}

Additional details:
- ASA PVC (Premium)
- 2" Galvanized steel posts (8' length)
- x3 full square metal stiffener rods per 8' panel
- 1 1/2" full square metal channel stiffener in each rail (top & bottom)

- Additional rails installed at bottom of fence to close any gaps - $99.99 per rail - Determined upon Installation (Optional - This will always be billed separately from the original project)

{{pricePerLinearFt}} per Linear ft
{{gateKitPrice}} per Gate Conversion Kit

**LIFETIME Warranty on PVC**
**All materials and labor included**
**5 YEAR limited Installation Warranty**
**Existing material removed and disposed**
---------------------------------------------------------
`;

/** Default long-form quote for most contractors (Canadian Fence Material Supply keeps its own preset). */
export const GENERIC_BASE_QUOTE_TEMPLATE_TEXT = `Fence quote — {{brand}}

Prepared for: {{homeowner}}
Location: {{location}}

Product: {{product}}
Style: {{style}}
Colour: {{color}}
Gates: {{gates}} (installed in {{gateInstalledLength}})

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared lengths:
{{sharedLengths}}

Pricing
{{pricePerLinearFt}} per linear foot (installed)
{{gateKitPrice}} per gate conversion kit (where applicable)

Subtotal: {{subtotal}}
{{taxLine}}
Total: {{grandTotal}}
Deposit: {{deposit}}

Additional details:
(Customize this section for the job — options, site conditions, exclusions, timeline, etc.)

Warranty:
(Customize warranty terms for this installation.)
`;

export function isCanadianFenceMaterialSupplyProfile(companyName?: string | null, slug?: string | null): boolean {
  const n = (companyName || '').toLowerCase();
  const s = (slug || '').toLowerCase();
  return n.includes('canadian fence material supply') || s.includes('canadian-fence-material-supply');
}

const WPC_MATERIAL_TEMPLATE = `Location: {{location}}

Brand: {{brand}}
Height: [[HEIGHT]]
Style: WPC Hybrid
Install Type: Level & Stepped
Post spacing: 6'
Footings: Concrete 48" Depth
Color: {{color}}
Cap style: Pyramid
Gates: {{gates}} (installed in {{gateInstalledLength}} length)

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared lengths:

{{sharedLengths}}

Additional details:
- 3"x3" Aluminum posts (black)
- Thickened top & Bottom rail
- Hidden brackets & fasteners

{{pricePerLinearFt}} per Linear ft
{{gateKitPrice}} per Gate Conversion Kit

**LIFETIME Warranty on PVC**
**All materials and labor included**
**5 YEAR limited Installation Warranty**
**Existing material removed and disposed**
---------------------------------------------------------
`;

const HYBRID_MATERIAL_TEMPLATE = `Location: {{location}}

Brand: {{brand}}
Height: [[HEIGHT]]
Style: Hybrid
Install Type: Level & Stepped
Board Installation:
Post spacing: 6'
Footings: Concrete 48" Depth
Color: {{color}}
Cap style: Pyramid
Gates: {{gates}} (installed in {{gateInstalledLength}} length)

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared lengths:

{{sharedLengths}}

Additional details:
- 3"x3" Aluminum posts (black)
- 3" Top & Bottom rail

{{pricePerLinearFt}} per Linear ft
{{gateKitPrice}} per Gate Conversion Kit

**LIFETIME Warranty on PVC**
**All materials and labor included**
**5 YEAR limited Installation Warranty**
**Existing material removed and disposed**
---------------------------------------------------------
`;

const CEDAR_MATERIAL_TEMPLATE = `Location: {{location}}

Cedar Lumber
Style: {{style}}
Height: [[HEIGHT]]
Post spacing:
Gates: {{gates}}
Footings:

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared fence lines:

{{sharedLengths}}

Total Length:

Additional Details:

{{pricePerLinearFt}} per linear ft
{{gateKitPrice}} per gate + Assembly & Installation

**Remove/Dispose of existing included**
**5 YEAR limited Installation Warranty**
-------------------------------------------------------
`;

const PRESSURE_TREATED_TEMPLATE = `Location: {{location}}

Pressure Treated Lumber
Height: [[HEIGHT]]
Style: Good Neighbour Style
Install Type: Level & Stepped
Post spacing: 8'
Footings: Concrete 48" Depth
Cap style: Pyramid
Gates: {{gates}} (installed in {{gateInstalledLength}} length)

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared fence lines:

{{sharedLengths}}

Additional Details:

{{pricePerLinearFt}} per linear ft
{{gateKitPrice}} per Gate Conversion Kit

**All materials and labor included**
**5 YEAR limited Installation Warranty**
**Existing material removed and disposed**
-------------------------------------------------------
`;

const CHAINLINK_TEMPLATE = `Location: {{location}}

Height: [[HEIGHT]]
Post spacing:
Color: {{color}}
Gates: {{gates}}

Length: {{lengthExpression}}

Private lengths
{{privateLengths}}

Shared Length:
{{sharedLengths}}
Total length:

Material size:
- End posts:
- Corner posts:
- Infill posts:
- Top rail:
- Mesh:

Footings:

Additional details:

{{pricePerLinearFt}} per linear ft
{{gateKitPrice}} per gate

**All materials and labor included**
**All organic matter removed and disposed**
**5 YEAR limited installation warranty**
`;

export function getMaterialQuoteTemplate(typeName?: string | null): string | null {
  const n = (typeName || '').toLowerCase();
  if (!n) return null;
  if (n.includes('chain link')) return CHAINLINK_TEMPLATE;
  if (n.includes('pressure treated')) return PRESSURE_TREATED_TEMPLATE;
  if (n.includes('cedar')) return CEDAR_MATERIAL_TEMPLATE;
  if (n.includes('wpc')) return WPC_MATERIAL_TEMPLATE;
  if (n.includes('hybrid')) return HYBRID_MATERIAL_TEMPLATE;
  return null;
}

/** Standard length breakdown block — injected when a template is missing these tokens. */
export const QUOTE_LENGTH_SECTIONS = `Private lengths
{{privateLengths}}

Shared lengths:

{{sharedLengths}}`;

/**
 * Material-specific or customized templates may omit length tokens. Ensure private, shared
 * (and removal via sharedLengths) always render for every contractor user.
 */
export function ensureQuoteLengthSections(templateText: string): string {
  const hasPrivate = /\{\{\s*privateLengths\s*\}\}/.test(templateText);
  const hasShared = /\{\{\s*sharedLengths\s*\}\}/.test(templateText);
  if (hasPrivate && hasShared) return templateText;

  const parts: string[] = [];
  if (!hasPrivate) parts.push('Private lengths\n{{privateLengths}}');
  if (!hasShared) parts.push('Shared lengths:\n\n{{sharedLengths}}');
  const block = `\n\n${parts.join('\n\n')}\n`;

  const anchors = [
    /\n{{pricePerLinearFt}}/,
    /\nPricing\n/,
    /\nAdditional details:/i,
    /\nAdditional Details:/,
    /\n\*\*LIFETIME Warranty/i,
    /\n-{3,}/,
  ];
  for (const re of anchors) {
    const m = templateText.match(re);
    if (m?.index != null) {
      return `${templateText.slice(0, m.index)}${block}${templateText.slice(m.index)}`;
    }
  }
  return `${templateText.trimEnd()}${block}`;
}

export function parseQuoteTemplateScoped(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function composeQuoteText(templateText: string, values: Record<QuoteTokenId, string>): string {
  const withSections = ensureQuoteLengthSections(templateText);
  const rendered = withSections.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, tokenRaw) => {
    const token = tokenRaw as QuoteTokenId;
    if (Object.prototype.hasOwnProperty.call(values, token)) return values[token];
    return full;
  });
  return `${rendered.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function isQuoteBlocks(input: unknown): input is QuoteBlock[] {
  if (!Array.isArray(input)) return false;
  return input.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<QuoteBlock>;
    if (candidate.type === 'text') return typeof candidate.id === 'string' && typeof candidate.text === 'string';
    if (candidate.type === 'token') {
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.token === 'string' &&
        QUOTE_TOKEN_DEFS.some((t) => t.token === candidate.token)
      );
    }
    return false;
  });
}

export function defaultQuoteTemplateText(companyName?: string | null, slug?: string | null): string {
  return isCanadianFenceMaterialSupplyProfile(companyName, slug)
    ? DEFAULT_QUOTE_TEMPLATE_TEXT
    : GENERIC_BASE_QUOTE_TEMPLATE_TEXT;
}

export function contractorHasServerQuoteTemplates(
  serverTemplateText?: string | null,
  serverScoped?: unknown
): boolean {
  if (typeof serverTemplateText === 'string' && serverTemplateText.trim()) return true;
  const scoped = parseQuoteTemplateScoped(serverScoped);
  return Object.keys(scoped).length > 0;
}

/** Company account templates from the database — never from browser storage. */
export function quoteTemplatesFromCompanyAccount(opts: {
  companyName?: string | null;
  slug?: string | null;
  serverTemplateText?: string | null;
  serverScoped?: unknown;
}): { globalText: string; scoped: Record<string, string> } {
  const { companyName, slug, serverTemplateText, serverScoped } = opts;
  const scoped = parseQuoteTemplateScoped(serverScoped);
  const globalText =
    typeof serverTemplateText === 'string' && serverTemplateText.trim()
      ? serverTemplateText
      : defaultQuoteTemplateText(companyName, slug);
  return { globalText, scoped };
}

/**
 * One-time read of old per-browser templates so they can be uploaded to the company account.
 * Not used for day-to-day loading.
 */
export function readLegacyBrowserQuoteTemplates(contractorId: string): {
  globalText: string;
  scoped: Record<string, string>;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    let globalText = '';
    const raw = localStorage.getItem(quoteTemplateStorageKey(contractorId));
    if (raw?.trim()) {
      globalText = raw;
    } else {
      const legacyRaw = localStorage.getItem(legacyQuoteBlocksStorageKey(contractorId));
      if (legacyRaw) {
        const parsed: unknown = JSON.parse(legacyRaw);
        if (isQuoteBlocks(parsed)) {
          globalText = quoteBlocksToTemplateText(parsed);
        }
      }
    }
    let scoped: Record<string, string> = {};
    const scopedRaw = localStorage.getItem(quoteTemplateScopedStorageKey(contractorId));
    if (scopedRaw) {
      scoped = parseQuoteTemplateScoped(JSON.parse(scopedRaw));
    }
    if (!globalText.trim() && Object.keys(scoped).length === 0) return null;
    return { globalText: globalText.trim() || defaultQuoteTemplateText(), scoped };
  } catch {
    return null;
  }
}

export function clearLegacyBrowserQuoteTemplates(contractorId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(quoteTemplateStorageKey(contractorId));
    localStorage.removeItem(quoteTemplateScopedStorageKey(contractorId));
    localStorage.removeItem(legacyQuoteBlocksStorageKey(contractorId));
  } catch {
    // ignore
  }
}

export async function saveQuoteTemplatesToCompanyAccount(payload: {
  quote_template_text: string;
  quote_template_scoped: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/contractor/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: typeof err.error === 'string' ? err.error : 'Could not save quote templates',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server' };
  }
}

/** @deprecated Use quoteTemplatesFromCompanyAccount */
export function loadContractorQuoteTemplates(opts: {
  contractorId: string;
  companyName?: string | null;
  slug?: string | null;
  serverTemplateText?: string | null;
  serverScoped?: unknown;
}): { globalText: string; scoped: Record<string, string> } {
  return quoteTemplatesFromCompanyAccount(opts);
}

export function quoteTemplateStorageKey(contractorId: string): string {
  return `qmf_quote_template_text_${contractorId}`;
}

export function quoteTemplateScopedStorageKey(contractorId: string): string {
  return `qmf_quote_template_scoped_${contractorId}`;
}

export function normalizeTemplateScope(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildTypeScopeKey(typeName: string): string {
  return `type:${normalizeTemplateScope(typeName)}`;
}

export function buildTypeStyleScopeKey(typeName: string, styleName: string): string {
  return `type:${normalizeTemplateScope(typeName)}|style:${normalizeTemplateScope(styleName)}`;
}

// Legacy key from block-based builder; used for migration.
export function legacyQuoteBlocksStorageKey(contractorId: string): string {
  return `qmf_quote_template_blocks_${contractorId}`;
}

export function quoteBlocksToTemplateText(blocks: QuoteBlock[]): string {
  return `${blocks
    .map((block) => (block.type === 'text' ? block.text : tokenPlaceholder(block.token)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

export type QuoteTokenId =
  | 'homeowner'
  | 'location'
  | 'product'
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
  { token: 'homeowner', label: 'Homeowner name' },
  { token: 'location', label: 'Quote address' },
  { token: 'product', label: 'Product label' },
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

export function composeQuoteText(blocks: QuoteBlock[], values: Record<QuoteTokenId, string>): string {
  return `${blocks
    .map((block) => (block.type === 'text' ? block.text : values[block.token]))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
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

export function quoteTemplateStorageKey(contractorId: string): string {
  return `qmf_quote_template_blocks_${contractorId}`;
}

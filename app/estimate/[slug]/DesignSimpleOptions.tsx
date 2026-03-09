'use client';

type ProductOption = {
  id: string;
  productName: string;
  height_ft: number;
  color: string | null;
  style_name: string | null;
  rule: { base_price_per_ft_low: number; base_price_per_ft_high: number };
};

interface Props {
  options: ProductOption[];
  optionId: string | null;
  totalFeet: number;
  hasRemoval: boolean;
  error: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onContinue: () => void;
  cardClass: string;
  selectCard: (active: boolean) => string;
  btnPrimary: string;
}

export function DesignSimpleOptions({
  options,
  optionId,
  totalFeet,
  hasRemoval,
  error,
  loading,
  onSelect,
  onContinue,
  cardClass,
  selectCard,
  btnPrimary,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className={cardClass}>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Choose your fence</h1>
          <p className="mt-2 text-sm text-slate-500">
            Select one option. Based on {totalFeet.toFixed(1)} ft
            {hasRemoval ? ' including removal.' : '.'}
          </p>

          <div className="mt-8 space-y-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={selectCard(optionId === opt.id)}
              >
                <div className="font-bold">
                  {opt.productName}
                  {opt.height_ft ? ` • ${opt.height_ft} ft` : ''}
                  {opt.color ? ` • ${opt.color}` : ''}
                  {opt.style_name ? ` • ${opt.style_name}` : ''}
                </div>
              </button>
            ))}
          </div>

          {options.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              This contractor has not set up products yet. Please contact them.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={!optionId || loading}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            {loading ? 'Saving…' : 'Continue to review'}
          </button>
        </div>
      </div>
    </div>
  );
}

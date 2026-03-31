export const BILLING_ALLOWED_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
]);

export function isBillingActive(status?: string | null): boolean {
  if (!status) return false;
  return BILLING_ALLOWED_STATUSES.has(status);
}


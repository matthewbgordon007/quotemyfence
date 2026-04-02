import type { SupabaseClient } from '@supabase/supabase-js';

export type ContractorConflictField = 'email' | 'company_name' | 'phone' | 'website';

/** Escape % and _ so ilike matches the literal string. */
export function escapeForIlikeExact(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Digits only for phone comparison (handles (555) 555-5555, +1 555…, etc.). */
export function normalizePhoneDigits(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let d = phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length > 0 ? d : null;
}

/** Canonical website host/path for duplicate detection. */
export function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let s = url.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.replace(/^www\./, '');
  s = s.replace(/\/$/, '');
  return s || null;
}

export type ContractorUniquenessInput = {
  email: string;
  companyName: string;
  phone?: string | null;
  website?: string | null;
  /** When updating an existing contractor, skip matching this id. */
  excludeContractorId?: string;
};

/**
 * Returns which fields already exist on another contractor (case-insensitive company & email;
 * normalized phone & website). Person names are not checked.
 */
export async function getContractorFieldConflicts(
  admin: SupabaseClient,
  input: ContractorUniquenessInput
): Promise<ContractorConflictField[]> {
  const conflicts = new Set<ContractorConflictField>();
  const exclude = input.excludeContractorId;

  const email = input.email.trim();
  const company = input.companyName.trim();
  if (!company) return [];

  if (email) {
    let q = admin.from('contractors').select('id').ilike('email', escapeForIlikeExact(email));
    if (exclude) q = q.neq('id', exclude);
    const { data } = await q.maybeSingle();
    if (data) conflicts.add('email');
  }

  {
    let q = admin.from('contractors').select('id').ilike('company_name', escapeForIlikeExact(company));
    if (exclude) q = q.neq('id', exclude);
    const { data } = await q.maybeSingle();
    if (data) conflicts.add('company_name');
  }

  const phoneNorm = normalizePhoneDigits(input.phone);
  if (phoneNorm && phoneNorm.length >= 10) {
    let q = admin.from('contractors').select('id, phone').not('phone', 'is', null);
    if (exclude) q = q.neq('id', exclude);
    const { data: rows } = await q;
    for (const row of rows || []) {
      if (normalizePhoneDigits(row.phone) === phoneNorm) {
        conflicts.add('phone');
        break;
      }
    }
  }

  const webNorm = normalizeWebsite(input.website);
  if (webNorm) {
    let q = admin.from('contractors').select('id, website').not('website', 'is', null);
    if (exclude) q = q.neq('id', exclude);
    const { data: rows } = await q;
    for (const row of rows || []) {
      if (normalizeWebsite(row.website as string) === webNorm) {
        conflicts.add('website');
        break;
      }
    }
  }

  return Array.from(conflicts);
}

const FIELD_LABEL: Record<ContractorConflictField, string> = {
  email: 'email address',
  company_name: 'company name',
  phone: 'phone number',
  website: 'website',
};

export function contractorConflictsErrorMessage(fields: ContractorConflictField[]): string {
  if (fields.length === 0) return 'This registration conflicts with an existing company.';
  const parts = fields.map((f) => FIELD_LABEL[f]);
  if (parts.length === 1) {
    return `Another company is already registered with this ${parts[0]}. If this is your business, sign in or contact support.`;
  }
  return `Another company is already registered with one or more of these: ${parts.join(', ')}. If this is your business, sign in or contact support.`;
}

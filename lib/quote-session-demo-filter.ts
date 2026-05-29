import type { SupabaseClient } from '@supabase/supabase-js';

let demoColumnKnownPresent = false;

/**
 * Whether quote_sessions.is_demo exists. Once detected it's cached as present;
 * while absent we re-check (a cheap head query) so demo-exclusion activates
 * automatically after the is_demo migration is run.
 */
export async function quoteSessionsHasDemoColumn(
  supabase: SupabaseClient
): Promise<boolean> {
  if (demoColumnKnownPresent) return true;
  const { error } = await supabase
    .from('quote_sessions')
    .select('is_demo', { head: true })
    .limit(1);
  if (!error) {
    demoColumnKnownPresent = true;
    return true;
  }
  return false;
}

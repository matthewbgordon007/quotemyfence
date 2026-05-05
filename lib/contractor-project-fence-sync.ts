import type { SupabaseClient } from '@supabase/supabase-js';

export type ProjectFenceDefaults = {
  colour_option_id: string | null;
  fence_style_id: string | null;
  fence_type_id: string | null;
};

/** Writes project catalogue defaults onto each lead's main fence row (matches public design route semantics). */
export async function applyProjectFenceDefaultsToSessions(
  supabase: SupabaseClient,
  quoteSessionIds: string[],
  project: ProjectFenceDefaults
): Promise<void> {
  if (quoteSessionIds.length === 0) return;

  const fenceUpdate: { selected_colour_option_id: string | null; selected_fence_style_id: string | null } = {
    selected_colour_option_id: null,
    selected_fence_style_id: null,
  };
  if (project.colour_option_id) {
    fenceUpdate.selected_colour_option_id = project.colour_option_id;
    fenceUpdate.selected_fence_style_id = null;
  } else if (project.fence_style_id) {
    fenceUpdate.selected_fence_style_id = project.fence_style_id;
    fenceUpdate.selected_colour_option_id = null;
  }

  const shouldTouchFence = Boolean(project.colour_option_id || project.fence_style_id || project.fence_type_id);

  for (const sid of quoteSessionIds) {
    const { data: fence } = await supabase.from('fences').select('id').eq('quote_session_id', sid).maybeSingle();
    if (fence?.id) {
      if (shouldTouchFence) {
        await supabase.from('fences').update(fenceUpdate).eq('id', fence.id);
      }
    } else if (project.colour_option_id || project.fence_style_id) {
      await supabase.from('fences').insert({
        quote_session_id: sid,
        label: 'Main',
        total_length_ft: 0,
        has_removal: false,
        ...fenceUpdate,
      });
    }
  }
}

export async function memberSessionIdsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<string[]> {
  const { data: members } = await supabase
    .from('contractor_project_members')
    .select('quote_session_id')
    .eq('project_id', projectId);
  return (members || []).map((m) => (m as { quote_session_id: string }).quote_session_id);
}

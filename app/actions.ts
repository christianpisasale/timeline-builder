'use server';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Colours drawn from the curated squad palette (lib/timeline.ts's
// SQUAD_TINTS/SQUAD_BARS) so freshly-seeded squads already match a swatch.
const DEFAULT_SQUADS = [
  { name: 'Orange',    tint: '#FCE4D2', bar_color: '#E8843C', sort_order: 0 },
  { name: 'Atlantis',  tint: '#D6F0EC', bar_color: '#2FA392', sort_order: 1 },
  { name: 'Thunder',   tint: '#E6E3FB', bar_color: '#7A63E0', sort_order: 2 },
  { name: 'Rose',      tint: '#FBE0EA', bar_color: '#D65C92', sort_order: 3 },
  { name: 'Sky',       tint: '#D9EAFB', bar_color: '#3E86D6', sort_order: 4 },
];

export async function createTimeline() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endD = new Date(today.getTime() + 70 * 864e5);
  const end = endD.toISOString().slice(0, 10);

  const { data: tl, error } = await supabase
    .from('timelines')
    .insert({ owner_id: user.id, title: 'Untitled timeline', chart_start: start, chart_end: end })
    .select('id')
    .single();
  if (error || !tl) throw error;

  await supabase.from('squads').insert(
    DEFAULT_SQUADS.map((s) => ({ ...s, timeline_id: tl.id }))
  );

  redirect(`/timeline/${tl.id}`);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function revalidateTimeline(id: string) {
  revalidatePath(`/timeline/${id}`);
}

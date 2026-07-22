'use server';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const DEFAULT_SQUADS = [
  { name: 'Orange',    tint: '#e6f2fb', bar_color: '#0079c8', sort_order: 0 },
  { name: 'Thunder',   tint: '#e0f2f1', bar_color: '#007d79', sort_order: 1 },
  { name: 'Atlantis',  tint: '#eaf4fc', bar_color: '#51a0dc', sort_order: 2 },
  { name: 'Digital',   tint: '#efeaf7', bar_color: '#491d8b', sort_order: 3 },
  { name: 'Programme', tint: '#f2f3f6', bar_color: '#491d8b', sort_order: 4 },
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

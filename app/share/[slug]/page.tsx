import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import PrintableTimeline from '@/components/PrintableTimeline';

export default async function SharedTimelinePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // no auth required — RLS already permits anonymous reads where is_public = true.
  // Matching on both public_slug and is_public means a disabled share link 404s
  // the same as one that never existed, rather than leaking timeline existence.
  const { data: timeline } = await supabase
    .from('timelines').select('*')
    .eq('public_slug', params.slug).eq('is_public', true).single();
  if (!timeline) notFound();

  const { data: squads } = await supabase
    .from('squads').select('*').eq('timeline_id', timeline.id).order('sort_order');
  const { data: rows } = await supabase
    .from('rows').select('*').eq('timeline_id', timeline.id).order('sort_order');

  return (
    <PrintableTimeline
      timeline={timeline}
      squads={squads ?? []}
      rows={rows ?? []}
    />
  );
}

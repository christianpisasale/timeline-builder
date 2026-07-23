import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import PrintableTimeline from '@/components/PrintableTimeline';

export default async function TimelinePrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: timeline } = await supabase
    .from('timelines').select('*').eq('id', params.id).single();
  if (!timeline) notFound();

  const { data: squads } = await supabase
    .from('squads').select('*').eq('timeline_id', params.id).order('sort_order');
  const { data: rows } = await supabase
    .from('rows').select('*').eq('timeline_id', params.id).order('sort_order');

  return (
    <PrintableTimeline
      timeline={timeline}
      squads={squads ?? []}
      rows={rows ?? []}
      backHref={`/timeline/${timeline.id}`}
    />
  );
}

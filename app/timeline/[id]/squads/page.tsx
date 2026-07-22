import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import SquadsManager from './SquadsManager';

export default async function SquadsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: timeline } = await supabase
    .from('timelines').select('*').eq('id', params.id).single();
  if (!timeline) notFound();

  const { data: squads } = await supabase
    .from('squads').select('*').eq('timeline_id', params.id).order('sort_order');

  const isOwner = timeline.owner_id === user.id;

  return (
    <SquadsManager
      timelineId={timeline.id}
      timelineTitle={timeline.title}
      initialSquads={squads ?? []}
      isOwner={isOwner}
    />
  );
}

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createTimeline, signOut } from './actions';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: timelines } = await supabase
    .from('timelines')
    .select('id,title,description,chart_start,chart_end,updated_at')
    .order('updated_at', { ascending: false });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ width: 5, height: 32, background: '#0079c8', borderRadius: 2, marginRight: 12 }} />
        <h1 style={{ fontSize: 24, color: '#0d1846', flex: 1 }}>Your timelines</h1>
        <form action={createTimeline}><button className="btn" type="submit">+ New timeline</button></form>
        <form action={signOut} style={{ marginLeft: 10 }}><button className="btn-ghost btn" type="submit">Sign out</button></form>
      </header>

      {(!timelines || timelines.length === 0) && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#55606c' }}>
          <p style={{ marginBottom: 16 }}>No timelines yet.</p>
          <form action={createTimeline}><button className="btn" type="submit">Create your first timeline</button></form>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {timelines?.map((t) => (
          <Link key={t.id} href={`/timeline/${t.id}`} className="card" style={{ padding: 18, display: 'block', color: 'inherit' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0d1846' }}>{t.title}</div>
            {t.description && <div style={{ fontSize: 13, color: '#55606c', marginTop: 4 }}>{t.description}</div>}
            <div style={{ fontSize: 12, color: '#929ba2', marginTop: 8 }}>
              {t.chart_start} to {t.chart_end}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '34px 34px 60px' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ width: 5, height: 32, background: '#7C6BD6', borderRadius: 3, marginRight: 14 }} />
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45', flex: 1 }}>Your timelines</h1>
        <form action={createTimeline}><button className="btn" type="submit">+ New timeline</button></form>
        <form action={signOut} style={{ marginLeft: 10 }}><button className="btn-ghost btn" type="submit">Sign out</button></form>
      </header>

      {(!timelines || timelines.length === 0) && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#6C6885' }}>
          <p style={{ marginBottom: 18 }}>No timelines yet.</p>
          <form action={createTimeline}><button className="btn" type="submit">Create your first timeline</button></form>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {timelines?.map((t) => (
          <Link key={t.id} href={`/timeline/${t.id}`} className="card timeline-card" style={{ padding: 22, display: 'block' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2E2A45' }}>{t.title}</div>
            {t.description && <div style={{ fontSize: 14, color: '#6C6885', marginTop: 4 }}>{t.description}</div>}
            <div style={{ fontSize: 13, color: '#9490AC', marginTop: 10 }}>
              {t.chart_start} to {t.chart_end}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

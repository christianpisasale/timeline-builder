import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createTimeline, signOut } from './actions';
import { Rag, darkenHex, deriveTimelineState, fmtDateRange, TimelineState } from '@/lib/timeline';

const STATE_META: Record<TimelineState, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#EDEAFA', text: '#5B4FB0' },
  at_risk: { label: 'At risk', bg: '#FBEBCF', text: '#BE8A2A' },
  complete: { label: 'Complete', bg: '#D9F0DE', text: '#3E9558' },
};

type TimelineRow = {
  id: string; title: string; description: string | null;
  chart_start: string; chart_end: string; owner_id: string; updated_at: string;
};
type SquadInfo = { name: string; tint: string; bar_color: string };

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: timelines } = await supabase
    .from('timelines')
    .select('id,title,description,chart_start,chart_end,owner_id,updated_at')
    .order('updated_at', { ascending: false });

  const ids = (timelines ?? []).map((t) => t.id);
  const [{ data: squads }, { data: rows }] = ids.length
    ? await Promise.all([
      supabase.from('squads').select('timeline_id,name,tint,bar_color').in('timeline_id', ids).order('sort_order'),
      supabase.from('rows').select('timeline_id,rag').in('timeline_id', ids),
    ])
    : [{ data: [] }, { data: [] }];

  const squadsByTimeline = new Map<string, SquadInfo[]>();
  for (const s of squads ?? []) {
    const list = squadsByTimeline.get(s.timeline_id) ?? [];
    list.push(s);
    squadsByTimeline.set(s.timeline_id, list);
  }
  const rowsByTimeline = new Map<string, { rag: Rag }[]>();
  for (const r of rows ?? []) {
    const list = rowsByTimeline.get(r.timeline_id) ?? [];
    list.push(r);
    rowsByTimeline.set(r.timeline_id, list);
  }

  const mine = (timelines ?? []).filter((t) => t.owner_id === user.id);
  const others = (timelines ?? []).filter((t) => t.owner_id !== user.id);

  // owner display names — only needed for the "Org timelines" section
  const ownerIds = [...new Set(others.map((t) => t.owner_id))];
  const { data: owners } = ownerIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', ownerIds)
    : { data: [] };
  const ownerNameById = new Map((owners ?? []).map((o) => [o.id, o.full_name || o.email || 'Someone']));

  const total = timelines?.length ?? 0;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 34px 60px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 5, height: 44, borderRadius: 999, background: '#7C6BD6', display: 'inline-block' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.6, color: '#2E2A45' }}>Team timelines</h1>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#9A93BE', background: '#EDEAFA', borderRadius: 999, padding: '4px 12px' }}>{total}</span>
            </div>
            <div style={{ marginTop: 3, fontSize: 14, fontWeight: 600, color: '#8A86A0' }}>Shared across Bupa &middot; everyone can view, only owners can edit</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <form action={signOut}><button style={{ background: 'none', border: 'none', padding: 0, color: '#8A86A0', fontSize: 15, fontWeight: 600 }} type="submit">Sign out</button></form>
          <form action={createTimeline}><button className="btn" type="submit">+ New timeline</button></form>
        </div>
      </header>

      {total === 0 && (
        <div className="card" style={{ padding: '70px 34px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 66, height: 66, borderRadius: 20, background: '#F4F1FC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 26, height: 14, borderRadius: 5, background: 'linear-gradient(180deg, #8E80E0, #8E80E0dd)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45' }}>No timelines yet</div>
          <div style={{ marginTop: 8, fontSize: 15, color: '#6C6885', maxWidth: 360, lineHeight: 1.55 }}>Create your first timeline to start mapping squads and milestones.</div>
          <form action={createTimeline} style={{ marginTop: 24 }}><button className="btn" type="submit">+ New timeline</button></form>
        </div>
      )}

      {total > 0 && (
        <>
          <SectionHeading label="My timelines" count={mine.length} />
          {mine.length === 0 ? (
            <div className="card" style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 40 }}>
              <div style={{ fontSize: 14, color: '#6C6885' }}>You haven&apos;t created any timelines yet.</div>
              <form action={createTimeline}><button className="btn" type="submit">+ New timeline</button></form>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 22, marginBottom: 40 }}>
              {mine.map((t) => (
                <TimelineCard key={t.id} t={t} tSquads={squadsByTimeline.get(t.id) ?? []} tRows={rowsByTimeline.get(t.id) ?? []} />
              ))}
            </div>
          )}

          {others.length > 0 && (
            <>
              <SectionHeading label="Org timelines" count={others.length} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 22 }}>
                {others.map((t) => (
                  <TimelineCard key={t.id} t={t} tSquads={squadsByTimeline.get(t.id) ?? []} tRows={rowsByTimeline.get(t.id) ?? []} ownerName={ownerNameById.get(t.owner_id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2, color: '#2E2A45' }}>{label}</h2>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#9A93BE', background: '#EDEAFA', borderRadius: 999, padding: '3px 10px' }}>{count}</span>
    </div>
  );
}

function TimelineCard({ t, tSquads, tRows, ownerName }: { t: TimelineRow; tSquads: SquadInfo[]; tRows: { rag: Rag }[]; ownerName?: string }) {
  const state = STATE_META[deriveTimelineState(t.chart_end, tRows)];
  return (
    <Link href={`/timeline/${t.id}`} className="card timeline-card" style={{ display: 'flex', flexDirection: 'column', padding: '26px 26px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45' }}>{t.title}</div>
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.3, padding: '5px 12px', borderRadius: 999, background: state.bg, color: state.text }}>{state.label}</span>
      </div>
      {ownerName && (
        <div style={{ marginTop: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, background: '#F1EFFA', color: '#7C6BD6' }}>Owned by {ownerName}</span>
        </div>
      )}
      {t.description && <div style={{ marginTop: ownerName ? 8 : 10, fontSize: 14, lineHeight: 1.55, color: '#6C6885', flex: 1 }}>{t.description}</div>}

      {tSquads.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
          {tSquads.map((sq, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: sq.tint, color: darkenHex(sq.bar_color, 0.35) }}>{sq.name}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTop: '1px solid #F2EFF9' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#6C6885', background: '#FAF9FE', border: '1px solid #F0EDF8', borderRadius: 999, padding: '6px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#8E80E0', display: 'inline-block' }} />
          {fmtDateRange(t.chart_start, t.chart_end)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#9490AC' }}>{tRows.length} {tRows.length === 1 ? 'row' : 'rows'}</span>
      </div>
    </Link>
  );
}

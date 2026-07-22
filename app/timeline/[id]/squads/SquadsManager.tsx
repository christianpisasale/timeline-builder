'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Squad } from '@/lib/timeline';
import ConfirmModal from '@/components/ConfirmModal';

export default function SquadsManager({
  timelineId, timelineTitle, initialSquads, isOwner,
}: { timelineId: string; timelineTitle: string; initialSquads: Squad[]; isOwner: boolean }) {
  const supabase = createClient();
  const [squads, setSquads] = useState<Squad[]>(initialSquads);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function markDirty() { setDirty(true); }

  async function addSquad() {
    const { data } = await supabase.from('squads').insert({
      timeline_id: timelineId, name: 'New squad', tint: '#F4F1FC', bar_color: '#7C6BD6', sort_order: squads.length,
    }).select('*').single();
    if (data) setSquads((ss) => [...ss, data]);
  }
  function updateSquad(id: string, patch: Partial<Squad>) {
    setSquads((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    markDirty();
  }
  async function deleteSquad(id: string) {
    await supabase.from('squads').delete().eq('id', id);
    setSquads((ss) => ss.filter((s) => s.id !== id).map((s, k) => ({ ...s, sort_order: k })));
    markDirty();
  }
  function moveSquad(id: string, dir: -1 | 1) {
    setSquads((ss) => {
      const i = ss.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ss.length) return ss;
      const copy = [...ss];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy.map((s, k) => ({ ...s, sort_order: k }));
    });
    markDirty();
  }

  async function save() {
    setSaving(true);
    try {
      const payload = squads.map((s, k) => ({
        id: s.id, timeline_id: timelineId, name: s.name, tint: s.tint, bar_color: s.bar_color, sort_order: k,
      }));
      const { data } = await supabase.from('squads').upsert(payload).select('*');
      if (data) setSquads(data.sort((a, b) => a.sort_order - b.sort_order));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  // autosave: name/colour/reorder edits flush shortly after the user stops changing them
  useEffect(() => {
    if (!isOwner || !dirty) return;
    const t = setTimeout(() => { save(); }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, squads]);

  const squadToDelete = squads.find((s) => s.id === confirmDeleteId);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 34px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
        <Link href={`/timeline/${timelineId}`} style={{ fontSize: 15, fontWeight: 600 }}>&larr; Back to timeline</Link>
        <div style={{ flex: 1 }} />
        {isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color: dirty || saving ? '#8A86A0' : '#63C29A' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: dirty || saving ? '#8A86A0' : '#63C29A', boxShadow: `0 0 0 4px ${dirty || saving ? '#8A86A029' : '#63C29A29'}` }} />
            {saving ? 'Saving…' : dirty ? 'Unsaved changes…' : 'All changes saved'}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '34px 38px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45', marginBottom: 4 }}>Manage squads</h1>
        <p style={{ fontSize: 14, color: '#6C6885', marginBottom: 24 }}>{timelineTitle}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#9490AC' }}>SQUADS</div>
          {isOwner && <button className="btn" onClick={addSquad}>+ Add squad</button>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 560 }}>
            {squads.map((s) => (
              <div key={s.id} className="row-card" style={{
                display: 'grid', gridTemplateColumns: '52px 1.5fr 70px 70px 40px', gap: 12, alignItems: 'center',
                background: '#FAF9FE', borderRadius: 14, padding: '9px 10px',
              }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  <button className="icon-mini-btn" disabled={!isOwner} onClick={() => moveSquad(s.id, -1)}>↑</button>
                  <button className="icon-mini-btn" disabled={!isOwner} onClick={() => moveSquad(s.id, 1)}>↓</button>
                </div>
                <input value={s.name} disabled={!isOwner} className="bordered-field" onChange={(e) => updateSquad(s.id, { name: e.target.value })} style={inp} />
                <input type="color" value={s.tint} disabled={!isOwner} onChange={(e) => updateSquad(s.id, { tint: e.target.value })} style={colorInp} title="Chip background" />
                <input type="color" value={s.bar_color} disabled={!isOwner} onChange={(e) => updateSquad(s.id, { bar_color: e.target.value })} style={colorInp} title="Bar colour" />
                {isOwner && <button className="icon-delete-btn" title="Delete squad" onClick={() => setConfirmDeleteId(s.id)}>×</button>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Delete squad?"
        message={`Delete "${squadToDelete?.name || 'this squad'}"? Rows using it will be unassigned, not deleted.`}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) deleteSquad(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </div>
  );
}

const inp: React.CSSProperties = { border: '1px solid #E6E3F2', background: '#fff', borderRadius: 10, padding: '9px 11px', fontSize: 14, fontWeight: 500, color: '#3A3654', width: '100%' };
const colorInp: React.CSSProperties = { width: '100%', height: 36, padding: 2, border: '1px solid #E6E3F2', borderRadius: 10, background: '#fff' };

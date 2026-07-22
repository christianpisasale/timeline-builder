'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Squad } from '@/lib/timeline';

export default function SquadsManager({
  timelineId, timelineTitle, initialSquads, isOwner,
}: { timelineId: string; timelineTitle: string; initialSquads: Squad[]; isOwner: boolean }) {
  const supabase = createClient();
  const [squads, setSquads] = useState<Squad[]>(initialSquads);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function markDirty() { setDirty(true); }

  async function addSquad() {
    const { data } = await supabase.from('squads').insert({
      timeline_id: timelineId, name: 'New squad', tint: '#f2f3f6', bar_color: '#0079c8', sort_order: squads.length,
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

  return (
    <div style={{ padding: '20px 28px 60px', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Link href={`/timeline/${timelineId}`} style={{ fontSize: 13, marginRight: 16 }}>&larr; Back to timeline</Link>
        <div style={{ flex: 1 }} />
        {isOwner && (
          <span style={{ fontSize: 12.5, color: '#55606c' }}>
            {saving ? 'Saving…' : dirty ? 'Unsaved changes…' : 'All changes saved'}
          </span>
        )}
      </div>

      <h1 style={{ fontSize: 20, color: '#0d1846', marginBottom: 4 }}>Manage squads</h1>
      <p style={{ fontSize: 13, color: '#55606c', marginBottom: 18 }}>{timelineTitle}</p>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, color: '#0d1846', flex: 1 }}>Squads</h3>
          {isOwner && <button className="btn btn-ghost" onClick={addSquad}>+ Add squad</button>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#55606c' }}>
                <th style={th}></th>
                <th style={th}>Name</th>
                <th style={th}>Tint</th>
                <th style={th}>Bar colour</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {squads.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid #eef1f5' }}>
                  <td style={td}>
                    <button style={mini} disabled={!isOwner} onClick={() => moveSquad(s.id, -1)}>↑</button>
                    <button style={mini} disabled={!isOwner} onClick={() => moveSquad(s.id, 1)}>↓</button>
                  </td>
                  <td style={td}><input value={s.name} disabled={!isOwner} onChange={(e) => updateSquad(s.id, { name: e.target.value })} style={{ ...txt, minWidth: 160 }} /></td>
                  <td style={td}><input type="color" value={s.tint} disabled={!isOwner} onChange={(e) => updateSquad(s.id, { tint: e.target.value })} style={colorInp} /></td>
                  <td style={td}><input type="color" value={s.bar_color} disabled={!isOwner} onChange={(e) => updateSquad(s.id, { bar_color: e.target.value })} style={colorInp} /></td>
                  <td style={td}>{isOwner && <button style={{ ...mini, color: '#d60023' }} onClick={() => deleteSquad(s.id)}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '4px 8px', verticalAlign: 'middle' };
const txt: React.CSSProperties = { padding: '5px 7px', border: '1px solid #dbe1e8', borderRadius: 4, fontSize: 12.5 };
const mini: React.CSSProperties = { border: '1px solid #dbe1e8', background: '#fff', borderRadius: 4, padding: '2px 6px', marginRight: 3, fontSize: 12 };
const colorInp: React.CSSProperties = { width: 40, height: 26, padding: 0, border: '1px solid #dbe1e8', borderRadius: 4 };

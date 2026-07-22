'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Row, Squad, Timeline, Rag, RowState } from '@/lib/timeline';
import TimelineChart from '@/components/TimelineChart';

export default function Editor({
  timeline, initialSquads, initialRows, isOwner,
}: { timeline: Timeline & { owner_id: string }; initialSquads: Squad[]; initialRows: Row[]; isOwner: boolean }) {
  const supabase = createClient();
  const [squads] = useState<Squad[]>(initialSquads);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [title, setTitle] = useState(timeline.title);
  const [description, setDescription] = useState(timeline.description ?? '');
  const [chartStart, setChartStart] = useState(timeline.chart_start);
  const [chartEnd, setChartEnd] = useState(timeline.chart_end);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: 'before' | 'after' } | null>(null);

  const liveTimeline: Timeline = { ...timeline, title, description, chart_start: chartStart, chart_end: chartEnd };

  function markDirty() { setDirty(true); }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markDirty();
  }
  function addRow() {
    const newRow: Row = {
      id: `tmp-${crypto.randomUUID()}`,
      squad_id: squads[0]?.id ?? null,
      sort_order: rows.length,
      milestone: 'New milestone',
      rag: 'green',
      original_start: null, original_finish: null,
      revised_start: chartStart, revised_finish: chartStart,
      is_milestone: true, state: 'active',
    };
    setRows((rs) => [...rs, newRow]);
    markDirty();
  }
  function deleteRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    markDirty();
  }
  function reorderRow(sourceId: string, targetId: string, pos: 'before' | 'after') {
    if (sourceId === targetId) return;
    setRows((rs) => {
      const from = rs.findIndex((r) => r.id === sourceId);
      if (from < 0) return rs;
      const copy = [...rs];
      const [moved] = copy.splice(from, 1);
      let to = copy.findIndex((r) => r.id === targetId);
      if (to < 0) return rs;
      if (pos === 'after') to += 1;
      copy.splice(to, 0, moved);
      return copy.map((r, k) => ({ ...r, sort_order: k }));
    });
    markDirty();
  }

  async function save() {
    setSaving(true);
    try {
      const NIL = '00000000-0000-0000-0000-000000000000';

      // 1. timeline meta
      await supabase.from('timelines').update({
        title, description, chart_start: chartStart, chart_end: chartEnd,
      }).eq('id', timeline.id);

      // 2. delete rows that were removed
      const keepIds = rows.filter((r) => !r.id.startsWith('tmp-')).map((r) => r.id);
      await supabase.from('rows').delete().eq('timeline_id', timeline.id).not('id', 'in', `(${keepIds.length ? keepIds.join(',') : NIL})`);

      // 3. upsert current rows (new ones get real ids)
      const payload = rows.map((r, k) => {
        const base = {
          timeline_id: timeline.id, squad_id: r.squad_id, sort_order: k,
          milestone: r.milestone, rag: r.rag,
          original_start: r.original_start, original_finish: r.original_finish,
          revised_start: r.revised_start, revised_finish: r.revised_finish,
          is_milestone: r.is_milestone, state: r.state,
        };
        return r.id.startsWith('tmp-') ? base : { ...base, id: r.id };
      });
      const { data: saved } = await supabase.from('rows').upsert(payload).select('*');
      if (saved) setRows(saved.sort((a, b) => a.sort_order - b.sort_order));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  // autosave: any change to timeline meta or rows flushes shortly after the
  // user stops typing/dragging, instead of requiring a manual save click.
  useEffect(() => {
    if (!isOwner || !dirty) return;
    const t = setTimeout(() => { save(); }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, description, chartStart, chartEnd, rows]);

  return (
    <div style={{ padding: '20px 28px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Link href="/" style={{ fontSize: 13, marginRight: 16 }}>&larr; All timelines</Link>
        {isOwner && (
          <Link href={`/timeline/${timeline.id}/squads`} style={{ fontSize: 13 }}>Manage squads</Link>
        )}
        <div style={{ flex: 1 }} />
        {isOwner && (
          <span style={{ fontSize: 12.5, color: '#55606c' }}>
            {saving ? 'Saving…' : dirty ? 'Unsaved changes…' : 'All changes saved'}
          </span>
        )}
      </div>

      {/* meta */}
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <input value={title} disabled={!isOwner}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          style={{ fontSize: 22, fontWeight: 700, color: '#0d1846', border: 'none', width: '100%', outline: 'none' }} />
        <textarea value={description} disabled={!isOwner} placeholder="Description shown above the timeline..."
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
          style={{ fontSize: 13, color: '#55606c', border: 'none', width: '100%', outline: 'none', resize: 'vertical', marginTop: 6, minHeight: 36 }} />
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12.5 }}>
          <label>Chart start <input type="date" value={chartStart} disabled={!isOwner} onChange={(e) => { setChartStart(e.target.value); markDirty(); }} style={dateInp} /></label>
          <label>Chart end <input type="date" value={chartEnd} disabled={!isOwner} onChange={(e) => { setChartEnd(e.target.value); markDirty(); }} style={dateInp} /></label>
        </div>
      </div>

      {/* chart preview */}
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <TimelineChart timeline={liveTimeline} squads={squads} rows={rows} />
      </div>

      {/* row editor */}
      {isOwner && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, color: '#0d1846', flex: 1 }}>Rows</h3>
            <button className="btn btn-ghost" onClick={addRow}>+ Add row</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#55606c' }}>
                  <th style={th}></th>
                  <th style={th}>Squad</th>
                  <th style={th}>RAG</th>
                  <th style={th}>Type</th>
                  <th style={th}>Milestone</th>
                  <th style={th}>Orig start</th>
                  <th style={th}>Orig finish</th>
                  <th style={th}>Rev start</th>
                  <th style={th}>Rev finish</th>
                  <th style={th}>State</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                      setDropTarget({ id: r.id, pos });
                    }}
                    onDrop={() => {
                      if (dragRowId) reorderRow(dragRowId, r.id, dropTarget?.pos ?? 'before');
                      setDragRowId(null);
                      setDropTarget(null);
                    }}
                    style={{
                      borderTop: dropTarget?.id === r.id && dropTarget.pos === 'before' ? '2px solid #0079c8' : '1px solid #eef1f5',
                      borderBottom: dropTarget?.id === r.id && dropTarget.pos === 'after' ? '2px solid #0079c8' : undefined,
                      opacity: dragRowId === r.id ? 0.4 : 1,
                    }}
                  >
                    <td style={td}>
                      <span
                        draggable
                        onDragStart={() => setDragRowId(r.id)}
                        onDragEnd={() => { setDragRowId(null); setDropTarget(null); }}
                        style={{ ...mini, cursor: 'grab', display: 'inline-block' }}
                        title="Drag to reorder"
                      >⠿</span>
                    </td>
                    <td style={td}>
                      <select value={r.squad_id ?? ''} onChange={(e) => updateRow(r.id, { squad_id: e.target.value || null })} style={sel}>
                        {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <select value={r.rag} onChange={(e) => updateRow(r.id, { rag: e.target.value as Rag })} style={sel}>
                        <option value="green">G</option><option value="amber">A</option>
                        <option value="red">R</option><option value="none">-</option>
                      </select>
                    </td>
                    <td style={td}>
                      <select value={r.is_milestone ? 'm' : 'b'} onChange={(e) => updateRow(r.id, { is_milestone: e.target.value === 'm' })} style={sel}>
                        <option value="b">Bar</option><option value="m">Milestone</option>
                      </select>
                    </td>
                    <td style={td}><input value={r.milestone} onChange={(e) => updateRow(r.id, { milestone: e.target.value })} style={{ ...txt, minWidth: 220 }} /></td>
                    <td style={td}><input type="date" value={r.original_start ?? ''} onChange={(e) => updateRow(r.id, { original_start: e.target.value || null })} style={txt} /></td>
                    <td style={td}><input type="date" value={r.original_finish ?? ''} onChange={(e) => updateRow(r.id, { original_finish: e.target.value || null })} style={txt} /></td>
                    <td style={td}><input type="date" value={r.revised_start ?? ''} onChange={(e) => updateRow(r.id, { revised_start: e.target.value || null })} style={txt} /></td>
                    <td style={td}><input type="date" value={r.revised_finish ?? ''} onChange={(e) => updateRow(r.id, { revised_finish: e.target.value || null })} style={txt} /></td>
                    <td style={td}>
                      <select value={r.state} onChange={(e) => updateRow(r.id, { state: e.target.value as RowState })} style={sel}>
                        <option value="active">Active</option><option value="done">Done</option><option value="external">External</option>
                      </select>
                    </td>
                    <td style={td}><button style={{ ...mini, color: '#d60023' }} onClick={() => deleteRow(r.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const dateInp: React.CSSProperties = { marginLeft: 6, padding: '4px 6px', border: '1px solid #c8d0da', borderRadius: 4 };
const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '4px 8px', verticalAlign: 'middle' };
const txt: React.CSSProperties = { padding: '5px 7px', border: '1px solid #dbe1e8', borderRadius: 4, fontSize: 12.5 };
const sel: React.CSSProperties = { padding: '5px 6px', border: '1px solid #dbe1e8', borderRadius: 4, fontSize: 12.5, background: '#fff' };
const mini: React.CSSProperties = { border: '1px solid #dbe1e8', background: '#fff', borderRadius: 4, padding: '2px 6px', marginRight: 3, fontSize: 12 };

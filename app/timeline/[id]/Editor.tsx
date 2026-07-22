'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Row, Squad, Timeline, Rag, RowState } from '@/lib/timeline';
import TimelineChart from '@/components/TimelineChart';
import ConfirmModal from '@/components/ConfirmModal';

function isInvalidRange(start: string | null, finish: string | null) {
  return !!(start && finish && finish < start);
}

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
  const [showRevised, setShowRevised] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const liveTimeline: Timeline = { ...timeline, title, description, chart_start: chartStart, chart_end: chartEnd };

  const hasInvalidDates =
    isInvalidRange(chartStart, chartEnd) ||
    rows.some((r) => isInvalidRange(r.original_start, r.original_finish) || isInvalidRange(r.revised_start, r.revised_finish));

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
      revised_start: null, revised_finish: null,
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
  // Held back while any finish date precedes its start date, so invalid
  // ranges never get persisted mid-edit.
  useEffect(() => {
    if (!isOwner || !dirty || hasInvalidDates) return;
    const t = setTimeout(() => { save(); }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, description, chartStart, chartEnd, rows, hasInvalidDates]);

  const rowToDelete = rows.find((r) => r.id === confirmDeleteId);
  const gridCols = showRevised
    ? '30px 150px 84px 130px 1.5fr 160px 160px 160px 160px 130px 40px'
    : '30px 150px 84px 130px 1.5fr 160px 160px 130px 40px';

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 34px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <Link href="/" style={{ fontSize: 15, fontWeight: 600 }}>&larr; All timelines</Link>
          {isOwner && (
            <Link href={`/timeline/${timeline.id}/squads`} style={{ fontSize: 15, fontWeight: 600 }}>Manage squads</Link>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {isOwner && <SaveStatus saving={saving} dirty={dirty} invalid={hasInvalidDates} />}
      </div>

      {/* meta */}
      <div className="card" style={{ padding: '34px 38px', marginBottom: 22 }}>
        <input value={title} disabled={!isOwner} className="editable-field"
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, color: '#2E2A45', width: '100%' }} />
        <textarea value={description} disabled={!isOwner} placeholder="Description shown above the timeline..." className="bordered-field"
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
          rows={2}
          style={{ marginTop: 14, border: '1px solid #ECE9F6', background: '#FAF9FE', borderRadius: 14, padding: '12px 15px', fontSize: 15, color: '#6C6885', width: '100%', resize: 'vertical', lineHeight: 1.5 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, marginTop: 22, flexWrap: 'wrap' }}>
          <label style={dateLabel}>Chart start
            <input type="date" value={chartStart} disabled={!isOwner} onChange={(e) => { setChartStart(e.target.value); markDirty(); }} className="bordered-field" style={dateInp} />
          </label>
          <label style={dateLabel}>Chart end
            <input type="date" value={chartEnd} disabled={!isOwner} onChange={(e) => { setChartEnd(e.target.value); markDirty(); }} className="bordered-field"
              style={isInvalidRange(chartStart, chartEnd) ? invalidDateInp : dateInp} title={isInvalidRange(chartStart, chartEnd) ? "Chart end can't be before chart start" : undefined} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, color: '#4B4763', cursor: 'pointer', paddingBottom: 10 }}>
            <input type="checkbox" checked={showRevised} onChange={(e) => setShowRevised(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#7C6BD6', cursor: 'pointer' }} />
            Show revised dates
          </label>
        </div>
      </div>

      {/* chart preview */}
      <div className="card" style={{ padding: 26, marginBottom: 22 }}>
        <TimelineChart timeline={liveTimeline} squads={squads} rows={rows} showRevised={showRevised} />
      </div>

      {/* row editor */}
      {isOwner && (
        <div className="card" style={{ padding: '30px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45' }}>Rows</h3>
            <button className="btn" onClick={addRow}>+ Add row</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: showRevised ? 1400 : 1100 }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 12, alignItems: 'center', padding: '0 6px 10px' }}>
                <div />
                <GridLabel>SQUAD</GridLabel>
                <GridLabel>RAG</GridLabel>
                <GridLabel>TYPE</GridLabel>
                <GridLabel>MILESTONE</GridLabel>
                <GridLabel>START DATE</GridLabel>
                <GridLabel>FINISH DATE</GridLabel>
                {showRevised && (
                  <>
                    <GridLabel>REVISED START</GridLabel>
                    <GridLabel>REVISED FINISH</GridLabel>
                  </>
                )}
                <GridLabel>STATE</GridLabel>
                <div />
              </div>

              {rows.map((r) => {
                const origInvalid = isInvalidRange(r.original_start, r.original_finish);
                const revInvalid = isInvalidRange(r.revised_start, r.revised_finish);
                return (
                  <div
                    key={r.id}
                    className="row-card"
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
                      display: 'grid', gridTemplateColumns: gridCols, gap: 12, alignItems: 'center',
                      background: '#FAF9FE', borderRadius: 14, padding: '9px 6px 9px 4px',
                      opacity: dragRowId === r.id ? 0.4 : 1,
                      // longhand-only override, kept separate from the row-card class's
                      // shorthand `border` so React never sees both on the same style object
                      ...(dropTarget?.id === r.id ? {
                        borderLeft: '1px solid #7C6BD6',
                        borderRight: '1px solid #7C6BD6',
                        borderTop: dropTarget.pos === 'before' ? '2px solid #7C6BD6' : '1px solid #7C6BD6',
                        borderBottom: dropTarget.pos === 'after' ? '2px solid #7C6BD6' : '1px solid #7C6BD6',
                      } : {}),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div
                        draggable
                        onDragStart={() => setDragRowId(r.id)}
                        onDragEnd={() => { setDragRowId(null); setDropTarget(null); }}
                        style={{ width: 10, height: 16, backgroundImage: 'radial-gradient(#CBC6DE 1.4px, transparent 1.5px)', backgroundSize: '5px 5px', cursor: 'grab' }}
                        title="Drag to reorder"
                      />
                    </div>
                    <select value={r.squad_id ?? ''} onChange={(e) => updateRow(r.id, { squad_id: e.target.value || null })} className="bordered-field" style={sel}>
                      {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={r.rag} onChange={(e) => updateRow(r.id, { rag: e.target.value as Rag })} className="bordered-field" style={sel}>
                      <option value="green">G</option><option value="amber">A</option>
                      <option value="red">R</option><option value="none">-</option>
                    </select>
                    <select value={r.is_milestone ? 'm' : 'b'} onChange={(e) => updateRow(r.id, { is_milestone: e.target.value === 'm' })} className="bordered-field" style={sel}>
                      <option value="b">Bar</option><option value="m">Milestone</option>
                    </select>
                    <input value={r.milestone} onChange={(e) => updateRow(r.id, { milestone: e.target.value })} className="bordered-field" style={inp} />
                    <input type="date" value={r.original_start ?? ''} onChange={(e) => updateRow(r.id, { original_start: e.target.value || null })} className="bordered-field" style={inp} />
                    <input type="date" value={r.original_finish ?? ''} onChange={(e) => updateRow(r.id, { original_finish: e.target.value || null })}
                      className="bordered-field" style={origInvalid ? invalidInp : inp} title={origInvalid ? "Finish date can't be before start date" : undefined} />
                    {showRevised && (
                      <>
                        <input type="date" value={r.revised_start ?? ''} onChange={(e) => updateRow(r.id, { revised_start: e.target.value || null })} className="bordered-field" style={inp} />
                        <input type="date" value={r.revised_finish ?? ''} onChange={(e) => updateRow(r.id, { revised_finish: e.target.value || null })}
                          className="bordered-field" style={revInvalid ? invalidInp : inp} title={revInvalid ? "Revised finish can't be before revised start" : undefined} />
                      </>
                    )}
                    <select value={r.state} onChange={(e) => updateRow(r.id, { state: e.target.value as RowState })} className="bordered-field" style={sel}>
                      <option value="active">Active</option><option value="done">Done</option><option value="external">External</option>
                    </select>
                    <button className="icon-delete-btn" title="Delete row" onClick={() => setConfirmDeleteId(r.id)}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Delete row?"
        message={`Delete "${rowToDelete?.milestone || 'this row'}"? This can't be undone.`}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) deleteRow(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </div>
  );
}

function SaveStatus({ saving, dirty, invalid }: { saving: boolean; dirty: boolean; invalid: boolean }) {
  const label = invalid ? 'Fix invalid dates to save' : saving ? 'Saving…' : dirty ? 'Unsaved changes…' : 'All changes saved';
  const color = invalid ? '#D9776F' : dirty || saving ? '#8A86A0' : '#63C29A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, boxShadow: `0 0 0 4px ${color}29` }} />
      {label}
    </div>
  );
}

function GridLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#9490AC' }}>{children}</div>;
}

const dateLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, fontWeight: 600, color: '#8A86A0' };
const dateInp: React.CSSProperties = { border: '1px solid #E6E3F2', background: '#FAF9FE', borderRadius: 11, padding: '10px 13px', fontSize: 15, fontWeight: 600, color: '#2E2A45' };
const invalidDateInp: React.CSSProperties = { ...dateInp, border: '1px solid #D9776F', background: '#FCEDED' };
const sel: React.CSSProperties = { border: '1px solid #E6E3F2', background: '#fff', borderRadius: 10, padding: '9px 10px', fontSize: 14, fontWeight: 600, color: '#3A3654', cursor: 'pointer', width: '100%' };
const inp: React.CSSProperties = { border: '1px solid #E6E3F2', background: '#fff', borderRadius: 10, padding: '9px 11px', fontSize: 14, fontWeight: 500, color: '#3A3654', width: '100%' };
const invalidInp: React.CSSProperties = { ...inp, border: '1px solid #D9776F', background: '#FCEDED' };

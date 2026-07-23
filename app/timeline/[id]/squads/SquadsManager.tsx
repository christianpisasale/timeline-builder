'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Squad, SQUAD_TINTS, SQUAD_BARS, darkenHex } from '@/lib/timeline';
import ConfirmModal from '@/components/ConfirmModal';

export default function SquadsManager({
  timelineId, timelineTitle, initialSquads, isOwner,
}: { timelineId: string; timelineTitle: string; initialSquads: Squad[]; isOwner: boolean }) {
  const supabase = createClient();
  const [squads, setSquads] = useState<Squad[]>(initialSquads);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    if (!openKey) return;
    function onDocClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-swatch-picker]')) setOpenKey(null);
    }
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, [openKey]);

  function markDirty() { setDirty(true); }

  async function addSquad() {
    const { data } = await supabase.from('squads').insert({
      timeline_id: timelineId, name: 'New squad', tint: SQUAD_TINTS[0], bar_color: SQUAD_BARS[0], sort_order: squads.length,
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
  const statColor = saving ? '#8A86A0' : dirty ? '#8A86A0' : '#63C29A';
  const statDot = saving ? '#B9A96B' : dirty ? '#C9C2E4' : '#63C29A';
  const statGlow = saving ? 'rgba(185,169,107,.2)' : dirty ? 'rgba(201,194,228,.3)' : 'rgba(99,194,154,.16)';
  const statLabel = saving ? 'Saving…' : dirty ? 'Unsaved changes…' : 'All changes saved';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 34px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
        <Link href={`/timeline/${timelineId}`} style={{ fontSize: 15, fontWeight: 600 }}>&larr; Back to timeline</Link>
        <div style={{ flex: 1 }} />
        {isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color: statColor }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: statDot, boxShadow: `0 0 0 4px ${statGlow}` }} />
            {statLabel}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '34px 38px' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
          <span style={{ width: 5, borderRadius: 999, background: '#7C6BD6', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: '#2E2A45' }}>Manage squads</h1>
            <div style={{ marginTop: 3, fontSize: 15, fontWeight: 600, color: '#8A86A0' }}>{timelineTitle} &middot; {squads.length} squad{squads.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color: '#9490AC' }}>SQUADS</div>
          {isOwner && <button className="btn" onClick={addSquad}>+ Add squad</button>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 660 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px 8px', border: '1px solid transparent' }}>
              <div style={{ width: 74 }} />
              <div style={{ flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#9490AC' }}>NAME</div>
              <div style={{ width: 96, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#9490AC' }}>TINT</div>
              <div style={{ width: 96, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#9490AC' }}>BAR</div>
              <div style={{ width: 120, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#9490AC' }}>PREVIEW</div>
              <div style={{ width: 34 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {squads.map((s, i) => (
                <div key={s.id} className="row-card" style={{
                  display: 'flex', alignItems: 'center', gap: 14, background: '#FAF9FE', borderRadius: 16, padding: '12px 14px',
                }}>
                  <div style={{ width: 74, display: 'flex', gap: 6 }}>
                    <button className="icon-mini-btn" style={miniNav} disabled={!isOwner || i === 0} onClick={() => moveSquad(s.id, -1)} title="Move up">↑</button>
                    <button className="icon-mini-btn" style={miniNav} disabled={!isOwner || i === squads.length - 1} onClick={() => moveSquad(s.id, 1)} title="Move down">↓</button>
                  </div>

                  <input value={s.name} disabled={!isOwner} className="bordered-field" onChange={(e) => updateSquad(s.id, { name: e.target.value })} style={{ ...inp, flex: 1, minWidth: 0 }} placeholder="Squad name" />

                  <SwatchPicker
                    width={96} color={s.tint} disabled={!isOwner}
                    open={openKey === `${s.id}:chip`} onToggle={() => setOpenKey((k) => (k === `${s.id}:chip` ? null : `${s.id}:chip`))}
                    palette={SQUAD_TINTS} activeBorder="#7C6BD6"
                    onPick={(c) => { updateSquad(s.id, { tint: c }); setOpenKey(null); }}
                  />
                  <SwatchPicker
                    width={96} color={s.bar_color} disabled={!isOwner}
                    open={openKey === `${s.id}:bar`} onToggle={() => setOpenKey((k) => (k === `${s.id}:bar` ? null : `${s.id}:bar`))}
                    palette={SQUAD_BARS} activeBorder="#2E2A45"
                    onPick={(c) => { updateSquad(s.id, { bar_color: c }); setOpenKey(null); }}
                  />

                  <div style={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.tint, color: darkenHex(s.bar_color, 0.35), maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <span style={{ display: 'block', width: 80, height: 12, borderRadius: 4, background: s.bar_color }} />
                  </div>

                  {isOwner && (
                    <button className="icon-delete-btn" style={{ width: 34, height: 34 }} title="Delete squad" onClick={() => setConfirmDeleteId(s.id)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2 L12 12 M12 2 L2 12" stroke="#D9776F" strokeWidth={2} strokeLinecap="round" /></svg>
                    </button>
                  )}
                </div>
              ))}

              {squads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9490AC', fontSize: 15, fontWeight: 600 }}>
                  No squads yet — add one to start tagging milestones.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDeleteId}
        title={`Delete "${squadToDelete?.name || 'this squad'}"?`}
        message={<>Rows using this squad will be <strong style={{ color: '#4B4763' }}>unassigned</strong>, not deleted. This can&apos;t be undone.</>}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) deleteSquad(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </div>
  );
}

function SwatchPicker({
  width, color, disabled, open, onToggle, palette, activeBorder, onPick,
}: { width: number; color: string; disabled: boolean; open: boolean; onToggle: () => void; palette: string[]; activeBorder: string; onPick: (c: string) => void }) {
  return (
    <div data-swatch-picker style={{ width, position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <button
        type="button" title="Choose colour" disabled={disabled} onClick={onToggle}
        style={{ width: 52, height: 34, borderRadius: 10, background: color, border: '1px solid rgba(0,0,0,.06)', cursor: disabled ? 'default' : 'pointer', padding: 0 }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: 46, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
          background: '#fff', border: '1px solid #ECE9F6', borderRadius: 16, padding: 12,
          boxShadow: '0 16px 40px rgba(88,74,140,.16)', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, width: 196,
        }}>
          {palette.map((c) => (
            <button
              key={c} type="button" onClick={() => onPick(c)}
              style={{ width: '100%', height: 28, borderRadius: 7, background: c, border: c === color ? `2px solid ${activeBorder}` : '1px solid #ECE9F6', cursor: 'pointer', padding: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { border: '1px solid #E6E3F2', background: '#fff', borderRadius: 10, padding: '9px 11px', fontSize: 14, fontWeight: 500, color: '#3A3654', width: '100%' };
const miniNav: React.CSSProperties = { width: 34, height: 34, borderRadius: 10 };

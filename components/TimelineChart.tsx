'use client';
import React from 'react';
import {
  Row, Squad, Timeline, RAG_META,
  fmtDate, parseDate, darkenHex,
} from '@/lib/timeline';

const TRACK_W = 640;
const COL = { squad: 120, rag: 58, milestone: 150, date: 70, revDate: 88 };
const LABEL_MIN_W = COL.squad + COL.rag + COL.milestone + COL.date * 2;
const REVISED_MIN_W = COL.revDate * 2;
const COL_BORDER = '1px solid #EFEBF7';

export default function TimelineChart({
  timeline, squads, rows, showRevised = false,
}: { timeline: Timeline; squads: Squad[]; rows: Row[]; showRevised?: boolean }) {
  const squadById = new Map(squads.map((s) => [s.id, s]));
  const labelMinWidth = LABEL_MIN_W + (showRevised ? REVISED_MIN_W : 0);

  // chart order always mirrors the table's manual drag order
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  const cs = parseDate(timeline.chart_start).getTime();
  const ce = parseDate(timeline.chart_end).getTime();
  const range = ce - cs;
  const valid = range > 0;
  const pctOf = (d: Date) => ((d.getTime() - cs) / range) * 100;

  // month header segments
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const months: { label: string; from: number; to: number }[] = [];
  if (valid) {
    const start = parseDate(timeline.chart_start);
    const end = parseDate(timeline.chart_end);
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const mStart = cur < start ? start : cur;
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const segEnd = mEnd > end ? end : mEnd;
      months.push({ label: MON[cur.getMonth()], from: pctOf(mStart), to: pctOf(segEnd) });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  // today line
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayInRange = valid && today.getTime() >= cs && today.getTime() <= ce;
  const todayLeft = `${pctOf(today)}%`;

  // weekly gridlines + week-start ticks, anchored to Monday
  const totalDaysMs = valid ? range / 86400000 : 1;
  const startDow = valid ? parseDate(timeline.chart_start).getDay() : 1;
  const addToMonday = (1 - startDow + 7) % 7;
  const weekPx = (TRACK_W * 7) / totalDaysMs;
  const offsetPx = (TRACK_W * addToMonday) / totalDaysMs;
  const gridBg = `repeating-linear-gradient(to right, rgba(107,90,201,.10) 0, rgba(107,90,201,.10) 1px, transparent 1px, transparent ${weekPx}px)`;
  const trackBg: React.CSSProperties = { backgroundImage: gridBg, backgroundPosition: `${offsetPx}px 0` };

  const weeks: { label: string; left: number }[] = [];
  if (valid) {
    const start = parseDate(timeline.chart_start);
    const end = parseDate(timeline.chart_end);
    let t = new Date(start.getFullYear(), start.getMonth(), start.getDate() + addToMonday);
    while (t <= end) {
      weeks.push({ label: String(t.getDate()), left: pctOf(t) });
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7);
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: labelMinWidth + TRACK_W }}>
        {/* month strip */}
        <div style={{ display: 'flex', marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: labelMinWidth }} />
          <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px`, position: 'relative', height: 34, borderBottom: '1px solid #E7E3F5' }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, bottom: 0, left: `${m.from}%`,
                width: `${m.to - m.from}%`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: '#9A93BE',
                background: i % 2 ? 'transparent' : 'rgba(124,107,214,.05)', borderLeft: '1px solid #E1DCEF',
              }}>{m.label}</div>
            ))}
            {todayInRange && <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 0, borderLeft: '1.5px dashed #B5ADD6' }} />}
          </div>
        </div>

        {/* week row */}
        <div style={{ display: 'flex', marginBottom: 2 }}>
          <div style={{ flex: 1, minWidth: labelMinWidth }} />
          <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px`, position: 'relative', height: 22, borderBottom: '1px solid #E7E3F5', ...trackBg }}>
            {weeks.map((w, i) => (
              <div key={i} style={{ position: 'absolute', left: `${w.left}%`, top: 4, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 600, color: '#A79ED0', fontVariantNumeric: 'tabular-nums' }}>{w.label}</div>
            ))}
          </div>
        </div>

        {/* column header */}
        <div style={{ display: 'flex', background: '#F4F1FC', height: 40, alignItems: 'center', borderTop: '1px solid #E7E3F5', borderBottom: '1px solid #E7E3F5' }}>
          <div style={{ flex: 1, minWidth: labelMinWidth, display: 'flex', alignItems: 'center' }}>
            <HeaderCell w={COL.squad} align="left">SQUAD</HeaderCell>
            <HeaderCell w={COL.rag}>RAG</HeaderCell>
            <HeaderCell w={COL.milestone} grow align="left">MILESTONES</HeaderCell>
            <HeaderCell w={COL.date} border>START</HeaderCell>
            <HeaderCell w={COL.date} border>FINISH</HeaderCell>
            {showRevised && (
              <>
                <HeaderCell w={COL.revDate} border color="#A79ED0">REV START</HeaderCell>
                <HeaderCell w={COL.revDate} border color="#A79ED0">REV FINISH</HeaderCell>
              </>
            )}
          </div>
          <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px` }} />
        </div>

        {/* empty state */}
        {sorted.length === 0 && (
          <div style={{ padding: '56px 20px', textAlign: 'center', color: '#9490AC', fontSize: 16, fontWeight: 600 }}>
            No rows yet — add your first row below to get started
          </div>
        )}

        {/* rows */}
        {sorted.map((r, i) => {
          const sq = r.squad_id ? squadById.get(r.squad_id) : undefined;
          const rag = RAG_META[r.rag];
          const done = r.state === 'done';
          const external = r.state === 'external';
          const zebra = i % 2 ? 'transparent' : '#FBFAFE';
          return (
            <div key={r.id} style={{ display: 'flex', height: 38, alignItems: 'center', borderBottom: '1px solid #F2EFF9', background: zebra }}>
              <div style={{ flex: 1, minWidth: labelMinWidth, display: 'flex', alignItems: 'center' }}>
                <Cell w={COL.squad} align="left">
                  {external ? (
                    <span style={chipStyle('#F4F1FC', '#9490AC', true)}>External</span>
                  ) : sq ? (
                    <span style={chipStyle(sq.tint, darkenHex(sq.bar_color, 0.35), false)}>{sq.name}</span>
                  ) : null}
                </Cell>
                <Cell w={COL.rag}>
                  {done ? (
                    <span style={badgeStyle('#D9F0DE', '#3E9558')}>✓</span>
                  ) : (
                    <span style={badgeStyle(rag.bg, rag.text)}>{rag.letter}</span>
                  )}
                </Cell>
                <Cell w={COL.milestone} grow align="left" style={{
                  fontWeight: 600, fontSize: 14,
                  fontStyle: external ? 'italic' : 'normal',
                  color: external ? '#9490AC' : done ? '#8A86A0' : '#3A3654',
                  opacity: done ? 0.85 : 1,
                  textDecoration: done ? 'line-through' : 'none',
                  textDecorationColor: done ? '#C9C2E4' : undefined,
                }}>
                  {r.milestone}
                </Cell>
                <Cell w={COL.date} border style={{ color: '#6C6885', fontWeight: 600, fontSize: 13 }}>{fmtDate(r.original_start) || '—'}</Cell>
                <Cell w={COL.date} border style={{ color: '#6C6885', fontWeight: 600, fontSize: 13 }}>{fmtDate(r.original_finish) || '—'}</Cell>
                {showRevised && (
                  <>
                    <Cell w={COL.revDate} border style={{ color: '#8A82AE', fontWeight: 600, fontSize: 14 }}>{fmtDate(r.revised_start) || '—'}</Cell>
                    <Cell w={COL.revDate} border style={{ color: '#8A82AE', fontWeight: 600, fontSize: 14 }}>{fmtDate(r.revised_finish) || '—'}</Cell>
                  </>
                )}
              </div>

              {/* track: clipped so bars/baselines for dates outside the chart
                  window are cut off here instead of bleeding into the label
                  columns to the left */}
              <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px`, position: 'relative', height: '100%', overflow: 'hidden', borderLeft: '1px solid #E7E3F5', ...trackBg }}>
                {todayInRange && <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 0, borderLeft: '1.5px dashed #B5ADD6' }} />}
                {renderMarkers(r, sq, done, external, showRevised, pctOf, valid)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Rect = { center: number } | { left: number; width: number };

function markerRect(startIso: string | null, finishIso: string | null, isDiamond: boolean, pctOf: (d: Date) => number): Rect | null {
  if (isDiamond) {
    const iso = startIso || finishIso;
    if (!iso) return null;
    const p = pctOf(parseDate(iso));
    if (p < 0 || p > 100) return null;
    return { center: p };
  }
  if (!startIso || !finishIso) return null;
  const ds = parseDate(startIso), df = parseDate(finishIso);
  if (df < ds) return null;
  let l = pctOf(ds), r = pctOf(df);
  if (r <= 0 || l >= 100) return null;
  l = Math.max(l, 0); r = Math.min(r, 100);
  return { left: l, width: Math.max(r - l, 0.6) };
}

function markerStyle(rect: Rect, variant: 'solid' | 'done' | 'outline', color: string, chip: string, isDiamond: boolean, zIndex: number): React.CSSProperties {
  const geom: React.CSSProperties = isDiamond
    ? { position: 'absolute', top: '50%', left: `${(rect as { center: number }).center}%`, width: 14, height: 14, transform: 'translate(-50%,-50%) rotate(45deg)', borderRadius: 2, zIndex }
    : { position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${(rect as { left: number }).left}%`, width: `${(rect as { width: number }).width}%`, height: 15, borderRadius: 3, zIndex };
  if (variant === 'outline') return { ...geom, background: 'transparent', border: `1.5px dashed ${color}` };
  if (variant === 'done') return {
    ...geom, backgroundColor: chip,
    backgroundImage: `repeating-linear-gradient(45deg, ${color}55 0, ${color}55 2px, transparent 2px, transparent 5px)`,
    border: `1.5px solid ${color}`,
  };
  return { ...geom, background: color };
}

function renderMarkers(
  r: Row, sq: Squad | undefined, done: boolean, external: boolean, showRevised: boolean,
  pctOf: (d: Date) => number, valid: boolean,
) {
  if (!valid) return null;
  const color = sq?.bar_color ?? '#7C6BD6';
  const chip = sq?.tint ?? '#F4F1FC';
  const isDiamond = r.is_milestone;
  const filled = done ? 'done' : 'solid';

  const origRect = markerRect(r.original_start, r.original_finish, isDiamond, pctOf);
  const revValid = !r.revised_finish || !r.revised_start || parseDate(r.revised_finish) >= parseDate(r.revised_start);
  const revActive = showRevised && !!(r.revised_start || r.revised_finish) && revValid;
  const revRect = revActive ? markerRect(r.revised_start || r.revised_finish, r.revised_finish || r.revised_start, isDiamond, pctOf) : null;

  // when a revised range is active, the revised marker becomes the solid/real
  // one and the original drops back to a dashed outline; otherwise original is solid.
  const origVariant = (revActive && revRect) ? 'outline' : external ? 'outline' : filled;
  const revVariant = external ? 'outline' : filled;

  return (
    <>
      {origRect && (
        <div title={isDiamond ? fmtDate(r.original_start) : `${fmtDate(r.original_start)} - ${fmtDate(r.original_finish)}`}
          style={markerStyle(origRect, origVariant, color, chip, isDiamond, 2)} />
      )}
      {revActive && revRect && (
        <div title={`Revised: ${isDiamond ? fmtDate(r.revised_start) : `${fmtDate(r.revised_start)} - ${fmtDate(r.revised_finish)}`}`}
          style={markerStyle(revRect, revVariant, color, chip, isDiamond, 3)} />
      )}
    </>
  );
}

function chipStyle(bg: string, text: string, italic: boolean): React.CSSProperties {
  return { display: 'inline-block', padding: '2px 9px', borderRadius: 4, fontSize: italic ? 11 : 12, fontWeight: 700, fontStyle: italic ? 'italic' : 'normal', background: bg, color: text, whiteSpace: 'nowrap' };
}
function badgeStyle(bg: string, text: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 999, fontSize: 12, fontWeight: 800, background: bg, color: text };
}

function HeaderCell({ w, children, align = 'center', grow = false, border = false, color = '#8A82AE' }: { w: number; children: React.ReactNode; align?: 'left' | 'center'; grow?: boolean; border?: boolean; color?: string }) {
  return (
    <div style={{ flex: grow ? `1 1 ${w}px` : `0 0 ${w}px`, minWidth: grow ? w : undefined, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color, borderLeft: border ? COL_BORDER : undefined }}>
      {children}
    </div>
  );
}
function Cell({ w, children, style = {}, align = 'center', grow = false, border = false }: { w: number; children: React.ReactNode; style?: React.CSSProperties; align?: 'left' | 'center'; grow?: boolean; border?: boolean }) {
  return (
    <div style={{ flex: grow ? `1 1 ${w}px` : `0 0 ${w}px`, minWidth: grow ? w : undefined, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: border ? COL_BORDER : undefined, ...style }}>
      {children}
    </div>
  );
}

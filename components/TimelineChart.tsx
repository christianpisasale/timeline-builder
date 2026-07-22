'use client';
import React from 'react';
import {
  Row, Squad, Timeline, RAG_META,
  dayIndex, totalDays, pct, fmtDate, effectiveDates, hasSlippage, parseDate,
} from '@/lib/timeline';

const NAVY = '#0d1846';

export default function TimelineChart({
  timeline, squads, rows,
}: { timeline: Timeline; squads: Squad[]; rows: Row[] }) {
  const days = totalDays(timeline.chart_start, timeline.chart_end);
  const squadById = new Map(squads.map((s) => [s.id, s]));

  // sort rows by effective start date, then sort_order
  const sorted = [...rows].sort((a, b) => {
    const da = effectiveDates(a).start, db = effectiveDates(b).start;
    if (da && db && da !== db) return parseDate(da).getTime() - parseDate(db).getTime();
    return a.sort_order - b.sort_order;
  });

  // month header segments
  const start = parseDate(timeline.chart_start);
  const end = parseDate(timeline.chart_end);
  const months: { label: string; from: number; to: number }[] = [];
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const mStart = cur < start ? start : cur;
    const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const segEnd = mEnd > end ? end : mEnd;
    months.push({
      label: MON[cur.getMonth()],
      from: dayIndex(iso(mStart), timeline.chart_start),
      to: dayIndex(iso(segEnd), timeline.chart_start),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // today line
  const now = new Date();
  const todayIso = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayIdx = dayIndex(todayIso, timeline.chart_start);
  const todayInRange = todayIdx >= 0 && todayIdx < days;

  return (
    <div style={{ overflowX: 'auto', fontFamily: "'Montserrat',Arial,sans-serif" }}>
      <div style={{ minWidth: 1100 }}>
        {/* month header */}
        <div style={{ display: 'flex' }}>
          <div style={{ flex: '0 0 620px' }} />
          <div style={{ position: 'relative', flex: 1, height: 26 }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${pct(m.from, days)}%`,
                width: `${pct(m.to - m.from + 1, days)}%`,
                background: NAVY, color: '#fff', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
                height: 26, lineHeight: '26px',
              }}>{m.label}</div>
            ))}
          </div>
        </div>

        {/* column header */}
        <div style={{ display: 'flex', background: NAVY, color: '#fff' }}>
          <HeaderCell w={98}>Squad</HeaderCell>
          <HeaderCell w={54}>RAG</HeaderCell>
          <HeaderCell w={280} align="left">Milestones</HeaderCell>
          <HeaderCell w={94}>Start</HeaderCell>
          <HeaderCell w={94}>Finish</HeaderCell>
          <div style={{ flex: 1 }} />
        </div>

        {/* rows */}
        {sorted.map((r) => {
          const sq = r.squad_id ? squadById.get(r.squad_id) : undefined;
          const rag = RAG_META[r.rag];
          const { start: es, finish: ef } = effectiveDates(r);
          const done = r.state === 'done';
          const external = r.state === 'external';
          const muted = done;
          return (
            <div key={r.id} style={{ display: 'flex', height: 34, background: done ? '#f4f5f7' : '#fff' }}>
              <Cell w={98} style={{ background: external ? '#f2f3f6' : (done ? '#eceef1' : sq?.tint ?? '#f2f3f6'), color: muted || external ? '#929ba2' : NAVY, fontWeight: 700, fontSize: 12, justifyContent: 'flex-start', paddingLeft: 10 }}>
                {external ? 'External' : sq?.name ?? ''}
              </Cell>
              <Cell w={54} style={{ color: done ? '#8a9298' : rag.col, fontWeight: 800, fontSize: done ? 13 : 14 }}>
                {done ? '\u2713' : rag.letter}
              </Cell>
              <Cell w={280} align="left" style={{ color: muted || external ? '#98a0a8' : NAVY, fontStyle: external ? 'italic' : 'normal', fontSize: 13, fontWeight: r.state === 'active' ? 400 : 400 }}>
                {r.milestone}
              </Cell>
              <Cell w={94} style={{ color: muted || external ? '#98a0a8' : NAVY, fontWeight: 600, fontSize: 12.5 }}>{fmtDate(es)}</Cell>
              <Cell w={94} style={{ color: muted || external ? '#98a0a8' : NAVY, fontWeight: 600, fontSize: 12.5 }} last>{fmtDate(ef)}</Cell>

              {/* track */}
              <div style={{ position: 'relative', flex: 1, borderBottom: '1px solid #eef1f5' }}>
                {todayInRange && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(todayIdx + 0.5, days)}%`, width: 2, background: `repeating-linear-gradient(${NAVY} 0 4px, transparent 4px 7px)`, opacity: 0.8 }} />
                )}
                {renderBar(r, es, ef, timeline, days, sq, external, done)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderBar(r: Row, es: string | null, ef: string | null, timeline: Timeline, days: number, sq?: Squad, external?: boolean, done?: boolean) {
  if (!es) return null;
  const color = sq?.bar_color ?? '#0079c8';

  if (r.is_milestone) {
    const at = dayIndex(es, timeline.chart_start);
    return (
      <div title={r.milestone} style={{
        position: 'absolute', top: '50%', left: `${pct(at + 0.5, days)}%`,
        width: 14, height: 14, transform: 'translate(-50%,-50%) rotate(45deg)',
        background: external ? '#fff' : color,
        border: external ? '1.5px dashed #b8bec6' : 'none',
        opacity: done ? 0.4 : 1, filter: done ? 'grayscale(1)' : 'none', zIndex: 4,
      }} />
    );
  }

  const a = dayIndex(es, timeline.chart_start);
  const z = ef ? dayIndex(ef, timeline.chart_start) : a;
  const ghost = hasSlippage(r) && r.original_start && r.original_finish;
  return (
    <>
      {/* faint original (baseline) bar behind, when dates have slipped */}
      {ghost && (
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: `${pct(dayIndex(r.original_start!, timeline.chart_start), days)}%`,
          width: `${pct(dayIndex(r.original_finish!, timeline.chart_start) - dayIndex(r.original_start!, timeline.chart_start) + 1, days)}%`,
          height: 16, background: 'transparent', border: `1px dashed ${color}`, opacity: 0.5, zIndex: 1,
        }} title={`Original: ${fmtDate(r.original_start)} - ${fmtDate(r.original_finish)}`} />
      )}
      {/* revised (current) bar */}
      <div title={r.milestone} style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        left: `${pct(a, days)}%`, width: `${pct(z - a + 1, days)}%`,
        height: 16, minWidth: 8, zIndex: 2,
        background: external ? 'transparent' : color,
        border: external ? '1.5px dashed #b8bec6' : 'none',
        opacity: done ? 0.4 : 1, filter: done ? 'grayscale(1)' : 'none',
      }} />
    </>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function HeaderCell({ w, children, align = 'center' }: { w: number; children: React.ReactNode; align?: 'left' | 'center' }) {
  return (
    <div style={{ flex: `0 0 ${w}px`, padding: '0 12px', height: 34, display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderRight: '1px solid rgba(255,255,255,.14)' }}>
      {children}
    </div>
  );
}
function Cell({ w, children, style = {}, align = 'center', last = false }: { w: number; children: React.ReactNode; style?: React.CSSProperties; align?: 'left' | 'center'; last?: boolean }) {
  return (
    <div style={{ flex: `0 0 ${w}px`, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', borderRight: last ? '2px solid #c8d0da' : '1px solid #dbe1e8', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...style }}>
      {children}
    </div>
  );
}

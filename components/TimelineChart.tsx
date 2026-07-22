'use client';
import React from 'react';
import {
  Row, Squad, Timeline, RAG_META,
  dayIndex, totalDays, pct, fmtDate, parseDate,
} from '@/lib/timeline';

const NAVY = '#0d1846';
const LABEL_W = 98 + 54 + 280 + 94 + 94; // squad + rag + milestone + start + finish
const REVISED_W = 94 + 94; // revised start + revised finish, only when shown

export default function TimelineChart({
  timeline, squads, rows, showRevised = false,
}: { timeline: Timeline; squads: Squad[]; rows: Row[]; showRevised?: boolean }) {
  const days = totalDays(timeline.chart_start, timeline.chart_end);
  const squadById = new Map(squads.map((s) => [s.id, s]));
  const labelWidth = LABEL_W + (showRevised ? REVISED_W : 0);

  // sort rows by original start date (stable regardless of the revised toggle), then sort_order
  const sorted = [...rows].sort((a, b) => {
    if (a.original_start && b.original_start && a.original_start !== b.original_start) {
      return parseDate(a.original_start).getTime() - parseDate(b.original_start).getTime();
    }
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
      <div style={{ minWidth: labelWidth + 480 }}>
        {/* month header */}
        <div style={{ display: 'flex' }}>
          <div style={{ flex: `0 0 ${labelWidth}px` }} />
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
          {showRevised && (
            <>
              <HeaderCell w={94}>Rev. Start</HeaderCell>
              <HeaderCell w={94}>Rev. Finish</HeaderCell>
            </>
          )}
          <div style={{ flex: 1 }} />
        </div>

        {/* empty state */}
        {sorted.length === 0 && (
          <div style={{ padding: '32px 12px', textAlign: 'center', color: '#8a949c', fontSize: 13.5 }}>
            No rows yet — add your first row below to get started.
          </div>
        )}

        {/* rows */}
        {sorted.map((r) => {
          const sq = r.squad_id ? squadById.get(r.squad_id) : undefined;
          const rag = RAG_META[r.rag];
          const done = r.state === 'done';
          const external = r.state === 'external';
          const muted = done;
          return (
            <div key={r.id} style={{ display: 'flex', height: 34, background: done ? '#f4f5f7' : '#fff' }}>
              <Cell w={98} style={{ background: external ? '#f2f3f6' : (done ? '#eceef1' : sq?.tint ?? '#f2f3f6'), color: muted || external ? '#929ba2' : NAVY, fontWeight: 700, fontSize: 12, justifyContent: 'flex-start', paddingLeft: 10 }}>
                {external ? 'External' : sq?.name ?? ''}
              </Cell>
              <Cell w={54} style={{ color: done ? '#8a9298' : rag.col, fontWeight: 800, fontSize: done ? 13 : 14 }}>
                {done ? '✓' : rag.letter}
              </Cell>
              <Cell w={280} align="left" style={{ color: muted || external ? '#98a0a8' : NAVY, fontStyle: external ? 'italic' : 'normal', fontSize: 13, fontWeight: r.state === 'active' ? 400 : 400 }}>
                {r.milestone}
              </Cell>
              <Cell w={94} style={{ color: muted || external ? '#98a0a8' : NAVY, fontWeight: 600, fontSize: 12.5 }}>{fmtDate(r.original_start)}</Cell>
              <Cell w={94} style={{ color: muted || external ? '#98a0a8' : NAVY, fontWeight: 600, fontSize: 12.5 }} last={!showRevised}>{fmtDate(r.original_finish)}</Cell>
              {showRevised && (
                <>
                  <Cell w={94} style={{ color: muted || external ? '#98a0a8' : NAVY, fontWeight: 600, fontSize: 12.5 }}>{fmtDate(r.revised_start)}</Cell>
                  <Cell w={94} style={{ color: muted || external ? '#98a0a8' : NAVY, fontWeight: 600, fontSize: 12.5 }} last>{fmtDate(r.revised_finish)}</Cell>
                </>
              )}

              {/* track: clipped so bars/baselines for dates outside the chart
                  window are cut off here instead of bleeding into the label
                  columns to the left */}
              <div style={{ position: 'relative', flex: 1, borderBottom: '1px solid #eef1f5', overflow: 'hidden' }}>
                {todayInRange && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(todayIdx + 0.5, days)}%`, width: 2, background: `repeating-linear-gradient(${NAVY} 0 4px, transparent 4px 7px)`, opacity: 0.8 }} />
                )}
                {renderBar(r, timeline, days, sq, external, done, showRevised)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderBar(r: Row, timeline: Timeline, days: number, sq?: Squad, external?: boolean, done?: boolean, showRevised?: boolean) {
  if (!r.original_start) return null;
  const color = sq?.bar_color ?? '#0079c8';
  // revised overlay only appears once the toggle is on and someone has
  // actually entered a revised date for this row
  const hasRevised = showRevised && !!r.revised_start;

  if (r.is_milestone) {
    const at = dayIndex(r.original_start, timeline.chart_start);
    return (
      <>
        <div title={r.milestone} style={{
          position: 'absolute', top: '50%', left: `${pct(at + 0.5, days)}%`,
          width: 14, height: 14, transform: 'translate(-50%,-50%) rotate(45deg)',
          background: external ? '#fff' : color,
          border: external ? '1.5px dashed #b8bec6' : 'none',
          opacity: done ? 0.4 : 1, filter: done ? 'grayscale(1)' : 'none', zIndex: 4,
        }} />
        {hasRevised && (
          <div title={`Revised: ${fmtDate(r.revised_start)}`} style={{
            position: 'absolute', top: '50%', left: `${pct(dayIndex(r.revised_start!, timeline.chart_start) + 0.5, days)}%`,
            width: 14, height: 14, transform: 'translate(-50%,-50%) rotate(45deg)',
            background: 'transparent', border: `2px dashed ${color}`, zIndex: 5,
          }} />
        )}
      </>
    );
  }

  const a = dayIndex(r.original_start, timeline.chart_start);
  const of_ = r.original_finish ? dayIndex(r.original_finish, timeline.chart_start) : a;
  return (
    <>
      {/* original (base) bar - always shown */}
      <div title={`${fmtDate(r.original_start)} - ${fmtDate(r.original_finish)}`} style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        left: `${pct(a, days)}%`, width: `${pct(of_ - a + 1, days)}%`,
        height: 16, minWidth: 8, zIndex: 2,
        background: external ? 'transparent' : color,
        border: external ? '1.5px dashed #b8bec6' : 'none',
        opacity: done ? 0.4 : 1, filter: done ? 'grayscale(1)' : 'none',
      }} />
      {/* revised overlay - only once a revised date has actually been entered */}
      {hasRevised && (() => {
        const rs = dayIndex(r.revised_start!, timeline.chart_start);
        const rf = r.revised_finish ? dayIndex(r.revised_finish, timeline.chart_start) : rs;
        return (
          <div title={`Revised: ${fmtDate(r.revised_start)} - ${fmtDate(r.revised_finish)}`} style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            left: `${pct(rs, days)}%`, width: `${pct(rf - rs + 1, days)}%`,
            height: 22, minWidth: 8, background: 'transparent', border: `2px dashed ${color}`,
            opacity: done ? 0.4 : 1, zIndex: 3,
          }} />
        );
      })()}
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

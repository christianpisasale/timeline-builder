'use client';
import React from 'react';
import {
  Row, Squad, Timeline, RAG_META,
  dayIndex, totalDays, pct, fmtDate, parseDate, darkenHex, hexToRgba,
} from '@/lib/timeline';

const TRACK_W = 760;
const COL = { squad: 150, rag: 64, milestone: 200, date: 90 };
const LABEL_MIN_W = COL.squad + COL.rag + COL.milestone + COL.date * 2;
const REVISED_MIN_W = COL.date * 2;

export default function TimelineChart({
  timeline, squads, rows, showRevised = false,
}: { timeline: Timeline; squads: Squad[]; rows: Row[]; showRevised?: boolean }) {
  const days = totalDays(timeline.chart_start, timeline.chart_end);
  const squadById = new Map(squads.map((s) => [s.id, s]));
  const labelMinWidth = LABEL_MIN_W + (showRevised ? REVISED_MIN_W : 0);

  // chart order always mirrors the table's manual drag order
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  // month header segments
  const start = parseDate(timeline.chart_start);
  const end = parseDate(timeline.chart_end);
  const months: { label: string; from: number; to: number }[] = [];
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
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
  const todayLeft = `${pct(todayIdx + 0.5, days)}%`;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: labelMinWidth + TRACK_W }}>
        {/* month strip */}
        <div style={{ display: 'flex', marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: labelMinWidth }} />
          <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px`, position: 'relative', height: 34 }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, bottom: 0, left: `${pct(m.from, days)}%`,
                width: `${pct(m.to - m.from + 1, days)}%`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: '#9A93BE',
                background: i % 2 ? 'transparent' : 'rgba(124,107,214,.05)', borderRadius: 8,
              }}>{m.label}</div>
            ))}
            {todayInRange && <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 0, borderLeft: '2px dashed #C9C2E4' }} />}
          </div>
        </div>

        {/* column header */}
        <div style={{ display: 'flex', background: '#F4F1FC', borderRadius: 14, height: 46, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: labelMinWidth, display: 'flex', alignItems: 'center' }}>
            <HeaderCell w={COL.squad} align="left">SQUAD</HeaderCell>
            <HeaderCell w={COL.rag}>RAG</HeaderCell>
            <HeaderCell w={COL.milestone} grow align="left">MILESTONES</HeaderCell>
            <HeaderCell w={COL.date}>START</HeaderCell>
            <HeaderCell w={COL.date}>FINISH</HeaderCell>
            {showRevised && (
              <>
                <HeaderCell w={COL.date}>REV. START</HeaderCell>
                <HeaderCell w={COL.date}>REV. FINISH</HeaderCell>
              </>
            )}
          </div>
          <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px` }} />
        </div>

        {/* empty state */}
        {sorted.length === 0 && (
          <div style={{ padding: '32px 12px', textAlign: 'center', color: '#9490AC', fontSize: 13.5 }}>
            No rows yet — add your first row below to get started.
          </div>
        )}

        {/* rows */}
        {sorted.map((r, i) => {
          const sq = r.squad_id ? squadById.get(r.squad_id) : undefined;
          const rag = RAG_META[r.rag];
          const done = r.state === 'done';
          const external = r.state === 'external';
          const muted = done;
          const zebra = i % 2 ? 'transparent' : '#FCFBFE';
          return (
            <div key={r.id} style={{ display: 'flex', height: 58, alignItems: 'center', borderBottom: '1px solid #F2EFF9', background: done ? '#F7F6FA' : zebra }}>
              <div style={{ flex: 1, minWidth: labelMinWidth, display: 'flex', alignItems: 'center' }}>
                <Cell w={COL.squad} align="left">
                  {external ? (
                    <span style={chipStyle('#F4F1FC', '#9490AC')}>External</span>
                  ) : sq ? (
                    <span style={chipStyle(sq.tint, darkenHex(sq.bar_color, 0.35))}>{sq.name}</span>
                  ) : null}
                </Cell>
                <Cell w={COL.rag}>
                  {done ? (
                    <span style={badgeStyle('#F4F1FC', '#9490AC')}>✓</span>
                  ) : (
                    <span style={badgeStyle(rag.bg, rag.text)}>{rag.letter}</span>
                  )}
                </Cell>
                <Cell w={COL.milestone} grow align="left" style={{ color: muted || external ? '#9490AC' : '#3A3654', fontWeight: 600, fontSize: 15, fontStyle: external ? 'italic' : 'normal' }}>
                  {r.milestone}
                </Cell>
                <Cell w={COL.date} style={{ color: '#6C6885', fontWeight: 600, fontSize: 14 }}>{fmtDate(r.original_start)}</Cell>
                <Cell w={COL.date} style={{ color: '#6C6885', fontWeight: 600, fontSize: 14 }}>{fmtDate(r.original_finish)}</Cell>
                {showRevised && (
                  <>
                    <Cell w={COL.date} style={{ color: '#6C6885', fontWeight: 600, fontSize: 14 }}>{fmtDate(r.revised_start)}</Cell>
                    <Cell w={COL.date} style={{ color: '#6C6885', fontWeight: 600, fontSize: 14 }}>{fmtDate(r.revised_finish)}</Cell>
                  </>
                )}
              </div>

              {/* track: clipped so bars/baselines for dates outside the chart
                  window are cut off here instead of bleeding into the label
                  columns to the left */}
              <div style={{ width: TRACK_W, flex: `0 0 ${TRACK_W}px`, position: 'relative', height: '100%', overflow: 'hidden' }}>
                {todayInRange && <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 0, borderLeft: '2px dashed #C9C2E4' }} />}
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
  const color = sq?.bar_color ?? '#7C6BD6';
  const shadow = hexToRgba(color, 0.4);
  // revised overlay only appears once the toggle is on and someone has
  // actually entered a revised date for this row
  const hasRevised = showRevised && !!r.revised_start;

  if (r.is_milestone) {
    const at = dayIndex(r.original_start, timeline.chart_start);
    return (
      <>
        <div title={r.milestone} style={{
          position: 'absolute', top: '50%', left: `${pct(at + 0.5, days)}%`,
          width: 22, height: 22, transform: 'translate(-50%,-50%) rotate(45deg)', borderRadius: 6,
          background: external ? 'transparent' : color,
          border: external ? '1.5px dashed #DED8F2' : 'none',
          boxShadow: external ? 'none' : `0 4px 12px ${shadow}`,
          opacity: done ? 0.45 : 1, zIndex: 4,
        }} />
        {hasRevised && (
          <div title={`Revised: ${fmtDate(r.revised_start)}`} style={{
            position: 'absolute', top: '50%', left: `${pct(dayIndex(r.revised_start!, timeline.chart_start) + 0.5, days)}%`,
            width: 22, height: 22, transform: 'translate(-50%,-50%) rotate(45deg)', borderRadius: 6,
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
        left: `${pct(a, days)}%`, width: `${Math.max(pct(of_ - a + 1, days), 1.2)}%`,
        height: 24, minWidth: 8, borderRadius: 8, zIndex: 2,
        background: external ? 'transparent' : `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
        border: external ? '1.5px dashed #DED8F2' : 'none',
        boxShadow: external ? 'none' : `0 4px 12px ${shadow}`,
        opacity: done ? 0.45 : 1,
      }} />
      {/* revised overlay - only once a revised date has actually been entered */}
      {hasRevised && (() => {
        const rs = dayIndex(r.revised_start!, timeline.chart_start);
        const rf = r.revised_finish ? dayIndex(r.revised_finish, timeline.chart_start) : rs;
        return (
          <div title={`Revised: ${fmtDate(r.revised_start)} - ${fmtDate(r.revised_finish)}`} style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            left: `${pct(rs, days)}%`, width: `${Math.max(pct(rf - rs + 1, days), 1.2)}%`,
            height: 30, minWidth: 8, borderRadius: 8, background: 'transparent', border: `2px dashed ${color}`,
            opacity: done ? 0.45 : 1, zIndex: 3,
          }} />
        );
      })()}
    </>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function chipStyle(bg: string, text: string): React.CSSProperties {
  return { display: 'inline-block', padding: '5px 13px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: bg, color: text, whiteSpace: 'nowrap' };
}
function badgeStyle(bg: string, text: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 27, height: 27, borderRadius: 999, fontSize: 13, fontWeight: 800, background: bg, color: text };
}

function HeaderCell({ w, children, align = 'center', grow = false }: { w: number; children: React.ReactNode; align?: 'left' | 'center'; grow?: boolean }) {
  return (
    <div style={{ flex: grow ? `1 1 ${w}px` : `0 0 ${w}px`, minWidth: grow ? w : undefined, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color: '#8A82AE' }}>
      {children}
    </div>
  );
}
function Cell({ w, children, style = {}, align = 'center', grow = false }: { w: number; children: React.ReactNode; style?: React.CSSProperties; align?: 'left' | 'center'; grow?: boolean }) {
  return (
    <div style={{ flex: grow ? `1 1 ${w}px` : `0 0 ${w}px`, minWidth: grow ? w : undefined, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...style }}>
      {children}
    </div>
  );
}

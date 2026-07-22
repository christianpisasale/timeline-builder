// Shared types + rendering math, ported from the IDP Phase 1 HTML timeline.

export type Rag = 'green' | 'amber' | 'red' | 'none';
export type RowState = 'active' | 'done' | 'external';

export interface Squad {
  id: string;
  name: string;
  tint: string;
  bar_color: string;
  sort_order: number;
}

export interface Row {
  id: string;
  squad_id: string | null;
  sort_order: number;
  milestone: string;
  rag: Rag;
  original_start: string | null;
  original_finish: string | null;
  revised_start: string | null;
  revised_finish: string | null;
  is_milestone: boolean;
  state: RowState;
}

export interface Timeline {
  id: string;
  title: string;
  description: string;
  chart_start: string;
  chart_end: string;
  sprint_len_weeks: number;
  first_sprint_no: number | null;
}

export const RAG_META: Record<Rag, { letter: string; name: string; col: string }> = {
  green: { letter: 'G', name: 'On track', col: '#2e9e4f' },
  amber: { letter: 'A', name: 'Managing', col: '#e8a13a' },
  red: { letter: 'R', name: 'Needs resolution', col: '#d60023' },
  none: { letter: '', name: '', col: '#c3c9d1' },
};

// --- date helpers ---
const DAY = 864e5;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const dayIndex = (dateStr: string, chartStart: string) =>
  Math.round((parseDate(dateStr).getTime() - parseDate(chartStart).getTime()) / DAY);
export const totalDays = (chartStart: string, chartEnd: string) =>
  Math.round((parseDate(chartEnd).getTime() - parseDate(chartStart).getTime()) / DAY) + 1;
export const pct = (i: number, days: number) => (i / days) * 100;

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const fmtDate = (s: string | null) => {
  if (!s) return '';
  const d = parseDate(s);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};

// Which dates drive rendering: revised when present, else original.
export function effectiveDates(r: Row) {
  const start = r.revised_start ?? r.original_start;
  const finish = r.revised_finish ?? r.original_finish;
  return { start, finish };
}
// True when a baseline exists and differs from the revised dates (slippage).
export function hasSlippage(r: Row) {
  return (
    (r.revised_start && r.original_start && r.revised_start !== r.original_start) ||
    (r.revised_finish && r.original_finish && r.revised_finish !== r.original_finish)
  );
}

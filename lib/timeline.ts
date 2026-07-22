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

export const RAG_META: Record<Rag, { letter: string; name: string; bg: string; text: string }> = {
  green: { letter: 'G', name: 'On track', bg: '#D9F0DE', text: '#3E9558' },
  amber: { letter: 'A', name: 'Managing', bg: '#FBEBCF', text: '#BE8A2A' },
  red: { letter: 'R', name: 'Needs resolution', bg: '#FADBDB', text: '#C0504F' },
  none: { letter: '–', name: 'None', bg: '#F4F1FC', text: '#9490AC' },
};

// Derive a readable chip-text shade and a soft drop-shadow tint from a
// squad's stored bar colour, so any user-picked colour (not just a fixed
// palette) gets consistent chip/shadow treatment.
export function darkenHex(hex: string, amount: number) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount));
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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


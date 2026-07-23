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

// Derive a readable chip-text shade from a squad's stored bar colour, so any
// tint/bar combination (picked independently from the curated palette) gets
// consistent chip-text contrast.
export function darkenHex(hex: string, amount: number) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount));
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// --- date helpers ---
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const fmtDate = (s: string | null) => {
  if (!s) return '';
  const d = parseDate(s);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};

// "1 Jun – 31 Aug 2026" (start year omitted when it matches the end year) —
// used for the dashboard card footer.
export const fmtDateRange = (startIso: string, endIso: string) => {
  const a = parseDate(startIso);
  const b = parseDate(endIso);
  const left = a.getFullYear() === b.getFullYear()
    ? `${a.getDate()} ${MON[a.getMonth()]}`
    : `${a.getDate()} ${MON[a.getMonth()]} ${a.getFullYear()}`;
  return `${left} – ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}`;
};

// Curated squad-colour palette (design handoff) — tint (chip bg) and bar
// (saturated marker) swatches are picked independently from these two lists,
// not as fixed pairs.
export const SQUAD_TINTS = [
  '#FCE4D2', '#D6F0EC', '#E6E3FB', '#FBE0EA', '#D9EAFB',
  '#FBEBCF', '#D9F0DE', '#EDE0FB', '#F4E2D2', '#E2ECFB',
];
export const SQUAD_BARS = [
  '#E8843C', '#2FA392', '#7A63E0', '#D65C92', '#3E86D6',
  '#E0B454', '#6FC98A', '#B07FE0', '#DE6B5A', '#4C9BD0',
];

export type TimelineState = 'active' | 'at_risk' | 'complete';

// No stored status field — derived: complete once the chart window has
// passed, at risk if any row is flagged RAG red, active otherwise.
export function deriveTimelineState(chartEnd: string, rows: { rag: Rag }[]): TimelineState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parseDate(chartEnd) < today) return 'complete';
  if (rows.some((r) => r.rag === 'red')) return 'at_risk';
  return 'active';
}


'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import TimelineChart from '@/components/TimelineChart';
import { Row, Squad, Timeline, fmtDateRange } from '@/lib/timeline';

// A3 landscape at 96 css-px/inch, minus a 12mm printable margin on every side.
const PX_PER_MM = 96 / 25.4;
const MARGIN_MM = 12;
const PRINTABLE_W = (420 - MARGIN_MM * 2) * PX_PER_MM;
const PRINTABLE_H = (297 - MARGIN_MM * 2) * PX_PER_MM;

export default function PrintableTimeline({
  timeline, squads, rows, backHref,
}: { timeline: Timeline; squads: Squad[]; rows: Row[]; backHref?: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, w: PRINTABLE_W, h: PRINTABLE_H });

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.scrollWidth, h = el.scrollHeight;
      if (!w || !h) return;
      // scale to fit one page — never enlarge past natural size
      const scale = Math.min(1, PRINTABLE_W / w, PRINTABLE_H / h);
      setBox({ scale, w: w * scale, h: h * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [timeline, squads, rows]);

  return (
    <div className="print-wrap" style={{ minHeight: '100vh', background: '#F6F4FC', padding: 24 }}>
      <style>{`
        @page { size: A3 landscape; margin: ${MARGIN_MM}mm; }
        @media print {
          .no-print { display: none !important; }
          .print-wrap { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1400, margin: '0 auto 16px' }}>
        {backHref ? <a href={backHref} style={{ fontSize: 15, fontWeight: 600 }}>&larr; Back</a> : <span />}
        <button className="btn" onClick={() => window.print()}>Export PDF</button>
      </div>

      <div style={{ width: box.w, height: box.h, margin: '0 auto', overflow: 'hidden' }}>
        <div ref={contentRef} style={{ width: 'max-content', transform: `scale(${box.scale})`, transformOrigin: 'top left', background: '#fff', padding: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: '#2E2A45' }}>{timeline.title}</h1>
          {timeline.description && <p style={{ marginTop: 6, fontSize: 14, color: '#6C6885', maxWidth: 900 }}>{timeline.description}</p>}
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: '#9490AC' }}>{fmtDateRange(timeline.chart_start, timeline.chart_end)}</div>
          <div style={{ marginTop: 18 }}>
            <TimelineChart timeline={timeline} squads={squads} rows={rows} showRevised={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

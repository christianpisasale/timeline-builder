'use client';
import { useEffect } from 'react';

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: { open: boolean; title: string; message: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(46,42,69,.28)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', borderRadius: 22, boxShadow: '0 24px 60px rgba(46,42,69,.3)', padding: '30px 32px', width: 400, maxWidth: 'calc(100vw - 40px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FCEDED', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="#D9776F" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45' }}>{title}</h3>
        <p style={{ marginTop: 8, fontSize: 15, color: '#6C6885', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            style={{ background: '#D9776F', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontSize: 15, fontWeight: 700 }}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

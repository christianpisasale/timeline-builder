'use client';
import { useEffect } from 'react';

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: { open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(46,42,69,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', border: '1px solid #ECE9F6', borderRadius: 20, boxShadow: '0 20px 50px rgba(88,74,140,.18)', padding: 28, width: 380, maxWidth: 'calc(100vw - 40px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2, color: '#2E2A45', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14.5, color: '#6C6885', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            style={{ background: '#D9776F', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontSize: 15, fontWeight: 700, boxShadow: '0 6px 16px rgba(217,119,111,.32)' }}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

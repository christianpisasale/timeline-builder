'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (e: any) {
      setMsg(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ width: 380, padding: 32 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ width: 5, height: 34, background: '#0079c8', borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, color: '#0d1846' }}>Timeline Builder</h1>
        </div>
        <p style={{ fontSize: 13, color: '#55606c', marginBottom: 20 }}>
          {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
        </p>
        <label style={lbl}>Email</label>
        <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@bupa.com.au" />
        <label style={lbl}>Password</label>
        <input style={inp} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={submit} disabled={busy}>
          {busy ? '...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        {msg && <p style={{ fontSize: 12.5, color: '#55606c', marginTop: 12 }}>{msg}</p>}
        <p style={{ fontSize: 12.5, marginTop: 16, textAlign: 'center' }}>
          {mode === 'signin' ? "No account? " : 'Have an account? '}
          <a onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(''); }} style={{ cursor: 'pointer' }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </a>
        </p>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#3a444c', marginBottom: 5, marginTop: 12 };
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid #c8d0da', borderRadius: 4, fontSize: 14 };

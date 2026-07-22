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
      <div className="card" style={{ width: 400, padding: 38 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 22 }}>
          <div style={{ width: 5, height: 34, background: '#7C6BD6', borderRadius: 3 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.3, color: '#2E2A45' }}>Timeline Builder</h1>
        </div>
        <p style={{ fontSize: 14, color: '#6C6885', marginBottom: 22 }}>
          {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
        </p>
        <label style={lbl}>Email</label>
        <input className="bordered-field" style={inp} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@bupa.com.au" />
        <label style={lbl}>Password</label>
        <input className="bordered-field" style={inp} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={submit} disabled={busy}>
          {busy ? '...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        {msg && <p style={{ fontSize: 13, color: '#6C6885', marginTop: 14 }}>{msg}</p>}
        <p style={{ fontSize: 13, marginTop: 18, textAlign: 'center', color: '#6C6885' }}>
          {mode === 'signin' ? "No account? " : 'Have an account? '}
          <a onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(''); }} style={{ cursor: 'pointer' }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </a>
        </p>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#8A86A0', marginBottom: 7, marginTop: 14 };
const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid #E6E3F2', background: '#FAF9FE', borderRadius: 11, fontSize: 15, color: '#2E2A45' };

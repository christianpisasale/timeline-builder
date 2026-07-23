'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type MsgKind = 'error' | 'info' | 'success';

function validEmail(e: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<MsgKind>('info');
  const [busy, setBusy] = useState(false);

  const signup = mode === 'signup';
  const emailBad = msgKind === 'error' && email.length > 0 && !validEmail(email);
  const passBad = msgKind === 'error' && password.length > 0 && password.length < 8;

  async function submit() {
    if (!validEmail(email)) { setMsgKind('error'); setMsg('Please enter a valid email address.'); return; }
    if (password.length < 8) { setMsgKind('error'); setMsg('Password must be at least 8 characters.'); return; }

    setBusy(true);
    setMsgKind('info');
    setMsg(signup ? 'Creating your account…' : 'Signing you in…');
    try {
      if (signup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsgKind('success');
        setMsg('Account created — check your email to confirm, then sign in.');
        setMode('signin');
        setBusy(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsgKind('success');
        setMsg('Signed in — redirecting…');
        setTimeout(() => { router.push('/'); router.refresh(); }, 400);
      }
    } catch (e: any) {
      setMsgKind('error');
      setMsg(e.message ?? 'Something went wrong');
      setBusy(false);
    }
  }

  const msgStyles: Record<MsgKind, React.CSSProperties> = {
    error: { color: '#C0504F', background: '#FDF1F1', border: '1px solid #F3D3D2' },
    info: { color: '#6C6885', background: '#FAF9FE', border: '1px solid #ECE9F6' },
    success: { color: '#3E9558', background: '#EAF7EE', border: '1px solid #CDEAD5' },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F6F4FC 0%, #EDE9FA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 26 }}>
          <span style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(150deg, #8E80E0, #7C6BD6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 13, height: 8, borderRadius: 3, background: '#fff', display: 'inline-block' }} />
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>Timeline Builder</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ECE9F6', borderRadius: 24, padding: '36px 36px 34px', boxShadow: '0 18px 50px rgba(88,74,140,.12)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: '#2E2A45' }}>{signup ? 'Create your account' : 'Welcome back'}</h1>
          <div style={{ marginTop: 6, fontSize: 15, color: '#8A86A0' }}>{signup ? 'Start building shared timelines with your team.' : 'Sign in to your timelines.'}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 26 }}>
            <label style={lbl}>EMAIL
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@bupa.com.au" style={emailBad ? errInp : baseInp}
              />
            </label>
            <label style={lbl}>PASSWORD
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={passBad ? errInp : baseInp}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </label>

            {msg && <div style={{ ...msgStyles[msgKind], borderRadius: 11, padding: '11px 14px', fontSize: 14, fontWeight: 600 }}>{msg}</div>}

            <button
              onClick={submit} disabled={busy}
              style={{ background: busy ? '#A99FE0' : '#7C6BD6', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 16, fontWeight: 700, cursor: busy ? 'default' : 'pointer', marginTop: 4 }}
            >
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
            </button>
          </div>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #F2EFF9', textAlign: 'center', fontSize: 15, color: '#6C6885' }}>
            {signup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a onClick={() => { setMode(signup ? 'signin' : 'signup'); setMsg(''); }} style={{ cursor: 'pointer', fontWeight: 700 }}>
              {signup ? 'Sign in' : 'Sign up'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: '#8A86A0' };
const baseInp: React.CSSProperties = { border: '1px solid #E6E3F2', background: '#FAF9FE', borderRadius: 12, padding: '13px 15px', fontSize: 16, fontWeight: 500, color: '#2E2A45', outline: 'none', width: '100%' };
const errInp: React.CSSProperties = { ...baseInp, border: '1px solid #C0504F', background: '#FDF1F1' };

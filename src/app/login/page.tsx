'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon);
  }, []);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const nextUrl = searchParams.get('next') || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const emailTrimmed = email.trim();

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
          options: {
            // If you don't have /auth/callback yet, change to `${process.env.NEXT_PUBLIC_APP_URL}`
            emailRedirectTo: "https://app.skopi.io/auth/callback?next=/me/purchases",
          },
        });

        if (error) throw error;

        setMessage('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
        setPassword('');
        return;
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (error) throw error;

      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
          aria-pressed={mode === 'signin'}
          style={{ padding: '8px 12px' }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
          aria-pressed={mode === 'signup'}
          style={{ padding: '8px 12px' }}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        >
          {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>

        {error && <p style={{ color: 'red', marginTop: 4 }}>{error}</p>}
        {message && <p style={{ marginTop: 4 }}>{message}</p>}
      </form>

      <p style={{ marginTop: 18, opacity: 0.8, fontSize: 13 }}>
        Note: If signup works but email confirm never arrives, check Supabase Auth URL Configuration.
      </p>
    </main>
  );
}

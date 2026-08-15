'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError('Escribe tu correo.');
    if (password.length < 6) return setError('La contraseña necesita al menos 6 caracteres.');

    setBusy(true);
    const supabase = createClient();

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      setBusy(false);
      if (error) return setError(traducir(error.message));
      setNotice('Cuenta creada. Si tu proyecto pide confirmar el correo, revisa tu bandeja.');
      router.push(params.get('next') ?? '/');
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(traducir(error.message));
    router.push(params.get('next') ?? '/');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm pt-8">
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={72} height={72}
          className="mx-auto rounded-2xl shadow-lift" />
        <h1 className="display mt-4 text-3xl leading-none tracking-[0.06em]">Pulso</h1>
      </div>
      <p className="text-center text-sm text-ink-soft">
        {mode === 'login' ? 'Entra con tu cuenta.' : 'Crea tu cuenta para participar.'}
      </p>

      <div className="mt-7 space-y-4">
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" type="email" className="field" value={email}
            autoComplete="email"
            onChange={e => { setEmail(e.target.value); setError(null); }}
            placeholder="nombre@empresa.cl" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="field" value={password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {error && (
          <p className="rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5 text-[13px] text-teamA-ink">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-xl border border-line bg-ice-card px-3.5 py-2.5 text-[13px] text-ink-soft">
            {notice}
          </p>
        )}

        <button className="btn btn-primary w-full text-base" onClick={submit} disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <button
          className="w-full text-[13px] font-medium text-ink-soft underline underline-offset-2"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}>
          {mode === 'login' ? 'No tengo cuenta, quiero registrarme' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}

function traducir(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('already registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de entrar.';
  return msg;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="pt-10 text-sm text-ink-soft">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}

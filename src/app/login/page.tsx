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
    <div className="mx-auto max-w-sm pt-10">
      <div className="mb-1 flex items-center gap-2">
        <PulseMark />
        <h1 className="text-2xl font-medium tracking-tight">Pulso</h1>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {mode === 'login' ? 'Entra con tu cuenta.' : 'Crea tu cuenta para participar.'}
      </p>

      <div className="mt-6 space-y-3">
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

        {error && <p className="text-[13px] text-red-700">{error}</p>}
        {notice && <p className="text-[13px] text-ink-soft">{notice}</p>}

        <button className="btn btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <button
          className="w-full text-[13px] text-ink-soft underline underline-offset-2"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}>
          {mode === 'login' ? 'No tengo cuenta, quiero registrarme' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}

/** Marca: una línea de electrocardiograma con un latido. */
function PulseMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M2 16h6l3-8 5 16 4-11 3 3h7"
        stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

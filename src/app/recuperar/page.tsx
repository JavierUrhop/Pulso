'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Pantalla a la que llega el enlace del correo de recuperación.
 * Supabase deja una sesión temporal al abrir el enlace; con ella se
 * puede fijar la contraseña nueva.
 */
function RecoverForm() {
  const router = useRouter();
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // El enlace puede llegar como sesión ya establecida o como código a canjear.
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return setReady('ok');

      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return setReady(error ? 'invalid' : 'ok');
      }
      setReady('invalid');
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady('ok');
    });

    check();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    if (password.length < 6) return setError('La contraseña necesita al menos 6 caracteres.');
    if (password !== repeat) return setError('Las dos contraseñas no coinciden.');

    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);

    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => { router.push('/'); router.refresh(); }, 1200);
  }

  if (ready === 'checking') {
    return <p className="pt-16 text-center text-sm text-ink-soft">Verificando el enlace…</p>;
  }

  if (ready === 'invalid') {
    return (
      <div className="mx-auto max-w-sm pt-14 text-center">
        <h1 className="display text-2xl leading-none">Enlace no válido</h1>
        <p className="mt-2 text-sm text-ink-soft">
          El enlace expiró o ya se usó. Pide uno nuevo desde la pantalla de inicio de sesión.
        </p>
        <a href="/login" className="btn btn-primary mt-5 w-full">Volver a entrar</a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm pt-14 text-center">
        <h1 className="display text-2xl leading-none">Contraseña actualizada</h1>
        <p className="mt-2 text-sm text-ink-soft">Entrando a la aplicación…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="display text-2xl leading-none">Nueva contraseña</h1>
      <p className="mt-2 text-sm text-ink-soft">Escríbela dos veces para confirmar.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="pw">Contraseña</label>
          <input id="pw" type="password" className="field" value={password}
            autoComplete="new-password"
            onChange={e => { setPassword(e.target.value); setError(null); }} />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Repetir contraseña</label>
          <input id="pw2" type="password" className="field" value={repeat}
            autoComplete="new-password"
            onChange={e => { setRepeat(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>

        {error && (
          <p className="rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5 text-[0.8125rem] text-teamA-ink">
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full text-base" onClick={save} disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </div>
    </div>
  );
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={<p className="pt-16 text-center text-sm text-ink-soft">Cargando…</p>}>
      <RecoverForm />
    </Suspense>
  );
}

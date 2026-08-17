'use client';

import { useEffect, useState } from 'react';

const KEY = 'pulso:text-scale';
export const MIN = 0.85;
export const MAX = 1.4;
const STEP = 0.05;

const PRESETS = [
  { value: 0.9,  label: 'Compacto' },
  { value: 1,    label: 'Normal' },
  { value: 1.15, label: 'Grande' },
  { value: 1.3,  label: 'Muy grande' },
];

function apply(scale: number) {
  document.documentElement.style.setProperty('--pulso-scale', String(scale));
}

/** Ajustes de la aplicación. Se guardan en este dispositivo. */
export default function Settings() {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const saved = Number(localStorage.getItem(KEY));
    if (saved >= MIN && saved <= MAX) setScale(saved);
  }, []);

  function change(next: number) {
    const clamped = Math.min(MAX, Math.max(MIN, Number(next.toFixed(2))));
    setScale(clamped);
    apply(clamped);
    try { localStorage.setItem(KEY, String(clamped)); } catch { /* modo privado */ }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Ajustes"
        className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-white
                   transition hover:bg-white/25">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/45 p-0 sm:items-center sm:p-4"
          role="dialog" aria-modal="true" aria-label="Ajustes"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-md rounded-t-2xl bg-ice-card p-5 text-ink shadow-lift
                          sm:rounded-2xl [padding-bottom:calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display text-lg leading-none">Ajustes</h2>
              <button onClick={() => setOpen(false)} aria-label="Cerrar"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-ice-sunk">
                ✕
              </button>
            </div>

            <p className="label">Tamaño del texto</p>

            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {PRESETS.map(p => (
                <button key={p.value} onClick={() => change(p.value)}
                  aria-pressed={Math.abs(scale - p.value) < 0.001}
                  className={`rounded-xl border px-1 py-2 text-[0.6875rem] font-semibold transition ${
                    Math.abs(scale - p.value) < 0.001
                      ? 'border-navy-800 bg-navy-800 text-white'
                      : 'border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => change(scale - STEP)} aria-label="Reducir texto"
                disabled={scale <= MIN}
                className="btn h-10 w-10 shrink-0 p-0 text-base">A−</button>

              <input type="range" min={MIN} max={MAX} step={STEP} value={scale}
                aria-label="Ajuste fino del tamaño del texto"
                onChange={e => change(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-line
                           accent-navy-800" />

              <button onClick={() => change(scale + STEP)} aria-label="Aumentar texto"
                disabled={scale >= MAX}
                className="btn h-10 w-10 shrink-0 p-0 text-base">A+</button>
            </div>

            <p className="mt-2 text-center text-[0.6875rem] text-ink-faint">
              {Math.round(scale * 100)}% del tamaño normal
            </p>

            <div className="mt-4 rounded-xl bg-ice-sunk p-3.5">
              <p className="text-sm">Así se ve el texto de la aplicación.</p>
              <p className="mt-1 text-[0.8125rem] text-ink-soft">
                Los nombres, puntajes y botones siguen esta misma escala.
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => change(1)} className="btn flex-1">Restablecer</button>
              <button onClick={() => setOpen(false)} className="btn btn-primary flex-1">Listo</button>
            </div>

            <p className="mt-3 text-center text-[0.6875rem] text-ink-faint">
              El ajuste se guarda solo en este dispositivo.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

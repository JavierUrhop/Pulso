'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

const ICONS = {
  marcador: 'M3 13h4l2-8 4 16 2.5-9 1.5 3h4',
  temporada: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
  registrar: 'M12 5v14M5 12h14',
  deportes: 'M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  yo: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0',
} as const;

function Icon({ d }: { d: string }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TabBar({ competitionId }: { competitionId: string }) {
  const path = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Marca la pestaña tocada de inmediato, sin esperar al servidor.
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => { setTarget(null); }, [path]);

  const base = `/c/${competitionId}`;
  const tabs = [
    { href: base, label: 'Marcador', icon: ICONS.marcador, exact: true },
    { href: `${base}/temporada`, label: 'Temporada', icon: ICONS.temporada },
    { href: `${base}/registrar`, label: 'Entrenamiento', icon: ICONS.registrar, cta: true },
    { href: `${base}/deportes`, label: 'Deportes', icon: ICONS.deportes },
    { href: `${base}/yo`, label: 'Perfil', icon: ICONS.yo },
  ];

  function go(href: string) {
    if (href === path) return;
    setTarget(href);
    startTransition(() => router.push(href));
  }

  return (
    <nav aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur
                 [padding-bottom:env(safe-area-inset-bottom)]">
      {/* Barra de progreso mientras se carga la pantalla siguiente */}
      <span aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 origin-left bg-navy-600 transition-transform
          duration-700 ease-out ${pending ? 'scale-x-100' : 'scale-x-0'}`} />

      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1">
        {tabs.map(t => {
          const routeActive = t.exact ? path === t.href : path.startsWith(t.href);
          const active = target ? target === t.href : routeActive;
          const loading = target === t.href && pending;

          return (
            <Link key={t.href} href={t.href} prefetch
              onClick={e => { e.preventDefault(); go(t.href); }}
              aria-current={active ? 'page' : undefined}
              aria-busy={loading || undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[0.5625rem] font-semibold
                uppercase tracking-[0.04em] transition-colors duration-150 active:scale-[.96] ${
                active || t.cta ? 'text-navy-800' : 'text-ink-faint hover:text-ink-soft'}`}>
              <span className={`transition ${
                t.cta
                  ? 'grid h-9 w-9 place-items-center rounded-full bg-navy-800 text-white shadow-lift'
                  : ''} ${loading ? 'opacity-60' : ''} ${
                active && !t.cta ? 'scale-105' : ''}`}>
                <Icon d={t.icon} />
              </span>
              <span className="leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

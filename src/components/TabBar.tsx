'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONS = {
  marcador: 'M3 13h4l2-8 4 16 2.5-9 1.5 3h4',
  temporada: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
  registrar: 'M12 5v14M5 12h14',
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
  const base = `/c/${competitionId}`;

  const tabs = [
    { href: base, label: 'Marcador', icon: ICONS.marcador, exact: true },
    { href: `${base}/temporada`, label: 'Temporada', icon: ICONS.temporada },
    { href: `${base}/registrar`, label: 'Registrar', icon: ICONS.registrar, cta: true },
    { href: `${base}/yo`, label: 'Perfil', icon: ICONS.yo },
  ];

  return (
    <nav aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur
                 [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {tabs.map(t => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold
                uppercase tracking-[0.06em] transition ${
                t.cta ? 'text-navy-800'
                : active ? 'text-navy-800' : 'text-ink-faint hover:text-ink-soft'}`}>
              <span className={t.cta
                ? 'grid h-9 w-9 place-items-center rounded-full bg-navy-800 text-white shadow-lift'
                : ''}>
                <Icon d={t.icon} />
              </span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

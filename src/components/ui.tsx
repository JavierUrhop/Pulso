import Link from 'next/link';
import type { Team, Category } from '@/lib/types';
import { progressSegments } from '@/lib/scoring';

export function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size}
      className="shrink-0 rounded-full object-cover bg-paper-sunk"
      style={{ width: size, height: size }} />;
  }
  return (
    <div className="shrink-0 rounded-full bg-paper-sunk grid place-items-center font-medium text-ink-soft"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || '?'}
    </div>
  );
}

export function TeamDot({ team }: { team: Team }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />;
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className={`chip ${category === 'sedentario'
      ? 'bg-teamA-soft text-teamA-ink' : 'bg-teamB-soft text-teamB-ink'}`}>
      {category === 'sedentario' ? 'Sedentario' : 'Avanzado'}
    </span>
  );
}

/** Barra segmentada: un bloque por cada entrenamiento posible en la semana. */
export function ProgressBar({
  count, goal, maxWeekly, team,
}: { count: number; goal: number; maxWeekly: number; team: Team }) {
  const segments = progressSegments(count, goal, maxWeekly);
  const base = team === 'A' ? 'bg-teamA' : 'bg-teamB';

  return (
    <div className="flex gap-[3px]" role="img"
      aria-label={`${count} de ${maxWeekly} entrenamientos, meta ${goal}`}>
      {segments.map((state, i) => (
        <div key={i}
          className={`h-1.5 flex-1 rounded-sm ${
            state === 'empty' ? 'bg-line'
            : state === 'over' ? 'bg-win'
            : state === 'goal' ? base
            : `${base} opacity-60`
          } ${i + 1 === goal ? 'ring-1 ring-inset ring-ink/25' : ''}`} />
      ))}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
      <span aria-hidden>←</span>{children}
    </Link>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl2 bg-paper-sunk p-3.5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-0.5 text-2xl font-medium tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

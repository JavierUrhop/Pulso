import Link from 'next/link';
import type { Team, Category } from '@/lib/types';
import { progressSegments } from '@/lib/scoring';

export const teamColor = (t: Team) => (t === 'A' ? 'bg-teamA' : 'bg-teamB');
export const teamText = (t: Team) => (t === 'A' ? 'text-teamA' : 'text-teamB');
export const teamSoft = (t: Team) =>
  t === 'A' ? 'bg-teamA-soft text-teamA-ink' : 'bg-teamB-soft text-teamB-ink';

export function Avatar({
  url, name, size = 36, ring,
}: { url?: string | null; name: string; size?: number; ring?: Team }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2)
    .map(s => s[0]?.toUpperCase()).join('');
  const ringCls = ring
    ? `ring-2 ring-offset-2 ring-offset-white ${ring === 'A' ? 'ring-teamA' : 'ring-teamB'}`
    : '';

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size}
      className={`shrink-0 rounded-full bg-ice-sunk object-cover ${ringCls}`}
      style={{ width: size, height: size }} />;
  }
  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-navy-800 font-display font-bold text-white ${ringCls}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials || '?'}
    </div>
  );
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className={`chip ${category === 'inicial'
      ? 'bg-ice-sunk text-ink-soft' : 'bg-navy-800 text-white'}`}>
      {category === 'inicial' ? 'Inicial' : 'Avanzada'}
    </span>
  );
}

/**
 * Barra segmentada: un bloque por entrenamiento posible en la semana.
 * El bloque de la meta lleva marca, y lo que la supera se pinta en verde.
 */
export function ProgressBar({
  count, goal, maxWeekly, team, size = 'md',
}: { count: number; goal: number; maxWeekly: number; team: Team; size?: 'sm' | 'md' }) {
  const segments = progressSegments(count, goal, maxWeekly);
  const fill = team === 'A' ? 'bg-teamA' : 'bg-teamB';
  const h = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex gap-[3px]" role="img"
      aria-label={`${count} de ${maxWeekly} entrenamientos, meta ${goal}`}>
      {segments.map((state, i) => (
        <div key={i}
          className={`${h} flex-1 rounded-[3px] transition-colors ${
            state === 'empty' ? 'bg-line'
            : state === 'over' ? 'bg-win'
            : state === 'goal' ? fill
            : `${fill} opacity-55`
          } ${i + 1 === goal && state === 'empty' ? 'ring-1 ring-inset ring-ink-faint/50' : ''}`} />
      ))}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
      <span aria-hidden className="text-base leading-none">←</span>{children}
    </Link>
  );
}

export function Stat({ label, value, tone }: {
  label: string; value: React.ReactNode; tone?: 'plain' | 'win';
}) {
  return (
    <div className="rounded-xl border border-line bg-ice-card p-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <p className={`score mt-0.5 font-display text-xl font-bold ${
        tone === 'win' ? 'text-win' : ''}`}>{value}</p>
    </div>
  );
}

export function Empty({ title, body, action }: {
  title: string; body: string; action?: React.ReactNode;
}) {
  return (
    <div className="card p-8 text-center">
      <p className="display text-lg">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Logo compacto para las cabeceras. */
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={26} height={26} className="rounded-md" />
      <span className={`display text-base tracking-[0.12em] ${dark ? 'text-white' : 'text-ink'}`}>
        Pulso
      </span>
    </span>
  );
}

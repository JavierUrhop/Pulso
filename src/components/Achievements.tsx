import { formatWeekRange } from '@/lib/week';

/**
 * Lenguaje visual de los logros.
 *
 * Los dos niveles tienen que distinguirse de un vistazo, así que no
 * cambian solo de color: cambian de ícono, de forma y de texto.
 *
 *   Meta cumplida  → carmesí, círculo liso, ticket de verificación
 *   Meta superada  → ciruela, círculo con halo, doble flecha hacia arriba
 */

export type MedalKind = 'meta' | 'superada';

export interface Medal {
  kind: MedalKind;
  week: number;
  competitionId: string;
  competitionName: string;
  startDate: string;
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DoubleUpIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 13.5L12 7.5l6 6M6 19l6-6 6 6" stroke="currentColor" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const KIND = {
  meta: {
    label: 'Meta cumplida',
    short: 'Meta',
    Icon: CheckIcon,
    text: 'text-crimson',
    border: 'border-crimson',
    tint: 'bg-crimson/10',
    dot: 'bg-crimson',
    medal: 'bg-gradient-to-br from-crimson to-crimson-dark',
    halo: '',
  },
  superada: {
    label: 'Meta superada',
    short: 'Superada',
    Icon: DoubleUpIcon,
    text: 'text-plum',
    border: 'border-plum',
    tint: 'bg-plum/10',
    dot: 'bg-plum',
    medal: 'bg-gradient-to-br from-plum to-plum-dark',
    // El halo marca que es el nivel superior, incluso en blanco y negro.
    halo: 'ring-2 ring-plum/30 ring-offset-2 ring-offset-white',
  },
} as const;

/**
 * Insignias de la semana. Se muestran siempre, apagadas mientras no se
 * consiguen, para que todos vean qué hay por ganar.
 */
export function GoalBadges({
  met, exceeded, sweep, compact = false,
}: { met: boolean; exceeded: boolean; sweep?: boolean; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge kind="meta" on={met} compact={compact} />
      <Badge kind="superada" on={exceeded} compact={compact} />
      {sweep !== undefined && (
        <span
          title={sweep ? 'Equipo pleno' : 'Equipo pleno · aún no conseguido'}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
            text-[0.625rem] font-bold uppercase tracking-[0.06em] ${
            sweep ? 'border-navy-700 bg-navy-700/10 text-navy-700'
                  : 'border-dashed border-line text-ink-faint/55'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sweep ? 'bg-navy-700' : 'bg-line'}`} />
          Equipo pleno
        </span>
      )}
    </div>
  );
}

function Badge({ kind, on, compact }: { kind: MedalKind; on: boolean; compact: boolean }) {
  const k = KIND[kind];
  const Icon = k.Icon;

  return (
    <span
      title={on ? k.label : `${k.label} · aún no conseguido`}
      className={`inline-flex items-center rounded-full border font-bold uppercase
        tracking-[0.06em] transition ${
        compact ? 'gap-1 px-1.5 py-0.5 text-[0.5625rem]' : 'gap-1.5 px-2.5 py-1 text-[0.625rem]'
        } ${on ? `${k.border} ${k.tint} ${k.text} shadow-sm`
              : 'border-dashed border-line text-ink-faint/55'}`}>
      <Icon size={compact ? 10 : 12} />
      {compact ? k.short : k.label}
    </span>
  );
}

/** Medalla ganada, con la semana y las fechas en que se consiguió. */
export function MedalChip({ medal, showCompetition = false }: {
  medal: Medal; showCompetition?: boolean;
}) {
  const k = KIND[medal.kind];
  const Icon = k.Icon;

  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-ice-card p-2.5 ${
      medal.kind === 'superada' ? 'border-plum/30' : 'border-line'}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full
        text-white shadow-sm ${k.medal} ${k.halo}`} aria-hidden>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className={`text-[0.75rem] font-bold leading-tight ${k.text}`}>{k.label}</p>
        <p className="text-[0.625rem] leading-tight text-ink-faint">
          Semana {medal.week} · {formatWeekRange(medal.startDate, medal.week)}
        </p>
        {showCompetition && (
          <p className="truncate text-[0.625rem] leading-tight text-ink-faint">
            {medal.competitionName}
          </p>
        )}
      </div>
    </div>
  );
}

/** Contador para la cabecera del perfil. */
export function MedalCount({ kind, count }: { kind: MedalKind; count: number }) {
  const k = KIND[kind];
  const Icon = k.Icon;

  return (
    <div className="rounded-xl bg-white/12 p-3 text-center">
      <span className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-white ${k.medal}
        ${kind === 'superada' ? 'ring-2 ring-white/25' : ''}`} aria-hidden>
        <Icon size={16} />
      </span>
      <p className="score mt-1.5 font-display text-xl font-bold leading-none">{count}</p>
      <p className="mt-0.5 text-[0.5625rem] uppercase tracking-[0.08em] text-white/70">
        {k.label.replace('Meta ', '')}
      </p>
    </div>
  );
}

/** Leyenda breve, para que se entienda qué significa cada nivel. */
export function MedalLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl bg-ice-sunk px-3.5 py-2.5">
      {(['meta', 'superada'] as MedalKind[]).map(kind => {
        const k = KIND[kind];
        const Icon = k.Icon;
        return (
          <span key={kind} className="inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-soft">
            <span className={`grid h-5 w-5 place-items-center rounded-full text-white ${k.medal}`}>
              <Icon size={11} />
            </span>
            <span className="font-semibold">{k.label}</span>
            <span className="text-ink-faint">
              {kind === 'meta' ? 'llegaste justo' : 'uno o más de más'}
            </span>
          </span>
        );
      })}
    </div>
  );
}

import Link from 'next/link';
import { Avatar, CategoryChip } from '@/components/ui';
import { MedalChip, MedalCount, MedalLegend } from '@/components/Achievements';
import { sportIcon } from '@/lib/sports';
import { formatDate } from '@/lib/week';
import type { TrophyRoom as Room } from '@/lib/trophies';

/**
 * Salón de trofeos: lo que ha conseguido una persona en todas sus
 * competencias. Sirve tanto para el perfil propio como para mirar el de
 * otro integrante.
 */
export default function TrophyRoom({
  room, actions,
}: { room: Room; actions?: React.ReactNode }) {
  const empty = room.medals.length === 0;

  return (
    <>
      <section className="-mx-4 -mt-5 mb-5 bg-navy-grad px-4 pb-5 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar url={room.avatarUrl} name={room.name} size={56} />
              <div className="min-w-0">
                <h1 className="display truncate text-2xl leading-none">{room.name}</h1>
                <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.12em] text-white/60">
                  Salón de trofeos
                </p>
              </div>
            </div>
            {actions}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/12 p-3 text-center">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-full
                               bg-white/15 text-sm" aria-hidden>🏃</span>
              <p className="score mt-1.5 font-display text-xl font-bold leading-none">
                {room.totalWorkouts}
              </p>
              <p className="mt-0.5 text-[0.5625rem] uppercase tracking-[0.08em] text-white/60">
                Entrenos
              </p>
            </div>
            <MedalCount kind="meta" count={room.totalMeta} />
            <MedalCount kind="superada" count={room.totalSuperada} />
          </div>
        </div>
      </section>

      {empty && (
        <div className="card mb-5 p-6 text-center">
          <p className="display text-base">Todavía sin medallas</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[0.8125rem] text-ink-soft">
            Cada semana que alcances tu meta ganas una medalla. Si la superas, la medalla
            sube de categoría.
          </p>
        </div>
      )}

      {!empty && <div className="mb-5"><MedalLegend /></div>}

      {room.competitions.map(c => (
        <section key={c.participant.id} className="mb-5">
          <div className="mb-2.5 flex items-center gap-2">
            <span className={`h-4 w-1 rounded-full ${
              c.participant.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
            <h2 className="display flex-1 truncate text-base leading-none">
              {c.competition.name}
            </h2>
            <CategoryChip category={c.participant.category} />
          </div>

          <div className="card mb-2.5 p-3.5">
            <div className="grid grid-cols-4 gap-2 text-center">
              <Cell label="Entrenos" value={c.workouts} />
              <Cell label="Metas" value={c.weeksMet} />
              <Cell label="Superadas" value={c.weeksExceeded} />
              <Cell label="Comodines" value={c.wildcards} />
            </div>

            <p className="mt-3 border-t border-line pt-2.5 text-[0.6875rem] text-ink-faint">
              Equipo {c.participant.team} · semana {c.currentWeek} de {c.competition.total_weeks}
              {' · desde '}{formatDate(c.competition.start_date)}
              {c.favouriteSport && (
                <> · más repetido {sportIcon(c.favouriteSport.name)} {c.favouriteSport.name}
                  {' '}({c.favouriteSport.count})</>
              )}
            </p>
          </div>

          {c.medals.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {c.medals.map(m => (
                <MedalChip key={`${m.competitionId}-${m.week}`} medal={m} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-3.5 py-3
                          text-center text-[0.75rem] text-ink-faint">
              Sin medallas en esta competencia todavía.
            </p>
          )}

          <Link href={`/c/${c.competition.id}/p/${c.participant.id}`}
            className="mt-2.5 inline-block text-[0.75rem] font-semibold text-ink-soft
                       underline underline-offset-2">
            Ver bitácora en esta competencia
          </Link>
        </section>
      ))}
    </>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="score font-display text-lg font-bold leading-none">{value}</p>
      <p className="mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        {label}
      </p>
    </div>
  );
}

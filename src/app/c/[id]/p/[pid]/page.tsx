import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import {
  scoreWeek, scoreSeason, createScoringContext, buildExclusions, goalTimeline,
} from '@/lib/scoring';
import { DAY_NAMES, formatWeekRange } from '@/lib/week';
import { Avatar, ProgressBar, Stat } from '@/components/ui';
import { GoalBadges } from '@/components/Achievements';
import { photosOf, sportIcon } from '@/lib/sports';
import WildcardButton from '@/components/WildcardButton';

export const dynamic = 'force-dynamic';

export default async function ParticipantDetail({
  params, searchParams,
}: { params: { id: string; pid: string }; searchParams: { semana?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const {
    competition, participants, workouts, wildcards, goals, inactive, me, currentWeek,
  } = data;
  const ctx = createScoringContext(
    competition, participants, workouts, goals, currentWeek,
    buildExclusions(wildcards, inactive));
  const p = participants.find(x => x.id === params.pid);
  if (!p) notFound();

  const week = Math.min(Math.max(Number(searchParams.semana) || currentWeek, 1), currentWeek);
  const { scores } = scoreWeek(
    competition, participants, workouts, wildcards, goals, week, ctx);
  const s = scores.find(x => x.participantId === p.id)!;

  const log = workouts
    .filter(w => w.participant_id === p.id && w.week_number === week)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const used = wildcards.filter(w => w.participant_id === p.id);
  const isMe = me?.id === p.id;
  const timeline = goalTimeline(competition, p, workouts, goals, currentWeek, ctx);
  const streak = timeline.progress;
  const seasonTotal = scoreSeason(
    competition, participants, workouts, wildcards, goals, currentWeek, ctx.excluded,
  ).participantTotals.get(p.id) ?? 0;

  return (
    <>
      <section className={`-mx-4 -mt-5 mb-4 px-4 pb-5 pt-5 text-white
        [padding-top:calc(1.25rem+env(safe-area-inset-top))]
        ${p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`}>
        <div className="mx-auto max-w-2xl">
          <Link href={`/c/${params.id}?semana=${week}`}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/75 hover:text-white">
            <span aria-hidden>←</span>Marcador
          </Link>

          <div className="mt-4 flex items-center gap-3.5">
            <Avatar url={p.avatar_url} name={p.display_name} size={60} />
            <div className="min-w-0 flex-1">
              <h1 className="display truncate text-2xl leading-none">
                {p.nickname || p.display_name}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.6875rem] uppercase tracking-[0.1em] text-white/70">
                Equipo {p.team} · meta {s.goal}/sem
              </p>
            </div>
            {p.user_id && (
              <Link href={`/u/${p.user_id}`}
                className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold hover:bg-white/25">
                {isMe ? 'Mis trofeos' : 'Ver perfil'}
              </Link>
            )}
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[0.625rem] uppercase tracking-[0.14em] text-white/60">Semana {week}</p>
              <p className="score font-display text-4xl font-bold leading-none">
                {s.usedWildcard ? '—' : s.total}
                <span className="ml-1 text-sm font-semibold text-white/60">pts</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.625rem] uppercase tracking-[0.14em] text-white/60">Temporada</p>
              <p className="score font-display text-2xl font-bold leading-none">{seasonTotal}</p>
            </div>
          </div>

          {!s.usedWildcard && (
            <div className="mt-3">
              <div className="flex gap-[3px]">
                {Array.from({ length: competition.max_weekly }, (_, i) => {
                  const slot = i + 1;
                  const on = slot <= s.workoutCount;
                  const over = on && slot > s.goal;
                  return (
                    <div key={i} className={`h-2 flex-1 rounded-[3px] ${
                      over ? 'bg-white' : on ? 'bg-white/85' : 'bg-white/25'
                    } ${slot === s.goal ? 'ring-1 ring-inset ring-white/70' : ''}`} />
                  );
                })}
              </div>
              <p className="mt-1.5 text-[0.6875rem] text-white/70">
                {s.workoutCount} de {competition.max_weekly} · meta {s.goal}
                {s.exceededGoal && ' · meta superada'}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mb-3">
        <GoalBadges met={s.metGoal} exceeded={s.exceededGoal} sweep={s.sweepBonus > 0} />
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <Stat label="Entrenos" value={s.workoutCount} />
        <Stat label="Meta" value={s.goalBonus ? `+${s.goalBonus}` : '—'} tone={s.goalBonus ? 'win' : 'plain'} />
        <Stat label="Superó" value={s.exceededBonus ? `+${s.exceededBonus}` : '—'} tone={s.exceededBonus ? 'win' : 'plain'} />
        <Stat label="Equipo" value={s.sweepBonus ? `+${s.sweepBonus}` : '—'} tone={s.sweepBonus ? 'win' : 'plain'} />
      </div>

      {streak > 0 && !s.usedWildcard && (
        <p className="mb-4 rounded-xl border border-line bg-ice-card px-3.5 py-2.5 text-[0.8125rem] text-ink-soft">
          <span className="font-semibold text-ink">
            {streak} de {timeline.threshold}
          </span>
          {' '}semanas logradas. {timeline.remaining === 0
            ? 'La meta sube ahora.'
            : `Faltan ${timeline.remaining} para subir a ${s.goal + 1}.`}
        </p>
      )}

      <div className="mb-2.5 flex items-center justify-between">
        <p className="eyebrow">Bitácora · {formatWeekRange(competition.start_date, week)}</p>
        {isMe && week === currentWeek && (
          <WildcardButton competitionId={params.id} participantId={p.id} weekNumber={week}
            alreadyUsedThisWeek={s.usedWildcard}
            remaining={competition.wildcards_per_person - used.length} />
        )}
      </div>

      {s.usedWildcard ? (
        <div className="card p-6 text-center">
          <p className="display text-base">
            {s.absent ? 'Semana inactiva' : 'Comodín aplicado'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-[0.8125rem] text-ink-soft">
            {s.absent
              ? 'El administrador marcó esta semana como no contable.'
              : 'No suma ni resta puntos.'}
            {' '}El promedio del equipo se calcula sin esta persona.
          </p>
        </div>
      ) : log.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-soft">Sin entrenamientos registrados esta semana.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {log.map(w => (
            <li key={w.id} className="card flex items-center gap-3 p-2.5">
              <span className={`team-bar ${p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
              {(() => {
                const photos = photosOf(w);
                return photos.length ? (
                  <div className="flex shrink-0 gap-1">
                    {photos.slice(0, 3).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={i} href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt={`Registro de ${w.sport}`}
                          className="h-14 w-14 rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-ice-sunk
                                  text-[0.5625rem] font-semibold uppercase tracking-wide text-ink-faint">
                    sin foto
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <p className="display text-[0.8125rem] leading-tight">{DAY_NAMES[w.day_of_week - 1]}</p>
                <p className="truncate text-sm font-medium">
                  <span className="mr-1">{sportIcon(w.sport)}</span>{w.sport}
                </p>
                {w.note && <p className="truncate text-[0.6875rem] text-ink-faint">{w.note}</p>}
              </div>
              {isMe ? (
                <Link href={`/c/${params.id}/w/${w.id}`}
                  className="shrink-0 rounded-lg border border-line px-2.5 py-1.5
                             text-[0.6875rem] font-semibold text-ink-soft hover:bg-ice-sunk">
                  Editar
                </Link>
              ) : (
                <span className="score shrink-0 rounded-md bg-win/12 px-2 py-1 text-xs font-bold text-win">
                  +1
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {currentWeek > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
            <Link key={w} href={`/c/${params.id}/p/${p.id}?semana=${w}`}
              className={`score rounded-lg px-3 py-1.5 text-xs font-bold ${w === week
                ? 'bg-navy-800 text-white'
                : 'border border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
              S{w}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

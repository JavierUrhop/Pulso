import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreWeek, currentStreak } from '@/lib/scoring';
import { DAY_NAMES, formatWeekRange } from '@/lib/week';
import { Avatar, CategoryChip, ProgressBar, BackLink, Stat } from '@/components/ui';
import WildcardButton from '@/components/WildcardButton';

export const dynamic = 'force-dynamic';

export default async function ParticipantDetail({
  params, searchParams,
}: { params: { id: string; pid: string }; searchParams: { semana?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { competition, participants, workouts, wildcards, goals, me, currentWeek } = data;
  const p = participants.find(x => x.id === params.pid);
  if (!p) notFound();

  const week = Math.min(Math.max(Number(searchParams.semana) || currentWeek, 1), currentWeek);
  const { scores } = scoreWeek(competition, participants, workouts, wildcards, goals, week);
  const s = scores.find(x => x.participantId === p.id)!;

  const log = workouts
    .filter(w => w.participant_id === p.id && w.week_number === week)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const wildcardUsed = wildcards.filter(w => w.participant_id === p.id);
  const isMe = me?.id === p.id;
  const streak = currentStreak(competition, p, week, workouts, goals);

  return (
    <>
      <BackLink href={`/c/${params.id}?semana=${week}`}>Volver</BackLink>

      <header className="mb-5 mt-4 flex items-center gap-3">
        <Avatar url={p.avatar_url} name={p.display_name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{p.nickname || p.display_name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
            Equipo {p.team} · meta {s.goal}/sem
            <CategoryChip category={p.category} />
          </p>
        </div>
        {isMe && (
          <Link href={`/c/${params.id}/yo`} className="btn h-9 px-3 text-[13px]">Editar perfil</Link>
        )}
      </header>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <Stat label="Entrenos" value={s.workoutCount} />
        <Stat label="Meta" value={s.goalBonus ? `+${s.goalBonus}` : '—'} />
        <Stat label="Superó" value={s.exceededBonus ? `+${s.exceededBonus}` : '—'} />
        <Stat label="Equipo" value={s.sweepBonus ? `+${s.sweepBonus}` : '—'} />
      </div>

      <div className="card mb-4 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm text-ink-soft">Total semana {week}</p>
          <p className="text-2xl font-medium tabular-nums">
            {s.usedWildcard ? '—' : `${s.total} pts`}
          </p>
        </div>
        {!s.usedWildcard && (
          <ProgressBar count={s.workoutCount} goal={s.goal}
            maxWeekly={competition.max_weekly} team={p.team} />
        )}
        {streak > 0 && !s.usedWildcard && (
          <p className="mt-2.5 text-xs text-ink-faint">
            Lleva {streak} {streak === 1 ? 'semana' : 'semanas'} igualando la meta.
            {' '}Con {competition.streak_to_raise} seguidas, sube a {s.goal + 1}.
          </p>
        )}
      </div>

      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-sm font-medium">
          Bitácora · {formatWeekRange(competition.start_date, week)}
        </p>
        {isMe && week === currentWeek && (
          <WildcardButton
            competitionId={params.id}
            participantId={p.id}
            weekNumber={week}
            alreadyUsedThisWeek={s.usedWildcard}
            remaining={competition.wildcards_per_person - wildcardUsed.length}
          />
        )}
      </div>

      {s.usedWildcard ? (
        <div className="card p-6 text-center">
          <p className="text-sm font-medium">Comodín aplicado en esta semana</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-soft">
            No suma ni resta puntos, y el promedio del equipo se calcula sin esta persona.
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
              {w.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={w.photo_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={w.photo_url} alt={`Registro de ${w.sport}`}
                    className="h-12 w-12 rounded-lg object-cover" />
                </a>
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-paper-sunk text-[10px] text-ink-faint">
                  sin foto
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {DAY_NAMES[w.day_of_week - 1]} · {w.sport}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {w.note || new Date(w.created_at).toLocaleString('es-CL', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="shrink-0 text-xs text-win">+1</span>
            </li>
          ))}
        </ul>
      )}

      {currentWeek > 1 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
            <Link key={w} href={`/c/${params.id}/p/${p.id}?semana=${w}`}
              className={`rounded-md px-2.5 py-1 text-xs ${w === week
                ? 'bg-ink text-white' : 'bg-paper-sunk text-ink-soft hover:bg-line'}`}>
              S{w}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreWeek, currentStreak } from '@/lib/scoring';
import { formatWeekRange } from '@/lib/week';
import { Avatar, ProgressBar, CategoryChip, BackLink } from '@/components/ui';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Dashboard({
  params, searchParams,
}: { params: { id: string }; searchParams: { semana?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { competition, participants, workouts, wildcards, goals, me, currentWeek } = data;

  // Sin cupo reclamado -> primero hay que elegir quién eres.
  if (!me) redirect(`/c/${params.id}/asignarme`);

  const week = Math.min(Math.max(Number(searchParams.semana) || currentWeek, 1), currentWeek);
  const { scores, teams } = scoreWeek(
    competition, participants, workouts, wildcards, goals, week,
  );
  const scoreOf = new Map(scores.map(s => [s.participantId, s]));

  // Aviso: quién está a una semana de que le suba la meta.
  const aboutToRaise = participants
    .filter(p => p.is_active)
    .map(p => ({
      p,
      streak: currentStreak(competition, p, week, workouts, goals),
    }))
    .filter(x => x.streak === competition.streak_to_raise - 1);

  const leader: Team | null =
    teams.A.perCapita === teams.B.perCapita ? null : teams.A.perCapita > teams.B.perCapita ? 'A' : 'B';

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href="/">Competencias</BackLink>
        <Link href={`/c/${params.id}/temporada`} className="text-sm text-ink-soft hover:text-ink">
          Temporada completa
        </Link>
      </div>

      <header className="mb-5">
        <p className="text-xs text-ink-faint">
          Semana {week} de {currentWeek} · {formatWeekRange(competition.start_date, week)}
        </p>
        <h1 className="mt-0.5 text-xl font-medium">{competition.name}</h1>
      </header>

      {/* Marcador */}
      <div className="card mb-3 p-5">
        <div className="flex items-center">
          {(['A', 'B'] as Team[]).map((t, i) => (
            <div key={t} className={`flex-1 text-center ${i === 0 ? 'border-r border-line' : ''}`}>
              <p className="text-[13px] text-ink-soft">Equipo {t}</p>
              <p className={`mt-1 text-3xl font-medium tabular-nums ${
                leader === t ? (t === 'A' ? 'text-teamA' : 'text-teamB') : ''}`}>
                {teams[t].perCapita.toFixed(1)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                pts per cápita · {teams[t].activeMembers} activos
              </p>
              {teams[t].sweep && (
                <p className="mt-1 text-[11px] font-medium text-win">Equipo completo en meta +{competition.bonus_team_sweep}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {aboutToRaise.length > 0 && (
        <div className="mb-4 rounded-lg border-l-2 border-ink/30 bg-paper-sunk px-4 py-3">
          <p className="text-[13px] text-ink-soft">
            <span className="font-medium text-ink">A un paso de subir la meta: </span>
            {aboutToRaise.map(x => x.p.nickname || x.p.display_name).join(', ')}
            {' '}— si vuelven a igualar su meta esta semana, sube en 1.
          </p>
        </div>
      )}

      {/* Equipos */}
      <div className="space-y-3">
        {(['A', 'B'] as Team[]).map(team => {
          const roster = participants
            .filter(p => p.is_active && p.team === team)
            .sort((a, b) => (scoreOf.get(b.id)?.total ?? 0) - (scoreOf.get(a.id)?.total ?? 0));

          return (
            <section key={team} className="card p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <h2 className="flex-1 font-medium">Equipo {team}</h2>
                <span className="text-xs text-ink-faint">{roster.length} integrantes</span>
              </div>

              <ul className="divide-y divide-line">
                {roster.map(p => {
                  const s = scoreOf.get(p.id)!;
                  return (
                    <li key={p.id}>
                      <Link href={`/c/${params.id}/p/${p.id}?semana=${week}`}
                        className="flex items-center gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-paper-sunk">
                        <Avatar url={p.avatar_url} name={p.display_name} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {p.nickname || p.display_name}
                            </p>
                            {p.id === me.id && (
                              <span className="chip bg-ink text-white">Tú</span>
                            )}
                          </div>
                          {s.usedWildcard ? (
                            <p className="mt-1 text-[11px] text-ink-faint">
                              Comodín usado · no afecta al equipo
                            </p>
                          ) : (
                            <div className="mt-1.5">
                              <ProgressBar count={s.workoutCount} goal={s.goal}
                                maxWeekly={competition.max_weekly} team={team} />
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums">
                            {s.usedWildcard ? '—' : `${s.total} pts`}
                          </p>
                          <p className="text-[11px] text-ink-faint tabular-nums">
                            meta {s.goal}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Selector de semana */}
      {currentWeek > 1 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
            <Link key={w} href={`/c/${params.id}?semana=${w}`}
              className={`rounded-md px-2.5 py-1 text-xs ${w === week
                ? 'bg-ink text-white' : 'bg-paper-sunk text-ink-soft hover:bg-line'}`}>
              S{w}
            </Link>
          ))}
        </div>
      )}

      {/* Botón flotante de registro */}
      {week === currentWeek && (
        <Link href={`/c/${params.id}/registrar`}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 btn btn-primary shadow-lg shadow-ink/10">
          Registrar entrenamiento
        </Link>
      )}
    </>
  );
}

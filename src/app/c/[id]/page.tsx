import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreWeek, currentStreak } from '@/lib/scoring';
import { formatWeekRange } from '@/lib/week';
import { Avatar, ProgressBar, Brand } from '@/components/ui';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Dashboard({
  params, searchParams,
}: { params: { id: string }; searchParams: { semana?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { competition, participants, workouts, wildcards, goals, me, currentWeek, finished } = data;
  if (!me) redirect(`/c/${params.id}/asignarme`);

  const week = Math.min(Math.max(Number(searchParams.semana) || currentWeek, 1), currentWeek);
  const { scores, teams } = scoreWeek(competition, participants, workouts, wildcards, goals, week);
  const scoreOf = new Map(scores.map(s => [s.participantId, s]));

  const leader: Team | null =
    teams.A.perCapita === teams.B.perCapita ? null
      : teams.A.perCapita > teams.B.perCapita ? 'A' : 'B';
  const diff = Math.abs(teams.A.perCapita - teams.B.perCapita).toFixed(1);

  const aboutToRaise = participants
    .filter(p => p.is_active)
    .map(p => ({ p, streak: currentStreak(competition, p, week, workouts, goals) }))
    .filter(x => x.streak === competition.streak_to_raise - 1);

  return (
    <>
      {/* Cabecera tipo marcador */}
      <section className="-mx-4 -mt-5 mb-4 bg-navy-grad px-4 pb-5 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <Link href="/"><Brand dark /></Link>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]">
              {finished ? 'Finalizada' : `Semana ${week} / ${competition.total_weeks}`}
            </span>
          </div>

          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.16em] text-white/60">
            {competition.name} · {formatWeekRange(competition.start_date, week)}
          </p>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {(['A', 'B'] as Team[]).map((t, i) => (
              <div key={t} className={i === 1 ? 'order-3' : ''}>
                <div className={`mx-auto mb-1.5 h-1 w-10 rounded-full ${
                  t === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <p className="display text-center text-sm tracking-[0.14em] text-white/70">
                  Equipo {t}
                </p>
                <p className={`score text-center font-display text-5xl font-bold leading-none
                  ${leader === t ? 'text-white' : 'text-white/55'}`}>
                  {teams[t].perCapita.toFixed(1)}
                </p>
                <p className="mt-1 text-center text-[10px] uppercase tracking-[0.1em] text-white/45">
                  {teams[t].activeMembers} activos
                </p>
              </div>
            ))}
            <span className="order-2 display text-xs text-white/40">vs</span>
          </div>

          <p className="mt-3 text-center text-[11px] text-white/60">
            {leader
              ? `Equipo ${leader} adelante por ${diff} puntos per cápita`
              : 'Empate técnico esta semana'}
          </p>
        </div>
      </section>

      {(teams.A.sweep || teams.B.sweep) && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-win/25 bg-win/10 px-3.5 py-2.5">
          <span className="text-base" aria-hidden>🏆</span>
          <p className="text-[13px] font-medium text-ink">
            {[teams.A.sweep && 'Equipo A', teams.B.sweep && 'Equipo B'].filter(Boolean).join(' y ')}
            {' '}con todos en meta · +{competition.bonus_team_sweep} a cada integrante
          </p>
        </div>
      )}

      {aboutToRaise.length > 0 && (
        <div className="mb-3 rounded-xl border border-line bg-ice-card px-3.5 py-2.5">
          <p className="eyebrow mb-0.5">Meta a punto de subir</p>
          <p className="text-[13px] text-ink-soft">
            {aboutToRaise.map(x => x.p.nickname || x.p.display_name).join(', ')}
            {' '}— una semana más igualando y su meta sube en 1.
          </p>
        </div>
      )}

      {/* Planteles */}
      <div className="space-y-3">
        {(['A', 'B'] as Team[]).map(team => {
          const roster = participants
            .filter(p => p.is_active && p.team === team)
            .sort((a, b) => (scoreOf.get(b.id)?.total ?? 0) - (scoreOf.get(a.id)?.total ?? 0));

          return (
            <section key={team} className="card overflow-hidden">
              <header className={`flex items-center gap-2.5 px-4 py-2.5 ${
                team === 'A' ? 'bg-teamA-soft' : 'bg-teamB-soft'}`}>
                <span className={`h-5 w-1 rounded-full ${team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <h2 className={`display flex-1 text-base ${
                  team === 'A' ? 'text-teamA-ink' : 'text-teamB-ink'}`}>Equipo {team}</h2>
                <span className="score text-[11px] font-bold text-ink-soft">
                  {teams[team].totalPoints} pts · {roster.length} jugadores
                </span>
              </header>

              <ul className="divide-y divide-line">
                {roster.map((p, idx) => {
                  const s = scoreOf.get(p.id)!;
                  return (
                    <li key={p.id}>
                      <Link href={`/c/${params.id}/p/${p.id}?semana=${week}`}
                        className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-ice-sunk">
                        <span className="score w-4 text-center text-[11px] font-bold text-ink-faint">
                          {idx + 1}
                        </span>
                        <Avatar url={p.avatar_url} name={p.display_name} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold">
                              {p.nickname || p.display_name}
                            </p>
                            {p.id === me.id && <span className="chip bg-navy-800 text-white">Tú</span>}
                          </div>
                          {s.usedWildcard ? (
                            <p className="mt-1 text-[11px] font-medium text-ink-faint">
                              Comodín · fuera del cálculo
                            </p>
                          ) : (
                            <div className="mt-1.5 flex items-center gap-2">
                              <ProgressBar count={s.workoutCount} goal={s.goal}
                                maxWeekly={competition.max_weekly} team={team} size="sm" />
                              <span className="score shrink-0 text-[10px] font-bold text-ink-faint">
                                {s.workoutCount}/{s.goal}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`score shrink-0 font-display text-lg font-bold ${
                          s.usedWildcard ? 'text-ink-faint' : ''}`}>
                          {s.usedWildcard ? '—' : s.total}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {currentWeek > 1 && (
        <div className="mt-4">
          <p className="eyebrow mb-2">Historial</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
              <Link key={w} href={`/c/${params.id}?semana=${w}`}
                className={`score rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  w === week ? 'bg-navy-800 text-white'
                    : 'border border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
                S{w}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreWeek, scoreSeason, currentStreak, round1 } from '@/lib/scoring';
import { formatWeekRange } from '@/lib/week';
import { Avatar, ProgressBar, Brand } from '@/components/ui';
import { GoalBadges } from '@/components/Achievements';
import type { Team, WeeklyScore } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Fila del marcador, sirva para una semana suelta o para el consolidado. */
interface Row {
  participantId: string;
  points: number;
  workouts: number;
  weeksMet: number;
  weeksExceeded: number;
  wildcards: number;
  /** Solo en vista semanal. */
  week?: WeeklyScore;
}

export default async function Dashboard({
  params, searchParams,
}: { params: { id: string }; searchParams: { semana?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { competition, participants, workouts, wildcards, goals, me, currentWeek, finished } = data;
  if (!me) redirect(`/c/${params.id}/asignarme`);

  // Por defecto se muestra el consolidado de toda la competencia.
  const raw = searchParams.semana;
  const asNumber = Number(raw);
  const single = raw && asNumber >= 1 && asNumber <= currentWeek ? asNumber : null;

  const season = scoreSeason(competition, participants, workouts, wildcards, goals, currentWeek);

  let teamScore: Record<Team, { value: number; members: number; sweeps: number }>;
  let rows: Row[];

  if (single) {
    const { scores, teams } = scoreWeek(
      competition, participants, workouts, wildcards, goals, single);

    teamScore = {
      A: { value: teams.A.perCapita, members: teams.A.activeMembers, sweeps: teams.A.sweep ? 1 : 0 },
      B: { value: teams.B.perCapita, members: teams.B.activeMembers, sweeps: teams.B.sweep ? 1 : 0 },
    };

    rows = scores.map(s => ({
      participantId: s.participantId,
      points: s.total,
      workouts: s.workoutCount,
      weeksMet: s.metGoal ? 1 : 0,
      weeksExceeded: s.exceededGoal ? 1 : 0,
      wildcards: s.usedWildcard ? 1 : 0,
      week: s,
    }));
  } else {
    const active = participants.filter(p => p.is_active);
    const byTeam: Record<Team, { members: Set<string>; sweeps: number }> = {
      A: { members: new Set(), sweeps: 0 },
      B: { members: new Set(), sweeps: 0 },
    };

    const acc = new Map<string, Row>(active.map(p => [p.id, {
      participantId: p.id, points: 0, workouts: 0,
      weeksMet: 0, weeksExceeded: 0, wildcards: 0,
    }]));

    for (const wk of season.weeks) {
      (['A', 'B'] as Team[]).forEach(t => { if (wk.teams[t].sweep) byTeam[t].sweeps += 1; });

      for (const s of wk.scores) {
        const row = acc.get(s.participantId);
        if (!row) continue;
        if (s.usedWildcard) { row.wildcards += 1; continue; }
        row.points += s.total;
        row.workouts += s.workoutCount;
        if (s.metGoal) row.weeksMet += 1;
        if (s.exceededGoal) row.weeksExceeded += 1;
      }
    }

    active.forEach(p => byTeam[p.team].members.add(p.id));

    teamScore = {
      A: { value: season.teamTotals.A, members: byTeam.A.members.size, sweeps: byTeam.A.sweeps },
      B: { value: season.teamTotals.B, members: byTeam.B.members.size, sweeps: byTeam.B.sweeps },
    };
    rows = [...acc.values()];
  }

  const rowOf = new Map(rows.map(r => [r.participantId, r]));

  const leader: Team | null = teamScore.A.value === teamScore.B.value ? null
    : teamScore.A.value > teamScore.B.value ? 'A' : 'B';
  const diff = round1(Math.abs(teamScore.A.value - teamScore.B.value));

  const aboutToRaise = participants
    .filter(p => p.is_active)
    .map(p => ({ p, streak: currentStreak(competition, p, currentWeek, workouts, goals) }))
    .filter(x => x.streak === competition.streak_to_raise - 1);

  const heading = single
    ? `Semana ${single} · ${formatWeekRange(competition.start_date, single)}`
    : `Consolidado · ${currentWeek} ${currentWeek === 1 ? 'semana' : 'semanas'}`;

  return (
    <>
      <section className="relative -mx-4 -mt-5 mb-4 overflow-hidden bg-navy-grad px-4 pb-5 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        {competition.cover_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={competition.cover_url} alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy-900/70 to-navy-800/85" />
          </>
        )}
        <div className="relative mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <Link href="/"><Brand dark /></Link>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.1em]">
              {finished ? 'Finalizada' : `Semana ${currentWeek} / ${competition.total_weeks}`}
            </span>
          </div>

          <p className="mt-4 text-center text-[0.6875rem] uppercase tracking-[0.16em] text-white/60">
            {competition.name}
          </p>
          <p className="mt-1 text-center text-[0.6875rem] text-white/45">{heading}</p>

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
                  {teamScore[t].value.toFixed(1)}
                </p>
                <p className="mt-1 text-center text-[0.625rem] uppercase tracking-[0.1em] text-white/45">
                  {single
                    ? `${teamScore[t].members} activos`
                    : `${teamScore[t].sweeps} ${teamScore[t].sweeps === 1 ? 'pleno' : 'plenos'}`}
                </p>
              </div>
            ))}
            <span className="order-2 display text-xs text-white/40">vs</span>
          </div>

          <p className="mt-3 text-center text-[0.6875rem] text-white/60">
            {leader
              ? `Equipo ${leader} adelante por ${diff} ${single ? 'puntos per cápita' : 'puntos acumulados'}`
              : 'Empate técnico'}
          </p>
        </div>
      </section>

      {/* Filtro de semanas */}
      <div className="mb-4 -mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5">
          <Link href={`/c/${params.id}`}
            className={`score shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              !single ? 'bg-navy-800 text-white'
                      : 'border border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
            Total
          </Link>
          {Array.from({ length: currentWeek }, (_, i) => i + 1).map(w => (
            <Link key={w} href={`/c/${params.id}?semana=${w}`}
              className={`score shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                single === w ? 'bg-navy-800 text-white'
                             : 'border border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
              S{w}
            </Link>
          ))}
        </div>
      </div>

      {single && (teamScore.A.sweeps || teamScore.B.sweeps) ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-win/25 bg-win/10 px-3.5 py-2.5">
          <span aria-hidden>🏆</span>
          <p className="text-[0.8125rem] font-medium text-ink">
            {[teamScore.A.sweeps && 'Equipo A', teamScore.B.sweeps && 'Equipo B'].filter(Boolean).join(' y ')}
            {' '}con todos en meta · +{competition.bonus_team_sweep} a cada integrante
          </p>
        </div>
      ) : null}

      {aboutToRaise.length > 0 && !finished && (
        <div className="mb-3 rounded-xl border border-line bg-ice-card px-3.5 py-2.5">
          <p className="eyebrow mb-0.5">Meta a punto de subir</p>
          <p className="text-[0.8125rem] text-ink-soft">
            {aboutToRaise.map(x => x.p.nickname || x.p.display_name).join(', ')}
            {' '}— una semana más igualando y su meta sube en 1.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(['A', 'B'] as Team[]).map(team => {
          const roster = participants
            .filter(p => p.is_active && p.team === team)
            .sort((a, b) => (rowOf.get(b.id)?.points ?? 0) - (rowOf.get(a.id)?.points ?? 0));

          const totalPoints = roster.reduce((n, p) => n + (rowOf.get(p.id)?.points ?? 0), 0);

          return (
            <section key={team} className="card overflow-hidden">
              <header className={`flex items-center gap-2.5 px-4 py-2.5 ${
                team === 'A' ? 'bg-teamA-soft' : 'bg-teamB-soft'}`}>
                <span className={`h-5 w-1 rounded-full ${team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <h2 className={`display flex-1 text-base ${
                  team === 'A' ? 'text-teamA-ink' : 'text-teamB-ink'}`}>Equipo {team}</h2>
                <span className="score text-[0.6875rem] font-bold text-ink-soft">
                  {totalPoints} pts · {roster.length} jugadores
                </span>
              </header>

              <ul className="divide-y divide-line">
                {roster.map((p, idx) => {
                  const r = rowOf.get(p.id)!;
                  const s = r.week;
                  return (
                    <li key={p.id}>
                      <Link href={`/c/${params.id}/p/${p.id}${single ? `?semana=${single}` : ''}`}
                        className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-ice-sunk">
                        <span className="score w-4 text-center text-[0.6875rem] font-bold text-ink-faint">
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

                          {single ? (
                            s?.usedWildcard ? (
                              <p className="mt-1 text-[0.6875rem] font-medium text-ink-faint">
                                Comodín · fuera del cálculo
                              </p>
                            ) : s ? (
                              <>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <ProgressBar count={s.workoutCount} goal={s.goal}
                                    maxWeekly={competition.max_weekly} team={team} size="sm" />
                                  <span className="score shrink-0 text-[0.625rem] font-bold text-ink-faint">
                                    {s.workoutCount}/{s.goal}
                                  </span>
                                </div>
                                <div className="mt-1.5">
                                  <GoalBadges met={s.metGoal} exceeded={s.exceededGoal} compact />
                                </div>
                              </>
                            ) : null
                          ) : (
                            <>
                              <p className="mt-1 text-[0.6875rem] text-ink-faint">
                                <span className="font-bold text-ink-soft">{r.workouts}</span>
                                {' '}{r.workouts === 1 ? 'entreno' : 'entrenos'}
                                {r.wildcards > 0 && ` · ${r.wildcards} comodín`}
                              </p>
                              <div className="mt-1.5">
                                <GoalBadges met={r.weeksMet > 0} exceeded={r.weeksExceeded > 0} compact />
                              </div>
                            </>
                          )}
                        </div>
                        <span className={`score shrink-0 font-display text-lg font-bold ${
                          single && s?.usedWildcard ? 'text-ink-faint' : ''}`}>
                          {single && s?.usedWildcard ? '—' : r.points}
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
    </>
  );
}

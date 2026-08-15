import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreSeason } from '@/lib/scoring';
import { Avatar, ProgressBar } from '@/components/ui';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MEDAL = ['🥇', '🥈', '🥉'];

export default async function Temporada({
  params, searchParams,
}: { params: { id: string }; searchParams: { equipo?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { competition, participants, workouts, wildcards, goals, currentWeek } = data;
  const season = scoreSeason(competition, participants, workouts, wildcards, goals, currentWeek);

  const filter = (searchParams.equipo === 'A' || searchParams.equipo === 'B')
    ? (searchParams.equipo as Team) : null;

  const maxPC = Math.max(1, ...season.weeks.flatMap(w => [w.teams.A.perCapita, w.teams.B.perCapita]));
  const lastWeek = season.weeks[season.weeks.length - 1];
  const lastScores = new Map(lastWeek.scores.map(s => [s.participantId, s]));

  const ranking = participants
    .filter(p => p.is_active && (!filter || p.team === filter))
    .map(p => ({ p, total: season.participantTotals.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const leader: Team | null = season.teamTotals.A === season.teamTotals.B ? null
    : season.teamTotals.A > season.teamTotals.B ? 'A' : 'B';

  return (
    <>
      <section className="-mx-4 -mt-5 mb-4 bg-navy-grad px-4 pb-5 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
            {currentWeek} {currentWeek === 1 ? 'semana' : 'semanas'} jugadas
          </p>
          <h1 className="display mt-1 text-2xl leading-none">Temporada</h1>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(['A', 'B'] as Team[]).map(t => (
              <div key={t} className={`rounded-xl2 p-3 ${
                leader === t ? 'bg-white/15' : 'bg-white/[0.07]'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${t === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                  <p className="display text-xs tracking-[0.12em] text-white/70">Equipo {t}</p>
                </div>
                <p className="score mt-1 font-display text-3xl font-bold leading-none">
                  {season.teamTotals[t].toFixed(1)}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/50">
                  acumulado
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card mb-4 p-4">
        <p className="eyebrow mb-3">Per cápita por semana</p>
        <div className="flex items-end gap-2" style={{ height: 110 }}>
          {season.weeks.map(w => (
            <div key={w.week} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-[3px]">
                {(['A', 'B'] as Team[]).map(t => (
                  <div key={t}
                    className={`w-1/2 rounded-t-[3px] ${t === 'A' ? 'bg-teamA' : 'bg-teamB'}`}
                    style={{ height: `${Math.max(3, (w.teams[t].perCapita / maxPC) * 100)}%` }}
                    title={`Equipo ${t}: ${w.teams[t].perCapita.toFixed(1)}`} />
                ))}
              </div>
              <span className="text-[10px] font-semibold text-ink-faint">S{w.week}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 border-t border-line pt-3 text-[11px] font-medium text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teamA" />Equipo A</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teamB" />Equipo B</span>
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Ranking individual</p>
        <div className="flex gap-1">
          {[{ key: null, label: 'Todos' }, { key: 'A' as Team, label: 'A' }, { key: 'B' as Team, label: 'B' }]
            .map(o => (
              <Link key={o.label}
                href={o.key ? `/c/${params.id}/temporada?equipo=${o.key}` : `/c/${params.id}/temporada`}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
                  filter === o.key ? 'bg-navy-800 text-white'
                    : 'border border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
                {o.label}
              </Link>
            ))}
        </div>
      </div>

      <ul className="space-y-2">
        {ranking.map(({ p, total }, i) => {
          const s = lastScores.get(p.id);
          return (
            <li key={p.id}>
              <Link href={`/c/${params.id}/p/${p.id}`}
                className="card flex items-center gap-3 p-3 transition hover:bg-ice-sunk">
                <span className={`team-bar ${p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <span className="score w-6 shrink-0 text-center font-display text-base font-bold text-ink-faint">
                  {i < 3 ? MEDAL[i] : i + 1}
                </span>
                <Avatar url={p.avatar_url} name={p.display_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.nickname || p.display_name}
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-faint">
                      {p.team}
                    </span>
                  </p>
                  {s && !s.usedWildcard && (
                    <div className="mt-1.5">
                      <ProgressBar count={s.workoutCount} goal={s.goal}
                        maxWeekly={competition.max_weekly} team={p.team} size="sm" />
                    </div>
                  )}
                </div>
                <span className="score shrink-0 font-display text-lg font-bold">{total}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

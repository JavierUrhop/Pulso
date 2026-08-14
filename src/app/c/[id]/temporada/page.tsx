import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreSeason } from '@/lib/scoring';
import { Avatar, ProgressBar, BackLink, Stat } from '@/components/ui';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Temporada({
  params, searchParams,
}: { params: { id: string }; searchParams: { equipo?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { competition, participants, workouts, wildcards, goals, currentWeek } = data;
  const season = scoreSeason(competition, participants, workouts, wildcards, goals, currentWeek);

  const filter = (searchParams.equipo === 'A' || searchParams.equipo === 'B')
    ? searchParams.equipo as Team : null;

  const maxPerCapita = Math.max(
    1,
    ...season.weeks.flatMap(w => [w.teams.A.perCapita, w.teams.B.perCapita]),
  );

  const lastWeek = season.weeks[season.weeks.length - 1];
  const lastScores = new Map(lastWeek.scores.map(s => [s.participantId, s]));

  const ranking = participants
    .filter(p => p.is_active && (!filter || p.team === filter))
    .map(p => ({ p, total: season.participantTotals.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <BackLink href={`/c/${params.id}`}>Volver</BackLink>
      <h1 className="mb-4 mt-4 text-xl font-medium">
        Temporada completa · {currentWeek} {currentWeek === 1 ? 'semana' : 'semanas'}
      </h1>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <Stat label="Equipo A acumulado" value={season.teamTotals.A.toFixed(1)} sub="suma per cápita" />
        <Stat label="Equipo B acumulado" value={season.teamTotals.B.toFixed(1)} sub="suma per cápita" />
      </div>

      {/* Gráfico de barras por semana */}
      <section className="card mb-5 p-4">
        <p className="mb-3 text-sm font-medium">Per cápita por semana</p>
        <div className="flex items-end gap-2" style={{ height: 96 }}>
          {season.weeks.map(w => (
            <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end justify-center gap-[3px]">
                <div className="w-1/2 rounded-sm bg-teamA"
                  style={{ height: `${Math.max(3, (w.teams.A.perCapita / maxPerCapita) * 100)}%` }}
                  title={`Equipo A: ${w.teams.A.perCapita.toFixed(1)}`} />
                <div className="w-1/2 rounded-sm bg-teamB"
                  style={{ height: `${Math.max(3, (w.teams.B.perCapita / maxPerCapita) * 100)}%` }}
                  title={`Equipo B: ${w.teams.B.perCapita.toFixed(1)}`} />
              </div>
              <span className="text-[10px] text-ink-faint">S{w.week}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teamA" />Equipo A</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teamB" />Equipo B</span>
        </div>
      </section>

      {/* Filtro por equipo */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Ranking individual acumulado</p>
        <div className="flex gap-1">
          {[
            { key: null, label: 'Todos' },
            { key: 'A' as Team, label: 'A' },
            { key: 'B' as Team, label: 'B' },
          ].map(o => (
            <Link key={o.label}
              href={o.key ? `/c/${params.id}/temporada?equipo=${o.key}` : `/c/${params.id}/temporada`}
              className={`rounded-md px-2.5 py-1 text-xs ${filter === o.key
                ? 'bg-ink text-white' : 'bg-paper-sunk text-ink-soft hover:bg-line'}`}>
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
                className="card flex items-center gap-3 p-3 hover:bg-paper-sunk">
                <span className="w-4 shrink-0 text-center text-[13px] text-ink-faint tabular-nums">
                  {i + 1}
                </span>
                <Avatar url={p.avatar_url} name={p.display_name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {p.nickname || p.display_name}
                    <span className="ml-1.5 font-normal text-[11px] text-ink-faint">
                      Equipo {p.team}
                    </span>
                  </p>
                  {s && !s.usedWildcard && (
                    <div className="mt-1.5">
                      <ProgressBar count={s.workoutCount} goal={s.goal}
                        maxWeekly={competition.max_weekly} team={p.team} />
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">{total} pts</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

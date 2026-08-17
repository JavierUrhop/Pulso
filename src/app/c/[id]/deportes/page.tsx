import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { sportIcon, photosOf } from '@/lib/sports';
import { DAY_NAMES } from '@/lib/week';
import { Avatar, Empty } from '@/components/ui';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Marcador global: métrica compartida entre ambos equipos.
 * Muestra cuánto se ha hecho de cada deporte en toda la competencia
 * y, al elegir uno, quiénes lo practican.
 */
export default async function Deportes({
  params, searchParams,
}: { params: { id: string }; searchParams: { d?: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const { participants, workouts } = data;
  const byId = new Map(participants.map(p => [p.id, p]));
  const selected = searchParams.d ?? null;

  // Conteo por deporte, con desglose por equipo.
  const tally = new Map<string, { total: number; A: number; B: number }>();
  for (const w of workouts) {
    const team = byId.get(w.participant_id)?.team;
    const row = tally.get(w.sport) ?? { total: 0, A: 0, B: 0 };
    row.total += 1;
    if (team) row[team] += 1;
    tally.set(w.sport, row);
  }

  const ranked = [...tally.entries()].sort((a, b) =>
    b[1].total - a[1].total || a[0].localeCompare(b[0], 'es'));
  const grandTotal = workouts.length;

  if (selected) {
    const rows = participants
      .map(p => ({
        p,
        list: workouts.filter(w => w.participant_id === p.id && w.sport === selected),
      }))
      .filter(x => x.list.length > 0)
      .sort((a, b) => b.list.length - a.list.length);

    const count = tally.get(selected)?.total ?? 0;

    return (
      <>
        <section className="-mx-4 -mt-5 mb-4 bg-navy-grad px-4 pb-5 pt-6 text-white
                            [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
          <div className="mx-auto max-w-2xl">
            <Link href={`/c/${params.id}/deportes`}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/75 hover:text-white">
              <span aria-hidden>←</span>Deportes
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/12 text-3xl">
                {sportIcon(selected)}
              </span>
              <div className="min-w-0">
                <h1 className="display truncate text-2xl leading-none">{selected}</h1>
                <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.12em] text-white/60">
                  {count} {count === 1 ? 'entrenamiento' : 'entrenamientos'} en total
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="eyebrow mb-2.5">Quiénes lo practican</p>
        <ul className="space-y-2">
          {rows.map(({ p, list }) => {
            const photos = list.flatMap(photosOf).slice(0, 3);
            return (
              <li key={p.id} className="card p-3">
                <Link href={`/c/${params.id}/p/${p.id}`} className="flex items-center gap-3">
                  <span className={`team-bar ${p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                  <Avatar url={p.avatar_url} name={p.display_name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.nickname || p.display_name}</p>
                    <p className="mt-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      Equipo {p.team}
                    </p>
                  </div>
                  <span className="score shrink-0 font-display text-lg font-bold">{list.length}</span>
                </Link>
                {photos.length > 0 && (
                  <div className="mt-2.5 flex gap-1.5 border-t border-line pt-2.5">
                    {photos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={i} href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      </a>
                    ))}
                    <span className="self-center text-[0.6875rem] text-ink-faint">
                      {DAY_NAMES[list[0].day_of_week - 1]} · S{list[0].week_number}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      <section className="-mx-4 -mt-5 mb-4 bg-navy-grad px-4 pb-5 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-white/60">Métrica compartida</p>
          <h1 className="display mt-1 text-2xl leading-none">Deportes</h1>
          <p className="mt-3 text-[0.8125rem] text-white/70">
            <span className="score font-display text-2xl font-bold text-white">{grandTotal}</span>
            {' '}entrenamientos entre los dos equipos, en {ranked.length}
            {' '}{ranked.length === 1 ? 'disciplina' : 'disciplinas'}.
          </p>
        </div>
      </section>

      {ranked.length === 0 ? (
        <Empty title="Sin registros aún"
          body="Cuando alguien registre su primer entrenamiento, aparecerá acá el conteo por deporte." />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ranked.map(([sport, row]) => (
            <Link key={sport} href={`/c/${params.id}/deportes?d=${encodeURIComponent(sport)}`}
              className="card flex flex-col items-center p-3.5 text-center transition hover:bg-ice-sunk">
              <span className="text-3xl leading-none">{sportIcon(sport)}</span>
              <p className="mt-2 line-clamp-2 text-[0.75rem] font-semibold leading-tight">{sport}</p>
              <p className="score mt-1.5 font-display text-2xl font-bold leading-none">{row.total}</p>
              <div className="mt-2 flex w-full gap-[3px]" aria-hidden>
                <div className="h-1 rounded-full bg-teamA"
                  style={{ flex: Math.max(row.A, 0.02) }} />
                <div className="h-1 rounded-full bg-teamB"
                  style={{ flex: Math.max(row.B, 0.02) }} />
              </div>
              <p className="mt-1 text-[0.625rem] font-semibold text-ink-faint">
                <span className="text-teamA">{row.A}</span>
                {' · '}
                <span className="text-teamB">{row.B}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

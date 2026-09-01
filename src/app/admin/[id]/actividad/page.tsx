import { redirect, notFound } from 'next/navigation';
import { isAdmin, saveActivity } from '../../actions';
import { createAdminClient } from '@/lib/supabase/server';
import { weekNumberFor, formatWeekRange } from '@/lib/week';
import { BackLink, Avatar, CategoryChip } from '@/components/ui';
import ErrorBanner from '@/components/ErrorBanner';
import type { Competition, Participant, InactiveWeek, Wildcard } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Actividad por semana.
 *
 * Cada persona tiene un cuadro por semana de la competencia. Con ticket,
 * esa semana cuenta. Al quitarlo, sus puntos de esa semana no suman, queda
 * fuera del promedio del equipo y no impide el bono de equipo completo.
 *
 * Las semanas en que la persona usó su comodín aparecen marcadas y sin
 * ticket: ya están fuera del cálculo por decisión suya, no del administrador.
 */
export default async function Actividad({
  params, searchParams,
}: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!(await isAdmin())) redirect('/admin');

  const supabase = createAdminClient();
  const [comp, parts, inactive, cards] = await Promise.all([
    supabase.from('competitions').select('*').eq('id', params.id).single(),
    supabase.from('participants').select('*').eq('competition_id', params.id)
      .order('team').order('display_name'),
    supabase.from('inactive_weeks').select('*').eq('competition_id', params.id),
    supabase.from('wildcards').select('*').eq('competition_id', params.id),
  ]);

  if (!comp.data) notFound();
  const c = comp.data as Competition;
  const participants = (parts.data ?? []) as Participant[];

  const off = new Set(
    ((inactive.data ?? []) as InactiveWeek[]).map(i => `${i.participant_id}:${i.week_number}`));
  const wild = new Set(
    ((cards.data ?? []) as Wildcard[]).map(w => `${w.participant_id}:${w.week_number}`));

  const weeks = Array.from({ length: c.total_weeks }, (_, i) => i + 1);
  const currentWeek = Math.min(weekNumberFor(c.start_date), c.total_weeks);

  return (
    <>
      <BackLink href={`/admin/${params.id}`}>Competencia</BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Actividad por semana</h1>
      <p className="mb-4 text-[0.8125rem] text-ink-soft">
        Un cuadro por semana. Con ticket, esa semana cuenta para el puntaje.
      </p>

      <ErrorBanner message={searchParams.error} />
      {searchParams.ok && (
        <div className="mb-4 rounded-xl border border-win/25 bg-win/10 px-3.5 py-2.5">
          <p className="text-[0.8125rem] text-win">{searchParams.ok}</p>
        </div>
      )}

      {/* Leyenda */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 rounded-xl bg-ice-sunk px-3.5 py-3">
        <Legend state="on" label="Cuenta" />
        <Legend state="off" label="No cuenta" />
        <Legend state="wildcard" label="Comodín de la persona" />
      </div>

      {participants.length === 0 ? (
        <p className="card p-5 text-center text-sm text-ink-soft">
          Agrega integrantes antes de marcar su actividad.
        </p>
      ) : (
        <form action={saveActivity}>
          <input type="hidden" name="competition_id" value={c.id} />
          <input type="hidden" name="total_weeks" value={c.total_weeks} />

          <div className="space-y-2.5">
            {participants.map(p => {
              const activas = weeks.filter(
                wk => !off.has(`${p.id}:${wk}`) && !wild.has(`${p.id}:${wk}`)).length;

              return (
                <section key={p.id} className="card p-3.5">
                  <header className="mb-3 flex items-center gap-2.5">
                    <span className={`h-8 w-1 shrink-0 rounded-full ${
                      p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                    <Avatar url={p.avatar_url} name={p.display_name} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8125rem] font-semibold">
                        {p.nickname || p.display_name}
                      </p>
                      <p className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-ink-faint">
                        Equipo {p.team}
                      </p>
                    </div>
                    <CategoryChip category={p.category} />
                    <span className="score shrink-0 text-[0.6875rem] font-bold text-ink-soft">
                      {activas}/{c.total_weeks}
                    </span>
                  </header>

                  <div className="flex flex-wrap gap-2">
                    {weeks.map(wk => {
                      const key = `${p.id}:${wk}`;
                      const isWild = wild.has(key);
                      const isOn = !off.has(key);

                      return (
                        <label key={wk}
                          title={isWild
                            ? `Semana ${wk} · comodín usado por la persona`
                            : `Semana ${wk} · ${formatWeekRange(c.start_date, wk)}`}
                          className="group cursor-pointer select-none">
                          <input type="checkbox" name="active" value={key}
                            defaultChecked={isOn}
                            aria-label={`${p.display_name}, semana ${wk}`}
                            className="peer sr-only" />

                          <span className={`flex h-11 w-11 flex-col items-center justify-center
                            rounded-xl border-2 transition
                            border-line bg-ice-card text-ink-faint
                            peer-checked:border-win peer-checked:bg-win/10 peer-checked:text-win
                            peer-focus-visible:ring-4 peer-focus-visible:ring-navy-600/20
                            peer-checked:[&_.si]:block peer-checked:[&_.no]:hidden
                            ${isWild ? 'border-dashed !border-gold !bg-gold/10 !text-gold' : ''}`}>
                            {isWild ? (
                              <WildcardIcon />
                            ) : (
                              <>
                                <span className="si hidden"><CheckIcon /></span>
                                <span className="no block"><CrossIcon /></span>
                              </>
                            )}
                            <span className={`mt-0.5 text-[0.5rem] font-bold ${
                              wk === currentWeek ? 'underline underline-offset-2' : ''}`}>
                              S{wk}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <button className="btn btn-primary sticky bottom-4 mt-4 w-full shadow-lift">
            Guardar actividad
          </button>
        </form>
      )}

      <p className="mt-3 text-[0.6875rem] text-ink-faint">
        Esto es distinto del comodín: el comodín lo usa la propia persona y es uno por
        temporada. Aquí decides tú, sin tope, para vacaciones, licencias o gente que se
        suma a mitad de camino.
      </p>
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" />
    </svg>
  );
}

function WildcardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5v-1a2.5 2.5 0 0 0 0-5v-1Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Legend({ state, label }: { state: 'on' | 'off' | 'wildcard'; label: string }) {
  const styles = {
    on: 'border-win bg-win/10 text-win',
    off: 'border-line bg-ice-card text-ink-faint',
    wildcard: 'border-dashed border-gold bg-gold/10 text-gold',
  }[state];

  return (
    <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-soft">
      <span className={`grid h-6 w-6 place-items-center rounded-lg border-2 ${styles}`}>
        {state === 'on' ? <CheckIcon /> : state === 'off' ? <CrossIcon /> : <WildcardIcon />}
      </span>
      {label}
    </span>
  );
}

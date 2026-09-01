import { redirect, notFound } from 'next/navigation';
import { isAdmin, saveActivity } from '../../actions';
import { createAdminClient } from '@/lib/supabase/server';
import { weekNumberFor, formatWeekRange } from '@/lib/week';
import { BackLink, Avatar } from '@/components/ui';
import ErrorBanner from '@/components/ErrorBanner';
import type { Competition, Participant, InactiveWeek } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Matriz de actividad: para cada persona y cada semana, si cuenta o no.
 * Marcado = activo. Desmarcado = esa semana no suma sus puntos.
 */
export default async function Actividad({
  params, searchParams,
}: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!(await isAdmin())) redirect('/admin');

  const supabase = createAdminClient();
  const [comp, parts, inactive] = await Promise.all([
    supabase.from('competitions').select('*').eq('id', params.id).single(),
    supabase.from('participants').select('*').eq('competition_id', params.id)
      .order('team').order('display_name'),
    supabase.from('inactive_weeks').select('*').eq('competition_id', params.id),
  ]);

  if (!comp.data) notFound();
  const c = comp.data as Competition;
  const participants = (parts.data ?? []) as Participant[];
  const off = new Set(
    ((inactive.data ?? []) as InactiveWeek[]).map(i => `${i.participant_id}:${i.week_number}`));

  const weeks = Array.from({ length: c.total_weeks }, (_, i) => i + 1);
  const currentWeek = Math.min(weekNumberFor(c.start_date), c.total_weeks);

  return (
    <>
      <BackLink href={`/admin/${params.id}`}>Competencia</BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Semanas activas</h1>
      <p className="mb-4 text-[0.8125rem] text-ink-soft">
        Marcado significa que esa semana cuenta. Al desmarcarla, los puntos de esa persona
        no suman, queda fuera del promedio per cápita y no impide el bono de equipo completo.
      </p>

      <ErrorBanner message={searchParams.error} />
      {searchParams.ok && (
        <div className="mb-4 rounded-xl border border-win/25 bg-win/10 px-3.5 py-2.5">
          <p className="text-[0.8125rem] text-win">{searchParams.ok}</p>
        </div>
      )}

      <form action={saveActivity}>
        <input type="hidden" name="competition_id" value={c.id} />
        <input type="hidden" name="total_weeks" value={c.total_weeks} />

        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <table className="w-max min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-ice px-2 pb-2 text-left">
                  <span className="eyebrow">Integrante</span>
                </th>
                {weeks.map(wk => (
                  <th key={wk} className="px-1 pb-2 text-center">
                    <span className={`block text-[0.625rem] font-bold ${
                      wk === currentWeek ? 'text-navy-800' : 'text-ink-faint'}`}>
                      S{wk}
                    </span>
                    <span className="block text-[0.5rem] text-ink-faint">
                      {formatWeekRange(c.start_date, wk).split(' – ')[0]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 border-t border-line bg-ice py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-4 w-1 shrink-0 rounded-full ${
                        p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                      <Avatar url={p.avatar_url} name={p.display_name} size={26} />
                      <span className="max-w-[9rem] truncate text-[0.8125rem] font-medium">
                        {p.nickname || p.display_name}
                      </span>
                    </div>
                  </td>
                  {weeks.map(wk => (
                    <td key={wk} className="border-t border-line px-1 py-2 text-center">
                      <input type="checkbox" name="active" value={`${p.id}:${wk}`}
                        defaultChecked={!off.has(`${p.id}:${wk}`)}
                        aria-label={`${p.display_name}, semana ${wk}`}
                        className="h-5 w-5 cursor-pointer accent-navy-800" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {participants.length === 0 ? (
          <p className="card p-5 text-center text-sm text-ink-soft">
            Agrega integrantes antes de marcar su actividad.
          </p>
        ) : (
          <button className="btn btn-primary mt-4 w-full">Guardar actividad</button>
        )}
      </form>

      <p className="mt-3 text-[0.6875rem] text-ink-faint">
        Esto es distinto del comodín: el comodín lo usa la propia persona y es uno por
        temporada. Aquí decides tú, sin tope, para vacaciones, licencias o gente que se
        suma a mitad de camino.
      </p>
    </>
  );
}

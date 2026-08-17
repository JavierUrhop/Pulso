import { notFound } from 'next/navigation';
import { isAdmin, updateCompetition, addParticipant, updateParticipant,
  releaseParticipant, deleteParticipant, setGoal, clearGoal,
  deleteWorkout, deleteWildcard, grantWildcard } from '../actions';
import { createAdminClient } from '@/lib/supabase/server';
import { weekNumberFor, DAY_NAMES, endDateOf, formatDate } from '@/lib/week';
import { BackLink, Avatar } from '@/components/ui';
import { photosOf } from '@/lib/sports';
import ErrorBanner from '@/components/ErrorBanner';
import { redirect } from 'next/navigation';
import type { Competition, Participant, Workout, Wildcard, ParticipantGoal } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminCompetition({
  params, searchParams,
}: { params: { id: string }; searchParams: { error?: string } }) {
  if (!(await isAdmin())) redirect('/admin');

  const supabase = createAdminClient();
  const [comp, parts, works, cards, goals] = await Promise.all([
    supabase.from('competitions').select('*').eq('id', params.id).single(),
    supabase.from('participants').select('*').eq('competition_id', params.id).order('team').order('display_name'),
    supabase.from('workouts').select('*').eq('competition_id', params.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('wildcards').select('*').eq('competition_id', params.id),
    supabase.from('participant_goals').select('*').eq('competition_id', params.id).eq('source', 'manual'),
  ]);

  if (!comp.data) notFound();
  const c = comp.data as Competition;
  const participants = (parts.data ?? []) as Participant[];
  const workouts = (works.data ?? []) as Workout[];
  const wildcards = (cards.data ?? []) as Wildcard[];
  const manualGoals = (goals.data ?? []) as ParticipantGoal[];
  const currentWeek = Math.min(weekNumberFor(c.start_date), c.total_weeks);
  const nameOf = new Map(participants.map(p => [p.id, p.nickname || p.display_name]));

  return (
    <>
      <BackLink href="/admin">Panel</BackLink>
      <ErrorBanner message={searchParams.error} />
      <h1 className="display mb-1 mt-3 text-2xl leading-none">{c.name}</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Semana {currentWeek} de {c.total_weeks} · termina el{' '}
        {formatDate(endDateOf(c.start_date, c.total_weeks))} ·{' '}
        {participants.filter(p => p.is_active).length} integrantes activos
      </p>

      {/* Reglas */}
      <section className="card mb-6 p-4">
        <p className="eyebrow mb-3">Reglas y metas base</p>
        <form action={updateCompetition} className="space-y-3">
          <input type="hidden" name="id" value={c.id} />
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="field" defaultValue={c.name} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Num label="Fecha de inicio" name="start_date" type="date" value={c.start_date} />
            <Num label="Duración (semanas)" name="total_weeks" value={c.total_weeks} />
            <Num label="Meta inicial" name="goal_initial" value={c.goal_initial} />
            <Num label="Meta avanzada" name="goal_advanced" value={c.goal_advanced} />
            <Num label="Tope semanal" name="max_weekly" value={c.max_weekly} />
            <Num label="Bono meta cumplida" name="bonus_goal_met" value={c.bonus_goal_met} />
            <Num label="Bono superar meta" name="bonus_goal_exceeded" value={c.bonus_goal_exceeded} />
            <Num label="Bono equipo completo" name="bonus_team_sweep" value={c.bonus_team_sweep} />
            <Num label="Semanas para subir" name="streak_to_raise" value={c.streak_to_raise} />
            <Num label="Comodines por persona" name="wildcards_per_person" value={c.wildcards_per_person} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={c.is_active} />
            Competencia activa
          </label>
          <button className="btn btn-primary w-full">Guardar reglas</button>
        </form>
      </section>

      {/* Agregar integrante */}
      <section className="card mb-4 p-4">
        <p className="eyebrow mb-3">Agregar integrante</p>
        <form action={addParticipant} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="competition_id" value={c.id} />
          <div className="min-w-[160px] flex-1">
            <label className="label" htmlFor="display_name">Nombre</label>
            <input id="display_name" name="display_name" className="field" required />
          </div>
          <select name="team" className="field w-24" aria-label="Equipo">
            <option value="A">Equipo A</option>
            <option value="B">Equipo B</option>
          </select>
          <select name="category" className="field w-32" aria-label="Categoría">
            <option value="inicial">Meta inicial</option>
            <option value="avanzada">Meta avanzada</option>
          </select>
          <button className="btn btn-primary">Agregar</button>
        </form>
      </section>

      {/* Integrantes */}
      <p className="eyebrow mb-2.5">Integrantes</p>
      <ul className="mb-6 space-y-2">
        {participants.map(p => (
          <li key={p.id} className="card p-3">
            <div className="mb-2.5 flex items-center gap-2.5">
              <Avatar url={p.avatar_url} name={p.display_name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {p.display_name}
                  {p.nickname && <span className="text-ink-faint"> · “{p.nickname}”</span>}
                </p>
                <p className="text-xs text-ink-faint">
                  {p.user_id ? 'Cuenta asignada' : 'Cupo libre'}
                </p>
              </div>
            </div>

            <form action={updateParticipant} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="competition_id" value={c.id} />
              <input name="display_name" className="field min-w-[130px] flex-1"
                defaultValue={p.display_name} aria-label="Nombre" />
              <select name="team" className="field w-20" defaultValue={p.team} aria-label="Equipo">
                <option value="A">A</option><option value="B">B</option>
              </select>
              <select name="category" className="field w-32" defaultValue={p.category} aria-label="Categoría">
                <option value="inicial">Meta inicial</option>
                <option value="avanzada">Meta avanzada</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input type="checkbox" name="is_active" defaultChecked={p.is_active} />Activo
              </label>
              <button className="btn h-9 px-3 text-xs">Guardar</button>
            </form>

            <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-line pt-2">
              <form action={setGoal} className="flex items-end gap-1.5">
                <input type="hidden" name="competition_id" value={c.id} />
                <input type="hidden" name="participant_id" value={p.id} />
                <div>
                  <label className="label text-[0.625rem]">Desde semana</label>
                  <input name="week_number" type="number" className="field h-8 w-20 text-xs"
                    defaultValue={currentWeek} min={1} />
                </div>
                <div>
                  <label className="label text-[0.625rem]">Meta</label>
                  <input name="goal" type="number" className="field h-8 w-16 text-xs"
                    defaultValue={p.category === 'inicial' ? c.goal_initial : c.goal_advanced} min={1} />
                </div>
                <button className="btn h-8 px-2.5 text-xs">Fijar meta</button>
              </form>

              <form action={grantWildcard} className="flex items-end gap-1.5">
                <input type="hidden" name="competition_id" value={c.id} />
                <input type="hidden" name="participant_id" value={p.id} />
                <div>
                  <label className="label text-[0.625rem]">Comodín semana</label>
                  <input name="week_number" type="number" className="field h-8 w-20 text-xs"
                    defaultValue={currentWeek} min={1} max={c.total_weeks} />
                </div>
                <button className="btn h-8 px-2.5 text-xs">Dar comodín</button>
              </form>

              {p.user_id && (
                <form action={releaseParticipant}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="competition_id" value={c.id} />
                  <button className="btn h-8 px-2.5 text-xs">Liberar cupo</button>
                </form>
              )}
              <form action={deleteParticipant}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="competition_id" value={c.id} />
                <button className="btn h-8 px-2.5 text-xs text-teamA">Eliminar</button>
              </form>
            </div>

            {manualGoals.filter(g => g.participant_id === p.id).map(g => (
              <form key={g.id} action={clearGoal}
                className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft">
                <input type="hidden" name="goal_id" value={g.id} />
                <input type="hidden" name="competition_id" value={c.id} />
                <span>Meta manual {g.goal} desde semana {g.week_number}</span>
                <button className="underline underline-offset-2">quitar</button>
              </form>
            ))}
          </li>
        ))}
      </ul>

      {/* Comodines */}
      {wildcards.length > 0 && (
        <>
          <p className="eyebrow mb-2.5">Comodines usados</p>
          <ul className="mb-6 space-y-1.5">
            {wildcards.map(w => (
              <li key={w.id} className="card flex items-center justify-between gap-2 p-2.5 text-[0.8125rem]">
                <span className="min-w-0 flex-1 truncate">
                  {nameOf.get(w.participant_id) ?? '—'} · semana {w.week_number}
                  <span className={`chip ml-2 ${w.is_admin_grant
                    ? 'bg-navy-800 text-white' : 'bg-ice-sunk text-ink-soft'}`}>
                    {w.is_admin_grant ? 'Admin' : 'Propio'}
                  </span>
                </span>
                <form action={deleteWildcard}>
                  <input type="hidden" name="wildcard_id" value={w.id} />
                  <input type="hidden" name="competition_id" value={c.id} />
                  <button className="text-xs font-medium text-teamA underline underline-offset-2">anular</button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Registros recientes */}
      <p className="eyebrow mb-2.5">Últimos registros</p>
      {workouts.length === 0 ? (
        <p className="card p-5 text-center text-sm text-ink-soft">Sin registros todavía.</p>
      ) : (
        <ul className="space-y-1.5">
          {workouts.map(w => (
            <li key={w.id} className="card flex items-center gap-2.5 p-2.5">
              {(() => {
                const photos = photosOf(w);
                return photos.length ? (
                  <div className="flex gap-1">
                    {photos.slice(0, 3).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={i} href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt="" className="h-9 w-9 rounded object-cover" />
                      </a>
                    ))}
                  </div>
                ) : <div className="h-9 w-9 rounded bg-ice-sunk" />;
              })()}
              <div className="min-w-0 flex-1 text-[0.8125rem]">
                <p className="truncate font-medium">{nameOf.get(w.participant_id) ?? '—'}</p>
                <p className="text-xs text-ink-faint">
                  S{w.week_number} · {DAY_NAMES[w.day_of_week - 1]} · {w.sport}
                </p>
              </div>
              <form action={deleteWorkout}>
                <input type="hidden" name="workout_id" value={w.id} />
                <input type="hidden" name="competition_id" value={c.id} />
                <button className="text-xs font-medium text-teamA underline underline-offset-2">borrar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Num({ label, name, value, type = 'number' }: {
  label: string; name: string; value: string | number; type?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="field" defaultValue={value} />
    </div>
  );
}

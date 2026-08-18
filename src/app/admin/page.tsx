import Link from 'next/link';
import { isAdmin, login, logout, createCompetition } from './actions';
import { createAdminClient } from '@/lib/supabase/server';
import { weekNumberFor, endDateOf, formatDate, mondayOfChile } from '@/lib/week';
import StartDatePicker from '@/components/StartDatePicker';
import CoverPicker from '@/components/CoverPicker';
import { BackLink } from '@/components/ui';
import ErrorBanner from '@/components/ErrorBanner';
import type { Competition } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminHome({
  searchParams,
}: { searchParams: { error?: string } }) {
  if (!(await isAdmin())) return <Gate error={searchParams.error} />;

  const supabase = createAdminClient();
  const { data } = await supabase.from('competitions').select('*')
    .order('start_date', { ascending: false });
  const competitions = (data ?? []) as Competition[];

  // Por defecto, el lunes de la semana en curso en Chile.
  const defaultStart = mondayOfChile();

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href="/">Volver a la app</BackLink>
        <form action={logout}>
          <button className="text-[0.8125rem] text-ink-faint underline underline-offset-2">
            Cerrar panel
          </button>
        </form>
      </div>

      <ErrorBanner message={searchParams.error} />

      <h1 className="display mb-1 text-2xl leading-none">Panel de administración</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Crea competencias, arma los equipos y ajusta las reglas.
      </p>

      <section className="card mb-6 p-4">
        <p className="eyebrow mb-3">Nueva competencia</p>
        <form action={createCompetition} className="space-y-3">
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="field" required
              placeholder="Pulso 2026" />
          </div>

          <CoverPicker />

          <div className="grid grid-cols-2 gap-2.5">
            <StartDatePicker defaultValue={defaultStart} weeks={12} />
            <div>
              <label className="label" htmlFor="goal_initial">Meta inicial</label>
              <input id="goal_initial" name="goal_initial" type="number" className="field"
                defaultValue={2} min={1} />
            </div>
            <div>
              <label className="label" htmlFor="goal_advanced">Meta avanzada</label>
              <input id="goal_advanced" name="goal_advanced" type="number" className="field"
                defaultValue={3} min={1} />
            </div>
            <div>
              <label className="label" htmlFor="max_weekly">Tope semanal</label>
              <input id="max_weekly" name="max_weekly" type="number" className="field"
                defaultValue={6} min={1} max={7} />
            </div>
            <div>
              <label className="label" htmlFor="streak_to_raise">Semanas para subir meta</label>
              <input id="streak_to_raise" name="streak_to_raise" type="number" className="field"
                defaultValue={3} min={1} />
            </div>
            <div>
              <label className="label" htmlFor="wildcards_per_person">Comodines por persona</label>
              <input id="wildcards_per_person" name="wildcards_per_person" type="number"
                className="field" defaultValue={1} min={0} />
            </div>
          </div>

          <button className="btn btn-primary w-full">Crear competencia</button>
        </form>
      </section>

      <div className="mb-2.5 flex items-center justify-between">
        <p className="eyebrow">Competencias</p>
        <Link href="/admin/deportes" className="text-[0.8125rem] text-ink-soft hover:text-ink">
          Catálogo de deportes
        </Link>
      </div>

      {competitions.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">Todavía no hay competencias.</p>
      ) : (
        <ul className="space-y-2">
          {competitions.map(c => (
            <li key={c.id}>
              <Link href={`/admin/${c.id}`} className="card flex items-center gap-3 p-3.5 transition hover:bg-ice-sunk">
                {c.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover_url} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-16 shrink-0 rounded-lg bg-ice-sunk" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="display truncate text-base leading-tight">{c.name}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Semana {Math.min(weekNumberFor(c.start_date), c.total_weeks)} de {c.total_weeks}
                    {' · '}metas {c.goal_initial}/{c.goal_advanced}
                    {' · '}hasta {formatDate(endDateOf(c.start_date, c.total_weeks))}
                  </p>
                </div>
                <span className={`chip ${c.is_active
                  ? 'bg-win/15 text-win' : 'bg-ice-sunk text-ink-soft'}`}>
                  {c.is_active ? 'Activa' : 'Cerrada'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Gate({ error }: { error?: string }) {
  return (
    <div className="mx-auto max-w-sm pt-14 text-center">
      <h1 className="display text-2xl leading-none">Panel de administración</h1>
      <p className="mb-5 mt-2 text-sm text-ink-soft">
        Ingresa la clave compartida para gestionar competencias.
      </p>
      <ErrorBanner message={error} />
      <form action={login} className="space-y-3">
        <input name="passcode" type="password" className="field" placeholder="Clave"
          autoComplete="off" required />
        <button className="btn btn-primary w-full text-base">Entrar</button>
      </form>
      <div className="mt-4 text-center">
        <BackLink href="/">Volver a la app</BackLink>
      </div>
    </div>
  );
}

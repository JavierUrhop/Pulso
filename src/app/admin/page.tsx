import Link from 'next/link';
import { isAdmin, login, logout, createCompetition } from './actions';
import { createAdminClient } from '@/lib/supabase/server';
import { weekNumberFor } from '@/lib/week';
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href="/">Volver a la app</BackLink>
        <form action={logout}>
          <button className="text-[13px] text-ink-faint underline underline-offset-2">
            Cerrar panel
          </button>
        </form>
      </div>

      <ErrorBanner message={searchParams.error} />

      <h1 className="mb-1 text-xl font-medium">Panel de administración</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Crea competencias, arma los equipos y ajusta las reglas.
      </p>

      <section className="card mb-6 p-4">
        <h2 className="mb-3 font-medium">Nueva competencia</h2>
        <form action={createCompetition} className="space-y-3">
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="field" required
              placeholder="Pulso 2026" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label" htmlFor="start_date">Inicio</label>
              <input id="start_date" name="start_date" type="date" className="field"
                defaultValue={today} required />
            </div>
            <div>
              <label className="label" htmlFor="max_weekly">Tope semanal</label>
              <input id="max_weekly" name="max_weekly" type="number" className="field"
                defaultValue={6} min={1} max={7} />
            </div>
            <div>
              <label className="label" htmlFor="goal_sedentario">Meta sedentario</label>
              <input id="goal_sedentario" name="goal_sedentario" type="number" className="field"
                defaultValue={2} min={1} />
            </div>
            <div>
              <label className="label" htmlFor="goal_avanzado">Meta avanzado</label>
              <input id="goal_avanzado" name="goal_avanzado" type="number" className="field"
                defaultValue={3} min={1} />
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
        <h2 className="font-medium">Competencias</h2>
        <Link href="/admin/deportes" className="text-[13px] text-ink-soft hover:text-ink">
          Catálogo de deportes
        </Link>
      </div>

      {competitions.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">Todavía no hay competencias.</p>
      ) : (
        <ul className="space-y-2">
          {competitions.map(c => (
            <li key={c.id}>
              <Link href={`/admin/${c.id}`} className="card flex items-center justify-between p-3.5 hover:bg-paper-sunk">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Semana {weekNumberFor(c.start_date)} · metas {c.goal_sedentario}/{c.goal_avanzado}
                  </p>
                </div>
                <span className={`chip ${c.is_active
                  ? 'bg-teamB-soft text-teamB-ink' : 'bg-paper-sunk text-ink-soft'}`}>
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
    <div className="mx-auto max-w-sm pt-16">
      <h1 className="text-xl font-medium">Panel de administración</h1>
      <p className="mb-5 mt-1 text-sm text-ink-soft">
        Ingresa la clave compartida para gestionar competencias.
      </p>
      <ErrorBanner message={error} />
      <form action={login} className="space-y-3">
        <input name="passcode" type="password" className="field" placeholder="Clave"
          autoComplete="off" required />
        <button className="btn btn-primary w-full">Entrar</button>
      </form>
      <div className="mt-4 text-center">
        <BackLink href="/">Volver a la app</BackLink>
      </div>
    </div>
  );
}

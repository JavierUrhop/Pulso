import { redirect } from 'next/navigation';
import { isAdmin, addSport, toggleSport } from '../actions';
import { createAdminClient } from '@/lib/supabase/server';
import { BackLink } from '@/components/ui';
import ErrorBanner from '@/components/ErrorBanner';
import type { Sport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Deportes({
  searchParams,
}: { searchParams: { error?: string } }) {
  if (!(await isAdmin())) redirect('/admin');

  const supabase = createAdminClient();
  const { data } = await supabase.from('sports').select('*').order('sort_order');
  const sports = (data ?? []) as Sport[];

  return (
    <>
      <BackLink href="/admin">Panel</BackLink>
      <ErrorBanner message={searchParams.error} />
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Catálogo de deportes</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Esta lista alimenta el desplegable del formulario de registro.
      </p>

      <form action={addSport} className="card mb-5 flex items-end gap-2 p-4">
        <div className="flex-1">
          <label className="label" htmlFor="name">Nuevo deporte</label>
          <input id="name" name="name" className="field" required placeholder="Escalada" />
        </div>
        <div className="w-24">
          <label className="label" htmlFor="sort_order">Orden</label>
          <input id="sort_order" name="sort_order" type="number" className="field" defaultValue={100} />
        </div>
        <button className="btn btn-primary">Agregar</button>
      </form>

      <ul className="space-y-1.5">
        {sports.map(s => (
          <li key={s.id} className="card flex items-center justify-between p-3">
            <span className={`text-sm ${s.is_active ? '' : 'text-ink-faint line-through'}`}>
              {s.name}
            </span>
            <form action={toggleSport}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="is_active" value={String(!s.is_active)} />
              <button className="text-xs font-medium text-ink-soft underline underline-offset-2">
                {s.is_active ? 'ocultar' : 'activar'}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}

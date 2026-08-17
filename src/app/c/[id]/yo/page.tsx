import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import ProfileForm from './ProfileForm';
import SignOut from '@/components/SignOut';
import Settings from '@/components/Settings';


export const dynamic = 'force-dynamic';

export default async function MiPerfil({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);

  const me = data.me;

  return (
    <>
      <section className={`-mx-4 -mt-5 mb-5 px-4 pb-5 pt-6 text-white
        [padding-top:calc(1.5rem+env(safe-area-inset-top))]
        ${me.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`}>
        <div className="mx-auto flex max-w-2xl items-start justify-between">
          <div>
            <h1 className="display text-2xl leading-none">Mi perfil</h1>
            <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.12em] text-white/70">
              Equipo {me.team} · {me.category === 'inicial' ? 'meta inicial' : 'meta avanzada'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Settings />
            <SignOut />
          </div>
        </div>
      </section>

      <p className="mb-4 text-[0.8125rem] text-ink-soft">
        Tu equipo y categoría los define el administrador. Aquí puedes ajustar cómo te ven los demás.
      </p>

      <ProfileForm competitionId={params.id} participant={me} />
    </>
  );
}

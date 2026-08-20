import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { BackLink } from '@/components/ui';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function EditarPerfil({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);

  return (
    <>
      <BackLink href={`/c/${params.id}/yo`}>Mi perfil</BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Editar mis datos</h1>
      <p className="mb-5 text-[0.8125rem] text-ink-soft">
        Equipo {data.me.team} y categoría los define el administrador.
      </p>
      <ProfileForm competitionId={params.id} participant={data.me} />
    </>
  );
}

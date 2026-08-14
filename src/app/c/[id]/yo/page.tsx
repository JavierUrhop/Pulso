import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { BackLink } from '@/components/ui';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function MiPerfil({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);

  return (
    <>
      <BackLink href={`/c/${params.id}`}>Volver</BackLink>
      <h1 className="mb-1 mt-4 text-xl font-medium">Mi perfil</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Equipo {data.me.team} · categoría {data.me.category}. Eso lo define el administrador.
      </p>
      <ProfileForm competitionId={params.id} participant={data.me} />
    </>
  );
}

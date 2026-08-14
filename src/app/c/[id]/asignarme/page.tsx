import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { BackLink, Avatar, CategoryChip, Empty } from '@/components/ui';
import ClaimForm from './ClaimForm';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Asignarme({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (data.me) redirect(`/c/${params.id}/yo`);

  const free = data.participants.filter(p => p.is_active && !p.user_id);

  return (
    <>
      <BackLink href="/">Competencias</BackLink>

      <header className="mb-5 mt-4">
        <h1 className="text-xl font-medium">¿Quién eres?</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Elige tu nombre de la lista. Ese cupo queda ligado a tu cuenta y nadie más podrá tomarlo.
        </p>
      </header>

      {free.length === 0 ? (
        <Empty
          title="No quedan cupos libres"
          body="Todos los nombres de esta competencia ya fueron reclamados. Pídele al administrador que agregue el tuyo."
        />
      ) : (
        <ClaimForm competitionId={params.id} options={free} />
      )}
    </>
  );
}

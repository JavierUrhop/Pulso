import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { loadTrophyRoom } from '@/lib/trophies';
import TrophyRoom from '@/components/TrophyRoom';
import Settings from '@/components/Settings';
import SignOut from '@/components/SignOut';

export const dynamic = 'force-dynamic';

export default async function MiPerfil({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);
  if (!data.user) redirect('/login');

  const room = await loadTrophyRoom(data.user.id);
  if (!room) notFound();

  return (
    <>
      <TrophyRoom
        room={room}
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <Settings />
            <SignOut />
          </div>
        }
      />

      <div className="flex gap-2 border-t border-line pt-4">
        <Link href={`/c/${params.id}/yo/editar`} className="btn flex-1">
          Editar mis datos
        </Link>
        <Link href={`/c/${params.id}`} className="btn flex-1">
          Ir al marcador
        </Link>
      </div>
    </>
  );
}

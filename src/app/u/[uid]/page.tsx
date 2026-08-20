import { notFound } from 'next/navigation';
import { loadTrophyRoom } from '@/lib/trophies';
import { createClient } from '@/lib/supabase/server';
import TrophyRoom from '@/components/TrophyRoom';
import { BackLink } from '@/components/ui';

export const dynamic = 'force-dynamic';

/** Perfil público de un integrante, visible para cualquiera de la competencia. */
export default async function PerfilPublico({ params }: { params: { uid: string } }) {
  const room = await loadTrophyRoom(params.uid);
  if (!room) notFound();

  const { data: { user } } = await createClient().auth.getUser();
  const isMe = user?.id === params.uid;

  return (
    <>
      <TrophyRoom room={room} />
      <div className="border-t border-line pt-4">
        <BackLink href={isMe ? '/' : `/c/${room.competitions[0]?.competition.id ?? ''}`}>
          Volver
        </BackLink>
      </div>
    </>
  );
}

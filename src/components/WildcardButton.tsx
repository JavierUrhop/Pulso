'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WildcardButton({
  competitionId, participantId, weekNumber, alreadyUsedThisWeek, remaining,
}: {
  competitionId: string;
  participantId: string;
  weekNumber: number;
  alreadyUsedThisWeek: boolean;
  remaining: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyUsedThisWeek) {
    return <span className="text-xs text-ink-faint">Comodín activo</span>;
  }
  if (remaining <= 0) {
    return <span className="text-xs text-ink-faint">Sin comodines</span>;
  }

  async function use() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().from('wildcards').insert({
      competition_id: competitionId,
      participant_id: participantId,
      week_number: weekNumber,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button className="btn h-8 px-3 text-xs" onClick={() => setConfirming(true)}>
        Usar comodín ({remaining})
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">¿Seguro? Es único en la temporada.</span>
        <button className="btn h-8 px-3 text-xs" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
        <button className="btn btn-primary h-8 px-3 text-xs" onClick={use} disabled={busy}>
          {busy ? '…' : 'Confirmar'}
        </button>
      </div>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}

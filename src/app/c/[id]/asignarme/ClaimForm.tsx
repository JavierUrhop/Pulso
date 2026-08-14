'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar, CategoryChip } from '@/components/ui';
import type { Participant } from '@/lib/types';

export default function ClaimForm({
  competitionId, options,
}: { competitionId: string; options: Participant[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function claim() {
    if (!selected) return setError('Selecciona tu nombre para continuar.');
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // El filtro `is('user_id', null)` evita que dos personas tomen el mismo cupo.
    const { data, error } = await supabase
      .from('participants')
      .update({ user_id: user!.id, claimed_at: new Date().toISOString() })
      .eq('id', selected)
      .is('user_id', null)
      .select();

    setBusy(false);

    if (error) return setError('No se pudo asignar. Intenta de nuevo.');
    if (!data?.length) return setError('Alguien acaba de tomar ese cupo. Elige otro.');

    router.push(`/c/${competitionId}/yo`);
    router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {options.map(p => (
          <li key={p.id}>
            <button
              onClick={() => { setSelected(p.id); setError(null); }}
              className={`flex w-full items-center gap-3 rounded-xl2 border p-3 text-left transition ${
                selected === p.id
                  ? 'border-ink bg-paper-sunk'
                  : 'border-line bg-paper-card hover:bg-paper-sunk'}`}>
              <Avatar url={p.avatar_url} name={p.display_name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.display_name}</p>
                <p className="mt-0.5 text-xs text-ink-faint">Equipo {p.team}</p>
              </div>
              <CategoryChip category={p.category} />
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-[13px] text-red-700">{error}</p>}

      <button className="btn btn-primary mt-4 w-full" onClick={claim} disabled={busy}>
        {busy ? 'Asignando…' : 'Este soy yo'}
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">
        Después podrás cambiar tu apodo y tu foto.
      </p>
    </>
  );
}

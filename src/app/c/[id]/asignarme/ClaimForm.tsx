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
    setBusy(true); setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // El filtro is('user_id', null) evita que dos personas tomen el mismo cupo.
    const { data, error } = await supabase.from('participants')
      .update({ user_id: user!.id, claimed_at: new Date().toISOString() })
      .eq('id', selected).is('user_id', null).select();

    setBusy(false);
    if (error) return setError('No se pudo asignar. Intenta de nuevo.');
    if (!data?.length) return setError('Alguien acaba de tomar ese cupo. Elige otro.');

    router.push(`/c/${competitionId}`);
    router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {options.map(p => {
          const on = selected === p.id;
          return (
            <li key={p.id}>
              <button onClick={() => { setSelected(p.id); setError(null); }}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl2 border p-3 text-left transition ${
                  on ? 'border-navy-800 bg-navy-800/[0.04] shadow-card'
                     : 'border-line bg-ice-card hover:bg-ice-sunk'}`}>
                <span className={`team-bar ${p.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <Avatar url={p.avatar_url} name={p.display_name} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Equipo {p.team}
                  </p>
                </div>
                <CategoryChip category={p.category} />
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-3 rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5 text-[13px] text-teamA-ink">
          {error}
        </p>
      )}

      <button className="btn btn-primary mt-4 w-full text-base" onClick={claim} disabled={busy}>
        {busy ? 'Asignando…' : 'Este soy yo'}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-faint">
        Después podrás cambiar tu apodo y tu foto.
      </p>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES, currentDayOfWeek } from '@/lib/week';

export default function WorkoutForm({
  competitionId, participantId, weekNumber, sports,
  alreadyThisWeek, maxWeekly, goal, usedWildcard,
}: {
  competitionId: string;
  participantId: string;
  weekNumber: number;
  sports: string[];
  alreadyThisWeek: number;
  maxWeekly: number;
  goal: number;
  usedWildcard: boolean;
}) {
  const router = useRouter();
  const [day, setDay] = useState(currentDayOfWeek());
  const [sport, setSport] = useState(sports[0] ?? '');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = alreadyThisWeek >= maxWeekly;
  const next = alreadyThisWeek + 1;

  function pick(f: File | null) {
    setFile(f);
    setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    if (!sport) return setError('Elige un deporte.');
    setBusy(true);
    setError(null);

    const supabase = createClient();
    let photoUrl: string | null = null;

    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setBusy(false);
        return setError('La foto pesa más de 8 MB. Prueba con una más liviana.');
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${competitionId}/${participantId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from('workout-photos').upload(path, file);
      if (up.error) {
        setBusy(false);
        return setError('No se pudo subir la foto. Puedes guardar sin ella.');
      }
      photoUrl = supabase.storage.from('workout-photos').getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from('workouts').insert({
      competition_id: competitionId,
      participant_id: participantId,
      week_number: weekNumber,
      day_of_week: day,
      sport,
      note: note.trim() || null,
      photo_url: photoUrl,
    });

    setBusy(false);
    if (error) return setError(error.message);

    router.push(`/c/${competitionId}`);
    router.refresh();
  }

  if (usedWildcard) {
    return (
      <div className="card p-6 text-center">
        <p className="font-medium">Esta semana estás con comodín</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">
          Los registros de esta semana no suman puntos. Vuelve la próxima semana.
        </p>
      </div>
    );
  }

  if (atCap) {
    return (
      <div className="card p-6 text-center">
        <p className="font-medium">Llegaste al tope de la semana</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">
          Ya registraste {maxWeekly} entrenamientos, que es el máximo que puntúa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="day">Día</label>
        <select id="day" className="field" value={day} onChange={e => setDay(Number(e.target.value))}>
          {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="sport">Deporte</label>
        <select id="sport" className="field" value={sport}
          onChange={e => { setSport(e.target.value); setError(null); }}>
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="note">Nota <span className="text-ink-faint">(opcional)</span></label>
        <input id="note" className="field" value={note} maxLength={120}
          onChange={e => setNote(e.target.value)} placeholder="8 km por el parque" />
      </div>

      <div>
        <label className="label">Foto de respaldo <span className="text-ink-faint">(opcional)</span></label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper-card px-4 py-6 text-center hover:bg-paper-sunk">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa" className="h-28 rounded-lg object-cover" />
          ) : (
            <>
              <span className="text-sm text-ink-soft">Toca para subir una foto</span>
              <span className="mt-0.5 text-xs text-ink-faint">Hace el registro auditable</span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => pick(e.target.files?.[0] ?? null)} />
        </label>
        {preview && (
          <button className="mt-2 text-xs text-ink-faint underline underline-offset-2"
            onClick={() => pick(null)}>Quitar foto</button>
        )}
      </div>

      <div className="rounded-lg bg-paper-sunk px-3.5 py-3 text-[13px] text-ink-soft">
        Será tu entrenamiento número {next} de la semana. Tu meta es {goal}.
        {next === goal && ' Con este alcanzas la meta.'}
        {next === goal + 1 && ' Con este superas la meta.'}
      </div>

      {error && <p className="text-[13px] text-red-700">{error}</p>}

      <button className="btn btn-primary w-full" onClick={save} disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar entrenamiento'}
      </button>
    </div>
  );
}

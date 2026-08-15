'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES, currentDayOfWeek } from '@/lib/week';
import type { Team } from '@/lib/types';

const SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function WorkoutForm({
  competitionId, participantId, weekNumber, sports,
  alreadyThisWeek, maxWeekly, goal, usedWildcard, team,
}: {
  competitionId: string; participantId: string; weekNumber: number;
  sports: string[]; alreadyThisWeek: number; maxWeekly: number;
  goal: number; usedWildcard: boolean; team: Team;
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
  const accent = team === 'A' ? 'bg-teamA' : 'bg-teamB';

  function pick(f: File | null) {
    setFile(f); setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    if (!sport) return setError('Elige un deporte.');
    setBusy(true); setError(null);

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
      competition_id: competitionId, participant_id: participantId,
      week_number: weekNumber, day_of_week: day, sport,
      note: note.trim() || null, photo_url: photoUrl,
    });

    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/c/${competitionId}`);
    router.refresh();
  }

  if (usedWildcard) {
    return (
      <div className="card p-6 text-center">
        <p className="display text-lg">Semana con comodín</p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
          Los registros de esta semana no suman puntos. Vuelve la próxima.
        </p>
      </div>
    );
  }

  if (atCap) {
    return (
      <div className="card p-6 text-center">
        <p className="display text-lg">Tope alcanzado</p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
          Ya registraste {maxWeekly} entrenamientos, el máximo que puntúa por semana.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Día</p>
        <div className="grid grid-cols-7 gap-1.5">
          {SHORT.map((d, i) => {
            const val = i + 1;
            const on = day === val;
            return (
              <button key={i} onClick={() => setDay(val)}
                aria-label={DAY_NAMES[i]} aria-pressed={on}
                className={`h-12 rounded-xl border font-display text-base font-bold transition ${
                  on ? `${accent} border-transparent text-white shadow-lift`
                     : 'border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">{DAY_NAMES[day - 1]}</p>
      </div>

      <div>
        <p className="label">Deporte</p>
        <div className="flex flex-wrap gap-1.5">
          {sports.map(s => (
            <button key={s} onClick={() => { setSport(s); setError(null); }}
              aria-pressed={sport === s}
              className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition ${
                sport === s ? 'border-navy-800 bg-navy-800 text-white'
                            : 'border-line bg-ice-card text-ink-soft hover:bg-ice-sunk'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">Nota (opcional)</label>
        <input id="note" className="field" value={note} maxLength={120}
          onChange={e => setNote(e.target.value)} placeholder="8 km por el parque" />
      </div>

      <div>
        <p className="label">Foto de respaldo (opcional)</p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl2
                          border-2 border-dashed border-line bg-ice-card px-4 py-7 text-center
                          transition hover:bg-ice-sunk">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa" className="h-32 rounded-lg object-cover" />
          ) : (
            <>
              <span className="text-sm font-semibold text-ink-soft">Toca para subir una foto</span>
              <span className="mt-0.5 text-[11px] text-ink-faint">Hace el registro auditable</span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => pick(e.target.files?.[0] ?? null)} />
        </label>
        {preview && (
          <button className="mt-2 text-xs font-medium text-ink-faint underline underline-offset-2"
            onClick={() => pick(null)}>Quitar foto</button>
        )}
      </div>

      <div className="rounded-xl border border-line bg-ice-card px-3.5 py-3">
        <p className="text-[13px] text-ink-soft">
          Entrenamiento <span className="score font-bold text-ink">{next}</span> de la semana ·
          {' '}meta <span className="score font-bold text-ink">{goal}</span>
          {next === goal && <span className="font-semibold text-win"> · con este llegas a la meta</span>}
          {next === goal + 1 && <span className="font-semibold text-win"> · con este la superas</span>}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5 text-[13px] text-teamA-ink">
          {error}
        </p>
      )}

      <button className="btn btn-primary w-full text-base" onClick={save} disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar entrenamiento'}
      </button>
    </div>
  );
}

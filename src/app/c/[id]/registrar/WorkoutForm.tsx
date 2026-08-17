'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES, DAY_SHORT, currentDayOfWeek } from '@/lib/week';
import { sportIcon, MAX_PHOTOS } from '@/lib/sports';
import type { Team, Sport } from '@/lib/types';

interface Shot { file: File; url: string }

export default function WorkoutForm({
  competitionId, participantId, weekNumber, sports,
  alreadyThisWeek, maxWeekly, goal, usedWildcard, team,
}: {
  competitionId: string; participantId: string; weekNumber: number;
  sports: Sport[]; alreadyThisWeek: number; maxWeekly: number;
  goal: number; usedWildcard: boolean; team: Team;
}) {
  const router = useRouter();
  const [day, setDay] = useState(currentDayOfWeek());
  const [sport, setSport] = useState(sports[0]?.name ?? '');
  const [note, setNote] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = alreadyThisWeek >= maxWeekly;
  const next = alreadyThisWeek + 1;
  const accent = team === 'A' ? 'bg-teamA' : 'bg-teamB';
  const reference = sports.find(s => s.name === sport)?.reference;

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);

    const room = MAX_PHOTOS - shots.length;
    if (room <= 0) return setError(`Máximo ${MAX_PHOTOS} fotos por entrenamiento.`);

    const incoming = Array.from(list).slice(0, room);
    const tooBig = incoming.find(f => f.size > 8 * 1024 * 1024);
    if (tooBig) return setError('Hay una foto de más de 8 MB. Prueba con una más liviana.');

    setShots(prev => [...prev, ...incoming.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
  }

  function removeShot(i: number) {
    setShots(prev => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
    setError(null);
  }

  async function save() {
    if (!sport) return setError('Elige un deporte.');
    if (shots.length === 0) return setError('Sube al menos una foto de respaldo.');

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const urls: string[] = [];
    for (const [i, shot] of shots.entries()) {
      const ext = shot.file.name.split('.').pop() || 'jpg';
      const path = `${competitionId}/${participantId}/${Date.now()}-${i}.${ext}`;
      const up = await supabase.storage.from('workout-photos').upload(path, shot.file);
      if (up.error) {
        setBusy(false);
        return setError('No se pudo subir una de las fotos. Intenta de nuevo.');
      }
      urls.push(supabase.storage.from('workout-photos').getPublicUrl(path).data.publicUrl);
    }

    const { error } = await supabase.from('workouts').insert({
      competition_id: competitionId, participant_id: participantId,
      week_number: weekNumber, day_of_week: day, sport,
      note: note.trim() || null, photo_urls: urls,
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
          {DAY_SHORT.map((d, i) => {
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
        <label className="label" htmlFor="sport">Deporte</label>
        <div className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ice-sunk text-xl">
            {sportIcon(sport)}
          </span>
          <select id="sport" className="field flex-1" value={sport}
            onChange={e => { setSport(e.target.value); setError(null); }}>
            {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        {reference && (
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Referencia sugerida: {reference}. Es orientativa, no se guarda en el registro.
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="label mb-0">Fotos de respaldo</p>
          <span className={`text-[11px] font-semibold ${
            shots.length ? 'text-ink-faint' : 'text-teamA'}`}>
            {shots.length}/{MAX_PHOTOS} · obligatorio
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {shots.map((s, i) => (
            <div key={s.url} className="relative aspect-square overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button onClick={() => removeShot(i)} aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full
                           bg-navy-900/75 text-xs font-bold text-white">
                ✕
              </button>
            </div>
          ))}

          {shots.length < MAX_PHOTOS && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center
                              gap-1 rounded-xl border-2 border-dashed border-line bg-ice-card
                              text-center transition hover:bg-ice-sunk">
              <span className="text-xl leading-none" aria-hidden>＋</span>
              <span className="px-1 text-[10px] font-semibold leading-tight text-ink-soft">
                Cámara o galería
              </span>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => { addFiles(e.target.files); e.currentTarget.value = ''; }} />
            </label>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          Puedes tomar la foto en el momento o elegirla de tu galería.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="note">Nota (opcional)</label>
        <input id="note" className="field" value={note} maxLength={120}
          onChange={e => setNote(e.target.value)} placeholder="8 km por el parque" />
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

      <button className="btn btn-primary w-full text-base" onClick={save}
        disabled={busy || shots.length === 0}>
        {busy ? 'Guardando…' : 'Guardar entrenamiento'}
      </button>
    </div>
  );
}

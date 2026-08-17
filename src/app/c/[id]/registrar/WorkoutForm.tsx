'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES, DAY_SHORT, currentDayOfWeek } from '@/lib/week';
import { sportIcon, MAX_PHOTOS, titleCase } from '@/lib/sports';
import { compressImage, formatBytes } from '@/lib/image';
import type { Team, Sport } from '@/lib/types';

interface Shot { file: File; url: string; saved: number }

const OTRO = '__otro__';

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
  const [customSport, setCustomSport] = useState('');
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = alreadyThisWeek >= maxWeekly;
  const next = alreadyThisWeek + 1;
  const accent = team === 'A' ? 'bg-teamA' : 'bg-teamB';
  const isOther = sport === OTRO;
  const reference = sports.find(s => s.name === sport)?.reference;
  const savedBytes = shots.reduce((n, s) => n + s.saved, 0);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);

    const room = MAX_PHOTOS - shots.length;
    if (room <= 0) return setError(`Máximo ${MAX_PHOTOS} fotos por entrenamiento.`);

    setWorking(true);
    const incoming = Array.from(list).slice(0, room);
    const ready: Shot[] = [];

    for (const original of incoming) {
      // Se reduce en el teléfono antes de subir: más rápido y ocupa mucho menos.
      const { file, originalBytes, finalBytes } = await compressImage(original);

      if (finalBytes > 8 * 1024 * 1024) {
        setWorking(false);
        return setError('Una de las fotos es demasiado pesada incluso comprimida.');
      }
      ready.push({ file, url: URL.createObjectURL(file), saved: originalBytes - finalBytes });
    }

    setShots(prev => [...prev, ...ready]);
    setWorking(false);
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

    let finalSport = sport;

    setBusy(true);
    setError(null);
    const supabase = createClient();

    // Deporte escrito a mano: se guarda en el catálogo para que quede
    // disponible para todos y aparezca en el marcador de deportes.
    if (isOther) {
      const clean = titleCase(customSport);
      if (clean.length < 3) {
        setBusy(false);
        return setError('Escribe el nombre del deporte (mínimo 3 letras).');
      }
      const { data, error } = await supabase.rpc('add_sport', { p_name: clean });
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      finalSport = (data as string) ?? clean;
    }

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
      week_number: weekNumber, day_of_week: day, sport: finalSport,
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
        <p className="mt-1.5 text-[0.6875rem] text-ink-faint">{DAY_NAMES[day - 1]}</p>
      </div>

      <div>
        <label className="label" htmlFor="sport">Deporte</label>
        <div className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ice-sunk text-xl">
            {sportIcon(isOther ? customSport : sport)}
          </span>
          <select id="sport" className="field flex-1" value={sport}
            onChange={e => { setSport(e.target.value); setError(null); }}>
            {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            <option value={OTRO}>Otro (escribirlo)</option>
          </select>
        </div>

        {isOther ? (
          <div className="mt-2">
            <input className="field" value={customSport} maxLength={40}
              onChange={e => { setCustomSport(e.target.value); setError(null); }}
              placeholder="Ej: Patinaje" aria-label="Nombre del deporte" />
            <p className="mt-1.5 text-[0.6875rem] text-ink-faint">
              Quedará guardado en la lista para todos y aparecerá en Deportes.
            </p>
          </div>
        ) : reference ? (
          <p className="mt-1.5 text-[0.6875rem] text-ink-faint">
            Referencia sugerida: {reference}. Es orientativa, no se guarda en el registro.
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="label mb-0">Fotos de respaldo</p>
          <span className={`text-[0.6875rem] font-semibold ${
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

          {working && (
            <div className="grid aspect-square place-items-center rounded-xl border border-line
                            bg-ice-sunk text-[0.6875rem] font-semibold text-ink-faint">
              Optimizando…
            </div>
          )}

          {shots.length < MAX_PHOTOS && !working && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center
                              gap-1 rounded-xl border-2 border-dashed border-line bg-ice-card
                              text-center transition hover:bg-ice-sunk">
              <span className="text-xl leading-none" aria-hidden>＋</span>
              <span className="px-1 text-[0.625rem] font-semibold leading-tight text-ink-soft">
                Cámara o galería
              </span>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => { addFiles(e.target.files); e.currentTarget.value = ''; }} />
            </label>
          )}
        </div>
        <p className="mt-1.5 text-[0.6875rem] text-ink-faint">
          Puedes tomar la foto en el momento o elegirla de tu galería.
          {savedBytes > 50_000 && ` Se optimizaron ${formatBytes(savedBytes)} antes de subir.`}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="note">Nota (opcional)</label>
        <input id="note" className="field" value={note} maxLength={120}
          onChange={e => setNote(e.target.value)} placeholder="8 km por el parque" />
      </div>

      <div className="rounded-xl border border-line bg-ice-card px-3.5 py-3">
        <p className="text-[0.8125rem] text-ink-soft">
          Entrenamiento <span className="score font-bold text-ink">{next}</span> de la semana ·
          {' '}meta <span className="score font-bold text-ink">{goal}</span>
          {next === goal && <span className="font-semibold text-win"> · con este llegas a la meta</span>}
          {next === goal + 1 && <span className="font-semibold text-win"> · con este la superas</span>}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5 text-[0.8125rem] text-teamA-ink">
          {error}
        </p>
      )}

      <button className="btn btn-primary w-full text-base" onClick={save}
        disabled={busy || working || shots.length === 0}>
        {busy ? 'Guardando…' : working ? 'Optimizando fotos…' : 'Guardar entrenamiento'}
      </button>
    </div>
  );
}

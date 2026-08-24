'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES } from '@/lib/week';
import type { RegistrationSlot } from '@/lib/week';
import { sportIcon, titleCase, photosOf, MAX_PHOTOS } from '@/lib/sports';
import { compressImage } from '@/lib/image';
import type { Team, Sport, Workout } from '@/lib/types';

const OTRO = '__otro__';

interface NewShot { file: File; url: string }

export default function EditWorkout({
  competitionId, workout, sports, team, participantId, slots,
}: {
  competitionId: string; workout: Workout; sports: Sport[];
  team: Team; participantId: string;
  /** Hoy y ayer. Solo dentro de esa ventana se puede mover la fecha. */
  slots: RegistrationSlot[];
}) {
  const router = useRouter();
  const known = sports.some(s => s.name === workout.sport);

  // Índice del slot que coincide con el registro; -1 si ya quedó fuera de plazo.
  const originalSlot = slots.findIndex(
    sl => sl.weekNumber === workout.week_number && sl.dayOfWeek === workout.day_of_week);
  const [slotIndex, setSlotIndex] = useState(originalSlot);
  const canMoveDate = originalSlot !== -1;
  const [sport, setSport] = useState(known ? workout.sport : OTRO);
  const [customSport, setCustomSport] = useState(known ? '' : workout.sport);
  const [note, setNote] = useState(workout.note ?? '');
  const [kept, setKept] = useState<string[]>(photosOf(workout));
  const [added, setAdded] = useState<NewShot[]>([]);
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOther = sport === OTRO;
  const totalPhotos = kept.length + added.length;
  const accent = team === 'A' ? 'bg-teamA' : 'bg-teamB';

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);

    const room = MAX_PHOTOS - totalPhotos;
    if (room <= 0) return setError(`Máximo ${MAX_PHOTOS} fotos por entrenamiento.`);

    setWorking(true);
    const ready: NewShot[] = [];
    for (const original of Array.from(list).slice(0, room)) {
      const { file } = await compressImage(original);
      ready.push({ file, url: URL.createObjectURL(file) });
    }
    setAdded(prev => [...prev, ...ready]);
    setWorking(false);
  }

  async function save() {
    if (totalPhotos === 0) return setError('Debe quedar al menos una foto de respaldo.');

    let finalSport = sport;
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (isOther) {
      const clean = titleCase(customSport);
      if (clean.length < 3) {
        setBusy(false);
        return setError('Escribe el nombre del deporte (mínimo 3 letras).');
      }
      const { data, error } = await supabase.rpc('add_sport', { p_name: clean });
      if (error) { setBusy(false); return setError(error.message); }
      finalSport = (data as string) ?? clean;
    }

    const urls = [...kept];
    for (const [i, shot] of added.entries()) {
      const ext = shot.file.name.split('.').pop() || 'jpg';
      const path = `${competitionId}/${participantId}/${Date.now()}-${i}.${ext}`;
      const up = await supabase.storage.from('workout-photos').upload(path, shot.file);
      if (up.error) { setBusy(false); return setError('No se pudo subir una de las fotos.'); }
      urls.push(supabase.storage.from('workout-photos').getPublicUrl(path).data.publicUrl);
    }

    const moved = canMoveDate && slotIndex !== -1 ? slots[slotIndex] : null;

    const { error } = await supabase.from('workouts').update({
      ...(moved ? { week_number: moved.weekNumber, day_of_week: moved.dayOfWeek } : {}),
      sport: finalSport,
      note: note.trim() || null, photo_urls: urls,
    }).eq('id', workout.id);

    setBusy(false);
    if (error) return setError(error.message);

    router.push(`/c/${competitionId}/p/${participantId}?semana=${workout.week_number}`);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().from('workouts').delete().eq('id', workout.id);
    setBusy(false);
    if (error) return setError(error.message);

    router.push(`/c/${competitionId}/p/${participantId}?semana=${workout.week_number}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Día del entrenamiento</p>

        {canMoveDate ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((sl, i) => {
                const on = slotIndex === i;
                return (
                  <button key={sl.date} onClick={() => setSlotIndex(i)} aria-pressed={on}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      on ? `${accent} border-transparent text-white shadow-lift`
                         : 'border-line bg-ice-card hover:bg-ice-sunk'}`}>
                    <p className="display text-base leading-none">{sl.label}</p>
                    <p className={`mt-1 text-[0.75rem] font-medium ${
                      on ? 'text-white/80' : 'text-ink-soft'}`}>{sl.dayName}</p>
                    {sl.previousWeek && (
                      <p className={`mt-1 text-[0.625rem] font-bold uppercase tracking-[0.06em] ${
                        on ? 'text-white/70' : 'text-ink-faint'}`}>
                        Semana {sl.weekNumber}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[0.6875rem] text-ink-faint">
              La fecha solo se puede mover dentro de las últimas 24 horas.
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-line bg-ice-sunk px-3.5 py-3">
            <p className="text-[0.8125rem] font-semibold">
              {DAY_NAMES[workout.day_of_week - 1]} · semana {workout.week_number}
            </p>
            <p className="mt-1 text-[0.6875rem] text-ink-faint">
              Pasó el plazo para cambiar la fecha. Puedes seguir corrigiendo el deporte,
              la nota y las fotos, o eliminar el registro.
            </p>
          </div>
        )}
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
        {isOther && (
          <input className="field mt-2" value={customSport} maxLength={40}
            onChange={e => { setCustomSport(e.target.value); setError(null); }}
            placeholder="Ej: Patinaje" aria-label="Nombre del deporte" />
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="label mb-0">Fotos de respaldo</p>
          <span className={`text-[0.6875rem] font-semibold ${
            totalPhotos ? 'text-ink-faint' : 'text-teamA'}`}>
            {totalPhotos}/{MAX_PHOTOS}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {kept.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button onClick={() => setKept(k => k.filter((_, idx) => idx !== i))}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full
                           bg-navy-900/75 text-xs font-bold text-white">✕</button>
            </div>
          ))}

          {added.map((s, i) => (
            <div key={s.url} className="relative aspect-square overflow-hidden rounded-xl border border-navy-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="Foto nueva" className="h-full w-full object-cover" />
              <button onClick={() => setAdded(a => a.filter((_, idx) => idx !== i))}
                aria-label="Quitar foto nueva"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full
                           bg-navy-900/75 text-xs font-bold text-white">✕</button>
            </div>
          ))}

          {working && (
            <div className="grid aspect-square place-items-center rounded-xl border border-line
                            bg-ice-sunk text-[0.6875rem] font-semibold text-ink-faint">
              Optimizando…
            </div>
          )}

          {totalPhotos < MAX_PHOTOS && !working && (
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
      </div>

      <div>
        <label className="label" htmlFor="note">Nota (opcional)</label>
        <input id="note" className="field" value={note} maxLength={120}
          onChange={e => setNote(e.target.value)} />
      </div>

      {error && (
        <p className="rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5 text-[0.8125rem] text-teamA-ink">
          {error}
        </p>
      )}

      <button className="btn btn-primary w-full text-base" onClick={save}
        disabled={busy || working || totalPhotos === 0}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>

      <div className="border-t border-line pt-4">
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="btn w-full border-teamA/40 text-teamA hover:bg-teamA-soft">
            Eliminar este entrenamiento
          </button>
        ) : (
          <div className="rounded-xl border border-teamA/30 bg-teamA-soft p-3.5">
            <p className="text-[0.8125rem] font-semibold text-teamA-ink">
              ¿Seguro que quieres eliminarlo?
            </p>
            <p className="mt-1 text-[0.75rem] text-teamA-ink/80">
              Se borra el registro y sus fotos dejan de mostrarse. Perderás el punto
              de esa sesión y no se puede deshacer.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirming(false)} disabled={busy}
                className="btn flex-1">Cancelar</button>
              <button onClick={remove} disabled={busy}
                className="btn flex-1 border-teamA bg-teamA text-white hover:bg-teamA/90">
                {busy ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

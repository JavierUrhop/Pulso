'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { weekNumberFor, mondayOfChile } from '@/lib/week';

const COOKIE = 'admin_ok';

export async function isAdmin(): Promise<boolean> {
  return cookies().get(COOKIE)?.value === '1';
}

/** Toda acción de admin pasa por aquí antes de tocar la base. */
async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin');
  return createAdminClient();
}

/** Vuelve a la pantalla mostrando el problema. Las server actions de un
 *  <form> no pueden devolver valores, así que el error viaja en la URL. */
function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const passcode = String(formData.get('passcode') ?? '');
  const expected = process.env.ADMIN_PASSCODE;

  if (!expected) fail('/admin', 'Falta configurar ADMIN_PASSCODE en el servidor.');
  if (passcode !== expected) fail('/admin', 'Clave incorrecta.');

  cookies().set(COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  redirect('/admin');
}

export async function logout() {
  cookies().delete(COOKIE);
  redirect('/admin');
}

// ---------------------------------------------------------------- competencias

/** Sube una portada al bucket público y devuelve su URL. */
async function uploadCover(
  supabase: ReturnType<typeof createAdminClient>,
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('competition-covers')
    .upload(path, file, { contentType: file.type || 'image/jpeg' });

  if (error) return null;
  return supabase.storage.from('competition-covers').getPublicUrl(path).data.publicUrl;
}

export async function createCompetition(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const startDate = String(formData.get('start_date') ?? '');

  if (!name || !startDate) fail('/admin', 'Nombre y fecha de inicio son obligatorios.');

  const cover = await uploadCover(supabase, formData.get('cover') as File | null);

  const { error } = await supabase.from('competitions').insert({
    name,
    start_date: startDate,
    cover_url: cover,
    goal_initial: Number(formData.get('goal_initial') ?? 2),
    goal_advanced: Number(formData.get('goal_advanced') ?? 3),
    total_weeks: Number(formData.get('total_weeks') ?? 12),
    max_weekly: Number(formData.get('max_weekly') ?? 6),
    streak_to_raise: Number(formData.get('streak_to_raise') ?? 3),
    wildcards_per_person: Number(formData.get('wildcards_per_person') ?? 1),
  });

  if (error) fail('/admin', error.message);
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function updateCompetition(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id'));

  const cover = await uploadCover(supabase, formData.get('cover') as File | null);

  const { error } = await supabase.from('competitions').update({
    ...(cover ? { cover_url: cover } : {}),
    name: String(formData.get('name') ?? '').trim(),
    start_date: String(formData.get('start_date')),
    goal_initial: Number(formData.get('goal_initial')),
    goal_advanced: Number(formData.get('goal_advanced')),
    total_weeks: Number(formData.get('total_weeks')),
    max_weekly: Number(formData.get('max_weekly')),
    bonus_goal_met: Number(formData.get('bonus_goal_met')),
    bonus_goal_exceeded: Number(formData.get('bonus_goal_exceeded')),
    bonus_team_sweep: Number(formData.get('bonus_team_sweep')),
    streak_to_raise: Number(formData.get('streak_to_raise')),
    wildcards_per_person: Number(formData.get('wildcards_per_person')),
    is_active: formData.get('is_active') === 'on',
  }).eq('id', id);

  if (error) fail(`/admin/${id}`, error.message);
  revalidatePath(`/admin/${id}`);
  revalidatePath(`/c/${id}`);
}

// ---------------------------------------------------------------- integrantes

export async function addParticipant(formData: FormData) {
  const supabase = await requireAdmin();
  const competitionId = String(formData.get('competition_id'));
  const name = String(formData.get('display_name') ?? '').trim();

  if (!name) fail(`/admin/${competitionId}`, 'Escribe el nombre de la persona.');

  const { error } = await supabase.from('participants').insert({
    competition_id: competitionId,
    display_name: name,
    team: String(formData.get('team') ?? 'A'),
    category: String(formData.get('category') ?? 'inicial'),
  });

  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

export async function updateParticipant(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('participants').update({
    display_name: String(formData.get('display_name') ?? '').trim(),
    team: String(formData.get('team')),
    category: String(formData.get('category')),
    is_active: formData.get('is_active') === 'on',
  }).eq('id', id);

  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

/** Libera el cupo para que otra persona lo reclame. No borra sus registros. */
export async function releaseParticipant(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('participants')
    .update({ user_id: null, claimed_at: null }).eq('id', id);

  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
}

export async function deleteParticipant(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('participants').delete().eq('id', id);
  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

// ---------------------------------------------------------------- metas

/** Ajuste manual de meta. Vale desde esa semana en adelante y reinicia la racha. */
export async function setGoal(formData: FormData) {
  const supabase = await requireAdmin();
  const competitionId = String(formData.get('competition_id'));
  const participantId = String(formData.get('participant_id'));
  const weekNumber = Number(formData.get('week_number'));
  const goal = Number(formData.get('goal'));

  if (!weekNumber || !goal) fail(`/admin/${competitionId}`, 'Semana y meta deben ser números válidos.');

  const { error } = await supabase.from('participant_goals').upsert({
    competition_id: competitionId,
    participant_id: participantId,
    week_number: weekNumber,
    goal,
    source: 'manual',
  }, { onConflict: 'participant_id,week_number' });

  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

export async function clearGoal(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('goal_id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('participant_goals').delete().eq('id', id);
  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

// ---------------------------------------------------------------- registros

export async function deleteWorkout(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('workout_id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

/** El administrador concede un comodín, sin gastar el cupo de la temporada. */
export async function grantWildcard(formData: FormData) {
  const supabase = await requireAdmin();
  const competitionId = String(formData.get('competition_id'));
  const participantId = String(formData.get('participant_id'));
  const weekNumber = Number(formData.get('week_number'));

  if (!weekNumber || weekNumber < 1) {
    fail(`/admin/${competitionId}`, 'Indica una semana válida para el comodín.');
  }

  const { error } = await supabase.from('wildcards').insert({
    competition_id: competitionId,
    participant_id: participantId,
    week_number: weekNumber,
    reason: String(formData.get('reason') ?? '').trim() || 'Otorgado por administración',
    is_admin_grant: true,
  });

  if (error) {
    fail(`/admin/${competitionId}`,
      error.code === '23505'
        ? 'Esa persona ya tiene un comodín en esa semana.'
        : error.message);
  }

  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

export async function deleteWildcard(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('wildcard_id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('wildcards').delete().eq('id', id);
  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
}

export async function removeCover(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id'));

  const { error } = await supabase.from('competitions')
    .update({ cover_url: null }).eq('id', id);

  if (error) fail(`/admin/${id}`, error.message);
  revalidatePath(`/admin/${id}`);
  revalidatePath('/');
}

/**
 * Elimina una competencia con todo su contenido.
 * Las tablas hijas tienen "on delete cascade", así que se van participantes,
 * entrenamientos, comodines y metas. Es irreversible.
 */
export async function deleteCompetition(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id'));
  const typed = String(formData.get('confirm_name') ?? '').trim();

  const { data: comp } = await supabase
    .from('competitions').select('name').eq('id', id).single();

  if (!comp) fail('/admin', 'Esa competencia ya no existe.');
  if (typed !== comp.name) {
    fail(`/admin/${id}`, 'Para eliminar, escribe el nombre exacto de la competencia.');
  }

  const { error } = await supabase.from('competitions').delete().eq('id', id);
  if (error) fail(`/admin/${id}`, error.message);

  revalidatePath('/admin');
  revalidatePath('/');
  redirect('/admin');
}

// ------------------------------------------------------- corrección de semanas

/**
 * Recalcula la semana de cada registro a partir de la fecha en que se creó
 * y de la fecha de inicio vigente. Sirve cuando se corrige el inicio de la
 * competencia y los registros quedaron con la numeración antigua.
 */
export async function renumberWeeks(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('competition_id'));

  const { data: comp } = await supabase
    .from('competitions').select('start_date, total_weeks').eq('id', id).single();
  if (!comp) fail('/admin', 'No se encontró la competencia.');

  const { data: works } = await supabase
    .from('workouts').select('id, created_at, week_number').eq('competition_id', id);

  let changed = 0;
  for (const w of works ?? []) {
    const week = Math.min(
      weekNumberFor(comp.start_date, new Date(w.created_at)),
      comp.total_weeks,
    );
    if (week !== w.week_number) {
      const { error } = await supabase.from('workouts')
        .update({ week_number: week }).eq('id', w.id);
      if (error) fail(`/admin/${id}`, error.message);
      changed += 1;
    }
  }

  revalidatePath(`/admin/${id}`);
  revalidatePath(`/c/${id}`);
  redirect(`/admin/${id}?ok=${encodeURIComponent(
    changed === 0 ? 'Las semanas ya estaban correctas.'
                  : `Se recalcularon ${changed} registros.`)}`);
}

/**
 * Desplaza todas las semanas registradas. Útil para corregir de una vez
 * cuando la competencia se creó con una semana de desfase.
 */
export async function shiftWeeks(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('competition_id'));
  const delta = Number(formData.get('delta'));

  if (!delta || Number.isNaN(delta)) fail(`/admin/${id}`, 'Indica cuántas semanas mover.');

  const tables = ['workouts', 'wildcards', 'participant_goals'] as const;
  let moved = 0;

  for (const table of tables) {
    const { data: rows } = await supabase
      .from(table).select('id, week_number').eq('competition_id', id);

    for (const r of rows ?? []) {
      const next = Math.max(1, r.week_number + delta);
      if (next === r.week_number) continue;
      const { error } = await supabase.from(table)
        .update({ week_number: next }).eq('id', r.id);
      if (error) fail(`/admin/${id}`, error.message);
      moved += 1;
    }
  }

  revalidatePath(`/admin/${id}`);
  revalidatePath(`/c/${id}`);
  redirect(`/admin/${id}?ok=${encodeURIComponent(`Se movieron ${moved} registros.`)}`);
}

// ---------------------------------------------------------------- deportes

export async function addSport(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) fail('/admin/deportes', 'Escribe el nombre del deporte.');

  const { error } = await supabase.from('sports')
    .insert({ name, sort_order: Number(formData.get('sort_order') ?? 100) });

  if (error) fail('/admin/deportes', error.message);
  revalidatePath('/admin/deportes');
}

export async function toggleSport(formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('sports')
    .update({ is_active: formData.get('is_active') === 'true' })
    .eq('id', String(formData.get('id')));

  if (error) fail('/admin/deportes', error.message);
  revalidatePath('/admin/deportes');
}

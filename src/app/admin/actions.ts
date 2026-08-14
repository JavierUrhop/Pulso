'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';

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

export async function createCompetition(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const startDate = String(formData.get('start_date') ?? '');

  if (!name || !startDate) fail('/admin', 'Nombre y fecha de inicio son obligatorios.');

  const { error } = await supabase.from('competitions').insert({
    name,
    start_date: startDate,
    goal_sedentario: Number(formData.get('goal_sedentario') ?? 2),
    goal_avanzado: Number(formData.get('goal_avanzado') ?? 3),
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

  const { error } = await supabase.from('competitions').update({
    name: String(formData.get('name') ?? '').trim(),
    start_date: String(formData.get('start_date')),
    goal_sedentario: Number(formData.get('goal_sedentario')),
    goal_avanzado: Number(formData.get('goal_avanzado')),
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
    category: String(formData.get('category') ?? 'sedentario'),
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

export async function deleteWildcard(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('wildcard_id'));
  const competitionId = String(formData.get('competition_id'));

  const { error } = await supabase.from('wildcards').delete().eq('id', id);
  if (error) fail(`/admin/${competitionId}`, error.message);
  revalidatePath(`/admin/${competitionId}`);
  revalidatePath(`/c/${competitionId}`);
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

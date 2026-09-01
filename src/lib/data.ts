import { createClient } from '@/lib/supabase/server';
import { activeWeek, weekNumberFor, isFinished } from '@/lib/week';
import type {
  Competition, Participant, Workout, Wildcard, ParticipantGoal, Sport, InactiveWeek,
} from '@/lib/types';

/**
 * Carga todo el estado de una competencia de una sola vez.
 * Con equipos de ~15 personas esto es unos pocos cientos de filas,
 * así que es más simple y más rápido que consultar por pantalla.
 */
export async function loadCompetition(competitionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [comp, parts, works, cards, goals, sports, inactive] = await Promise.all([
    supabase.from('competitions').select('*').eq('id', competitionId).single(),
    supabase.from('participants').select('*').eq('competition_id', competitionId)
      .order('display_name'),
    supabase.from('workouts').select('*').eq('competition_id', competitionId)
      .order('created_at', { ascending: false }),
    supabase.from('wildcards').select('*').eq('competition_id', competitionId),
    supabase.from('participant_goals').select('*').eq('competition_id', competitionId),
    supabase.from('sports').select('*').eq('is_active', true),
    supabase.from('inactive_weeks').select('*').eq('competition_id', competitionId),
  ]);

  if (comp.error || !comp.data) return null;

  const competition = comp.data as Competition;
  const participants = (parts.data ?? []) as Participant[];

  return {
    user,
    competition,
    participants,
    workouts: (works.data ?? []) as Workout[],
    wildcards: (cards.data ?? []) as Wildcard[],
    inactive: (inactive.data ?? []) as InactiveWeek[],
    goals: (goals.data ?? []) as ParticipantGoal[],
    // Orden alfabético español: 'Fútbol' después de 'Funcional', tildes incluidas.
    sports: ((sports.data ?? []) as Sport[])
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    me: participants.find(p => p.user_id === user?.id) ?? null,
    /** Semana vigente, tope en la última semana de la competencia. */
    currentWeek: activeWeek(competition.start_date, competition.total_weeks),
    /** Semana natural, sin tope. Útil para saber si ya terminó. */
    calendarWeek: weekNumberFor(competition.start_date),
    finished: isFinished(competition.start_date, competition.total_weeks),
  };
}

export type CompetitionData = NonNullable<Awaited<ReturnType<typeof loadCompetition>>>;

export type Team = 'A' | 'B';
export type Category = 'inicial' | 'avanzada';

export interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  goal_initial: number;
  goal_advanced: number;
  total_weeks: number;
  max_weekly: number;
  bonus_goal_met: number;
  bonus_goal_exceeded: number;
  bonus_team_sweep: number;
  streak_to_raise: number;
  wildcards_per_person: number;
  is_active: boolean;
}

export interface Participant {
  id: string;
  competition_id: string;
  display_name: string;
  nickname: string | null;
  avatar_url: string | null;
  team: Team;
  category: Category;
  user_id: string | null;
  is_active: boolean;
  claimed_at: string | null;
}

export interface Workout {
  id: string;
  competition_id: string;
  participant_id: string;
  week_number: number;
  day_of_week: number;
  sport: string;
  note: string | null;
  photo_urls: string[];
  created_at: string;
}

export interface Wildcard {
  id: string;
  competition_id: string;
  participant_id: string;
  week_number: number;
  reason: string | null;
  is_admin_grant: boolean;
}

export interface ParticipantGoal {
  id: string;
  competition_id: string;
  participant_id: string;
  week_number: number;
  goal: number;
  source: 'auto' | 'manual';
}

export interface Sport {
  id: string;
  name: string;
  /** Duración mínima sugerida. Informativa: no se guarda en el registro. */
  reference: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Resultado del cálculo semanal de una persona. */
export interface WeeklyScore {
  participantId: string;
  weekNumber: number;
  goal: number;
  workoutCount: number;
  usedWildcard: boolean;
  basePoints: number;
  goalBonus: number;
  exceededBonus: number;
  sweepBonus: number;
  total: number;
  /** Cuenta para el promedio per cápita del equipo. */
  counts: boolean;
  metGoal: boolean;
  exceededGoal: boolean;
}

export interface TeamWeekly {
  team: Team;
  weekNumber: number;
  totalPoints: number;
  activeMembers: number;
  perCapita: number;
  sweep: boolean;
}

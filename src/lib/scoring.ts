import type {
  Competition, Participant, Workout, Wildcard, ParticipantGoal,
  WeeklyScore, TeamWeekly, Team,
} from './types';

/**
 * ---------------------------------------------------------------
 * REGLAS DE LA COMPETENCIA
 * ---------------------------------------------------------------
 * 1. Cada entrenamiento registrado vale 1 punto, con tope de
 *    `max_weekly` (6) por semana.
 * 2. Si la persona alcanza su meta semanal: +2 puntos.
 * 3. Si supera su meta en al menos 1 entrenamiento: +1 punto extra.
 * 4. Si TODO el equipo (integrantes activos, sin comodín) alcanza su
 *    meta esa semana: +5 puntos para cada uno.
 * 5. El puntaje del equipo es per cápita: suma de puntos dividida por
 *    los integrantes que cuentan esa semana.
 * 6. Comodín: excluye a la persona del cálculo de esa semana. No suma
 *    ni resta, y no rompe el bono de equipo.
 * 7. Si alguien iguala exactamente su meta `streak_to_raise` (3)
 *    semanas seguidas, su meta sube en 1 a la semana siguiente.
 *    Superar la meta NO cuenta para la racha (solo igualarla).
 * ---------------------------------------------------------------
 */

export function baseGoalFor(competition: Competition, participant: Participant): number {
  return participant.category === 'sedentario'
    ? competition.goal_sedentario
    : competition.goal_avanzado;
}

/**
 * Meta vigente de una persona en una semana.
 * Prioridad: override manual > escalado automático por racha > meta base.
 */
export function goalFor(
  competition: Competition,
  participant: Participant,
  weekNumber: number,
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
): number {
  const manual = goalOverrides
    .filter(g => g.participant_id === participant.id && g.source === 'manual' && g.week_number <= weekNumber)
    .sort((a, b) => b.week_number - a.week_number)[0];

  let goal = baseGoalFor(competition, participant);
  let startWeek = 1;

  // Un override manual reinicia el conteo desde esa semana.
  if (manual) {
    goal = manual.goal;
    startWeek = manual.week_number;
  }

  const mine = workouts.filter(w => w.participant_id === participant.id);
  let streak = 0;

  for (let wk = startWeek; wk < weekNumber; wk++) {
    const count = Math.min(
      mine.filter(w => w.week_number === wk).length,
      competition.max_weekly,
    );

    if (count === goal) {
      streak += 1;
      if (streak >= competition.streak_to_raise) {
        goal = Math.min(goal + 1, competition.max_weekly);
        streak = 0;
      }
    } else {
      streak = 0;
    }
  }

  return goal;
}

/** Cuántas semanas seguidas lleva igualando exactamente la meta (para el aviso de "sube la meta"). */
export function currentStreak(
  competition: Competition,
  participant: Participant,
  upToWeek: number,
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
): number {
  let streak = 0;
  for (let wk = 1; wk < upToWeek; wk++) {
    const goal = goalFor(competition, participant, wk, workouts, goalOverrides);
    const count = Math.min(
      workouts.filter(w => w.participant_id === participant.id && w.week_number === wk).length,
      competition.max_weekly,
    );
    streak = count === goal ? streak + 1 : 0;
    if (streak >= competition.streak_to_raise) streak = 0;
  }
  return streak;
}

/** Puntaje semanal de todas las personas + resumen por equipo. */
export function scoreWeek(
  competition: Competition,
  participants: Participant[],
  workouts: Workout[],
  wildcards: Wildcard[],
  goalOverrides: ParticipantGoal[],
  weekNumber: number,
): { scores: WeeklyScore[]; teams: Record<Team, TeamWeekly> } {
  const active = participants.filter(p => p.is_active);

  // Paso 1: contar entrenamientos, metas y bonos individuales.
  const partial = active.map<WeeklyScore>(p => {
    const usedWildcard = wildcards.some(
      w => w.participant_id === p.id && w.week_number === weekNumber,
    );
    const workoutCount = Math.min(
      workouts.filter(w => w.participant_id === p.id && w.week_number === weekNumber).length,
      competition.max_weekly,
    );
    const goal = goalFor(competition, p, weekNumber, workouts, goalOverrides);

    const metGoal = !usedWildcard && workoutCount >= goal;
    const exceededGoal = !usedWildcard && workoutCount >= goal + 1;

    const basePoints = usedWildcard ? 0 : workoutCount;
    const goalBonus = metGoal ? competition.bonus_goal_met : 0;
    const exceededBonus = exceededGoal ? competition.bonus_goal_exceeded : 0;

    return {
      participantId: p.id,
      weekNumber,
      goal,
      workoutCount,
      usedWildcard,
      basePoints,
      goalBonus,
      exceededBonus,
      sweepBonus: 0,
      total: basePoints + goalBonus + exceededBonus,
      counts: !usedWildcard,
      metGoal,
      exceededGoal,
    };
  });

  const byId = new Map(active.map(p => [p.id, p]));

  // Paso 2: bono de equipo completo (+5) si todos los que cuentan cumplieron.
  const teams = {} as Record<Team, TeamWeekly>;

  (['A', 'B'] as Team[]).forEach(team => {
    const roster = partial.filter(s => byId.get(s.participantId)?.team === team);
    const counted = roster.filter(s => s.counts);
    const sweep = counted.length > 0 && counted.every(s => s.metGoal);

    if (sweep) {
      counted.forEach(s => {
        s.sweepBonus = competition.bonus_team_sweep;
        s.total += competition.bonus_team_sweep;
      });
    }

    const totalPoints = counted.reduce((sum, s) => sum + s.total, 0);

    teams[team] = {
      team,
      weekNumber,
      totalPoints,
      activeMembers: counted.length,
      perCapita: counted.length ? round1(totalPoints / counted.length) : 0,
      sweep,
    };
  });

  return { scores: partial, teams };
}

/** Acumulado de toda la temporada, semana por semana. */
export function scoreSeason(
  competition: Competition,
  participants: Participant[],
  workouts: Workout[],
  wildcards: Wildcard[],
  goalOverrides: ParticipantGoal[],
  throughWeek: number,
) {
  const weeks: { week: number; teams: Record<Team, TeamWeekly>; scores: WeeklyScore[] }[] = [];
  const totals = new Map<string, number>();
  const teamTotals: Record<Team, number> = { A: 0, B: 0 };

  for (let wk = 1; wk <= throughWeek; wk++) {
    const { scores, teams } = scoreWeek(
      competition, participants, workouts, wildcards, goalOverrides, wk,
    );
    weeks.push({ week: wk, teams, scores });

    scores.forEach(s => {
      if (s.counts) totals.set(s.participantId, (totals.get(s.participantId) ?? 0) + s.total);
    });
    teamTotals.A += teams.A.perCapita;
    teamTotals.B += teams.B.perCapita;
  }

  return {
    weeks,
    participantTotals: totals,
    teamTotals: { A: round1(teamTotals.A), B: round1(teamTotals.B) },
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Segmentos de la barra de progreso: uno por cada entrenamiento posible en la semana. */
export type SegmentState = 'empty' | 'progress' | 'goal' | 'over';

export function progressSegments(
  workoutCount: number,
  goal: number,
  maxWeekly: number,
): SegmentState[] {
  return Array.from({ length: maxWeekly }, (_, i) => {
    const slot = i + 1;
    if (slot > workoutCount) return 'empty';
    if (slot > goal) return 'over';
    if (slot === goal) return 'goal';
    return 'progress';
  });
}

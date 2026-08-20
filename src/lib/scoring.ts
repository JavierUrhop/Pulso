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

/**
 * Contexto precalculado. Sin esto, cada semana vuelve a recorrer todas las
 * anteriores para deducir la meta, y el costo crece al cuadrado: con 20
 * personas y 12 semanas eso son miles de recorridos por cada pantalla.
 * Calculándolo una vez, el marcador se arma en una pasada.
 */
export interface ScoringContext {
  /** metas[participantId][semana] */
  goals: Map<string, number[]>;
  /** entrenamientos contados por `${participantId}:${semana}` */
  counts: Map<string, number>;
}

export function createScoringContext(
  competition: Competition,
  participants: Participant[],
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
  throughWeek: number,
): ScoringContext {
  const counts = new Map<string, number>();
  for (const w of workouts) {
    const key = `${w.participant_id}:${w.week_number}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const goals = new Map<string, number[]>();
  for (const p of participants) {
    goals.set(p.id, goalSeries(competition, p, counts, goalOverrides, throughWeek));
  }

  return { goals, counts };
}

function countOf(
  counts: Map<string, number>, participantId: string, week: number, cap: number,
): number {
  return Math.min(counts.get(`${participantId}:${week}`) ?? 0, cap);
}

/**
 * Metas semana a semana en una sola pasada, aplicando el escalado por racha
 * y los ajustes manuales del administrador.
 */
function goalSeries(
  competition: Competition,
  participant: Participant,
  counts: Map<string, number>,
  goalOverrides: ParticipantGoal[],
  throughWeek: number,
): number[] {
  const manual = goalOverrides
    .filter(g => g.participant_id === participant.id && g.source === 'manual')
    .sort((a, b) => a.week_number - b.week_number);

  const series: number[] = [0];
  let goal = baseGoalFor(competition, participant);
  let streak = 0;

  for (let wk = 1; wk <= Math.max(1, throughWeek); wk++) {
    // Un ajuste manual manda desde su semana y reinicia el conteo de racha.
    const override = manual.filter(m => m.week_number === wk).pop();
    if (override) {
      goal = override.goal;
      streak = 0;
    }

    series[wk] = goal;

    const count = countOf(counts, participant.id, wk, competition.max_weekly);
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

  return series;
}

export function baseGoalFor(competition: Competition, participant: Participant): number {
  return participant.category === 'inicial'
    ? competition.goal_initial
    : competition.goal_advanced;
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
  const counts = new Map<string, number>();
  for (const w of workouts) {
    if (w.participant_id !== participant.id) continue;
    const key = `${w.participant_id}:${w.week_number}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return goalSeries(competition, participant, counts, goalOverrides, weekNumber)[weekNumber];
}

/** Semanas seguidas igualando exactamente la meta, para avisar antes de que suba. */
export function currentStreak(
  competition: Competition,
  participant: Participant,
  upToWeek: number,
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
  ctx?: ScoringContext,
): number {
  const counts = ctx?.counts ?? (() => {
    const m = new Map<string, number>();
    for (const w of workouts) {
      const key = `${w.participant_id}:${w.week_number}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  })();

  const goals = ctx?.goals.get(participant.id)
    ?? goalSeries(competition, participant, counts, goalOverrides, upToWeek);

  let streak = 0;
  for (let wk = 1; wk < upToWeek; wk++) {
    const count = countOf(counts, participant.id, wk, competition.max_weekly);
    streak = count === (goals[wk] ?? 0) ? streak + 1 : 0;
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
  ctx?: ScoringContext,
): { scores: WeeklyScore[]; teams: Record<Team, TeamWeekly> } {
  const active = participants.filter(p => p.is_active);
  const context = ctx
    ?? createScoringContext(competition, participants, workouts, goalOverrides, weekNumber);

  // Paso 1: contar entrenamientos, metas y bonos individuales.
  const partial = active.map<WeeklyScore>(p => {
    const usedWildcard = wildcards.some(
      w => w.participant_id === p.id && w.week_number === weekNumber,
    );
    const workoutCount = countOf(context.counts, p.id, weekNumber, competition.max_weekly);
    const goal = context.goals.get(p.id)?.[weekNumber]
      ?? goalFor(competition, p, weekNumber, workouts, goalOverrides);

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
  const ctx = createScoringContext(
    competition, participants, workouts, goalOverrides, throughWeek);

  for (let wk = 1; wk <= throughWeek; wk++) {
    const { scores, teams } = scoreWeek(
      competition, participants, workouts, wildcards, goalOverrides, wk, ctx,
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

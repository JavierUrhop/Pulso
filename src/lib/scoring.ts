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
 * 7. Cada semana en que llega a su meta —o la supera— suma uno a un
 *    contador histórico. No hace falta que sean seguidas. Al acumular
 *    `streak_to_raise` (3) semanas, la meta sube en 1 y el contador
 *    vuelve a 0.
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
  /** semanas que no cuentan: comodín o inactividad marcada por el admin */
  excluded: Set<string>;
}

/** Semanas fuera del cálculo, por comodín o por inactividad. */
export function buildExclusions(
  wildcards: { participant_id: string; week_number: number }[],
  inactive: { participant_id: string; week_number: number }[] = [],
): Set<string> {
  const out = new Set<string>();
  for (const w of wildcards) out.add(`${w.participant_id}:${w.week_number}`);
  for (const w of inactive) out.add(`${w.participant_id}:${w.week_number}`);
  return out;
}

export function createScoringContext(
  competition: Competition,
  participants: Participant[],
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
  throughWeek: number,
  excluded: Set<string> = new Set(),
): ScoringContext {
  const counts = new Map<string, number>();
  for (const w of workouts) {
    const key = `${w.participant_id}:${w.week_number}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const goals = new Map<string, number[]>();
  for (const p of participants) {
    goals.set(p.id, computeGoals(
      competition, p, counts, goalOverrides, throughWeek, excluded).series);
  }

  return { goals, counts, excluded };
}

function countOf(
  counts: Map<string, number>, participantId: string, week: number, cap: number,
): number {
  return Math.min(counts.get(`${participantId}:${week}`) ?? 0, cap);
}

/** Estado de una semana dentro del avance hacia la próxima meta. */
export type GoalWeekStatus = 'cumplida' | 'superada' | 'no' | 'excluida' | 'sube';

export interface GoalWeek {
  week: number;
  goal: number;
  count: number;
  status: GoalWeekStatus;
  /** Semanas acumuladas al cerrar esa semana. */
  progress: number;
}

export interface GoalTimeline {
  series: number[];
  weeks: GoalWeek[];
  /** Meta vigente al final del período mirado. */
  goal: number;
  /** Semanas acumuladas hacia la próxima subida. */
  progress: number;
  /** Cuántas faltan para que suba. */
  remaining: number;
  threshold: number;
}

/**
 * Metas semana a semana, en una sola pasada.
 *
 * REGLA: cada semana en que la persona llega a su meta —o la supera— suma
 * uno a un contador histórico. No hace falta que sean consecutivas: una
 * semana floja no borra lo avanzado. Al llegar al umbral la meta sube en 1
 * y el contador vuelve a 0, porque el objetivo ya cambió.
 *
 * Las semanas con comodín o marcadas como inactivas se saltan por completo:
 * ni suman ni estorban.
 */
function computeGoals(
  competition: Competition,
  participant: Participant,
  counts: Map<string, number>,
  goalOverrides: ParticipantGoal[],
  throughWeek: number,
  excluded: Set<string> = new Set(),
): GoalTimeline {
  const manual = goalOverrides
    .filter(g => g.participant_id === participant.id && g.source === 'manual')
    .sort((a, b) => a.week_number - b.week_number);

  const series: number[] = [0];
  const weeks: GoalWeek[] = [];
  const threshold = Math.max(1, competition.streak_to_raise);

  let goal = baseGoalFor(competition, participant);
  let progress = 0;

  for (let wk = 1; wk <= Math.max(1, throughWeek); wk++) {
    const override = manual.filter(m => m.week_number === wk).pop();
    if (override) {
      goal = override.goal;
      progress = 0;
    }

    series[wk] = goal;

    if (excluded.has(`${participant.id}:${wk}`)) {
      weeks.push({ week: wk, goal, count: 0, status: 'excluida', progress });
      continue;
    }

    const count = countOf(counts, participant.id, wk, competition.max_weekly);
    let status: GoalWeekStatus = 'no';

    if (count >= goal) {
      status = count > goal ? 'superada' : 'cumplida';
      progress += 1;
    }

    if (progress >= threshold) {
      goal = Math.min(goal + 1, competition.max_weekly);
      progress = 0;
      status = 'sube';
    }

    weeks.push({ week: wk, goal: series[wk], count, status, progress });
  }

  return {
    series, weeks, goal, progress, threshold,
    remaining: Math.max(0, threshold - progress),
  };
}

/** Avance de una persona hacia su próxima subida de meta. */
export function goalTimeline(
  competition: Competition,
  participant: Participant,
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
  throughWeek: number,
  ctx?: ScoringContext,
): GoalTimeline {
  const counts = ctx?.counts ?? (() => {
    const m = new Map<string, number>();
    for (const w of workouts) {
      const key = `${w.participant_id}:${w.week_number}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  })();

  return computeGoals(competition, participant, counts, goalOverrides,
    throughWeek, ctx?.excluded ?? new Set());
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
  return computeGoals(competition, participant, counts, goalOverrides, weekNumber)
    .series[weekNumber];
}

/**
 * Semanas acumuladas hacia la próxima subida de meta.
 * Antes era una racha consecutiva; ahora el conteo es histórico.
 */
export function currentStreak(
  competition: Competition,
  participant: Participant,
  upToWeek: number,
  workouts: Workout[],
  goalOverrides: ParticipantGoal[],
  ctx?: ScoringContext,
): number {
  return goalTimeline(competition, participant, workouts, goalOverrides,
    Math.max(0, upToWeek - 1), ctx).progress;
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
  const context = ctx ?? createScoringContext(
    competition, participants, workouts, goalOverrides, weekNumber,
    buildExclusions(wildcards));

  // Paso 1: contar entrenamientos, metas y bonos individuales.
  const partial = active.map<WeeklyScore>(p => {
    // Dos motivos distintos para quedar fuera de la semana: el comodín, que
    // usa la propia persona, y la inactividad, que marca el administrador.
    // El efecto sobre el puntaje es el mismo, pero conviene distinguirlos
    // para poder explicarlo en pantalla.
    const hasWildcard = wildcards.some(
      w => w.participant_id === p.id && w.week_number === weekNumber);
    const absent = !hasWildcard && context.excluded.has(`${p.id}:${weekNumber}`);
    const usedWildcard = hasWildcard || absent;
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
      absent,
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
  excluded?: Set<string>,
) {
  const weeks: { week: number; teams: Record<Team, TeamWeekly>; scores: WeeklyScore[] }[] = [];
  const totals = new Map<string, number>();
  const teamTotals: Record<Team, number> = { A: 0, B: 0 };
  const ctx = createScoringContext(
    competition, participants, workouts, goalOverrides, throughWeek,
    excluded ?? buildExclusions(wildcards));

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

import { createClient } from '@/lib/supabase/server';
import { createScoringContext, baseGoalFor } from '@/lib/scoring';
import { activeWeek } from '@/lib/week';
import type { Medal } from '@/components/Achievements';
import type {
  Competition, Participant, Workout, Wildcard, ParticipantGoal,
} from '@/lib/types';

export interface SportTally {
  name: string;
  count: number;
  /** Última semana en que lo practicó, para ordenar por novedad si hace falta. */
  lastWeek: number;
}

export interface CompetitionTrophies {
  competition: Competition;
  participant: Participant;
  currentWeek: number;
  workouts: number;
  weeksMet: number;
  weeksExceeded: number;
  wildcards: number;
  medals: Medal[];
  /** Todo lo que ha practicado en esta competencia, de más a menos. */
  sports: SportTally[];
}

export interface TrophyRoom {
  userId: string;
  /** Datos de presentación tomados del cupo más reciente. */
  name: string;
  avatarUrl: string | null;
  totalWorkouts: number;
  totalMeta: number;
  totalSuperada: number;
  competitions: CompetitionTrophies[];
  medals: Medal[];
  /** Deportes practicados sumando todas las competencias. */
  sports: SportTally[];
}

/**
 * Reúne los logros de una persona en todas las competencias donde participa.
 *
 * Solo necesita los datos de esa persona: la meta de cada semana depende de
 * su propio historial, así que no hace falta cargar el resto del equipo.
 */
export async function loadTrophyRoom(userId: string): Promise<TrophyRoom | null> {
  const supabase = createClient();

  const { data: parts } = await supabase
    .from('participants').select('*').eq('user_id', userId);

  const participants = (parts ?? []) as Participant[];
  if (participants.length === 0) return null;

  const participantIds = participants.map(p => p.id);
  const competitionIds = [...new Set(participants.map(p => p.competition_id))];

  const [comps, works, cards, goals] = await Promise.all([
    supabase.from('competitions').select('*').in('id', competitionIds),
    supabase.from('workouts').select('*').in('participant_id', participantIds),
    supabase.from('wildcards').select('*').in('participant_id', participantIds),
    supabase.from('participant_goals').select('*').in('participant_id', participantIds),
  ]);

  const competitions = (comps.data ?? []) as Competition[];
  const workouts = (works.data ?? []) as Workout[];
  const wildcards = (cards.data ?? []) as Wildcard[];
  const overrides = (goals.data ?? []) as ParticipantGoal[];

  const rows: CompetitionTrophies[] = [];

  for (const participant of participants) {
    const competition = competitions.find(c => c.id === participant.competition_id);
    if (!competition) continue;

    const mine = workouts.filter(w => w.participant_id === participant.id);
    const myCards = wildcards.filter(w => w.participant_id === participant.id);
    const currentWeek = activeWeek(competition.start_date, competition.total_weeks);

    const ctx = createScoringContext(
      competition, [participant], mine, overrides, currentWeek);
    const series = ctx.goals.get(participant.id) ?? [];

    const medals: Medal[] = [];
    let weeksMet = 0;
    let weeksExceeded = 0;

    for (let wk = 1; wk <= currentWeek; wk++) {
      if (myCards.some(c => c.week_number === wk)) continue;

      const count = Math.min(
        ctx.counts.get(`${participant.id}:${wk}`) ?? 0,
        competition.max_weekly,
      );
      const goal = series[wk] ?? baseGoalFor(competition, participant);
      if (count < goal) continue;

      const exceeded = count >= goal + 1;
      weeksMet += 1;

      const base = {
        week: wk,
        competitionId: competition.id,
        competitionName: competition.name,
        startDate: competition.start_date,
      };

      // Cumplir la meta siempre da su medalla.
      medals.push({ kind: 'meta', ...base });

      // Superarla da una segunda, además de la anterior.
      if (exceeded) {
        weeksExceeded += 1;
        medals.push({ kind: 'superada', ...base });
      }
    }

    const tally = new Map<string, SportTally>();
    for (const w of mine) {
      const row = tally.get(w.sport) ?? { name: w.sport, count: 0, lastWeek: 0 };
      row.count += 1;
      row.lastWeek = Math.max(row.lastWeek, w.week_number);
      tally.set(w.sport, row);
    }
    const sports = [...tally.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));

    rows.push({
      competition,
      participant,
      currentWeek,
      workouts: mine.length,
      weeksMet,
      weeksExceeded,
      wildcards: myCards.length,
      // Lo más reciente primero, y dentro de una semana la medalla mayor arriba.
      medals: medals.slice().reverse(),
      sports,
    });
  }

  // La competencia más reciente primero.
  rows.sort((a, b) => b.competition.start_date.localeCompare(a.competition.start_date));

  const newest = rows[0]?.participant ?? participants[0];
  const allMedals = rows.flatMap(r => r.medals);

  // Deportes sumando todas las competencias.
  const global = new Map<string, SportTally>();
  for (const r of rows) {
    for (const sp of r.sports) {
      const row = global.get(sp.name) ?? { name: sp.name, count: 0, lastWeek: 0 };
      row.count += sp.count;
      row.lastWeek = Math.max(row.lastWeek, sp.lastWeek);
      global.set(sp.name, row);
    }
  }

  return {
    userId,
    name: newest.nickname || newest.display_name,
    avatarUrl: rows.find(r => r.participant.avatar_url)?.participant.avatar_url ?? null,
    totalWorkouts: rows.reduce((n, r) => n + r.workouts, 0),
    totalMeta: allMedals.filter(m => m.kind === 'meta').length,
    totalSuperada: allMedals.filter(m => m.kind === 'superada').length,
    competitions: rows,
    medals: allMedals,
    sports: [...global.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es')),
  };
}

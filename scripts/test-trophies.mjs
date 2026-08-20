/**
 * Verifica la regla de medallas: cumplir da una, superar da dos.
 *   node scripts/test-scoring.mjs && node scripts/test-trophies.mjs
 */
import { createScoringContext, baseGoalFor } from '../.tmp/out/scoring.mjs';

const comp = {
  id: 'c1', name: 'Test', start_date: '2026-08-17', end_date: null,
  goal_initial: 2, goal_advanced: 3, total_weeks: 12, max_weekly: 6,
  bonus_goal_met: 2, bonus_goal_exceeded: 1, bonus_team_sweep: 5,
  streak_to_raise: 3, wildcards_per_person: 1, is_active: true,
};

const p = {
  id: 'p1', competition_id: 'c1', display_name: 'Test', nickname: null,
  avatar_url: null, team: 'A', category: 'avanzada', user_id: 'u1',
  is_active: true, claimed_at: null,
};

const W = (week, n, sport = 'Fútbol') => Array.from({ length: n }, (_, i) => ({
  id: `${week}-${i}`, competition_id: 'c1', participant_id: 'p1',
  week_number: week, day_of_week: (i % 7) + 1, sport,
  note: null, photo_urls: [], created_at: '2026-08-17',
}));

/** Réplica de la lógica de medallas de src/lib/trophies.ts */
function medalsFor(workouts, wildcards = [], throughWeek = 3) {
  const ctx = createScoringContext(comp, [p], workouts, [], throughWeek);
  const series = ctx.goals.get(p.id) ?? [];
  const out = [];

  for (let wk = 1; wk <= throughWeek; wk++) {
    if (wildcards.some(c => c.week_number === wk)) continue;
    const count = Math.min(ctx.counts.get(`${p.id}:${wk}`) ?? 0, comp.max_weekly);
    const goal = series[wk] ?? baseGoalFor(comp, p);
    if (count < goal) continue;
    out.push({ kind: 'meta', week: wk });
    if (count >= goal + 1) out.push({ kind: 'superada', week: wk });
  }
  return out;
}

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      esperado ${JSON.stringify(want)}, obtuvo ${JSON.stringify(got)}`}`);
};

// Meta 3: quedarse corto no da medalla
eq('2 de 3 entrenos: sin medallas', medalsFor(W(1, 2), [], 1), []);

// Llegar justo da una sola
eq('3 de 3: solo meta cumplida',
  medalsFor(W(1, 3), [], 1), [{ kind: 'meta', week: 1 }]);

// Superar da las dos
eq('4 de 3: meta cumplida y superada',
  medalsFor(W(1, 4), [], 1),
  [{ kind: 'meta', week: 1 }, { kind: 'superada', week: 1 }]);

eq('6 de 3: igual son dos medallas, no más',
  medalsFor(W(1, 6), [], 1),
  [{ kind: 'meta', week: 1 }, { kind: 'superada', week: 1 }]);

// El comodín deja la semana sin medallas
eq('semana con comodín: sin medallas',
  medalsFor(W(1, 5), [{ week_number: 1 }], 1), []);

// Varias semanas mezcladas
eq('tres semanas: justo, corto, superado',
  medalsFor([...W(1, 3), ...W(2, 1), ...W(3, 5)], [], 3),
  [{ kind: 'meta', week: 1 }, { kind: 'meta', week: 3 }, { kind: 'superada', week: 3 }]);

// El histórico de deportes agrupa y cuenta
{
  const ws = [...W(1, 2, 'Fútbol'), ...W(2, 1, 'Spinning'), ...W(3, 3, 'Fútbol')];
  const tally = new Map();
  for (const w of ws) tally.set(w.sport, (tally.get(w.sport) ?? 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  eq('deportes agrupados por cantidad', sorted, [['Fútbol', 5], ['Spinning', 1]]);
}

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);

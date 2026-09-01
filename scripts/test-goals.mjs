/**
 * Pruebas de la regla de subida de meta.
 *
 * Regla vigente: se cuentan las semanas en que la persona ALCANZÓ O SUPERÓ
 * su meta. No necesitan ser consecutivas. Al juntar el umbral, la meta sube
 * en 1 y el contador vuelve a 0. Las semanas con comodín o marcadas como
 * inactivas se saltan: ni suman ni interrumpen.
 *
 *   node scripts/test-scoring.mjs && node scripts/test-goals.mjs
 */
import { createScoringContext, goalTimeline, buildExclusions } from '../.tmp/out/scoring.mjs';

const comp = {
  id: 'c1', name: 'T', start_date: '2026-08-17', end_date: null,
  goal_initial: 2, goal_advanced: 3, total_weeks: 12, max_weekly: 6,
  bonus_goal_met: 2, bonus_goal_exceeded: 1, bonus_team_sweep: 5,
  streak_to_raise: 3, wildcards_per_person: 1, is_active: true,
};
const p = {
  id: 'p1', competition_id: 'c1', display_name: 'T', nickname: null, avatar_url: null,
  team: 'A', category: 'avanzada', user_id: 'u1', is_active: true, claimed_at: null,
};

const W = (wk, n) => Array.from({ length: n }, (_, i) => ({
  id: `${wk}-${i}`, competition_id: 'c1', participant_id: 'p1',
  week_number: wk, day_of_week: (i % 7) + 1, sport: 'F',
  note: null, photo_urls: [], created_at: '2026-08-17',
}));

const timeline = (ws, weeks = 5, wildcards = [], inactive = []) => {
  const excluded = buildExclusions(wildcards, inactive);
  const ctx = createScoringContext(comp, [p], ws, [], weeks, excluded);
  return goalTimeline(comp, p, ws, [], weeks, ctx);
};

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      esperado ${JSON.stringify(want)}, obtuvo ${JSON.stringify(got)}`}`);
};

// Llegar justo tres veces sube la meta
{
  const t = timeline([...W(1,3), ...W(2,3), ...W(3,3)]);
  eq('tres semanas cumplidas: la meta sube a 4', t.goal, 4);
  eq('y el contador vuelve a cero', t.progress, 0);
  eq('la semana 3 queda marcada como subida', t.weeks[2].status, 'sube');
}

// Superarla también cuenta (antes no)
{
  const t = timeline([...W(1,4), ...W(2,5), ...W(3,4)]);
  eq('superar la meta también suma al contador', t.goal, 4);
  eq('las semanas se marcan como superadas', t.weeks[0].status, 'superada');
}

// No hace falta que sean seguidas
{
  const t = timeline([...W(1,3), ...W(2,1), ...W(3,3), ...W(4,3)]);
  eq('una semana floja no borra lo avanzado', t.goal, 4);
  eq('la semana floja no cuenta', t.weeks[1].status, 'no');
  eq('pero conserva el contador', t.weeks[1].progress, 1);
}

// Progreso parcial visible
{
  const t = timeline([...W(1,3), ...W(2,3)]);
  eq('con dos cumplidas la meta sigue igual', t.goal, 3);
  eq('el contador va en 2', t.progress, 2);
  eq('falta una semana para subir', t.remaining, 1);
}

// Las semanas excluidas se saltan
{
  const t = timeline([...W(1,3), ...W(3,3), ...W(4,3)], 5, [], [{ participant_id:'p1', week_number:2 }]);
  eq('una semana inactiva no interrumpe', t.goal, 4);
  eq('y se marca como excluida', t.weeks[1].status, 'excluida');
}
{
  const t = timeline([...W(1,3), ...W(3,3)], 3, [{ participant_id:'p1', week_number:2 }]);
  eq('el comodín tampoco interrumpe', t.progress, 2);
}

// Sin actividad, nada cambia
{
  const t = timeline([]);
  eq('sin entrenamientos la meta no se mueve', t.goal, 3);
  eq('y el contador queda en cero', t.progress, 0);
}

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);

import { scoreWeek, goalFor, progressSegments, scoreSeason,
  createScoringContext, currentStreak, goalTimeline,
  buildExclusions } from '../.tmp/out/scoring.mjs';

const comp = {
  id: 'c1', name: 'Test', start_date: '2026-07-13', end_date: null,
  goal_initial: 2, goal_advanced: 3, total_weeks: 12, max_weekly: 6,
  bonus_goal_met: 2, bonus_goal_exceeded: 1, bonus_team_sweep: 5,
  streak_to_raise: 3, wildcards_per_person: 1, is_active: true,
};

const P = (id, team, category) => ({
  id, competition_id: 'c1', display_name: id, nickname: null, avatar_url: null,
  team, category, user_id: null, is_active: true, claimed_at: null,
});

const W = (pid, week, n) => Array.from({ length: n }, (_, i) => ({
  id: `${pid}-${week}-${i}`, competition_id: 'c1', participant_id: pid,
  week_number: week, day_of_week: (i % 7) + 1, sport: 'Running',
  note: null, photo_url: null, created_at: '2026-07-13',
}));

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      esperado ${JSON.stringify(want)}, obtuvo ${JSON.stringify(got)}`}`);
};

// ---- 1. Puntaje base: 1 punto por entrenamiento, sin llegar a la meta
{
  const ps = [P('a1','A','avanzada'), P('a2','A','avanzada')];
  const { scores } = scoreWeek(comp, ps, W('a1',1,2), [], [], 1);
  eq('2 entrenos con meta 3 -> 2 pts, sin bonos', scores[0].total, 2);
}

// ---- 2. Meta exacta -> +2
{
  const ps = [P('a1','A','avanzada'), P('a2','A','avanzada')];
  const { scores } = scoreWeek(comp, ps, W('a1',1,3), [], [], 1);
  eq('3 entrenos con meta 3 -> 3 + 2 = 5 pts', scores[0].total, 5);
}

// ---- 3. Superar meta -> +2 +1
{
  const ps = [P('a1','A','avanzada'), P('a2','A','avanzada')];
  const { scores } = scoreWeek(comp, ps, W('a1',1,4), [], [], 1);
  eq('4 entrenos con meta 3 -> 4 + 2 + 1 = 7 pts', scores[0].total, 7);
}

// ---- 4. Tope de 6 por semana
{
  const ps = [P('a1','A','avanzada'), P('a2','A','avanzada')];
  const { scores } = scoreWeek(comp, ps, W('a1',1,9), [], [], 1);
  eq('9 entrenos se topan en 6', scores[0].workoutCount, 6);
  eq('9 entrenos -> 6 + 2 + 1 = 9 pts', scores[0].total, 9);
}

// ---- 5. Bono de equipo completo (+5 cada uno)
{
  const ps = [P('a1','A','avanzada'), P('a2','A','inicial')];
  const ws = [...W('a1',1,3), ...W('a2',1,2)];
  const { scores, teams } = scoreWeek(comp, ps, ws, [], [], 1);
  eq('a1 con bono de equipo -> 3+2+5 = 10', scores.find(s=>s.participantId==='a1').total, 10);
  eq('a2 con bono de equipo -> 2+2+5 = 9', scores.find(s=>s.participantId==='a2').total, 9);
  eq('equipo A hizo sweep', teams.A.sweep, true);
  eq('per cápita A = (10+9)/2 = 9.5', teams.A.perCapita, 9.5);
}

// ---- 6. Si uno falla, nadie recibe el +5
{
  const ps = [P('a1','A','avanzada'), P('a2','A','inicial')];
  const ws = [...W('a1',1,3), ...W('a2',1,1)];
  const { scores, teams } = scoreWeek(comp, ps, ws, [], [], 1);
  eq('sin sweep si alguien no cumple', teams.A.sweep, false);
  eq('a1 sin bono equipo -> 5', scores.find(s=>s.participantId==='a1').total, 5);
}

// ---- 7. Comodín: excluido del promedio y NO rompe el sweep
{
  const ps = [P('a1','A','avanzada'), P('a2','A','inicial'), P('a3','A','inicial')];
  const ws = [...W('a1',1,3), ...W('a2',1,2)];
  const cards = [{ id:'w1', competition_id:'c1', participant_id:'a3', week_number:1, reason:null }];
  const { scores, teams } = scoreWeek(comp, ps, ws, cards, [], 1);
  eq('comodín no cuenta para el promedio', teams.A.activeMembers, 2);
  eq('comodín no rompe el sweep', teams.A.sweep, true);
  eq('persona con comodín queda en 0', scores.find(s=>s.participantId==='a3').total, 0);
  eq('per cápita ignora al del comodín', teams.A.perCapita, 9.5);
}

// ---- 8. Escalado de meta: 3 semanas llegando a la meta
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',2,3), ...W('a1',3,3)];
  eq('semana 1 meta 3', goalFor(comp, p, 1, ws, []), 3);
  eq('semana 3 sigue en 3', goalFor(comp, p, 3, ws, []), 3);
  eq('semana 4 sube a 4', goalFor(comp, p, 4, ws, []), 4);
}

// ---- 9. Superar la meta TAMBIÉN cuenta para el contador
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',2,5), ...W('a1',3,3)];
  eq('superar suma igual que igualar, sube en la 4', goalFor(comp, p, 4, ws, []), 4);
}

// ---- 9b. El contador es histórico: una semana floja no lo borra
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',2,0), ...W('a1',3,3), ...W('a1',4,1), ...W('a1',5,4)];
  eq('semana 5 aún en meta 3', goalFor(comp, p, 5, ws, []), 3);
  eq('con la tercera semana lograda, la 6 sube a 4', goalFor(comp, p, 6, ws, []), 4);
}

// ---- 9c. Al subir la meta, el contador vuelve a cero
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',2,3), ...W('a1',3,3),
              ...W('a1',4,4), ...W('a1',5,4)];
  const t = goalTimeline(comp, p, ws, [], 5);
  eq('meta vigente tras subir', t.goal, 4);
  eq('lleva 2 semanas hacia la siguiente subida', t.progress, 2);
  eq('le falta 1 para volver a subir', t.remaining, 1);
}

// ---- 9d. Las semanas excluidas no suman ni estorban
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',2,3), ...W('a1',3,3)];
  const excl = buildExclusions([{ participant_id:'a1', week_number:2 }]);
  const ctx = createScoringContext(comp, [p], ws, [], 4, excl);
  eq('la semana con comodín no cuenta para el contador',
    ctx.goals.get('a1')[4], 3);
}

// ---- 10. Override manual reinicia el conteo
{
  const p = P('a1','A','inicial');
  const ws = [...W('a1',1,2), ...W('a1',2,2), ...W('a1',3,2)];
  const goals = [{ id:'g1', competition_id:'c1', participant_id:'a1', week_number:3, goal:5, source:'manual' }];
  eq('meta manual manda desde su semana', goalFor(comp, p, 4, ws, goals), 5);
}

// ---- 11. Per cápita protege equipos de distinto tamaño
{
  const ps = [P('a1','A','avanzada'), P('b1','B','avanzada'), P('b2','B','avanzada'), P('b3','B','avanzada')];
  const ws = [...W('a1',1,3), ...W('b1',1,3), ...W('b2',1,3), ...W('b3',1,3)];
  const { teams } = scoreWeek(comp, ps, ws, [], [], 1);
  eq('A (1 persona) y B (3 personas) empatan per cápita', teams.A.perCapita, teams.B.perCapita);
}

// ---- 12. Barra segmentada
{
  eq('barra: 4 entrenos, meta 3, tope 6',
    progressSegments(4, 3, 6),
    ['progress','progress','goal','over','empty','empty']);
}

// ---- 13. Acumulado de temporada
{
  const ps = [P('a1','A','avanzada'), P('b1','B','avanzada')];
  const ws = [...W('a1',1,3), ...W('a1',2,3), ...W('b1',1,1)];
  const season = scoreSeason(comp, ps, ws, [], [], 2);
  eq('acumulado a1 = (3+2+5) + (3+2+5) = 20', season.participantTotals.get('a1'), 20);
  eq('temporada tiene 2 semanas', season.weeks.length, 2);
}

// ---- 14. El contexto precalculado da lo mismo que el cálculo directo
{
  const ps = [P('a1','A','avanzada'), P('a2','A','inicial'), P('b1','B','avanzada')];
  const ws = [...W('a1',1,3), ...W('a1',2,4), ...W('a2',1,2), ...W('a2',2,2), ...W('b1',1,5)];
  const ctx = createScoringContext(comp, ps, ws, [], 3);

  for (let wk = 1; wk <= 3; wk++) {
    const directo = scoreWeek(comp, ps, ws, [], [], wk);
    const conCtx  = scoreWeek(comp, ps, ws, [], [], wk, ctx);
    eq(`semana ${wk}: contexto y cálculo directo coinciden`,
      JSON.stringify(conCtx.scores), JSON.stringify(directo.scores));
  }
  eq('la tabla de metas cubre todas las semanas', ctx.goals.get('a1').length, 4);
}

// ---- 15. La racha se lee igual con y sin contexto
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',2,3)];
  const ctx = createScoringContext(comp, [p], ws, [], 3);
  eq('avance con contexto', currentStreak(comp, p, 3, ws, [], ctx), 2);
  eq('avance sin contexto', currentStreak(comp, p, 3, ws, []), 2);
}

// ---- 16. Un ajuste manual reinicia la racha en la semana indicada
{
  const p = P('a1','A','inicial');
  const ws = [...W('a1',1,2), ...W('a1',2,2), ...W('a1',3,2), ...W('a1',4,2)];
  const goals = [{ id:'g1', competition_id:'c1', participant_id:'a1', week_number:2, goal:4, source:'manual' }];
  eq('meta manual vale desde su semana', goalFor(comp, p, 2, ws, goals), 4);
  eq('y se mantiene después', goalFor(comp, p, 5, ws, goals), 4);
}

// ---- 17. Semanas inactivas: no suman y no rompen el bono de equipo
{
  const ps = [P('a1','A','avanzada'), P('a2','A','inicial'), P('a3','A','inicial')];
  const ws = [...W('a1',1,3), ...W('a2',1,2)];   // a3 no entrenó
  const excl = buildExclusions([], [{ participant_id:'a3', week_number:1 }]);
  const ctx = createScoringContext(comp, ps, ws, [], 1, excl);
  const { scores, teams } = scoreWeek(comp, ps, ws, [], [], 1, ctx);

  const a3 = scores.find(s => s.participantId === 'a3');
  eq('la persona inactiva queda marcada como ausente', a3.absent, true);
  eq('y no como comodín propio',
    a3.usedWildcard && !ps.find(p => p.id === 'a3').wildcard, true);
  eq('no entra en el promedio del equipo', teams.A.activeMembers, 2);
  eq('el equipo igual logra el pleno', teams.A.sweep, true);
  eq('per cápita = ((3+2+5)+(2+2+5))/2 = 9.5', teams.A.perCapita, 9.5);
}

// ---- 18. Una semana inactiva no frena el avance hacia la meta
{
  const p = P('a1','A','avanzada');
  const ws = [...W('a1',1,3), ...W('a1',3,3), ...W('a1',4,3)];
  const excl = buildExclusions([], [{ participant_id:'a1', week_number:2 }]);
  const ctx = createScoringContext(comp, [p], ws, [], 5, excl);
  const t = goalTimeline(comp, p, ws, [], 5, ctx);
  eq('la semana inactiva se salta', t.weeks[1].status, 'excluida');
  eq('tras 3 semanas logradas la meta sube a 4', t.goal, 4);
}

// ---- 19. La línea de tiempo marca en qué semana subió la meta
{
  const p = P('a1','A','inicial');
  const ws = [...W('a1',1,2), ...W('a1',2,3), ...W('a1',3,2)];
  const t = goalTimeline(comp, p, ws, [], 3);
  eq('semana 1 cumplida', t.weeks[0].status, 'cumplida');
  eq('semana 2 superada', t.weeks[1].status, 'superada');
  eq('semana 3 dispara la subida', t.weeks[2].status, 'sube');
  eq('el contador quedó en cero', t.progress, 0);
  eq('la meta nueva es 3', t.goal, 3);
}

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);

/**
 * Pruebas de la ventana de registro (hoy o ayer, hora de Chile).
 *   node scripts/test-window.mjs
 */
const TZ = 'America/Santiago';
const DAY = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

const sd = d => new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const dayOf = s => { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); };
const mon = d => { const o = new Date(d); const w = o.getUTCDay();
  o.setUTCDate(o.getUTCDate() - (w === 0 ? 6 : w - 1)); return o; };
const weekFor = (st, when) =>
  Math.max(1, Math.floor(Math.round((mon(dayOf(sd(when))) - mon(dayOf(st))) / 86400000) / 7) + 1);

function slots(start, total, when) {
  const today = dayOf(sd(when));
  const yest = new Date(today); yest.setUTCDate(yest.getUTCDate() - 1);
  const cw = weekFor(start, when);
  const sm = mon(dayOf(start));
  const build = (d, label) => {
    const diff = Math.round((mon(d) - sm) / 86400000);
    const w = Math.floor(diff / 7) + 1;
    if (w < 1 || w > total) return null;
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    return { label, dayName: DAY[dow-1], dayOfWeek: dow, weekNumber: w, previousWeek: w !== cw };
  };
  return [build(today,'Hoy'), build(yest,'Ayer')].filter(Boolean);
}
const within = (start, total, w, d, when) =>
  slots(start, total, when).some(s => s.weekNumber === w && s.dayOfWeek === d);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      esperado ${JSON.stringify(want)}, obtuvo ${JSON.stringify(got)}`}`);
};

const START = '2026-08-17';   // lunes
const TOTAL = 12;

// --- El caso borde: lunes por la mañana, "ayer" fue domingo de la semana pasada
{
  const lunes = new Date('2026-08-24T14:00:00Z');  // lunes 24, 10:00 en Chile
  const s = slots(START, TOTAL, lunes);
  eq('lunes: hay dos opciones', s.length, 2);
  eq('lunes: hoy es lunes de la semana 2',
    [s[0].dayName, s[0].weekNumber, s[0].previousWeek], ['Lunes', 2, false]);
  eq('lunes: ayer es domingo de la semana 1',
    [s[1].dayName, s[1].weekNumber, s[1].previousWeek], ['Domingo', 1, true]);
  eq('se acepta el domingo en la semana ya cerrada',
    within(START, TOTAL, 1, 7, lunes), true);
}

// --- Domingo por la noche sigue siendo domingo en Chile
{
  const domingo = new Date('2026-08-24T03:30:00Z');   // domingo 23, 23:30 en Chile
  const s = slots(START, TOTAL, domingo);
  eq('domingo 23:30: hoy es domingo semana 1',
    [s[0].dayName, s[0].weekNumber], ['Domingo', 1]);
  eq('domingo 23:30: ayer es sábado semana 1',
    [s[1].dayName, s[1].weekNumber], ['Sábado', 1]);
}

// --- Primer día: no existe "ayer" dentro de la competencia
{
  const primer = new Date('2026-08-17T14:00:00Z');
  eq('primer día: solo una opción', slots(START, TOTAL, primer).length, 1);
  eq('no se acepta un día anterior al inicio',
    within(START, TOTAL, 1, 7, primer), false);
}

// --- Nada de anotar días lejanos
{
  const miercoles = new Date('2026-08-26T14:00:00Z');  // miércoles semana 2
  eq('no se acepta el sábado de la semana pasada',
    within(START, TOTAL, 1, 6, miercoles), false);
  eq('no se acepta el lunes de esta semana (anteayer)',
    within(START, TOTAL, 2, 1, miercoles), false);
  eq('sí se acepta el martes (ayer)',
    within(START, TOTAL, 2, 2, miercoles), true);
  eq('sí se acepta el miércoles (hoy)',
    within(START, TOTAL, 2, 3, miercoles), true);
}

// --- Fuera del calendario de la competencia
{
  const tarde = new Date('2026-12-01T14:00:00Z');
  eq('pasado el final, no hay opciones', slots(START, TOTAL, tarde).length, 0);
}

// --- Horario de verano chileno (UTC-3 en enero)
{
  const enero = new Date('2027-01-11T02:30:00Z');  // domingo 10 ene, 23:30 en Chile
  const s = slots('2027-01-04', TOTAL, enero);
  eq('en horario de verano, sigue siendo domingo', s[0].dayName, 'Domingo');
}

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);

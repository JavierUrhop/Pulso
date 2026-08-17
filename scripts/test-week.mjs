/**
 * Pruebas del cálculo de semanas en horario de Chile.
 *   node scripts/test-week.mjs
 */
const TZ = 'America/Santiago';

const santiago = (d) => new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const dayOf = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); };
const mondayOf = (d) => { const o = new Date(d); const w = o.getUTCDay();
  o.setUTCDate(o.getUTCDate() - (w === 0 ? 6 : w - 1)); return o; };
const weekNumberFor = (start, when) => {
  const s = mondayOf(dayOf(start)), n = mondayOf(dayOf(santiago(when)));
  return Math.max(1, Math.floor(Math.round((n - s) / 86400000) / 7) + 1);
};
const dow = (when) => { const n = dayOf(santiago(when)).getUTCDay(); return n === 0 ? 7 : n; };

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = got === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` (esperado ${want}, obtuvo ${got})`}`);
};

// El caso que importa: domingo tarde en Chile no debe leerse como lunes.
eq('domingo 23:30 en Chile es día 7', dow(new Date('2026-08-17T03:30:00Z')), 7);
eq('lunes 00:30 en Chile es día 1',   dow(new Date('2026-08-17T04:30:00Z')), 1);

// Horario de verano chileno (UTC-3 en enero, UTC-4 en agosto).
eq('domingo 23:30 en enero es día 7', dow(new Date('2027-01-11T02:30:00Z')), 7);
eq('lunes 00:30 en enero es día 1',   dow(new Date('2027-01-11T03:30:00Z')), 1);

// Numeración de semanas desde un lunes.
eq('el lunes de inicio es semana 1',      weekNumberFor('2026-08-10', new Date('2026-08-10T14:00:00Z')), 1);
eq('el domingo siguiente sigue en 1',     weekNumberFor('2026-08-10', new Date('2026-08-17T02:00:00Z')), 1);
eq('el lunes siguiente pasa a 2',         weekNumberFor('2026-08-10', new Date('2026-08-17T14:00:00Z')), 2);
eq('tres semanas después es semana 4',    weekNumberFor('2026-08-10', new Date('2026-08-31T14:00:00Z')), 4);

// Si el inicio cae a mitad de semana, la semana 1 parte el lunes de esa semana.
eq('inicio en miércoles: ese día es semana 1',  weekNumberFor('2026-08-12', new Date('2026-08-12T14:00:00Z')), 1);
eq('inicio en miércoles: el lunes previo también', weekNumberFor('2026-08-12', new Date('2026-08-10T14:00:00Z')), 1);
eq('inicio en miércoles: lunes siguiente es 2', weekNumberFor('2026-08-12', new Date('2026-08-17T14:00:00Z')), 2);

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);

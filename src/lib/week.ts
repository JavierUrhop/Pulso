export const DAY_NAMES = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
] as const;

/** Medianoche UTC de una fecha 'YYYY-MM-DD' o Date, sin sorpresas de zona horaria. */
function toUTCMidnight(d: string | Date): Date {
  if (typeof d === 'string') {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day));
  }
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Retrocede hasta el lunes de esa semana. */
function mondayOf(d: Date): Date {
  const out = new Date(d);
  const dow = out.getUTCDay(); // 0 = domingo
  const diff = dow === 0 ? 6 : dow - 1;
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}

/**
 * Número de semana de la competencia (1-indexado).
 * La semana 1 es la que contiene start_date, empezando el lunes.
 */
export function weekNumberFor(startDate: string, when: Date = new Date()): number {
  const start = mondayOf(toUTCMidnight(startDate));
  const now = mondayOf(toUTCMidnight(when));
  const diffDays = Math.round((now.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/** Rango de fechas de una semana dada, para mostrar en la interfaz. */
export function weekRange(startDate: string, weekNumber: number): { from: Date; to: Date } {
  const start = mondayOf(toUTCMidnight(startDate));
  const from = new Date(start);
  from.setUTCDate(from.getUTCDate() + (weekNumber - 1) * 7);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 6);
  return { from, to };
}

export function formatWeekRange(startDate: string, weekNumber: number): string {
  const { from, to } = weekRange(startDate, weekNumber);
  const fmt = (d: Date) =>
    `${d.getUTCDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getUTCMonth()]}`;
  return `${fmt(from)} – ${fmt(to)}`;
}

/** Día de la semana actual en formato 1..7 (lunes = 1). */
export function currentDayOfWeek(when: Date = new Date()): number {
  const dow = when.getDay();
  return dow === 0 ? 7 : dow;
}

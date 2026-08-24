/**
 * Cálculo de semanas de la competencia.
 *
 * Regla: la semana 1 va del LUNES 00:00 al DOMINGO 23:59, en horario de
 * Chile. Todo se resuelve en la zona America/Santiago para que un domingo
 * por la noche no se cuente como lunes de la semana siguiente, y para que
 * los cambios de horario de verano no muevan los límites.
 */

export const TZ = 'America/Santiago';

export const DAY_NAMES = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
] as const;

export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

/** Fecha del calendario chileno ('YYYY-MM-DD') para un instante dado. */
export function santiagoDateString(when: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(when);
}

/** 'YYYY-MM-DD' -> Date en medianoche UTC, para comparar días sin husos. */
function dayOf(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Retrocede hasta el lunes de esa semana. */
function mondayOf(d: Date): Date {
  const out = new Date(d);
  const dow = out.getUTCDay();            // 0 = domingo
  out.setUTCDate(out.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return out;
}

/**
 * Número de semana de la competencia (1 en adelante).
 * La semana 1 es la que contiene start_date, empezando el lunes.
 */
export function weekNumberFor(startDate: string, when: Date = new Date()): number {
  const start = mondayOf(dayOf(startDate));
  const now = mondayOf(dayOf(santiagoDateString(when)));
  const diffDays = Math.round((now.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Semana vigente, sin pasarse del final de la competencia.
 * Sirve para que una competencia terminada no siga sumando semanas vacías.
 */
export function activeWeek(startDate: string, totalWeeks: number, when: Date = new Date()): number {
  return Math.min(weekNumberFor(startDate, when), Math.max(1, totalWeeks));
}

export function isFinished(startDate: string, totalWeeks: number, when: Date = new Date()): boolean {
  return weekNumberFor(startDate, when) > totalWeeks;
}

export function hasStarted(startDate: string, when: Date = new Date()): boolean {
  return dayOf(santiagoDateString(when)).getTime() >= mondayOf(dayOf(startDate)).getTime();
}

/** Lunes y domingo de una semana dada. */
export function weekRange(startDate: string, weekNumber: number): { from: Date; to: Date } {
  const start = mondayOf(dayOf(startDate));
  const from = new Date(start);
  from.setUTCDate(from.getUTCDate() + (weekNumber - 1) * 7);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 6);
  return { from, to };
}

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

export function formatWeekRange(startDate: string, weekNumber: number): string {
  const { from, to } = weekRange(startDate, weekNumber);
  const fmt = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return `${fmt(from)} – ${fmt(to)}`;
}

export function formatDate(date: string): string {
  const d = dayOf(date);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Último día de la competencia, como 'YYYY-MM-DD'. */
export function endDateOf(startDate: string, totalWeeks: number): string {
  const { to } = weekRange(startDate, totalWeeks);
  return to.toISOString().slice(0, 10);
}

/** El lunes en que realmente parte la competencia. */
export function firstMonday(startDate: string): string {
  return mondayOf(dayOf(startDate)).toISOString().slice(0, 10);
}

/** Día de la semana actual en Chile, 1..7 con lunes = 1. */
export function currentDayOfWeek(when: Date = new Date()): number {
  const dow = dayOf(santiagoDateString(when)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Lunes de la semana en curso en Chile, como 'YYYY-MM-DD'. */
export function mondayOfChile(when: Date = new Date()): string {
  return mondayOf(dayOf(santiagoDateString(when))).toISOString().slice(0, 10);
}

/** Lunes de la semana que contiene una fecha dada. */
export function mondayOfDate(date: string): string {
  return mondayOf(dayOf(date)).toISOString().slice(0, 10);
}

/** Una opción válida para registrar: hoy o ayer, con su semana ya resuelta. */
export interface RegistrationSlot {
  label: 'Hoy' | 'Ayer';
  /** 1..7 con lunes = 1 */
  dayOfWeek: number;
  dayName: string;
  weekNumber: number;
  /** 'YYYY-MM-DD' en calendario chileno */
  date: string;
  /** true si cae en una semana distinta a la que corre hoy */
  previousWeek: boolean;
}

/**
 * Ventana de registro: solo se puede anotar el entrenamiento de hoy o el de
 * ayer.
 *
 * El caso importante es el lunes: "ayer" fue domingo, que pertenece a la
 * semana anterior y ya está cerrada. En vez de bloquearlo, la opción viene
 * con su propio número de semana, así el registro cae donde corresponde.
 */
export function registrationSlots(
  startDate: string,
  totalWeeks: number,
  when: Date = new Date(),
): RegistrationSlot[] {
  const today = dayOf(santiagoDateString(when));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const currentWeek = weekNumberFor(startDate, when);
  const startMonday = mondayOf(dayOf(startDate));

  const build = (d: Date, label: 'Hoy' | 'Ayer'): RegistrationSlot | null => {
    const iso = d.toISOString().slice(0, 10);
    const diffDays = Math.round((mondayOf(d).getTime() - startMonday.getTime()) / 86_400_000);
    const week = Math.floor(diffDays / 7) + 1;

    // Fuera del calendario de la competencia: no se puede registrar.
    if (week < 1 || week > totalWeeks) return null;

    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    return {
      label,
      dayOfWeek: dow,
      dayName: DAY_NAMES[dow - 1],
      weekNumber: week,
      date: iso,
      previousWeek: week !== currentWeek,
    };
  };

  return [build(today, 'Hoy'), build(yesterday, 'Ayer')]
    .filter((s): s is RegistrationSlot => s !== null);
}

/** ¿Ese día y semana siguen dentro de la ventana de registro? */
export function isWithinWindow(
  startDate: string, totalWeeks: number,
  weekNumber: number, dayOfWeek: number,
  when: Date = new Date(),
): boolean {
  return registrationSlots(startDate, totalWeeks, when)
    .some(s => s.weekNumber === weekNumber && s.dayOfWeek === dayOfWeek);
}

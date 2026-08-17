import type { Workout } from './types';

/**
 * Ícono por deporte. Se busca por coincidencia de palabra clave, así que
 * un deporte nuevo agregado desde el panel también obtiene un ícono
 * razonable sin tocar este archivo.
 */
const RULES: [RegExp, string][] = [
  [/baile|zumba/i,              '💃'],
  [/basquet|básquet|vóleib|voleib/i, '🏀'],
  [/boxeo|marcial/i,            '🥊'],
  [/calistenia|barras/i,        '🤸'],
  [/cerro|trekking|senderis/i,  '🥾'],
  [/mountainbike|mtb/i,         '🚵'],
  [/ciclismo|bici/i,            '🚴'],
  [/crossfit/i,                 '🏋️'],
  [/elíptica|eliptica|escalador/i, '🪜'],
  [/escalada|boulder/i,         '🧗'],
  [/funcional|hiit/i,           '⚡'],
  [/fútbol|futbol/i,            '⚽'],
  [/gimnasio|pesas|musculac/i,  '🏋️'],
  [/kayak|sup|remo/i,           '🛶'],
  [/pádel|padel|tenis/i,        '🎾'],
  [/pilates|yoga/i,             '🧘'],
  [/ski|snowboard|nieve/i,      '🎿'],
  [/spinning/i,                 '🚲'],
  [/surf/i,                     '🏄'],
  [/nataci|piscina/i,           '🏊'],
  [/running|trote|correr|maratón/i, '🏃'],
  [/caminata|caminar/i,         '🚶'],
];

export function sportIcon(name: string): string {
  for (const [re, icon] of RULES) if (re.test(name)) return icon;
  return '🏅';
}

/**
 * Fotos de un entrenamiento.
 * Contempla los registros antiguos, guardados cuando había una sola foto.
 */
export function photosOf(w: Workout & { photo_url?: string | null }): string[] {
  if (w.photo_urls?.length) return w.photo_urls;
  return w.photo_url ? [w.photo_url] : [];
}

export const MAX_PHOTOS = 3;

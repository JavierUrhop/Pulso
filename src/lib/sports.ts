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

/**
 * Normaliza un deporte escrito a mano: quita espacios sobrantes y deja
 * cada palabra con mayúscula inicial, igual que el catálogo base.
 * Las siglas cortas ya escritas en mayúsculas se conservan (HIIT, SUP, MTB).
 */
export function titleCase(input: string): string {
  const clean = input.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  return clean
    .split(' ')
    .map(word => {
      const isAcronym = word.length <= 4
        && word === word.toLocaleUpperCase('es')
        && /\p{Lu}/u.test(word);
      if (isAcronym) return word;

      return word
        .toLocaleLowerCase('es')
        .replace(/^[\p{L}]/u, ch => ch.toLocaleUpperCase('es'));
    })
    .join(' ');
}

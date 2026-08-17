/**
 * Compresión de fotos en el navegador, antes de subirlas.
 *
 * Una foto de celular pesa entre 2 y 4 MB, y para un respaldo visual eso
 * es muchísimo más de lo necesario. Reduciéndola a 1280 px de lado mayor
 * y guardándola como JPEG de calidad 0.8, queda en torno a 200–350 KB:
 * se distingue perfectamente en pantalla, sube mucho más rápido con datos
 * móviles y el almacenamiento rinde entre 10 y 15 veces más.
 */

export const MAX_SIDE = 1280;
export const QUALITY = 0.8;

export interface CompressResult {
  file: File;
  originalBytes: number;
  finalBytes: number;
}

export async function compressImage(
  file: File,
  maxSide: number = MAX_SIDE,
  quality: number = QUALITY,
): Promise<CompressResult> {
  const original = file.size;

  // Si no es una imagen que el navegador sepa decodificar, se sube tal cual.
  if (!file.type.startsWith('image/')) {
    return { file, originalBytes: original, finalBytes: original };
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('sin canvas');

    // Fondo blanco: evita que un PNG con transparencia salga negro en JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality));

    if (!blob) throw new Error('sin blob');

    // Si comprimir no ayudó (ya venía optimizada), se conserva la original.
    if (blob.size >= original) {
      return { file, originalBytes: original, finalBytes: original };
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    const out = new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
    return { file: out, originalBytes: original, finalBytes: out.size };
  } catch {
    // HEIC u otros formatos que el navegador no decodifica: se sube el original.
    return { file, originalBytes: original, finalBytes: original };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

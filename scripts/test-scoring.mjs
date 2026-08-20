/**
 * Compila src/lib/scoring.ts de forma aislada para poder probarlo con node.
 * Se le quitan los imports de tipos: como son solo tipos, no cambian el
 * JavaScript resultante y el módulo queda sin dependencias.
 *
 *   node scripts/test-scoring.mjs && node scripts/run-tests.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';

rmSync('.tmp', { recursive: true, force: true });
mkdirSync('.tmp', { recursive: true });

const src = readFileSync('src/lib/scoring.ts', 'utf8')
  .replace(/^import[\s\S]*?from '\.\/types';\n/m, '');
writeFileSync('.tmp/scoring.ts', src);

// tsconfig propio: sin él, tsc toma el del proyecto y falla por rutas.
writeFileSync('.tmp/tsconfig.json', JSON.stringify({
  compilerOptions: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'bundler',
    outDir: 'out',
    skipLibCheck: true,
    noEmitOnError: false,
    types: [],
  },
  files: ['scoring.ts'],
}, null, 2));

try {
  execSync('npx tsc -p .tmp', { stdio: 'pipe' });
} catch {
  // Se esperan errores de "tipo no encontrado" porque quitamos los imports.
  // TypeScript emite el JavaScript igual, que es lo que necesitamos.
}

if (!existsSync('.tmp/out/scoring.js')) {
  console.error('No se pudo compilar scoring.ts');
  process.exit(1);
}

renameSync('.tmp/out/scoring.js', '.tmp/out/scoring.mjs');
console.log('scoring.ts compilado en .tmp/out/scoring.mjs');

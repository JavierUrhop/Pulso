import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

mkdirSync('.tmp', { recursive: true });
const src = readFileSync('src/lib/scoring.ts', 'utf8')
  .replace(/^import[\s\S]*?from '\.\/types';\n/m, '');
writeFileSync('.tmp/scoring.ts', src);
execSync('npx tsc .tmp/scoring.ts --module esnext --target es2020 --outDir .tmp/out', { stdio: 'inherit' });

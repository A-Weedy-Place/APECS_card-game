// Stage a separate Vercel project with only the scoring worker's source files.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = join(root, 'data', 'vercel-model-worker-release');
const paths = [
  'scripts/model-worker.ts', 'scripts/enroads-browser.mjs',
  'src/game/enroads-controls.json', 'src/game/errors.ts', 'src/game/policy-catalogue.ts',
  'src/server/evaluation.ts', 'src/server/model-queue.ts', 'src/server/model-result.ts',
  'src/server/postgres.ts', 'src/server/supabase-ca.ts',
];
const config = ['Dockerfile.model-worker', 'package.json', 'package-lock.json', 'tsconfig.json'];

async function copy(from, to) {
  const file = join(destination, to);
  await mkdir(dirname(file), { recursive: true });
  await copyFile(join(root, from), file);
}

await Promise.all([
  ...paths.map(path => copy(path, `worker/${path}`)),
  ...config.map(path => copy(`deploy/model-worker/${path}`, `worker/${path}`)),
  copy('deploy/model-worker/vercel.json', 'vercel.json'),
  copy('deploy/model-worker/public/robots.txt', 'public/robots.txt'),
]);
console.log(destination);

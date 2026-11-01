import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
// Transcode generated originals without changing their content.
const artDirectory = resolve('public/art');
await mkdir(artDirectory, { recursive: true });
if (process.argv[2] === '--policy-details') {
  if (!process.argv[3]) throw new Error('Pass the generated policy-detail atlas path.');
  await sharp(process.argv[3]).webp({ quality: 86 }).toFile(resolve(artDirectory, 'policy-details-v1.webp'));
  console.log('policy-details-v1.webp: compressed WebP asset saved');
  process.exit(0);
}
for (const [input, name] of [[process.argv[2], 'polar-world.webp'], [process.argv[3], 'policy-atlas.webp']]) {
  if (!input) throw new Error('Pass the background and atlas source paths.');
  await sharp(input).webp({ quality: 86 }).toFile(resolve(artDirectory, name));
  console.log(`${name}: compressed WebP asset saved`);
}

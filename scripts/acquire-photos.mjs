// Reproducible asset import. Run manually; never required by the game server.
import { mkdir, writeFile, copyFile, readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const photos = resolve(root, 'public/art/photos');
await mkdir(photos, { recursive: true });
const selections = [
  ['world', 'GSFC_20171208_Archive_e001911'],
  ['power', 'KSC-20210405-PH-NAS01_0001'],
  ['wind', 'GRC-1979-C-02503'],
  ['governance', 'GRC-2024-C-05752'],
  ['science', 'KSC-2011-3471'],
  ['land', 's49-91-079'],
  ['ocean', 'iss072e145182'],
  ['food', 'ED07-0256-17'],
  ['industry', 'MSFC-1600392'],
];
const requested = process.argv.slice(2);
const creditOverrides = { world: 'NASA/GSFC/Michael Studinger', science: 'NASA/Frankie Martin', industry: 'NASA/Emmett Given' };
const credits = requested.length ? JSON.parse(await readFile(resolve(photos, 'credits.json'), 'utf8')) : [];
for (const [name, id] of selections.filter(([name]) => !requested.length || requested.includes(name))) {
  const response = await fetch(`https://images-api.nasa.gov/search?nasa_id=${encodeURIComponent(id)}&media_type=image`);
  if (!response.ok) throw new Error(`NASA metadata ${response.status}: ${id}`);
  const item = (await response.json()).collection.items[0];
  if (!item?.links?.[0]?.href) throw new Error(`No image for ${id}`);
  let url = item.links[0].href;
  if (name === 'world') {
    const assets = await (await fetch(`https://images-api.nasa.gov/asset/${id}`)).json();
    url = assets.collection.items.find(asset => /~orig\.jpg$/i.test(asset.href))?.href ?? url;
  }
  const image = await fetch(url);
  if (!image.ok) throw new Error(`Photo ${image.status}: ${id}`);
  await sharp(Buffer.from(await image.arrayBuffer())).resize({ width: name === 'world' ? 1920 : 760, withoutEnlargement: true }).webp({ quality: 82 }).toFile(resolve(photos, `${name}.webp`));
  const existing = credits.findIndex(photo => photo.name === name); if (existing >= 0) credits.splice(existing, 1);
  credits.push({ name, id, title: item.data[0].title, credit: creditOverrides[name] ?? item.data[0].photographer ?? item.data[0].secondary_creator ?? 'NASA', description: item.data[0].description, source: `https://images.nasa.gov/details/${id}`, original: url, terms: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', modification: 'Resized/compressed to WebP; displayed with CSS crops. Illustrative subject photo; people and institutions shown do not endorse this game.' });
  console.log(`Photo ready: ${name} (${id})`);
}
await writeFile(resolve(photos, 'credits.json'), JSON.stringify(credits, null, 2) + '\n');
if (requested.length && !requested.includes('flags')) process.exit(0);

const metadata = await (await fetch('https://registry.npmjs.org/flag-icons/latest')).json();
const temp = resolve(root, 'data/asset-import');
await mkdir(temp, { recursive: true });
const archive = resolve(temp, 'flag-icons.tgz');
await writeFile(archive, Buffer.from(await (await fetch(metadata.dist.tarball)).arrayBuffer()));
execFileSync('tar', ['-xzf', archive, '-C', temp]);
const flags = resolve(root, 'public/flags');
await mkdir(flags, { recursive: true });
let count = 0;
for (const file of await readdir(resolve(temp, 'package/flags/4x3'))) {
  if (/^[a-z]{2}\.svg$/.test(file)) { await copyFile(resolve(temp, 'package/flags/4x3', file), resolve(flags, file)); count++; }
}
await writeFile(resolve(flags, 'LICENSE.txt'), await readFile(resolve(temp, 'package/LICENSE')));
console.log(`${count} flag SVGs imported from flag-icons ${metadata.version} (MIT)`);

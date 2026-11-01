import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
const root=resolve(import.meta.dirname,'..');
const photos=Object.entries(JSON.parse(await readFile(resolve(root,'public/art/cards/credits.json'),'utf8')));
const width=240,height=190,columns=6;
const tiles=[];
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let index=0;index<photos.length;index++){
  const[id,photo]=photos[index];
  const image=await sharp(resolve(root,'public'+photo.file)).resize(width-8,145,{fit:'contain',background:'#e4e8e5'}).png().toBuffer();
  const left=index%columns*width+4,top=Math.floor(index/columns)*height;
  tiles.push({input:image,left,top});
  tiles.push({input:Buffer.from('<svg width="240" height="42"><rect width="240" height="42" fill="white"/><text x="4" y="15" font-family="Arial" font-size="12" font-weight="bold">'+escape(id)+'</text><text x="4" y="32" font-family="Arial" font-size="10">'+escape(photo.title.slice(0,37))+'</text></svg>'),left:left-4,top:top+146});
}
await mkdir(resolve(root,'screenshots'),{recursive:true});
await sharp({create:{width:width*columns,height:height*Math.ceil(photos.length/columns),channels:3,background:'#e4e8e5'}}).composite(tiles).png().toFile(resolve(root,'screenshots/card-photo-contact-sheet.png'));
console.log('Contact sheet: '+photos.length+' photographs');

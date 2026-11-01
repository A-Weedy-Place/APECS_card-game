// Manual, reproducible acquisition from official Wikimedia APIs/CDN.
// Never runs in the game server. Keeps downloaded asset attribution beside it.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const root = resolve(import.meta.dirname, '..'), output = resolve(root, 'public/art/cards');
await mkdir(output, { recursive: true });
const manifestPath = resolve(output, 'credits.json');
let manifest = {}; try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}
const plans = {
  solar: 'Solar power', wind: 'Wind farm', 'community-power': 'Community solar', 'energy-access': 'Solar power in India',
  grid: 'Electrical grid', nuclear: 'Nuclear power plant', 'clean-power-standard': '2015 United Nations Climate Change Conference', 'coal-exit': 'Coal-fired power station',
  efficiency: 'Zero-energy building', heat: 'Heat pump', 'deep-retrofit': 'Building insulation', 'transit-planning': 'Urban planning', 'clean-transit': 'Tram', shipping: 'Port',
  'innovation-fund': 'National Renewable Energy Laboratory', 'skills-training': 'Vocational education', 'worker-transition': 'Wind turbine', 'clean-industry': 'Electric arc furnace', 'circular-materials': 'Recycling', removal: 'Direct air capture',
  'open-science': 'Mauna Loa Observatory', methane: 'Gas leak', 'methane-standard': '2021 United Nations Climate Change Conference',
  'indigenous-leadership': 'United Nations Permanent Forum on Indigenous Issues', 'forest-protection': 'Amazon rainforest', 'restore-land': 'Reforestation', wetlands: 'Mangrove',
  'food-waste': 'Food waste', food: 'Sustainable agriculture', agroecology: 'Agroforestry',
  'early-warning': 'Tsunami warning system', adaptation: 'Flood control', 'coastal-protection': 'Seawall', 'loss-damage': '2022 United Nations Climate Change Conference', 'resilience-fund': 'United Nations General Assembly',
  'climate-solidarity': '2021 United Nations Climate Change Conference', 'citizens-assembly': "Citizens' assembly", coalition: 'Paris Agreement', 'international-deal': 'Paris Agreement', 'participatory-budget': 'Participatory budgeting',
  'climate-literacy': 'School Strike for Climate', 'trusted-media': 'United Nations Climate Change conference', 'local-campaign': '2019 climate strikes',
  'green-bank': 'European Investment Bank', 'clean-contracts': 'Offshore wind power', 'revenue-reform': 'World Bank Group', 'social-dividend': 'United Nations Conference on Sustainable Development', 'carbon-price': 'European Union Emissions Trading System',
  'rapid-grid': 'High-voltage direct current', 'emergency-levy': 'World Bank Group', 'rewilding-leap': 'Rewilding (conservation biology)',
  'coal-mine':'Coal mining','oil-platform':'Oil platform','oil-pump':'Pumpjack','oil-refinery':'Oil refinery',
  'nuclear-build':'Nuclear power','nuclear-control':'Nuclear reactor','gas-plant':'Natural gas power plant','lng-terminal':'Liquefied natural gas',
  biofuel:'Biofuel',biogas:'Biogas',biomass:'Biomass (energy)',cycling:'Cycling infrastructure',
  'electric-car':'Electric car','ev-charger':'Charging station','electric-train':'Electric locomotive',
  insulation:'Building insulation','electric-motor':'Electric motor',induction:'Induction cooking',
  landfill:'Landfill',refrigerants:'Refrigeration','ocean-removal':'Ocean alkalinity enhancement',
  afforestation:'Afforestation','forest-soil':'Soil carbon','capture-research':'Carbon capture and storage','capture-plant':'Carbon dioxide removal',
};
const pinned = {
  'forest-soil':'File:Soil Profile.jpg',
  'capture-research':'File:SRS1000 being used to measure soil respiration in the field..jpg',
  'capture-plant':'File:Aquistore wellhead.jpg',
  solar: 'File:Solarpark Jännersdorf.jpg',
  'international-deal': 'File:Adoption of the Paris Agreement (23075211014).jpg',
  coalition: 'File:Adoption of the Paris Agreement (25876053520).jpg',
  grid: 'File:Abspannportal.jpg',
  shipping: 'File:PortNewarkNJTurnpike.jpg',
  methane: 'File:Polyethylene gas main.jpg',
  'food-waste': 'File:Food Waste.jpg',
  'loss-damage': 'File:Day 3 at COP27 (cop27 0164) (52488901578).jpg',
  'climate-solidarity': 'File:International leaders sign joint statement at COP26 (51649202102).jpg',
  'social-dividend': 'File:World Leaders at Rio+20.jpg',
  'clean-power-standard': 'File:JCH 6442 (22802505643).jpg',
  'transit-planning': 'File:Partizanske4.jpg',
  'methane-standard': 'File:President Joe Biden at COP26.jpg',
  'resilience-fund': 'File:UN General Assembly hall.jpg',
  'local-campaign': 'File:COP15pechke.jpg',
  'revenue-reform': 'File:WhiteandKeynes.jpg',
  'carbon-price': 'File:European Parliament hemicycle.jpg',
  'emergency-levy': 'File:The World Bank Group (53844804648).jpg',
  removal: 'File:Climeworks-Anlage.jpg',
  agroecology: 'File:Faidherbia albida.jpg',
};
const requested = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const force = process.argv.includes('--replace');
const clean = text => String(text ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();
const canonical = name => String(name).replaceAll('_',' ');
const headers = { 'User-Agent': 'CryospherePavilionPrototype/0.7 (https://www.apecs.is/; local educational photo importer) Node.js' };
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let lastRequest = 0;
async function fetchPolite(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await pause(Math.max(0, 1200 - (Date.now() - lastRequest))); lastRequest = Date.now();
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (response.status !== 429 && response.status !== 503) return response;
    const retry = response.headers.get('retry-after');
    const seconds = Math.max(5, /^\d+$/.test(retry ?? '') ? Number(retry) : 10 * 2 ** attempt);
    console.log('Rate limited; respecting Retry-After: ' + seconds + 's');
    let remaining = seconds * 1000;
    while (remaining > 0) { const step = Math.min(60000, remaining); await pause(step); remaining -= step; }
  }
  throw new Error('Host remains rate limited; resume later without redownloading cached files.');
}
async function api(params) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', ...params });
  const response = await fetchPolite(url);
  if (!response.ok) throw new Error('Metadata HTTP ' + response.status);
  const json = await response.json(); if (json.error) throw new Error(json.error.info);
  return Object.values(json.query?.pages ?? {});
}
const entries = Object.entries(plans).filter(([id]) => (!requested.length || requested.includes(id)) && (!manifest[id] || force));
const pagesByTitle = new Map(), infoByTitle = new Map(), missing = [];
const articles = [...new Set(entries.map(([,article])=>article))];
for(let offset=0;offset<articles.length;offset+=25){
  const pages=await api({titles:articles.slice(offset,offset+25).join('|'),redirects:'1',prop:'pageimages|images',piprop:'name',imlimit:'500'});
  for(const page of pages) pagesByTitle.set(page.title,page);
}
async function articlePage(article){
  if(pagesByTitle.has(article))return pagesByTitle.get(article);
  const pages=await api({titles:article,redirects:'1',prop:'pageimages|images',piprop:'name',imlimit:'50'});
  const page=pages[0];pagesByTitle.set(article,page);return page;
}
const candidates = new Map();
for(const [id,article] of entries){
  const page=await articlePage(article);
  candidates.set(id,[...new Set([pinned[id],page?.pageimage?'File:'+page.pageimage:null,...(page?.images??[]).map(image=>image.title)].filter(Boolean).map(canonical))].filter(name=>/\.jpe?g$/i.test(name)&&!/\b(icon|logo|flag|map|diagram|graph|chart|coat of arms|signature|seal|symbol)\b/i.test(name)));
}
async function loadInfo(names){
  const unknown=[...new Set(names.map(canonical))].filter(name=>!infoByTitle.has(name));
  for(let offset=0;offset<unknown.length;offset+=40){
    const infos=await api({titles:unknown.slice(offset,offset+40).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|size|mime|sha1',iiurlwidth:'960'});
    for(const page of infos) infoByTitle.set(canonical(page.title),page.imageinfo?.[0]??null);
  }
}
// Batch first candidates rather than making two metadata requests per card.
await loadInfo([...candidates.values()].flatMap(names=>names.slice(0,3)));
const used=new Set(Object.entries(manifest).filter(([id])=>!entries.some(([selected])=>id===selected)).map(([,photo])=>photo.sha1));
for(const [id,article]of entries){
  try{
    let picked;
    if(id==='skills-training'){
      const nasa=JSON.parse(await readFile(resolve(root,'public/art/photos/credits.json'),'utf8')).find(photo=>photo.name==='science');
      const buffer=await readFile(resolve(root,'public/art/photos/science.webp'));
      const dimensions=await sharp(buffer).metadata();
      await writeFile(resolve(output,id+'.webp'),buffer);
      picked={file:'/art/cards/'+id+'.webp',title:nasa.title,subject:'Research skills and training',description:nasa.description,credit:nasa.credit,licence:'NASA media use guidance',licenceUrl:nasa.terms,source:nasa.source,original:nasa.original,sha1:createHash('sha1').update(buffer).digest('hex'),width:dimensions.width,height:dimensions.height,modification:nasa.modification};
      used.add(picked.sha1);
    }
    for(const name of candidates.get(id)??[]){
      if(picked)break;
      await loadInfo([name]);
      const info=infoByTitle.get(canonical(name));
      if(!info||info.mime!=='image/jpeg'||info.width<500||info.height<320||used.has(info.sha1)||info.size>60000000)continue;
      const metadata=info.extmetadata??{},licence=clean(metadata.LicenseShortName?.value);
      const normalizedLicence=licence.replace(/^CC-BY-SA-/, 'CC BY-SA ').replace(/^CC-BY-/, 'CC BY ');
      if(!/^(CC BY(?:-SA)? [1-4]\.[05]|CC0|Public domain|PD)/i.test(normalizedLicence)||/non.free|fair.use|permission required/i.test(clean(metadata.Restrictions?.value)))continue;
      try{
        let response=await fetchPolite(info.thumburl??info.url);if(!response.ok&&info.thumburl)response=await fetchPolite(info.url);if(!response.ok)continue;
        const buffer=Buffer.from(await response.arrayBuffer());
        await sharp(buffer).rotate().resize({width:860,withoutEnlargement:true}).webp({quality:80}).toFile(resolve(output,id+'.webp'));
        picked={file:'/art/cards/'+id+'.webp',title:name.replace(/^File:/,'').replace(/\.[^.]+$/,''),subject:article,description:clean(metadata.ImageDescription?.value),credit:clean(metadata.Artist?.value)||clean(metadata.Credit?.value),licence,licenceUrl:metadata.LicenseUrl?.value||info.descriptionurl,source:info.descriptionurl,original:info.url,sha1:info.sha1,width:info.width,height:info.height,modification:'Converted/resized to WebP; displayed cropped. Any adapted photograph retains its stated licence. Illustrative/editorial use, not endorsement by people or institutions pictured.'};
        if(id==='carbon-price')Object.assign(picked,{credit:'© European Union 2023 – Source: EP',licence:'CC BY 4.0',licenceUrl:'https://creativecommons.org/licenses/by/4.0/'}); // Original caption requests this attribution/licence.
        if(id==='loss-damage')picked.credit='David Nieto / IAEA';
        if(id==='methane')Object.assign(picked,{credit:'© Andrew Dunn, 2005',description:'Gas-main installation in Chesterton Road, Cambridge, photographed on 16 August 2005.'}); // Author manually verified on the Commons file page; absent from its machine-readable fields.
        if(!picked.credit)throw new Error('Manual author verification required before using this photo.');
        used.add(info.sha1);break;
      }catch(error){console.log('Candidate unavailable for '+id+': '+(error.cause?.code??error.message));}
    }
    if(!picked)throw new Error('No distinct licensed photograph found in '+article);
    manifest[id]=picked;await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
    await writeFile(resolve(output,id+'.licence.txt'),picked.title+'\n'+picked.credit+'\n'+picked.licence+': '+picked.licenceUrl+'\nSource: '+picked.source+'\n'+picked.modification+'\n');
    console.log('Downloaded '+id+': '+picked.title+' ['+picked.licence+']');
  }catch(error){missing.push(id);console.log('MISSING '+id+': '+(error.cause?.code??error.message));}
}
console.log(JSON.stringify({downloaded:Object.keys(manifest).length,total:Object.keys(plans).length,missing}));
if(missing.length)process.exitCode=1;

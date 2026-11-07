import {readFile} from 'node:fs/promises';

const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed = (value, keys, label) => {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error(`Unexpected public wiki fields: ${label}`);
};
const text = value => typeof value==='string'&&value.trim()&&!/[\u2013\u2014]/.test(value);
const slug = value => typeof value==='string'&&/^[a-z0-9-]+$/.test(value);
const regionSlug = region => region.id.replaceAll('_','-');
const regionUrl = (region,base) => `${base}wiki/regions/${regionSlug(region)}/index.html`;

function validate(data) {
  allowed(data,['updated','notice','creatures','regions','guides'],'root');
  if(!text(data.updated)||!text(data.notice))throw Error('Invalid public wiki introduction');
  const regions=new Set();
  for(const region of data.regions){
    allowed(region,['id','name','description','route','guardian'],'region');
    if(!/^[a-z0-9_]+$/.test(region.id)||regions.has(region.id)||![region.name,region.description,region.route].every(text)||(region.guardian!==null&&!text(region.guardian)))throw Error('Invalid public region');
    regions.add(region.id);
  }
  const names=new Set();
  for(const creature of data.creatures){
    allowed(creature,['slug','name','description','animalCombination','region','image'],'creature');
    if(!slug(creature.slug)||names.has(creature.slug)||![creature.name,creature.description,creature.animalCombination].every(text)||!regions.has(creature.region)||!/^[a-z0-9-]+\.png$/.test(creature.image))throw Error('Invalid public creature');
    names.add(creature.slug);
  }
  for(const region of data.regions)if(region.guardian&&!data.creatures.some(c=>c.name===region.guardian&&c.region===region.id))throw Error('Invalid public guardian');
  const guides=new Set();
  for(const guide of data.guides){
    allowed(guide,['slug','title','summary','sections'],'guide');
    if(!slug(guide.slug)||guides.has(guide.slug)||![guide.title,guide.summary].every(text))throw Error('Invalid public guide');
    guides.add(guide.slug);
    for(const section of guide.sections){
      allowed(section,['title','paragraphs'],'section');
      if(!text(section.title)||!Array.isArray(section.paragraphs)||!section.paragraphs.every(text))throw Error('Invalid public guide section');
    }
  }
}

function nav(data,base,current) {
  const link=(key,label,path)=>`<a href="${base}wiki/${path}"${current===key?' aria-current="page"':''}>${label}</a>`;
  return `<aside class="wiki-nav" aria-label="Wiki navigation"><strong>Game wiki</strong><nav>${link('home','Wiki home','index.html')}${link('creatures','Creatures','creatures/index.html')}${data.guides.map(g=>link(g.slug,esc(g.title),`guides/${g.slug}/index.html`)).join('')}${link('regions','Regions','regions/index.html')}</nav><div class="wiki-nav-extra"><a href="${base}updates/index.html">Development news</a><a href="${base}playtest/index.html">Early playtesting</a></div></aside>`;
}
function shell(data,base,current,title,body,crumb='') {
  return `<link rel="stylesheet" href="${base}wiki.css"><div class="wiki-shell">${nav(data,base,current)}<article class="wiki-main"><nav class="wiki-breadcrumbs" aria-label="Wiki breadcrumb"><a href="${base}wiki/index.html">Wiki</a>${crumb?`<span aria-hidden="true">/</span>${crumb}`:''}</nav><header class="wiki-heading"><p class="label">THAT'S MY EGG!</p><h1>${esc(title)}</h1></header><p class="wiki-notice"><strong>Under development.</strong> ${esc(data.notice)}</p>${body}<footer class="wiki-updated">Guide updated ${esc(data.updated)}.</footer></article></div>`;
}
const guideCards=(data,base)=>`<ul class="wiki-topic-list">${data.guides.map(g=>`<li><a href="${base}wiki/guides/${g.slug}/index.html">${esc(g.title)}</a><p>${esc(g.summary)}</p></li>`).join('')}</ul>`;
const creatureCard=(creature,data,base)=>`<li><a href="${base}wiki/creatures/${creature.slug}/index.html"><span class="wiki-creature-art"><img src="${base}wiki-assets/${creature.image}" alt="${esc(creature.name)} creature artwork" width="512" height="512" loading="lazy"></span><strong>${esc(creature.name)}</strong><span>${esc(data.regions.find(r=>r.id===creature.region).name)}</span></a></li>`;

export async function wikiPages(page) {
  const data=JSON.parse(await readFile(new URL('../content/public-wiki.json',import.meta.url),'utf8'));
  validate(data);
  const entries=[];
  const add=(url,title,description,body,base)=>entries.push({path:`${url}index.html`,url,html:page(`${title} | That's my Egg! Wiki`,description,url,body,base)});
  let base='../';
  const homeBody=`<p class="wiki-lead">A guide to stealing eggs, caring for pets, and the creatures of That's my Egg!.</p><section class="wiki-section"><h2>Start here</h2>${guideCards(data,base)}</section><section class="wiki-section"><div class="wiki-section-heading"><h2>Creatures</h2><a href="creatures/index.html">Browse all ${data.creatures.length} creatures →</a></div><p>Meet the current creature roster, from the companions of Sunnyside Backyard to the swimmers of Deepwater Abyss and gliders of Cloudtop Cliffs. Each profile includes artwork, a species description, and its animal combination.</p><ul class="wiki-creature-grid preview">${['labraduck','hamsturtle','donkeyote','kiwink'].map(name=>creatureCard(data.creatures.find(c=>c.slug===name),data,base)).join('')}</ul></section><section class="wiki-section"><h2>Explore the regions</h2><p>Get to know Home and all ${data.regions.length-1} biomes, including later regions still being developed.</p><a class="text-link" href="regions/index.html">Read the region guide →</a></section>`;
  add('wiki/','Game wiki','A public guide to eggs, pets, regions, and creatures in the Roblox game That\'s my Egg!.',shell(data,base,'home','Game wiki',homeBody),base);
  base='../../';
  const indexBody=`<p class="wiki-lead">${data.creatures.length} creature profiles, with artwork, species descriptions, regions, and animal combinations.</p><p>Browse the current roster below, or <a href="../regions/index.html">explore by region</a>. Artwork introduces each species; models and availability can change during development.</p><ul class="wiki-creature-grid">${data.creatures.map(c=>creatureCard(c,data,base)).join('')}</ul>`;
  add('wiki/creatures/','Creatures','Browse the current creature roster from That\'s my Egg!, with artwork and animal combinations.',shell(data,base,'creatures','Creatures',indexBody,'<span>Creatures</span>'),base);
  for(const creature of data.creatures){
    base='../../../';
    const region=data.regions.find(r=>r.id===creature.region);
    const body=`<div class="wiki-creature-profile"><figure class="wiki-profile-art"><img src="${base}wiki-assets/${creature.image}" width="512" height="512" alt="${esc(creature.name)} creature artwork"><figcaption>Creature artwork. The game model may differ during development.</figcaption></figure><div><p class="wiki-species-description">${esc(creature.description)}</p><dl class="wiki-facts"><div><dt>Region</dt><dd><a href="${regionUrl(region,base)}">${esc(region.name)}</a></dd></div><div><dt>Animal combination</dt><dd>${esc(creature.animalCombination)}</dd></div></dl><p class="wiki-profile-note">This profile introduces the species. Individual pets have their own quality, size, and details in game.</p></div></div><section class="wiki-section"><h2>Related guides</h2><ul class="wiki-related"><li><a href="${base}wiki/guides/eggs-and-hatching/index.html">Eggs and hatching</a></li><li><a href="${base}wiki/guides/pets-and-gardens/index.html">Pets and gardens</a></li><li><a href="../index.html">All creatures</a></li></ul></section>`;
    add(`wiki/creatures/${creature.slug}/`,creature.name,`Meet ${creature.name} from That's my Egg!.`,shell(data,base,'creatures',creature.name,body,`<a href="../index.html">Creatures</a><span aria-hidden="true">/</span><span>${esc(creature.name)}</span>`),base);
  }
  for(const guide of data.guides){
    base='../../../';
    const body=`<p class="wiki-lead">${esc(guide.summary)}</p><nav class="wiki-contents" aria-label="On this page"><strong>On this page</strong><ul>${guide.sections.map((s,i)=>`<li><a href="#section-${i+1}">${esc(s.title)}</a></li>`).join('')}</ul></nav>${guide.sections.map((section,i)=>`<section class="wiki-section" id="section-${i+1}"><h2>${esc(section.title)}</h2>${section.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('')}<section class="wiki-section"><h2>Keep reading</h2><ul class="wiki-related">${data.guides.filter(g=>g.slug!==guide.slug).map(g=>`<li><a href="../${g.slug}/index.html">${esc(g.title)}</a></li>`).join('')}<li><a href="${base}wiki/creatures/index.html">Creature guide</a></li></ul></section>`;
    add(`wiki/guides/${guide.slug}/`,guide.title,guide.summary,shell(data,base,guide.slug,guide.title,body,`<span>${esc(guide.title)}</span>`),base);
  }
  base='../../';
  const routes=[...new Set(data.regions.map(r=>r.route))];
  const regionBody=`<p class="wiki-lead">Home and all ${data.regions.length-1} biomes in the world of That's my Egg!.</p><p>The main route leads from Sunnyside Backyard to Jungle Wilds, where the world branches toward water, mountain, and sky regions. Later regions are still being developed.</p><nav class="wiki-contents" aria-label="Region contents"><strong>Explore the world</strong><ul>${routes.map((route,i)=>`<li><a href="#route-${i}">${esc(route)}</a></li>`).join('')}</ul></nav>${routes.map((route,i)=>`<section class="wiki-section" id="route-${i}"><h2>${esc(route)}</h2><ul class="wiki-topic-list">${data.regions.filter(r=>r.route===route).map(region=>`<li><a href="${regionUrl(region,base)}">${esc(region.name)}</a><p>${esc(region.description)}</p></li>`).join('')}</ul></section>`).join('')}`;
  add('wiki/regions/','Regions','Explore Home and all fourteen biomes in That\'s my Egg!.',shell(data,base,'regions','Regions',regionBody,'<span>Regions</span>'),base);
  for(const region of data.regions){
    base='../../../';
    const creatures=data.creatures.filter(c=>c.region===region.id);
    const guardian=data.creatures.find(c=>c.name===region.guardian);
    const body=`<p class="wiki-lead">${esc(region.description)}</p><dl class="wiki-facts"><div><dt>Route</dt><dd>${esc(region.route)}</dd></div>${guardian?`<div><dt>Guardian</dt><dd><a href="${base}wiki/creatures/${guardian.slug}/index.html">${esc(guardian.name)}</a></dd></div>`:''}</dl>${region.id==='home'?`<section class="wiki-section"><h2>Your garden and collection</h2><p>Bring your eggs back to Home, then manage owned eggs and creatures in your garden and pet collection.</p>${guideCards(data,base)}</section>`:`<section class="wiki-section"><h2>Creatures of ${esc(region.name)}</h2>${creatures.length?`<ul class="wiki-creature-grid">${creatures.map(c=>creatureCard(c,data,base)).join('')}</ul>`:'<p>There are no creature profiles to show for this region yet.</p>'}</section>`}<section class="wiki-section"><h2>Keep exploring</h2><ul class="wiki-related"><li><a href="../index.html">All regions</a></li><li><a href="${base}wiki/creatures/index.html">All creatures</a></li><li><a href="${base}wiki/guides/getting-started/index.html">Getting started</a></li></ul></section>`;
    add(`wiki/regions/${regionSlug(region)}/`,region.name,`Explore ${region.name} in That's my Egg!.`,shell(data,base,'regions',region.name,body,`<a href="../index.html">Regions</a><span aria-hidden="true">/</span><span>${esc(region.name)}</span>`),base);
  }
  return entries;
}

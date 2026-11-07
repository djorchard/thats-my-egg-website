import {readFile} from 'node:fs/promises';

const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed = (value, keys, label) => {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error(`Unexpected public wiki fields: ${label}`);
};
const text = value => typeof value==='string'&&value.trim()&&!/[\u2013\u2014]/.test(value);
const slug = value => typeof value==='string'&&/^[a-z0-9-]+$/.test(value);

function validate(data) {
  allowed(data,['updated','notice','creatures','regions','guides'],'root');
  if(!text(data.updated)||!text(data.notice))throw Error('Invalid public wiki introduction');
  const regions=new Set();
  for(const region of data.regions){
    allowed(region,['id','name','description'],'region');
    if(!slug(region.id)||regions.has(region.id)||![region.name,region.description].every(text))throw Error('Invalid public region');
    regions.add(region.id);
  }
  const names=new Set();
  for(const creature of data.creatures){
    allowed(creature,['slug','name','description','animalCombination','region','image'],'creature');
    if(!slug(creature.slug)||names.has(creature.slug)||![creature.name,creature.description,creature.animalCombination].every(text)||!regions.has(creature.region)||!/^[a-z0-9-]+\.png$/.test(creature.image))throw Error('Invalid public creature');
    names.add(creature.slug);
  }
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
  const homeBody=`<p class="wiki-lead">A guide to rescuing eggs, caring for pets, and the creatures of That's my Egg!.</p><section class="wiki-section"><h2>Start here</h2>${guideCards(data,base)}</section><section class="wiki-section"><div class="wiki-section-heading"><h2>Creatures</h2><a href="creatures/index.html">Browse the creature guide →</a></div><p>Meet a selection of the creatures in development. Artwork is shown separately from the game models.</p><ul class="wiki-creature-grid preview">${['labraduck','hamsturtle','donkeyote','kiwink'].map(name=>creatureCard(data.creatures.find(c=>c.slug===name),data,base)).join('')}</ul></section><section class="wiki-section"><h2>Explore the regions</h2><p>Start at Home and get to know the nearby regions, their guardians, and their creatures.</p><a class="text-link" href="regions/index.html">Read the region guide →</a></section>`;
  add('wiki/','Game wiki','A public guide to eggs, pets, regions, and creatures in the Roblox game That\'s my Egg!.',shell(data,base,'home','Game wiki',homeBody),base);
  base='../../';
  const indexBody=`<p class="wiki-lead">Creature profiles with their descriptions, region, and animal combination.</p><p>This initial guide covers a selection of creatures in the development build. It is not a complete release catalogue.</p><ul class="wiki-creature-grid">${data.creatures.map(c=>creatureCard(c,data,base)).join('')}</ul>`;
  add('wiki/creatures/','Creatures','Browse selected creature profiles from That\'s my Egg!, with artwork and animal combinations.',shell(data,base,'creatures','Creatures',indexBody,'<span>Creatures</span>'),base);
  for(const creature of data.creatures){
    base='../../../';
    const region=data.regions.find(r=>r.id===creature.region);
    const body=`<div class="wiki-creature-profile"><figure class="wiki-profile-art"><img src="${base}wiki-assets/${creature.image}" width="512" height="512" alt="${esc(creature.name)} creature artwork"><figcaption>Creature artwork. The game model may differ during development.</figcaption></figure><div><p class="wiki-species-description">${esc(creature.description)}</p><dl class="wiki-facts"><div><dt>Region</dt><dd><a href="${base}wiki/regions/index.html#${region.id}">${esc(region.name)}</a></dd></div><div><dt>Animal combination</dt><dd>${esc(creature.animalCombination)}</dd></div></dl><p class="wiki-profile-note">This profile introduces the species. Individual pets have their own quality, size, and details in game.</p></div></div><section class="wiki-section"><h2>Related guides</h2><ul class="wiki-related"><li><a href="${base}wiki/guides/eggs-and-hatching/index.html">Eggs and hatching</a></li><li><a href="${base}wiki/guides/pets-and-gardens/index.html">Pets and gardens</a></li><li><a href="../index.html">All creatures</a></li></ul></section>`;
    add(`wiki/creatures/${creature.slug}/`,creature.name,`Meet ${creature.name} from That's my Egg!.`,shell(data,base,'creatures',creature.name,body,`<a href="../index.html">Creatures</a><span aria-hidden="true">/</span><span>${esc(creature.name)}</span>`),base);
  }
  for(const guide of data.guides){
    base='../../../';
    const body=`<p class="wiki-lead">${esc(guide.summary)}</p><nav class="wiki-contents" aria-label="On this page"><strong>On this page</strong><ul>${guide.sections.map((s,i)=>`<li><a href="#section-${i+1}">${esc(s.title)}</a></li>`).join('')}</ul></nav>${guide.sections.map((section,i)=>`<section class="wiki-section" id="section-${i+1}"><h2>${esc(section.title)}</h2>${section.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('')}<section class="wiki-section"><h2>Keep reading</h2><ul class="wiki-related">${data.guides.filter(g=>g.slug!==guide.slug).map(g=>`<li><a href="../${g.slug}/index.html">${esc(g.title)}</a></li>`).join('')}<li><a href="${base}wiki/creatures/index.html">Creature guide</a></li></ul></section>`;
    add(`wiki/guides/${guide.slug}/`,guide.title,guide.summary,shell(data,base,guide.slug,guide.title,body,`<span>${esc(guide.title)}</span>`),base);
  }
  base='../../';
  const regionBody=`<p class="wiki-lead">Home and a selection of the nearby regions in development.</p><nav class="wiki-contents" aria-label="Region contents"><strong>Regions in this guide</strong><ul>${data.regions.map(r=>`<li><a href="#${r.id}">${esc(r.name)}</a></li>`).join('')}</ul></nav>${data.regions.map(region=>`<section class="wiki-section" id="${region.id}"><h2>${esc(region.name)}</h2><p>${esc(region.description)}</p>${data.creatures.some(c=>c.region===region.id)?`<ul class="wiki-related">${data.creatures.filter(c=>c.region===region.id).map(c=>`<li><a href="../creatures/${c.slug}/index.html">${esc(c.name)}</a></li>`).join('')}</ul>`:''}</section>`).join('')}`;
  add('wiki/regions/','Regions','Home and selected nearby regions in That\'s my Egg!.',shell(data,base,'regions','Regions',regionBody,'<span>Regions</span>'),base);
  return entries;
}

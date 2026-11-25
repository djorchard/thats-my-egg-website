import {readFile} from 'node:fs/promises';
import {escapeHtml as e, formatDate} from './layout.mjs';

const wikiUrl = (base, path = '') => `${base}wiki/${path}index.html`;
const regionPath = region => `regions/${region.id.replaceAll('_', '-')}/`;
const creaturePath = creature => `creatures/${creature.slug}/`;
const guidePath = guide => `guides/${guide.slug}/`;
const link = (base, path, label) => `<a href="${wikiUrl(base, path)}">${e(label)}</a>`;
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const text = value => typeof value === 'string' && value.trim() && !/[\u2013\u2014]/u.test(value);
const lines = value => Array.isArray(value) && value.length && value.every(text);

function allowFields(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) {
    throw Error(`Unexpected public wiki fields in ${label}`);
  }
}

function validate(data) {
  allowFields(data, ['updated', 'notice', 'creatures', 'regions', 'guides'], 'root');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated) || !Number.isFinite(Date.parse(data.updated)) ||
      !text(data.notice)) throw Error('Invalid public wiki introduction');

  const regions = new Set();
  for (const region of data.regions) {
    allowFields(region, ['id', 'name', 'description', 'route', 'guardian', 'previewRoster'], 'region');
    if (!/^[a-z0-9_]+$/.test(region.id) || regions.has(region.id) ||
        ![region.name, region.description, region.route].every(text) ||
        (region.guardian !== null && !text(region.guardian)) ||
        ('previewRoster' in region && !lines(region.previewRoster))) {
      throw Error(`Invalid public region ${region.id}`);
    }
    regions.add(region.id);
  }

  const creatures = new Set();
  for (const creature of data.creatures) {
    allowFields(creature, ['slug', 'name', 'description', 'animalCombination', 'region', 'image'], 'creature');
    if (!slug(creature.slug) || creatures.has(creature.slug) ||
        ![creature.name, creature.description, creature.animalCombination].every(text) ||
        !regions.has(creature.region) || !/^[a-z0-9-]+\.png$/.test(creature.image)) {
      throw Error(`Invalid public creature ${creature.slug}`);
    }
    creatures.add(creature.slug);
  }
  for (const region of data.regions) {
    if (region.guardian && !data.creatures.some(c => c.name === region.guardian && c.region === region.id)) {
      throw Error(`Invalid public guardian in ${region.id}`);
    }
  }

  const guides = new Set();
  for (const guide of data.guides) {
    allowFields(guide, ['slug', 'title', 'summary', 'sections'], 'guide');
    if (!slug(guide.slug) || guides.has(guide.slug) || ![guide.title, guide.summary].every(text) ||
        !Array.isArray(guide.sections) || !guide.sections.length) {
      throw Error(`Invalid public guide ${guide.slug}`);
    }
    guides.add(guide.slug);
    for (const section of guide.sections) {
      allowFields(section, ['title', 'paragraphs', 'steps'], 'guide section');
      if (!text(section.title) || !lines(section.paragraphs) || ('steps' in section && !lines(section.steps))) {
        throw Error(`Invalid public guide section in ${guide.slug}`);
      }
    }
  }
}

function nav(base, section, path) {
  const pages = [['', 'Overview'], ['guides/', 'Player guides'], ['creatures/', 'Creatures'], ['regions/', 'Regions']];
  return `<nav class="wiki-nav" aria-label="Wiki sections">${pages.map(([url, title]) =>
    `<a href="${wikiUrl(base, url)}"${path === url ? ' aria-current="page"' : ''}${section === url ? ' class="is-active"' : ''}>${title}</a>`
  ).join('')}</nav>`;
}

function searchForm(base, results = false) {
  return `<form class="wiki-search" action="${wikiUrl(base, 'search/')}" role="search" aria-label="Wiki search"${results ? ' data-wiki-search' : ''}>
    <label class="wiki-visually-hidden" for="wiki-query">Search the wiki</label>
    <input type="search" id="wiki-query" name="q" maxlength="120" placeholder="Search the wiki">
    ${results ? `<label class="wiki-visually-hidden" for="wiki-kind">Page type</label>
    <select id="wiki-kind" name="type"><option value="">All pages</option><option value="Guide">Guides</option><option value="Creature">Creatures</option><option value="Region">Regions</option></select>` : ''}
    <button type="submit">Search</button>
  </form>`;
}

function contents(items) {
  return `<nav class="wiki-contents" aria-label="On this page"><strong>On this page</strong>
    <ul>${items.map(([id, name]) => `<li><a href="#${id}">${e(name)}</a></li>`).join('')}</ul></nav>`;
}

function shell(data, base, path, title, body, {section = path, crumb = [], outline = [], intro = '', search = true} = {}) {
  const trail = [link(base, '', 'Wiki'), ...crumb, `<span aria-current="page">${e(title)}</span>`]
    .map(item => `<li>${item}</li>`).join('');
  return `<link rel="stylesheet" href="${base}wiki.css">
    <div class="wiki-shell">
      <div class="wiki-toolbar">${nav(base, section, path)}${search ? searchForm(base) : ''}</div>
      <article class="wiki-main${outline.length ? ' has-outline' : ''}">
        ${path ? `<nav class="wiki-breadcrumbs" aria-label="Breadcrumb"><ol>${trail}</ol></nav>` : ''}
        <header class="wiki-heading"><h1>${e(title)}</h1>${intro ? `<p class="wiki-lead">${e(intro)}</p>` : ''}</header>
        ${outline.length ? contents(outline) : ''}
        <div class="wiki-article-body">${body}</div>
        <footer class="wiki-updated">Wiki updated <time datetime="${e(data.updated)}">${formatDate(data.updated)}</time></footer>
      </article>
    </div>`;
}

const guideCards = (data, base) => `<ul class="wiki-topic-list">${data.guides.map(guide =>
  `<li>${link(base, guidePath(guide), guide.title)}<p>${e(guide.summary)}</p></li>`
).join('')}</ul>`;
const related = links => `<ul class="wiki-related">${links.map(a => `<li>${a}</li>`).join('')}</ul>`;
const creatureCard = (creature, regions, base) => `<li><a href="${wikiUrl(base, creaturePath(creature))}">
  <span class="wiki-creature-art"><img src="${base}wiki-assets/${creature.image}" alt="" width="512" height="512" loading="lazy"></span>
  <strong>${e(creature.name)}</strong><span class="wiki-creature-region">${e(regions.get(creature.region).name)}</span>
</a></li>`;
const facts = rows => `<dl class="wiki-facts">${rows.map(([name, value]) =>
  `<div><dt>${name}</dt><dd>${value}</dd></div>`
).join('')}</dl>`;

function searchContents(data, regions, base) {
  const entries = [
    ...data.guides.map(g => ({
      title: g.title, path: guidePath(g), type: 'Guide', description: g.summary,
      terms: g.sections.flatMap(s => [s.title, ...s.paragraphs, ...(s.steps ?? [])]).join(' ')
    })),
    ...data.creatures.map(c => ({
      title: c.name, path: creaturePath(c), type: 'Creature',
      description: `${regions.get(c.region).name} · ${c.animalCombination}`, terms: c.description
    })),
    ...data.regions.map(r => ({
      title: r.name, path: regionPath(r), type: 'Region', description: r.description,
      terms: [r.route, r.guardian, ...(r.previewRoster ?? [])].join(' ')
    }))
  ].sort((a, b) => a.title.localeCompare(b.title, 'en'));
  return `${searchForm(base, true)}
    <p class="wiki-search-count" role="status"></p>
    <noscript><p>Use your browser's Find command to search this page list.</p></noscript>
    <ul class="wiki-search-results">${entries.map(entry => `<li data-type="${entry.type}" data-terms="${e(entry.terms)}">
      <div data-wiki-result-title>${link(base, entry.path, entry.title)} <span>${entry.type}</span></div>
      <p>${e(entry.description)}</p>
    </li>`).join('')}</ul>
    <script src="${base}wiki-search.js" defer></script>`;
}

export async function wikiPages(page) {
  const data = JSON.parse(await readFile(new URL('../content/public-wiki.json', import.meta.url), 'utf8'));
  validate(data);
  const regions = new Map(data.regions.map(region => [region.id, region]));
  const entries = [];
  const add = (path, base, title, description, body, options) => {
    const url = `wiki/${path}`;
    entries.push({
      path: `${url}index.html`, url,
      html: page(`${title} | That's my Egg! Wiki`, description, url, shell(data, base, path, title, body, options), base)
    });
  };

  let base = '../';
  const featured = data.creatures.filter(c => ['labraduck', 'hamsturtle', 'donkeyote', 'kiwink'].includes(c.slug));
  const home = `<div class="wiki-welcome">
    <div><h2>Your first egg run</h2><p>Venture out from Home, take an egg, escape its guardian, and hatch a creature for your collection.</p>
    ${link(base, 'guides/getting-started/', 'Follow the first-egg guide')}</div>
    <img src="${base}assets/backyard-current-20261107.jpg" alt="Sunnyside Backyard in a development screenshot">
  </div>
  <p class="wiki-notice">${e(data.notice)}</p>
  <section class="wiki-section"><h2>Player guides</h2>${guideCards(data, base)}</section>
  <section class="wiki-section"><div class="wiki-section-heading"><h2>Creature directory</h2>${link(base, 'creatures/', `Browse ${data.creatures.length} profiles`)}</div>
    <ul class="wiki-creature-grid">${featured.map(c => creatureCard(c, regions, base)).join('')}</ul></section>
  <section class="wiki-section"><div class="wiki-section-heading"><h2>Regions</h2>${link(base, 'regions/', 'Browse all regions')}</div>
    <p>The trail through Sunnyside Backyard leads to Jungle Wilds, then branches into water, mountain, and sky routes.</p></section>`;
  add('', base, 'Game wiki', "The official player reference for eggs, guardians, creatures, and regions in That's my Egg!", home, {
    intro: "Player guides and an illustrated reference for the world of That's my Egg!"
  });

  base = '../../';
  add('search/', base, 'Search the wiki', 'Find creatures, regions, and player guides.', searchContents(data, regions, base), {search: false});
  add('guides/', base, 'Player guides', 'Learn how to get your first egg, escape guardians, and care for pets.', guideCards(data, base));
  add('creatures/', base, 'Creatures', 'Browse the illustrated creature directory.', `<ul class="wiki-creature-grid">${
    data.creatures.map(c => creatureCard(c, regions, base)).join('')
  }</ul>`, {intro: `${data.creatures.length} illustrated profiles. Browse by name or use wiki search to find a species by its animal combination.`});

  const routes = [...new Set(data.regions.map(r => r.route))];
  add('regions/', base, 'Regions', "Explore Home and the biomes of That's my Egg!",
    routes.map((route, i) => `<section class="wiki-section" id="route-${i}"><h2>${e(route)}</h2>
      <ul class="wiki-topic-list">${data.regions.filter(r => r.route === route).map(r =>
        `<li>${link(base, regionPath(r), r.name)}<p>${e(r.description)}</p></li>`
      ).join('')}</ul></section>`).join(''),
    {intro: `Home and ${data.regions.length - 1} biomes, grouped by travel route.`, outline: routes.map((r, i) => [`route-${i}`, r])});

  base = '../../../';
  for (const creature of data.creatures) {
    const region = regions.get(creature.region);
    const guardian = region.guardian === creature.name ? [['Role', 'Regional guardian']] : [];
    const body = `<div class="wiki-profile">
      <p class="wiki-lead">${e(creature.description)}</p>
      <aside class="wiki-infobox" aria-label="${e(creature.name)} facts">
        <figure><img src="${base}wiki-assets/${creature.image}" width="512" height="512" alt="${e(creature.name)}">
        <figcaption>Creature artwork</figcaption></figure>
        ${facts([['Region', link(base, regionPath(region), region.name)], ['Animal combination', e(creature.animalCombination)], ...guardian])}
      </aside>
      <section class="wiki-section"><h2>Related pages</h2>${related([
        link(base, regionPath(region), region.name),
        link(base, 'guides/eggs-and-hatching/', 'Eggs and hatching'),
        link(base, 'guides/pets-and-gardens/', 'Pets and gardens')
      ])}</section>
    </div>`;
    add(creaturePath(creature), base, creature.name, creature.description, body, {
      section: 'creatures/', crumb: [link(base, 'creatures/', 'Creatures')]
    });
  }

  for (const guide of data.guides) {
    const sections = guide.sections.map((section, i) => [`section-${i + 1}`, section.title]);
    const body = guide.sections.map((section, i) => `<section class="wiki-section" id="${sections[i][0]}">
      <h2>${e(section.title)}</h2>${section.paragraphs.map(p => `<p>${e(p)}</p>`).join('')}
      ${section.steps ? `<ol class="wiki-steps">${section.steps.map(s => `<li>${e(s)}</li>`).join('')}</ol>` : ''}
    </section>`).join('') + `<section class="wiki-section"><h2>Related guides</h2>${related(data.guides.filter(g =>
      g.slug !== guide.slug
    ).map(g => link(base, guidePath(g), g.title)))}</section>`;
    add(guidePath(guide), base, guide.title, guide.summary, body, {
      section: 'guides/', crumb: [link(base, 'guides/', 'Player guides')], outline: sections, intro: guide.summary
    });
  }

  for (const region of data.regions) {
    const creatures = data.creatures.filter(c => c.region === region.id);
    const roster = region.previewRoster?.map(name => {
      const profile = creatures.find(c => c.name === name);
      return `<li>${profile ? link(base, creaturePath(profile), name) : e(name)}</li>`;
    }).join('');
    const guardian = creatures.find(c => c.name === region.guardian);
    const notes = [['Route', e(region.route)]];
    if (guardian) notes.push(['Guardian', link(base, creaturePath(guardian), guardian.name)]);
    const body = `${facts(notes)}
      ${roster ? `<section class="wiki-section"><h2>Egg pool in the development build</h2><ul>${roster}</ul></section>` : ''}
      ${region.id === 'home' ? `<section class="wiki-section"><h2>Your garden and collection</h2>${guideCards(data, base)}</section>` : ''}
      ${creatures.length ? `<section class="wiki-section"><h2>Creature profiles</h2><ul class="wiki-creature-grid">${
        creatures.map(c => creatureCard(c, regions, base)).join('')
      }</ul></section>` : ''}
      <section class="wiki-section"><h2>Related pages</h2>${related([
        link(base, 'regions/', 'All regions'), link(base, 'creatures/', 'Creature directory'),
        link(base, 'guides/guardians-and-escapes/', 'Guardians and escapes')
      ])}</section>`;
    add(regionPath(region), base, region.name, region.description, body, {
      section: 'regions/', crumb: [link(base, 'regions/', 'Regions')], intro: region.description
    });
  }
  return entries;
}

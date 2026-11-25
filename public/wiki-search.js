const form = document.querySelector('[data-wiki-search]');
const query = form.elements.q;
const kind = form.elements.type;
const status = document.querySelector('.wiki-search-count');
const list = document.querySelector('.wiki-search-results');
const normalize = value => value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const entries = [...list.children].map(element => ({
  element,
  type: element.dataset.type,
  title: normalize(element.querySelector('a').textContent),
  text: normalize(`${element.textContent} ${element.dataset.terms}`)
}));

function render() {
  const phrase = normalize(query.value);
  const terms = phrase ? phrase.split(' ') : [];
  const matches = [];
  for (const entry of entries) {
    const visible = (!kind.value || entry.type === kind.value) && terms.every(term => entry.text.includes(term));
    entry.element.hidden = !visible;
    if (visible) matches.push(entry);
  }
  matches.sort((a, b) => {
    if (!phrase) return 0;
    const rank = entry => entry.title === phrase ? 0 : entry.title.startsWith(phrase) ? 1 : entry.title.includes(phrase) ? 2 : 3;
    return rank(a) - rank(b);
  });
  for (const entry of matches) list.append(entry.element);
  status.textContent = matches.length ?
    `${matches.length} ${matches.length === 1 ? 'page' : 'pages'}${phrase || kind.value ? ' found' : ''}.` :
    'No pages found. Try another term or choose All pages.';
}

const params = new URLSearchParams(location.search);
query.value = (params.get('q') ?? '').slice(0, query.maxLength);
kind.value = params.get('type') ?? '';
if (kind.selectedIndex < 0) kind.selectedIndex = 0;
function update() {
  const url = new URL(location.href);
  for (const input of [query, kind]) {
    if (input.value) url.searchParams.set(input.name, input.value);
    else url.searchParams.delete(input.name);
  }
  history.replaceState(null, '', url);
  render();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  update();
});
query.addEventListener('input', update);
kind.addEventListener('change', update);
render();

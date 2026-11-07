export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHtml;
const game = 'https://www.roblox.com/games/106981925573714/';
export const formatDate = value => new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:'Australia/Brisbane'}).format(new Date(`${value}T12:00:00+10:00`));

function header(base, current) {
  const nav = (label, href, key) => `<a class="nav-${key}" href="${href}"${current===key?' aria-current="page"':''}>${label}</a>`;
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">
    <a class="brand" href="${base}index.html" aria-label="That's my Egg! home"><img src="${base}assets/logo.png" width="510" height="248" alt="That's my Egg!"></a>
    <nav aria-label="Main navigation">
      ${nav('Home',`${base}index.html`,'home')}
      ${nav('News',`${base}updates/index.html`,'news')}
      ${nav('Wiki',`${base}wiki/index.html`,'wiki')}
      ${nav('About the game',`${base}index.html#about`,'about')}
      ${nav('Report a bug',`${base}report-bug/index.html`,'report')}
      ${nav('Early playtest',`${base}playtest/index.html`,'playtest')}
    </nav>
    <a class="button small" href="${game}" target="_blank" rel="noopener">View on Roblox <span aria-hidden="true">↗</span></a>
  </div></header>`;
}
function footer(base) {
  return `<footer class="site-footer"><div class="footer-inner"><div class="footer-brand"><img src="${base}assets/logo.png" width="510" height="248" alt="That's my Egg!"><p>A Roblox game by Orchard Studios.<br>Currently under development.</p></div><nav aria-label="Footer navigation"><a href="${base}updates/index.html">Development news</a><a href="${base}wiki/index.html">Creature wiki</a><a href="${base}playtest/index.html">Early playtester signup</a><a href="${base}feed.xml">RSS feed</a><a href="${base}report-bug/index.html">Report a bug</a><a href="${game}" target="_blank" rel="noopener">Roblox game page</a></nav></div><div class="footer-legal"><span>© 2026 Orchard Studios</span></div></footer>`;
}
export function page(title, description, path, body, base='./', image='world.jpg') {
  const current=path===''?'home':path.startsWith('updates/')?'news':path.startsWith('playtest/')?'playtest':path.startsWith('wiki/')?'wiki':path.startsWith('report-bug/')?'report':'';
  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#171c22">
  <title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="https://thatsmyegg.com/${path}">
  <meta property="og:type" content="${path.startsWith('updates/')&&path!=='updates/'?'article':'website'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="https://thatsmyegg.com/${path}"><meta property="og:image" content="https://thatsmyegg.com/assets/${e(image)}"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="${base}assets/favicon.png"><link rel="alternate" type="application/rss+xml" title="That's my Egg! development news" href="${base}feed.xml"><link rel="stylesheet" href="${base}site.css">
  </head><body>${header(base,current)}<main id="main">${body}</main>${footer(base)}</body></html>`;
}
export function postCard(post, base='./') {
  return `<article class="news-post"><a class="post-image" href="${base}updates/${post.slug}/index.html" tabindex="-1" aria-hidden="true"><img src="${base}assets/${e(post.image)}" alt="" width="1664" height="936" loading="lazy"></a><div class="post-copy"><div class="post-meta"><span>${e(post.category)}</span><time datetime="${post.date}">${formatDate(post.date)}</time></div><h2><a href="${base}updates/${post.slug}/index.html">${e(post.title)}</a></h2><p>${e(post.summary)}</p><a class="text-link" href="${base}updates/${post.slug}/index.html">Read post <span aria-hidden="true">→</span></a></div></article>`;
}
export function home(posts, gallery) {
  return `<section class="hero" aria-label="That's my Egg!">
    <img class="hero-scene" src="assets/world.jpg" width="1664" height="936" alt="Labraduck chasing a player carrying an egg, with other creatures in the world" fetchpriority="high">
    <div class="hero-inner"><h1><img src="assets/logo-hero.png" width="1020" height="496" alt="That's my Egg!"></h1></div>
    <div class="hero-bottom"><div class="hero-summary"><p class="platform">A ROBLOX GAME</p><p>Steal eggs. Escape the guardians.<br>Hatch your own creature collection.</p></div><a class="button" href="${game}" target="_blank" rel="noopener">View on Roblox <span aria-hidden="true">↗</span></a></div>
  </section>
  <aside class="development-bar"><div><strong>IN DEVELOPMENT</strong><p>The game is still being built and tested. No release date has been announced.</p><a href="playtest/index.html">Join the early playtest <span aria-hidden="true">→</span></a></div></aside>
  <div class="content-width main-content"><section class="news-section" id="news"><div class="section-title"><h2>Latest news</h2><a href="updates/index.html">All posts <span aria-hidden="true">→</span></a></div><div class="news-layout"><div class="news-list">${posts.slice(0,3).map(p=>postCard(p)).join('')}</div><aside class="game-status"><h3>Development updates</h3><p>Updates every four days about new creatures and work on the game.</p><dl><div><dt>Status</dt><dd>In development</dd></div><div><dt>Platform</dt><dd>Roblox</dd></div><div><dt>Release date</dt><dd>To be announced</dd></div></dl><a class="text-link" href="feed.xml">Subscribe via RSS <span aria-hidden="true">→</span></a></aside></div></section>
  <section class="about-section" id="about"><div class="about-copy"><h2>About the game</h2><p>That's my Egg! is a creature-collecting game on Roblox. Head out from Home, take an egg, and get back before its guardian catches you.</p><p>Bring eggs home to hatch, build your collection, and explore further into the world. We're developing the creatures, regions, and game systems together.</p><p class="muted">Features, designs, and balance will change during development.</p></div><div class="guardian-feature"><div class="guardian-image"><img src="assets/labraduck.png" width="512" height="512" alt="Labraduck, a golden feathered guardian with hanging ears and an orange bill" loading="lazy"></div><div><p class="label">BACKYARD GUARDIAN</p><h3>Labraduck</h3><p>The first guardian you'll meet. Those eggs aren't going anywhere without a chase.</p><p class="combination">Animal combination: Labrador + Duck</p><span class="media-type">Creature concept art</span></div></div></section>
  <section class="gallery-section" id="screenshots"><div class="section-title"><h2>From development</h2><p>Studio captures. Work in progress.</p></div><div class="media-grid">${gallery.map(item=>`<figure><a href="assets/${e(item.file)}" target="_blank" rel="noopener" aria-label="View full image: ${e(item.title)}"><img src="assets/${e(item.file)}" alt="${e(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy"></a><figcaption><strong>${e(item.title)}</strong><span>${e(item.caption)}</span></figcaption></figure>`).join('')}</div></section></div>`;
}
export function archive(posts) {
  return `<div class="content-width archive"><div class="page-heading"><p class="label">THAT'S MY EGG!</p><h1>Development news</h1><p>Progress updates, new creatures, and changes to the game.</p></div><div class="news-layout"><section aria-label="Development posts">${posts.map(p=>postCard(p,'../')).join('')}</section><aside class="game-status"><h2>Follow development</h2><p>The game is under development. These posts cover work in progress, rather than a finished release.</p><a class="text-link" href="../feed.xml">Subscribe via RSS <span aria-hidden="true">→</span></a></aside></div></div>`;
}
export function article(post) {
  const photo=(image,alt,caption,lazy=true)=>`<figure><img src="../../assets/${e(image)}" alt="${e(alt)}" width="1200" height="800"${lazy?' loading="lazy"':''}>${caption?`<figcaption>${e(caption)}</figcaption>`:''}</figure>`;
  return `<article class="article"><a class="text-link" href="../index.html">← All development news</a><header class="article-header"><div class="post-meta"><span>${e(post.category)}</span><time datetime="${post.date}">${formatDate(post.date)}</time></div><h1>${e(post.title)}</h1><p class="article-summary">${e(post.summary)}</p></header>${photo(post.image,post.imageAlt,post.imageCaption,false)}${post.sections.map(s=>`<section><h2>${e(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}${s.image?photo(s.image,s.imageAlt,s.imageCaption):''}</section>`).join('')}<aside class="article-notice">That's my Egg! is under development. Features and artwork may change before release.</aside><a class="text-link" href="../index.html">← All development news</a></article>`;
}

import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,dirname} from 'node:path';
import {page,home,archive,article,escapeHtml as e} from './layout.mjs';
import {playtest} from './playtest-layout.mjs';
import {wikiPages} from './public-wiki.mjs';
import {reportBody} from './report-layout.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'dist');
const origin='https://thatsmyegg.com';
const posts=JSON.parse(await readFile(resolve(root,'content/posts.json'),'utf8'));
const gallery=JSON.parse(await readFile(resolve(root,'content/gallery.json'),'utf8'));
const seen=new Set();
for(const post of posts){
  if(!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(post.slug)||seen.has(post.slug))throw Error('Invalid or duplicate post slug');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(post.date)||Number.isNaN(Date.parse(post.date)))throw Error('Invalid post date');
  if(![post.title,post.summary,post.category].every(x=>typeof x==='string'&&x.trim()))throw Error('Incomplete post');
  seen.add(post.slug);
}
if(!posts.length)throw Error('At least one post is required');
posts.sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
if(!out.startsWith(resolve(root)+sep))throw Error('Output must stay inside the website checkout');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(resolve(root,'public'),out,{recursive:true});
const wiki=await wikiPages(page);
for(const entry of wiki){await mkdir(dirname(resolve(out,entry.path)),{recursive:true});await writeFile(resolve(out,entry.path),entry.html);}
await writeFile(resolve(out,'index.html'),page("That's my Egg! | Roblox game in development","Steal eggs, escape guardians, and collect creatures in That's my Egg!, a Roblox game under development. Read development news and see Studio previews.",'',home(posts,gallery)));
await mkdir(resolve(out,'updates'),{recursive:true});
await writeFile(resolve(out,'updates/index.html'),page("Development news | That's my Egg!","Development updates, new creatures, and work in progress on That's my Egg!.",'updates/',archive(posts),'../'));
await mkdir(resolve(out,'playtest'),{recursive:true});
await writeFile(resolve(out,'playtest/index.html'),page("Early playtester signup | That's my Egg!","Join Orchard Studios' early playtester list for That's my Egg!. Enter your Roblox username to sign up.",'playtest/',playtest(),'../'));
await writeFile(resolve(out,'report-bug/index.html'),page("Report a bug | That's my Egg!","Report a problem to Orchard Studios. Add a screenshot and point out what went wrong.",'report-bug/',await reportBody(),'../'));
for(const post of posts){
  const folder=resolve(out,'updates',post.slug);
  await mkdir(folder,{recursive:true});
  await writeFile(resolve(folder,'index.html'),page(`${post.title} | That's my Egg!`,post.summary,`updates/${post.slug}/`,article(post),'../../',post.image));
}
await writeFile(resolve(out,'feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>That's my Egg! development news</title><link>${origin}/</link><description>Development news from That's my Egg!, a Roblox game in development.</description><language>en-AU</language>${posts.map(p=>`<item><title>${e(p.title)}</title><link>${origin}/updates/${p.slug}/</link><guid>${origin}/updates/${p.slug}/</guid><pubDate>${new Date(`${p.date}T12:00:00+10:00`).toUTCString()}</pubDate><description>${e(p.summary)}</description></item>`).join('')}</channel></rss>`);
await writeFile(resolve(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','updates/','playtest/','report-bug/',...wiki.map(x=>x.url),...posts.map(p=>`updates/${p.slug}/`)].map(path=>`<url><loc>${origin}/${path}</loc></url>`).join('')}</urlset>`);
await writeFile(resolve(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(resolve(out,'CNAME'),'thatsmyegg.com\n');
await writeFile(resolve(out,'.nojekyll'),'');
await writeFile(resolve(out,'404.html'),page("Page not found | That's my Egg!",'This page could not be found.','404.html','<section class="content-width error-page"><h1>Page not found</h1><p>The page may have moved, or the link may be incorrect.</p><a class="button" href="/">Back to home</a></section>','/'));
console.log(`Built homepage, news archive, ${posts.length} post(s), RSS, sitemap, and domain configuration.`);

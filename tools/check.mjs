import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=resolve(root,'dist');
let pages=0,links=0;
async function walk(folder){for(const e of await readdir(folder,{withFileTypes:true})){
  const path=resolve(folder,e.name);if(e.isDirectory()){await walk(path);continue;}
  if(!['.html','.css','.xml','.txt','.json','.mjs','.md','.yml'].includes(extname(path)))continue;
  const text=await readFile(path,'utf8');
  if(/[\u2013\u2014]/u.test(text))throw Error(`Prohibited dash in ${path}`);
  if(extname(path)==='.html'){
    pages++;
    for(const [,raw] of text.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(/^(?:https?:|mailto:|data:|#)/.test(raw))continue;
      const target=raw.split(/[?#]/)[0];
      const dest=target.startsWith('/')?resolve(dist,'.'+target):resolve(dirname(path),target);
      await stat(dest);links++;
    }
    if(!text.includes('<h1>')&&!text.includes('<h1 '))throw Error(`Missing h1: ${path}`);
  }
}}
await walk(dist);
await walk(resolve(root,'content'));
console.log(`Checked ${pages} HTML pages, ${links} local references, and final text for prohibited dashes.`);

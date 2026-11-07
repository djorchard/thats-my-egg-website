import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHandler} from '../worker/index.mjs';
function fixture({proof={},account={id:4347970672,name:'OrchardStudios'},dbFails=false}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../worker/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let values=[];return{bind(...v){values=v;return this;},async run(){if(dbFails)throw Error('database unavailable');return sqlite.prepare(sql).run(...values);},async first(){return sqlite.prepare(sql).get(...values);},async all(){return{results:sqlite.prepare(sql).all(...values)};}};}};
 const env={DB,TURNSTILE_SECRET:'test-secret',ADMIN_TOKEN:'private-developer-test-key',SIGNUP_LIMITER:{limit:async()=>({success:true})}};
 const handler=createHandler(async url=>url.includes('siteverify')?Response.json({success:true,hostname:'thatsmyegg.com',action:'playtest',...proof}):Response.json({data:account?[account]:[]}));
 const signup=(body={username:'OrchardStudios',token:'test-proof'},origin='https://thatsmyegg.com')=>handler.fetch(new Request('https://api.example/signup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
 return{sqlite,env,handler,signup};
}
test('successful signup is durable and repeat requests create one row',async()=>{const f=fixture();const a=await f.signup();assert.equal(a.status,201);assert.equal((await a.json()).saved,true);await f.signup({username:'orchardstudios',token:'another'});assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM playtesters').get().n,1);assert.equal(f.sqlite.prepare('SELECT username FROM playtesters').get().username,'OrchardStudios');});
test('no confirmation on failed database write',async()=>{const f=fixture({dbFails:true});const r=await f.signup();assert.equal(r.status,503);assert.equal((await r.json()).saved,undefined);});
test('unknown Roblox account does not enter the list',async()=>{const f=fixture({account:null});assert.equal((await f.signup()).status,400);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM playtesters').get().n,0);});
test('invalid names are rejected',async()=>{const f=fixture();assert.equal((await f.signup({username:'Display Name',token:'x'})).status,400);});
test('disallowed website cannot submit or receive CORS permission',async()=>{const f=fixture();const r=await f.signup(undefined,'https://attacker.example');assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);});
test('verification must be successful and tied to our domain and action',async()=>{for(const proof of [{success:false},{hostname:'attacker.example'},{action:'report'}]){const f=fixture({proof});assert.equal((await f.signup()).status,400);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM playtesters').get().n,0);}});
test('rate limit fails before external validation or insert',async()=>{const f=fixture();f.env.SIGNUP_LIMITER.limit=async()=>({success:false});assert.equal((await f.signup()).status,429);});
test('private list requires developer authentication',async()=>{const f=fixture();await f.signup();assert.equal((await f.handler.fetch(new Request('https://api.example/admin/signups'),f.env)).status,401);const r=await f.handler.fetch(new Request('https://api.example/admin/signups',{headers:{Authorization:'Bearer private-developer-test-key'}}),f.env);assert.equal(r.status,200);assert.equal((await r.json()).signups.length,1);});
test('unconfigured service fails closed',async()=>{const f=fixture();delete f.env.TURNSTILE_SECRET;assert.equal((await f.signup()).status,503);});

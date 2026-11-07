class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const origins=new Set(['https://thatsmyegg.com','https://www.thatsmyegg.com']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
async function readJson(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'Please submit the signup form.');
  if(Number(request.headers.get('Content-Length'))>4096)throw new HttpError(413,'The signup is too large.');
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Enter your Roblox username.');
  let size=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new HttpError(413,'The signup is too large.');}parts.push(value);}
  try{return JSON.parse(await new Blob(parts).text());}catch{throw new HttpError(400,'Please submit the signup form again.');}
}
async function equalSecret(actual,expected){
  if(!expected)return false;
  const hash=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [a,b]=await Promise.all([hash(actual),hash(expected)]);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];return mismatch===0;
}
export function createHandler(fetcher=fetch){
  return {async fetch(request,env){
    const origin=request.headers.get('Origin');let response;
    try{
      const url=new URL(request.url);
      if(url.pathname==='/health'&&request.method==='GET')response=json({service:'Orchard Studios playtester signup',ready:Boolean(env.DB&&env.TURNSTILE_SECRET&&env.ADMIN_TOKEN&&env.SIGNUP_LIMITER)});
      else if(url.pathname==='/admin/signups'&&request.method==='GET'){
        if(!await equalSecret(request.headers.get('Authorization')||'',`Bearer ${env.ADMIN_TOKEN||''}`)||!env.ADMIN_TOKEN)throw new HttpError(401,'Developer access required.');
        const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)throw new HttpError(400,'Invalid cursor.');
        const rows=await env.DB.prepare('SELECT roblox_user_id, username, signed_up_at, status FROM playtesters WHERE roblox_user_id > ? ORDER BY roblox_user_id LIMIT 100').bind(after).all();
        response=json({signups:rows.results,nextCursor:rows.results.at(-1)?.roblox_user_id||after});
      }else if(url.pathname==='/signup'&&['POST','OPTIONS'].includes(request.method)){
        if(!origins.has(origin))throw new HttpError(403,'This website cannot submit signups.');
        if(request.method==='OPTIONS')response=new Response(null,{status:204});
        else{
          if(!env.DB||!env.TURNSTILE_SECRET||!env.ADMIN_TOKEN||!env.SIGNUP_LIMITER)throw new HttpError(503,'Signup is temporarily unavailable. Please try again later.');
          if(!(await env.SIGNUP_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)throw new HttpError(429,'Please wait a minute before trying again.');
          const body=await readJson(request);const username=typeof body?.username==='string'?body.username.trim():'';
          if(!/^[A-Za-z0-9_]{3,20}$/.test(username))throw new HttpError(400,'Enter your Roblox username using 3 to 20 letters, numbers, or underscores.');
          if(typeof body.token!=='string'||!body.token||body.token.length>2048)throw new HttpError(400,'Please complete verification and try again.');
          const verify=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:body.token,remoteip:request.headers.get('CF-Connecting-IP')||''}),signal:AbortSignal.timeout(10000)});
          if(!verify.ok)throw new HttpError(503,'Verification is temporarily unavailable. Please try again.');
          const proof=await verify.json();
          if(!proof.success||proof.action!=='playtest'||!['thatsmyegg.com','www.thatsmyegg.com'].includes(proof.hostname))throw new HttpError(400,'Verification expired. Please verify again.');
          const lookup=await fetcher('https://users.roblox.com/v1/usernames/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernames:[username],excludeBannedUsers:true}),signal:AbortSignal.timeout(10000)});
          if(!lookup.ok)throw new HttpError(503,'Roblox is temporarily unavailable. Please try again later.');
          const account=(await lookup.json()).data?.[0];
          if(!account||!Number.isSafeInteger(account.id)||account.id<=0||typeof account.name!=='string')throw new HttpError(400,'We could not find that Roblox username. Check the username rather than the display name.');
          await env.DB.prepare('INSERT INTO playtesters (roblox_user_id, username, signed_up_at) VALUES (?, ?, ?) ON CONFLICT(roblox_user_id) DO NOTHING').bind(account.id,account.name,new Date().toISOString()).run();
          const saved=await env.DB.prepare('SELECT roblox_user_id, username FROM playtesters WHERE roblox_user_id = ?').bind(account.id).first();
          if(!saved)throw new HttpError(503,'We could not confirm your signup. Please try again.');
          response=json({saved:true,username:saved.username},201);
        }
      }else throw new HttpError(404,'Not found.');
    }catch(error){response=json({error:error instanceof HttpError?error.message:'We could not save your signup. Please try again.'},error instanceof HttpError?error.status:503);}
    const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Vary','Origin');
    if(origins.has(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');}
    return new Response(response.body,{status:response.status,headers});
  }};
}
export default createHandler();

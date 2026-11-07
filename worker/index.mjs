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
  return {
  async scheduled(_event,env,ctx){ctx.waitUntil(flushNotifications(env));},
  async fetch(request,env,ctx){
    const origin=request.headers.get('Origin');let response;
    try{
      const url=new URL(request.url);
      if(url.pathname==='/health'&&request.method==='GET')response=json({service:'Orchard Studios playtester signup',version:'username-signup-v2',ready:Boolean(env.DB&&env.TURNSTILE_SECRET&&env.ADMIN_TOKEN&&env.SIGNUP_LIMITER),notificationsConfigured:notificationsReady(env)});
      else if(url.pathname==='/admin/notifications/test'&&request.method==='POST'){
        if(!await equalSecret(request.headers.get('Authorization')||'',`Bearer ${env.ADMIN_TOKEN||''}`)||!env.ADMIN_TOKEN)throw new HttpError(401,'Developer access required.');
        if(!notificationsReady(env))throw new HttpError(503,'Email notifications are not configured.');
        try{
          const result=await env.SIGNUP_EMAIL.send({from:env.SIGNUP_NOTIFY_FROM,to:env.SIGNUP_NOTIFY_TO,subject:"That's my Egg! signup email test",text:'This confirms the Orchard Studios playtester notification email path. This is a setup test, not a new playtester signup.'});
          response=json({accepted:true,messageId:typeof result?.messageId==='string'?result.messageId:null},201);
        }catch(error){
          const code=typeof error?.code==='string'&&/^E_[A-Z_]+$/.test(error.code)?error.code:'EMAIL_SEND_FAILED';
          response=json({accepted:false,error:code},502);
        }
      }
      else if(url.pathname==='/admin/signups'&&request.method==='GET'){
        if(!await equalSecret(request.headers.get('Authorization')||'',`Bearer ${env.ADMIN_TOKEN||''}`)||!env.ADMIN_TOKEN)throw new HttpError(401,'Developer access required.');
        const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)throw new HttpError(400,'Invalid cursor.');
        const rows=await env.DB.prepare('SELECT signup_id, roblox_user_id, username, signed_up_at, status, notification_state FROM playtester_signups WHERE signup_id > ? ORDER BY signup_id LIMIT 100').bind(after).all();
        response=json({signups:rows.results,nextCursor:rows.results.at(-1)?.signup_id||after,cursorVersion:2,identityValidation:'username_format_only'});
      }else if(url.pathname==='/admin/summary'&&request.method==='GET'){
        if(!await equalSecret(request.headers.get('Authorization')||'',`Bearer ${env.ADMIN_TOKEN||''}`)||!env.ADMIN_TOKEN)throw new HttpError(401,'Developer access required.');
        const rows=await env.DB.prepare('SELECT notification_state, COUNT(*) AS count FROM playtester_signups GROUP BY notification_state').all();
        response=json({total:rows.results.reduce((sum,row)=>sum+row.count,0),notifications:rows.results});
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
          const inserted=await env.DB.prepare('INSERT INTO playtester_signups (username, signed_up_at) VALUES (?, ?) ON CONFLICT(username) DO NOTHING').bind(username,new Date().toISOString()).run();
          const saved=await env.DB.prepare('SELECT signup_id, username FROM playtester_signups WHERE username = ? COLLATE NOCASE').bind(username).first();
          if(!saved)throw new HttpError(503,'We could not confirm your signup. Please try again.');
          // Confirm the durable save first. Email failures never turn a saved
          // signup into an error or a second notification on a browser retry.
          const notify=()=>sendNotification(env,saved.signup_id).catch(()=>{});
          if(ctx?.waitUntil)ctx.waitUntil(notify());
          else await notify();
          const isNew=Number(inserted.meta?.changes??inserted.changes)>0;
          response=json({saved:true,username:saved.username},isNew?201:200);
        }
      }else throw new HttpError(404,'Not found.');
    }catch(error){response=json({error:error instanceof HttpError?error.message:'We could not save your signup. Please try again.'},error instanceof HttpError?error.status:503);}
    const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Vary','Origin');
    if(origins.has(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');}
    return new Response(response.body,{status:response.status,headers});
  }};
}
function notificationsReady(env){return Boolean(env.SIGNUP_EMAIL&&env.SIGNUP_NOTIFY_TO&&env.SIGNUP_NOTIFY_FROM);}
export async function sendNotification(env,id){
  if(!notificationsReady(env))return;
  const row=await env.DB.prepare('SELECT signup_id, username, signed_up_at, notification_state FROM playtester_signups WHERE signup_id = ?').bind(id).first();
  if(!row||row.notification_state!=='pending')return;
  const claim=await env.DB.prepare("UPDATE playtester_signups SET notification_state = 'sending', notification_attempted_at = ?, notification_error_code = NULL WHERE signup_id = ? AND notification_state = 'pending'").bind(new Date().toISOString(),id).run();
  if(Number(claim.meta?.changes??claim.changes)!==1)return;
  let sent;
  try{
    sent=await env.SIGNUP_EMAIL.send({
      from:env.SIGNUP_NOTIFY_FROM,
      to:env.SIGNUP_NOTIFY_TO,
      subject:`New That's my Egg! playtester: ${row.username}`,
      text:`${row.username} joined the early playtester list.\n\nRoblox username: ${row.username}\nSigned up: ${row.signed_up_at}\nSignup reference: TME-PLAYTEST-${row.signup_id}\n\nThe username was submitted by the visitor and checked for format. It has not been authenticated with Roblox. They have been told to look for a friend request from OrchardStudios.\n\nOrchard Studios`
    });
  }catch(error){
    // Named validation/configuration failures are definite rejections. Unknown
    // outcomes need review rather than an automatic send that could duplicate.
    const code=typeof error?.code==='string'&&/^E_[A-Z_]+$/.test(error.code)?error.code:'UNKNOWN_SEND_OUTCOME';
    const state=['E_SENDER_NOT_VERIFIED','E_SENDER_DOMAIN_NOT_AVAILABLE','E_SENDER_DOMAIN_NOT_CONFIGURED','E_RECIPIENT_NOT_ALLOWED','E_RECIPIENT_NOT_VERIFIED','E_RECIPIENT_SUPPRESSED','E_ACCOUNT_SUSPENDED','E_VALIDATION_ERROR','E_FIELD_MISSING'].includes(code)?'failed':'uncertain';
    await env.DB.prepare('UPDATE playtester_signups SET notification_state = ?, notification_error_code = ? WHERE signup_id = ? AND notification_state = ?').bind(state,code,id,'sending').run();
    return;
  }
  // If recording this receipt fails, the row stays 'sending'. We never replay
  // that uncertain outcome automatically, preserving one message per signup.
  await env.DB.prepare("UPDATE playtester_signups SET notification_state = 'sent', notification_sent_at = ?, notification_message_id = ? WHERE signup_id = ? AND notification_state = 'sending'").bind(new Date().toISOString(),typeof sent?.messageId==='string'?sent.messageId:null,id).run();
}
export async function flushNotifications(env){
  if(!notificationsReady(env))return;
  const rows=await env.DB.prepare("SELECT signup_id FROM playtester_signups WHERE notification_state = 'pending' ORDER BY signup_id LIMIT 5").all();
  for(const row of rows.results)await sendNotification(env,row.signup_id);
}
export default createHandler();

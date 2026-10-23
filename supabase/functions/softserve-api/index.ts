import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {verifyReplay,ENGINE} from './verify.mjs';
const sb=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://kai-da-wang.github.io','https://soft-serve-stack-kai.imjusttrying341.chatgpt.site']);
const validSkins={vanilla:0,strawberry:50,matcha:100,cocoa:200,taro:350,aurora:500};
const encoder=new TextEncoder();
const day=()=>new Date(Date.now()+28800000).toISOString().slice(0,10);
const str=(x)=>typeof x==='string'?x:'';
const fail=(status,error,message=error)=>Response.json({error,message},{status});
function raiseDb(error){if(error)throw new Error(error.message||'database error')}
async function getPlayer(id){const {data,error}=await sb.from('ss_players').select('id,nickname,best_score,skin').eq('id',id).maybeSingle();raiseDb(error);if(data)return data;const tail=id.slice(-4).toUpperCase();const {error:created}=await sb.from('ss_players').upsert({id,nickname:'奶油玩家'+tail},{onConflict:'id',ignoreDuplicates:true});raiseDb(created);const result=await sb.from('ss_players').select('id,nickname,best_score,skin').eq('id',id).single();raiseDb(result.error);return result.data;}
function publicProfile(p){return {nickname:p.nickname,bestScore:p.best_score,skin:p.skin}}
async function handler(req){const origin=req.headers.get('Origin'),h={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin'};if(origin&&origins.has(origin))h['Access-Control-Allow-Origin']=origin;
const reply=(data,status=200)=>Response.json(data,{status,headers:h});
if(origin&&!origins.has(origin))return reply({error:'origin'},403);
if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});
const url=new URL(req.url),path=url.pathname.slice(url.pathname.indexOf('/api/'));
const match=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('Authorization')||'');if(req.headers.has('Authorization')&&!match)return reply({error:'invalid_identity'},401);
let id=null;if(match){const hash=await crypto.subtle.digest('SHA-256',encoder.encode(match[1]));id='guest_'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
try{
if(path==='/api/health'&&req.method==='GET')return reply({ok:true,engine:ENGINE,guestIdentity:true,backend:'independent'});
if(path==='/api/leaderboard'&&req.method==='GET'){const {data,error}=await sb.rpc('ss_board',{p_period:url.searchParams.get('period')==='daily'?'daily':'all',p_player:id});raiseDb(error);return reply(data)}
if(path==='/api/profile'&&req.method==='GET')return reply(id?{signedIn:true,profile:publicProfile(await getPlayer(id))}:{signedIn:false,profile:null});
if(!id)return reply({error:'sign_in_required',message:'请刷新后重试。'},401);
if(path==='/api/profile'&&req.method==='PATCH'){
 const input=await req.json(),p=await getPlayer(id),updates={};
 if(input.nickname!==undefined){if(typeof input.nickname!=='string')return reply({error:'nickname',message:'昵称请使用 1–12 个字。'},400);const name=input.nickname.trim().replace(/\s+/g,' ');if([...name].length<1||[...name].length>12||/[\u0000-\u001f\u007f<>]/u.test(name))return reply({error:'nickname',message:'昵称请使用 1–12 个字。'},400);updates.nickname=name;}
 if(input.skin!==undefined){if(!(input.skin in validSkins)||p.best_score<validSkins[input.skin])return reply({error:'skin_locked',message:'达到对应分数后即可解锁。'},403);updates.skin=input.skin;}
 if(Object.keys(updates).length){const {error}=await sb.from('ss_players').update(updates).eq('id',id);raiseDb(error)}
 return reply({profile:publicProfile(await getPlayer(id))});
}
if(path==='/api/runs'&&req.method==='POST'){
 await getPlayer(id);const {count,error}=await sb.from('ss_runs').select('id',{count:'exact',head:true}).eq('player_id',id).gte('started_at',new Date(Date.now()-60000).toISOString());raiseDb(error);
 if(count>35)return reply({error:'too_many',message:'稍等一下，再来一支。'},429);
 const {data,error:insertError}=await sb.from('ss_runs').insert({player_id:id}).select('id').single();raiseDb(insertError);
 return reply({runId:data.id,engine:ENGINE},201);
}
const runMatch=/^\/api\/runs\/([0-9a-f-]{36})$/.exec(path);
if(runMatch&&req.method==='POST'){
 const {data:run,error}=await sb.from('ss_runs').select('*').eq('id',runMatch[1]).eq('player_id',id).maybeSingle();raiseDb(error);
 if(!run)return reply({error:'missing_run',message:'这局未能同步，再来一支试试。'},404);
 if(run.completed_at)return reply({score:run.score,day:run.day,profile:publicProfile(await getPlayer(id))});
 const age=Date.now()-new Date(run.started_at).getTime();
 if(age>1200000)return reply({error:'expired_run',message:'这局已过期，再来一支试试。'},400);
 let verified;try{verified=verifyReplay((await req.json()).replay,age)}catch{return reply({error:'invalid_replay',message:'这局成绩未能同步，解锁进度已留在本机。'},400)}
 const {data,error:completed}=await sb.rpc('ss_complete',{p_run:run.id,p_player:id,p_score:verified.score,p_outcome:verified.outcome});raiseDb(error);
 return reply({score:data?.[0]?.score??verified.score,day:data?.[0]?.day??day(),profile:publicProfile(await getPlayer(id))});
}
return reply({error:'not_found'},404)
}catch(e){console.error('softserve api failure',e);return reply({error:'unavailable',message:'排行榜暂时不可用，请重试。'},503)}
}
Deno.serve(handler);

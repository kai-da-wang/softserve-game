import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {recordedRound} from './verification.mjs';
import {dayKey} from '../public/game/progression.js';

// Ephemeral Worker + D1: no production data, listener, or published test users.
const bundle=await build({stdin:{contents:'import {handleGameApi} from "./lib/game/api.ts"; export default {fetch:handleGameApi};',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
try{
  const db=await mf.getD1Database('DB'),schema=await readFile(new URL('../drizzle/0000_adorable_freak.sql',import.meta.url),'utf8');
  for(const statement of schema.split('--> statement-breakpoint'))if(statement.trim())await db.prepare(statement).run();
  const request=async(path,{id,method='GET',body,origin}={})=>{
    const headers={'Content-Type':'application/json'};
    if(id)headers['oai-authenticated-user-id']=id;
    if(origin)headers.Origin=origin;
    const response=await mf.dispatchFetch('https://game.test'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  };
  const ok=async(path,options)=>{const response=await request(path,options);assert(response.status<300,JSON.stringify(response));return response.data;};
  const finish=async(id,replay)=>{
    const run=await ok('/api/runs',{id,method:'POST',body:{}});
    // Advance only this test's elapsed clock; gameplay remains actual shared physics.
    await db.prepare('UPDATE runs SET started_at=? WHERE id=?').bind(Date.now()-replay.steps/60*1000,run.runId).run();
    const result=await ok('/api/runs/'+run.runId,{id,method:'POST',body:{replay,score:999999}});
    return {run,result};
  };
  const mirrorHeaders={'Origin':'https://kai-da-wang.github.io'};
  const mirrored=await mf.dispatchFetch('https://game.test/api/leaderboard',{headers:mirrorHeaders});
  assert.equal(mirrored.headers.get('Access-Control-Allow-Origin'),mirrorHeaders.Origin);
  assert.equal(mirrored.headers.get('Access-Control-Allow-Credentials'),null);
  const untrusted=await mf.dispatchFetch('https://game.test/api/leaderboard',{headers:{Origin:'https://other.test'}});
  assert.equal(untrusted.headers.get('Access-Control-Allow-Origin'),null);
  const preflight=method=>mf.dispatchFetch('https://game.test/api/runs',{method:'OPTIONS',headers:{...mirrorHeaders,'Access-Control-Request-Method':method}});
  assert.equal((await preflight('GET')).status,204);
  assert.equal((await preflight('POST')).status,403);
  assert.deepEqual((await ok('/api/profile')).profile,null);
  assert.equal((await request('/api/runs',{method:'POST',body:{}})).status,401);
  assert.equal((await ok('/api/leaderboard')).entries.length,0);
  const a='test-alice',b='test-bob';
  assert.equal((await ok('/api/profile',{id:a})).profile.bestScore,0);
  await ok('/api/profile',{id:b});
  await ok('/api/profile',{id:a,method:'PATCH',body:{nickname:'奶油一号'}});
  assert.equal((await request('/api/profile',{id:a,method:'PATCH',body:{nickname:'<bad>'}})).status,400);
  assert.equal((await request('/api/profile',{id:a,method:'PATCH',body:{skin:'strawberry'}})).status,403);
  assert.equal((await request('/api/runs',{id:a,method:'POST',body:{},origin:'https://other.test'})).status,403);
  const low=recordedRound({seconds:6}).replay,high=recordedRound({seconds:8}).replay;
  const aRun=await finish(a,high);assert.equal(aRun.result.score,51);
  await finish(b,low);
  const lowerAgain=await finish(a,low);assert.equal(lowerAgain.result.profile.bestScore,51);
  const repeated=await ok('/api/runs/'+aRun.run.runId,{id:a,method:'POST',body:{replay:low}});
  assert.equal(repeated.score,51,'Completed rounds are idempotent');
  assert.equal((await request('/api/runs/'+aRun.run.runId,{id:b,method:'POST',body:{replay:high}})).status,404);
  assert.equal((await ok('/api/profile',{id:a,method:'PATCH',body:{skin:'strawberry'}})).profile.skin,'strawberry');
  assert.equal((await request('/api/profile',{id:a,method:'PATCH',body:{skin:'matcha'}})).status,403);
  const unfinished=await ok('/api/runs',{id:b,method:'POST',body:{}});
  assert.equal((await request('/api/runs/'+unfinished.runId,{id:b,method:'POST',body:{replay:{...high,steps:1}}})).status,400);
  for(const period of ['all','daily']){
    const board=await ok('/api/leaderboard?period='+period,{id:b});
    assert.deepEqual(board.entries.map(r=>r.score),[51,31]);
    assert.equal(board.me.rank,2);assert.equal(board.entries[0].nickname,'奶油一号');
    assert(!JSON.stringify(board).includes(a),'Private account IDs are never exposed');
  }
  await finish(b,high);
  assert.deepEqual((await ok('/api/leaderboard')).entries.map(r=>r.nickname),['奶油一号',(await ok('/api/profile',{id:b})).profile.nickname],'Earlier equal scores rank first');
  await db.prepare('UPDATE daily_bests SET day=? WHERE player_id=?').bind('2026-01-01',b).run();
  assert.equal((await ok('/api/leaderboard?period=daily')).entries.length,1,'Only this Beijing day is ranked');
  const failure=recordedRound({seconds:40,release:false}).replay;
  const failed=await finish(b,failure);assert.equal(failed.result.score,76);assert.equal(failed.result.day,dayKey(Date.now()));
  assert.equal((await ok('/api/leaderboard?period=daily',{id:b})).me.rank,1,'Failure scores count on daily and all-time boards');
  console.log('Worker/D1 auth, real score writes, both rankings, ties, daily isolation, failure records, skin locks, nickname validation, and idempotence passed.');
}finally{await mf.dispose();}

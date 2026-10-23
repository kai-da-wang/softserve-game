import assert from 'node:assert/strict';
import {CreamSimulation,CONFIG} from '../public/game/simulation.js';
import {verifyReplay,ENGINE} from '../lib/game/verify.mjs';
import {heightToScore} from '../public/game/progression.js';

export function recordedRound({seconds=8,frameDt=1/60,circle=false,release=true}={}){
  const sim=new CreamSimulation(),moves=[];sim.press();
  while(sim.time<seconds&&sim.phase==='pouring'){
    if(circle){
      const t=sim.time,r=.30*Math.min(1,t/.8),x=r*Math.cos(t*2.2),z=r*Math.sin(t*2.2);
      sim.moveBy(x-sim.cone.x,z-sim.cone.z);
      moves.push([Math.round(sim.time/CONFIG.dt),Number(sim.cone.x.toFixed(6)),Number(sim.cone.z.toFixed(6))]);
    }
    sim.advance(frameDt);
  }
  let releaseStep=null;
  if(release&&sim.phase==='pouring'){releaseStep=Math.round(sim.time/CONFIG.dt);sim.release();}
  while(sim.phase==='settling'||sim.phase==='pouring'||sim.phase==='failure'&&sim.fallTime<2)sim.advance(frameDt);
  return {sim,replay:{engine:ENGINE,moves,releaseStep,steps:Math.round(sim.time/CONFIG.dt),outcome:sim.phase}};
}

for(const options of [{},{circle:true,seconds:15},{circle:true,seconds:15,frameDt:1/30},{seconds:40,release:false}]){
  const {sim,replay}=recordedRound(options),verified=verifyReplay(replay,sim.time*1000);
  assert.equal(verified.outcome,sim.phase);
  assert.equal(verified.score,heightToScore((sim.phase==='failure'?sim.peak:sim.height)*5),'Replay must reproduce actual client height');
  assert.deepEqual(verifyReplay({...replay,score:999999},sim.time*1000),verified,'Claimed client scores cannot change the result');
}
const {sim,replay}=recordedRound({circle:true,seconds:15});
const verify=value=>verifyReplay(value,sim.time*1000);
assert.throws(()=>verify({...replay,engine:'unknown'}));
assert.throws(()=>verify({...replay,moves:[[2,0,0],[1,0,0]]}));
assert.throws(()=>verify({...replay,moves:[[0,Infinity,0]]}));
assert.throws(()=>verify({...replay,moves:[[0,31,0]]}));
assert.throws(()=>verify({...replay,steps:1}));
assert.throws(()=>verify({...replay,outcome:'interrupted'}));
assert.throws(()=>verifyReplay(replay,0),/too_fast/);
console.log('Successful and failed replay verification, 30/60 FPS inputs, score tampering, timing, and malformed inputs passed.');

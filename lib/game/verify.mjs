import {CreamSimulation,CONFIG} from '../../public/game/simulation.js';
import {heightToScore} from '../../public/game/progression.js';
export const ENGINE='softserve-0.3';
export function verifyReplay(replay,elapsedMs){
 if(!replay||replay.engine!==ENGINE||!Number.isSafeInteger(replay.steps)||replay.steps<1||replay.steps>18000||!Array.isArray(replay.moves)||replay.moves.length>18000)throw new Error('invalid_replay');
 if(replay.steps*CONFIG.dt>elapsedMs/1000+12)throw new Error('too_fast');
 if(!['success','failure'].includes(replay.outcome))throw new Error('invalid_outcome');
 if(replay.releaseStep!==null&&(!Number.isSafeInteger(replay.releaseStep)||replay.releaseStep<0||replay.releaseStep>replay.steps))throw new Error('invalid_release');
 let last=-1;for(const move of replay.moves){if(!Array.isArray(move)||move.length!==3||!Number.isSafeInteger(move[0])||move[0]<last||move[0]>replay.steps||move[0]<0||!Number.isFinite(move[1])||!Number.isFinite(move[2])||Math.abs(move[1])>30||Math.abs(move[2])>30)throw new Error('invalid_move');last=move[0];}
 const sim=new CreamSimulation();sim.press();let cursor=0;
 for(let step=0;step<replay.steps;step++){
  while(cursor<replay.moves.length&&replay.moves[cursor][0]===step){const [,x,z]=replay.moves[cursor++];sim.moveBy(x-sim.cone.x,z-sim.cone.z);}
  if(replay.releaseStep===step)sim.release();sim.advance(CONFIG.dt);
 }
 if(replay.releaseStep===replay.steps)sim.release();
 if(sim.phase!==replay.outcome)throw new Error('unfinished_replay');
 const score=heightToScore((sim.phase==='failure'?sim.peak:sim.height)*5);
 if(!Number.isSafeInteger(score)||score>10000)throw new Error('invalid_score');
 return {score,outcome:sim.phase};
}

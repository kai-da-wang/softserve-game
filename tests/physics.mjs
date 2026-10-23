import assert from 'node:assert/strict';
import {CreamSimulation,CONFIG} from '../public/game/simulation.js';
const tick=(s,n)=>{for(let i=0;i<n*60;i++)s.advance(1/60);};
const ready=new CreamSimulation();tick(ready,2);assert.equal(ready.points.length,0,'No cream before a press');assert.equal(ready.height,0);
ready.press();ready.moveBy(.21,-.105);assert.equal(ready.cone.x,.21);assert.equal(ready.cone.z,-.105);ready.release();const count=ready.pending.length;tick(ready,1);assert.equal(ready.phase,'success');assert.equal(ready.pending.length,0,'Release drains the remaining cream and stops extrusion');
function trial(mode,seconds=40,dt=1/60){const s=new CreamSimulation();s.press();let x0=0,z0=0;for(let t=0;t<seconds;t+=dt){if(mode==='circle'){const r=.30*Math.min(1,t/.8),x=r*Math.cos(t*2.2),z=r*Math.sin(t*2.2);s.moveBy(x-x0,z-z0);x0=x;z0=z;}s.advance(dt);if(s.phase==='failure')break;}return s;}
const still=trial('still'),circle=trial('circle',25),circle30=trial('circle',25,1/30);
console.log(JSON.stringify({still:{phase:still.phase,cm:still.height*5,t:still.time},circle:{phase:circle.phase,cm:circle.height*5,t:circle.time,points:circle.points.length},circle30:{phase:circle30.phase,cm:circle30.height*5}}));
assert(still.phase==='failure','A narrow stationary column must lose balance');assert(circle.height>still.height,'Winding a broad base should improve height');assert(circle.height>1,'Winding should build above five centimeters');
assert(Math.abs(circle30.height-circle.height)<.25,'Stacking should behave consistently at 30 and 60 FPS');
if(circle.phase==='pouring'){circle.release();tick(circle,1);assert.equal(circle.phase,'success');}
const spill=new CreamSimulation();spill.press();spill.moveBy(1,0);tick(spill,.5);assert.equal(spill.phase,'failure');assert.equal(spill.reason,'spill');
const cancelled=new CreamSimulation();cancelled.press();tick(cancelled,1);cancelled.interrupt();tick(cancelled,1);assert.equal(cancelled.phase,'interrupted');
console.log('Hold/release, free relative movement, contact, balance, spill, cancellation, and frame-rate checks passed.');

// Independent model: delayed extrusion, contact between flattened strands,
// and a damped, creeping beam for the weight of the cream above each joint.
export const CONFIG=Object.freeze({dt:1/60,radius:.18,flatten:.85,flow:.74,drag:2.1,gap:.7,flight:.22,coneRadius:.5,coneDepth:1.1});
const limit=(v,a,b)=>Math.min(b,Math.max(a,v));
const ease=t=>{t=limit(t,0,1);return t*t*(3-2*t);};
export class CreamSimulation{
 constructor(){this.reset();}
 reset(){this.phase='ready';this.time=0;this.remainder=0;this.cone={x:0,z:0};this.points=[];this.pending=[];this.drops=[];this.joints=[];this.height=0;this.peak=0;this.stroke=0;this.pouring=false;this.history=[];this.still=0;this.drift={x:0,z:0};this.lastDirection={x:1,z:0};this.reason=null;this.settle=0;this.fallTime=0;this.bandClock=0;this.bands=[];this.risk=0;this.tipStart=0;this.overhang=0;this.broken=0;}
 press(){if(this.phase!=='ready')return false;this.phase='pouring';this.pouring=true;return true;}
 moveBy(x,z){if(this.phase!=='pouring'||!Number.isFinite(x)||!Number.isFinite(z))return;this.cone.x+=x;this.cone.z+=z;}
 release(){if(this.phase!=='pouring')return;this.pouring=false;this.phase='settling';this.tipStart=this.pending.length;this.settle=0;}
 interrupt(reason='cancel'){if(!['ready','pouring','settling'].includes(this.phase))return;this.phase='interrupted';this.reason=reason;this.pouring=false;this.pending=[];}
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)return;this.remainder+=Math.min(seconds,1);let steps=0;while(this.remainder+1e-10>=CONFIG.dt&&steps++<60){this.remainder-=CONFIG.dt;this.tick(CONFIG.dt);}}
 floor(x,z){const r=Math.hypot(x,z),rx=CONFIG.radius,ry=rx*CONFIG.flatten,inner=.455,slope=1.02/inner;if(r>=CONFIG.coneRadius+rx)return null;const tangent=slope*rx*rx/Math.sqrt((slope*rx)**2+ry*ry);if(r+tangent<inner)return slope*r-1.02+Math.sqrt((slope*rx)**2+ry*ry);if(r<inner)return ry*Math.sqrt(Math.max(0,1-((inner-r)/rx)**2));return ry*Math.sqrt(Math.max(0,1-(Math.max(0,r-CONFIG.coneRadius)/rx)**2));}
 tick(dt){if(this.phase==='ready'||this.phase==='success'||this.phase==='interrupted')return;this.time+=dt;if(this.phase==='failure'){this.fallTime+=dt;const j=this.joints[this.broken];if(j){const sign=Math.sign(j.ax)||1;j.ax+=sign*dt*.72;j.az*=1+dt*.07;j.ax=limit(j.ax,-1.8,1.8);}this.drops.forEach(p=>{p.y-=dt*(p.v+=dt*9.8);});return;}
 const x=-this.cone.x,z=-this.cone.z;
 if(this.pouring){this.pending.push({x,z,born:this.time});this.history.push({x,z,t:this.time});while(this.history[0]?.t<this.time-.9)this.history.shift();let sx=0,sz=0;for(const p of this.history){sx+=p.x;sz+=p.z;}const count=this.history.length,meanX=sx/count,meanZ=sz/count;let spread=0;for(const p of this.history)spread+=(p.x-meanX)**2+(p.z-meanZ)**2;const stationary=this.time>.9&&Math.sqrt(spread/count)<.017;this.still+=(Number(stationary)-this.still)*(1-Math.exp(-dt/.25));const last=this.history.at(-2);if(last){const dx=x-last.x,dz=z-last.z,l=Math.hypot(dx,dz);if(l>.0003)this.lastDirection={x:dx/l,z:dz/l};}if(stationary){this.drift.x+=this.lastDirection.x*.065*dt;this.drift.z+=this.lastDirection.z*.065*dt;}else{this.drift.x*=Math.exp(-dt*4);this.drift.z*=Math.exp(-dt*4);}}
 while(this.pending.length&&this.time-this.pending[0].born>=CONFIG.flight-1e-9){const parcel=this.pending.shift();let px=parcel.x*.6+x*.4,pz=parcel.z*.6+z*.4;const head=this.points.at(-1);let base=this.floor(px,pz);if(base===null&&head){const bent=this.deform(head);if(Math.hypot(px-bent.x,pz-bent.z)<.36)base=.15;}
 if(base===null||Math.hypot(px,pz)>1.4){this.fail('spill');break;}
 this.deposit(px,pz,dt,base);
 }
 if(this.phase==='failure')return;
 this.bandClock+=dt;if(this.bandClock>.08){this.buildBands();this.bandClock=0;}this.balance(dt);
 if(this.phase==='settling'&&!this.pending.length){this.settle+=dt;if(this.settle>.45){this.phase='success';this.pouring=false;}}
 }
 deposit(x,z,dt,base){const head=this.points.at(-1);let px=x+this.drift.x,pz=z+this.drift.z;if(head){const bent=this.deform({x:px,y:head.y,z:pz});px-=bent.x-px;pz-=bent.z-pz;let dx=(px-head.x)*(1-Math.exp(-dt/.045)),dz=(pz-head.z)*(1-Math.exp(-dt/.045));const distance=Math.hypot(dx,dz),max=CONFIG.flow*dt*2.5;if(distance>max){dx*=max/distance;dz*=max/distance;}px=head.x+dx;pz=head.z+dz;this.stroke+=Math.hypot(dx,dz);}
 let y=this.floor(px,pz)??base;const r=CONFIG.radius,ry=r*CONFIG.flatten;
 for(const p of this.points){if(this.stroke-p.stroke<.66)break;if(head&&p.y>head.y+ry)continue;const radial=r*(1+(p.size??1)),d=Math.hypot(p.x-px,p.z-pz);if(d<radial)y=Math.max(y,p.y+ry*(1+(p.size??1))*Math.sqrt(1-(d/radial)**2));}
 const supportedY=y;
 if(head){const distance=Math.hypot(px-head.x,pz-head.z),maxSlope=Math.max(distance*.82,CONFIG.flow*dt*.22);y=limit(y,head.y-maxSlope,head.y+maxSlope);y=Math.max(y,this.floor(px,pz)??base);if(this.pouring&&this.still>.05){const rise=.20*this.still*dt;y=Math.max(y,head.y+rise);this.stroke+=rise;}if(head.y-supportedY>.31){this.overhang+=distance;if(this.overhang>.38){this.fail('balance');return;}}else this.overhang=0;}
 let size=1;if(!this.pouring&&head&&this.tipStart){const t=1-this.pending.length/this.tipStart;size=Math.max(.04,(1-t)**.65);px=head.x;pz=head.z;y=head.y+ry*.10;}
 const p={x:px,y,z:pz,stroke:this.stroke,size,mass:CONFIG.flow*dt*Math.PI*r*r};
 if(head&&Math.hypot(px-head.x,y-head.y,pz-head.z)<.0033&&size>.98){head.mass+=p.mass;}else this.points.push(p);
 this.height=Math.max(this.height,y+ry*size,0);this.peak=Math.max(this.peak,this.height);
 }
 buildBands(){const bands=[];for(const p of this.points){if(p.y<-.12)continue;const i=Math.max(0,Math.floor(p.y/.65));const a=bands[i]??={mass:0,x:0,y:0,z:0,xx:0,zz:0,xz:0};a.mass+=p.mass;a.x+=p.x*p.mass;a.y+=p.y*p.mass;a.z+=p.z*p.mass;a.xx+=p.x*p.x*p.mass;a.zz+=p.z*p.z*p.mass;a.xz+=p.x*p.z*p.mass;}
 for(let i=0;i<bands.length;i++){let b=bands[i];if(!b){const p=bands[i-1];bands[i]={mass:0,x:p?.x??0,y:(i+.5)*.65,z:p?.z??0,width:p?.width??.36};continue;}const m=b.mass;b.x/=m;b.y/=m;b.z/=m;const a=Math.max(0,b.xx/m-b.x*b.x),c=Math.max(0,b.zz/m-b.z*b.z),cov=b.xz/m-b.x*b.z,minor=Math.max(0,(a+c-Math.hypot(a-c,2*cov))/2);b.width=.36+2*Math.sqrt(2*minor);}
 this.bands=bands;while(this.joints.length<bands.length)this.joints.push({ax:0,az:0,vx:0,vz:0,rx:0,rz:0});
 }
 balance(dt){if(!this.bands.length)return;let mass=0,sx=0,sy=0,sz=0;
 for(let i=this.bands.length-1;i>=0;i--){const band=this.bands[i],joint=this.joints[i],center=this.deform(band);mass+=band.mass;sx+=center.x*band.mass;sy+=center.y*band.mass;sz+=center.z*band.mass;if(mass<1e-8)continue;const below=this.bands[i-1],pivot={x:below?.x??0,y:i*.65,z:below?.z??0},bent=this.deform(pivot),armX=sx/mass-bent.x,armZ=sz/mass-bent.z,lever=Math.max(.13,sy/mass-bent.y),width=Math.min(1.05,band.width,below?.width??1.05),thin=Math.pow(Math.min(1,width/.68),Math.min(7,Math.max(0,this.bands.length-i-2)*2)),stiffness=88*Math.pow(width,3.1)*thin*(i===0?1.8:1),inertia=Math.max(.0005,mass*(lever*lever+.04)),damping=7.5*Math.sqrt(stiffness*inertia),denominator=1+dt*damping/inertia+dt*dt*stiffness/inertia;
 joint.vx=(joint.vx+dt*(mass*10*armX-stiffness*(joint.ax-joint.rx))/inertia)/denominator;joint.vz=(joint.vz+dt*(mass*10*armZ-stiffness*(joint.az-joint.rz))/inertia)/denominator;joint.ax+=joint.vx*dt;joint.az+=joint.vz*dt;
 const stress=Math.hypot(joint.ax-joint.rx,joint.az-joint.rz),yieldAngle=.05+Math.max(0,width*.5-Math.hypot(armX,armZ))*.36;if(stress>yieldAngle){const f=(stress-yieldAngle)/stress*dt/3;joint.rx+=(joint.ax-joint.rx)*f;joint.rz+=(joint.az-joint.rz)*f;}
 }
 let sumX=0,sumZ=0,worst=0,worstI=0;this.joints.forEach((j,i)=>{sumX+=j.ax;sumZ+=j.az;const a=Math.hypot(j.ax,j.az);if(a>worst){worst=a;worstI=i;}});this.risk=Math.min(1,Math.max(worst/.5,Math.hypot(sumX,sumZ)/1.2));if(worst>.5||Math.hypot(sumX,sumZ)>1.2){this.broken=worstI;this.fail('balance');}
 }
 deform(p){let x=p.x,y=p.y,z=p.z;for(let i=0;i<this.joints.length;i++){const joint=this.joints[i],rise=Math.max(0,p.y-i*.65),w=ease(rise/.65);if(!w)continue;const ax=joint.ax*w,az=joint.az*w;x+=Math.sin(ax)*rise;z+=Math.sin(az)*rise;y-=(1-Math.cos(Math.hypot(ax,az)))*rise;}return{...p,x,y,z};}
 fail(reason){if(this.reason)return;this.phase='failure';this.reason=reason;this.pouring=false;this.fallTime=0;if(!this.joints.length)this.joints.push({ax:.06,az:0,vx:0,vz:0,rx:0,rz:0});this.joints[this.broken].ax||=.02;}
 flowPoints(){if(!this.pending.length)return[];const head=this.points.at(-1),position={x:-this.cone.x,y:this.height+CONFIG.gap,z:-this.cone.z},base=head?this.deform(head):{x:position.x,y:this.floor(position.x,position.z)??-.4,z:position.z};const points=[{...base,size:head?.size??1}];for(const [i,p] of this.pending.entries()){const age=limit((this.time-p.born)/CONFIG.flight,0,1),s=ease(age);points.push({x:p.x*(1-s)+base.x*s,y:position.y*(1-age)+base.y*age,z:p.z*(1-s)+base.z*s,size:!this.pouring&&this.tipStart?Math.max(.06,(this.pending.length/this.tipStart)**.65):1});}if(this.pouring)points.push({...position,size:1});return points;}
}

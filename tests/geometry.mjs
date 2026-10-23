import assert from 'node:assert/strict';
import * as THREE from '../public/game/vendor/three.module.js';
import {CreamMesh} from '../public/game/render.js';
import {skinById} from '../public/game/progression.js';
const mesh=new CreamMesh(new THREE.MeshStandardMaterial(),16);
mesh.update([{x:0,y:0,z:0},{x:0,y:.5,z:0},{x:0,y:1,z:0}]);
const p=mesh.geom.attributes.position,n=mesh.geom.attributes.normal,index=mesh.geom.index;
for(let i=0;i<mesh.geom.drawRange.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(p,index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(p,index.getX(i+2)),normal=new THREE.Vector3().fromBufferAttribute(n,index.getX(i));const face=b.sub(a).cross(c.sub(a));assert(face.dot(normal)>0,'Cream faces must point outward and remain visible with front-face culling');}
mesh.update(Array.from({length:200},(_,i)=>({x:Math.sin(i*.1),y:i*.01,z:Math.cos(i*.1)})));
assert(mesh.geom.drawRange.count<=(16-1)*32*6);for(let i=0;i<mesh.geom.drawRange.count;i++)assert(index.getX(i)<p.count);
mesh.update([]);assert.equal(mesh.geom.drawRange.count,0);
const points=[{x:0,y:0,z:0},{x:0,y:.5,z:0},{x:0,y:1,z:0}];
mesh.update(points,skinById('strawberry'));
const pink=new THREE.Color(skinById('strawberry').color),colors=mesh.geom.attributes.color;
assert(Math.abs(colors.getX(0)-pink.r)<1e-6);
assert(Math.abs(colors.getY(0)-pink.g)<1e-6);
mesh.update(points,skinById('aurora'));
assert(Math.abs(colors.getY(8)-colors.getY(24))>.02,'Two-tone skin must color opposite sides differently');
console.log('Outward cream geometry, empty meshes, bounded buffers, and actual skin vertex colors passed.');

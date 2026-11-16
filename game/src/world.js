import * as THREE from 'three';
import { palette } from './palette.js';

export const collisionBoxes = [];
export const spawnPoints = {
  aurora: [{x:-34,y:0,z:-9},{x:-36,y:0,z:-4},{x:-36,y:0,z:2},{x:-34,y:0,z:7},{x:-32,y:0,z:0}],
  glacier: [{x:34,y:0,z:-9},{x:36,y:0,z:-4},{x:36,y:0,z:2},{x:34,y:0,z:7},{x:32,y:0,z:0}]
};
export const sitePositions = { A: new THREE.Vector3(-19,0,0), B: new THREE.Vector3(19,0,0) };
export const waypointGraph = [
  {id:'west',x:-31,z:0,hold:true},{id:'creek-west',x:-20,z:12},{id:'creek-mid',x:0,z:12},{id:'creek-east',x:20,z:12},{id:'east',x:31,z:0,hold:true},
  {id:'causeway-west',x:-15,z:0},{id:'causeway-mid',x:0,z:0},{id:'causeway-east',x:15,z:0},
  {id:'walk-west',x:-22,z:-10,y:5},{id:'walk-mid',x:0,z:-10,y:5,hold:true},{id:'walk-east',x:22,z:-10,y:5},
  {id:'site-a',x:-19,z:0,hold:true},{id:'site-b',x:19,z:0,hold:true}
];
export const laneRoutes = { frozenCreek:['west','creek-west','creek-mid','creek-east','east'], causeway:['west','causeway-west','causeway-mid','causeway-east','east'], serviceWalkway:['west','walk-west','walk-mid','walk-east','east'] };

function material(color, roughness=.86, extra={}) { return new THREE.MeshStandardMaterial({color,roughness,...extra}); }
function box(parent, name, x,y,z, sx,sy,sz, color, solid=true, opts={}) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material(color,.82,opts)); mesh.name=name; mesh.position.set(x,y+sy/2,z); mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  if(solid) collisionBoxes.push({minX:x-sx/2,maxX:x+sx/2,minY:y,maxY:y+sy,minZ:z-sz/2,maxZ:z+sz/2,name}); return mesh;
}
function cylinder(parent,name,x,y,z,r1,r2,h,color,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material(color));m.name=name;m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function siteMarker(parent,letter,pos){const ring=new THREE.Mesh(new THREE.TorusGeometry(4,.12,8,48),material(palette.orange,.35,{emissive:palette.orange,emissiveIntensity:.3}));ring.rotation.x=Math.PI/2;ring.position.set(pos.x,.14,pos.z);parent.add(ring);const label=new THREE.Mesh(new THREE.BoxGeometry(1.2,.12,.12),material(palette.warmLight,.4,{transparent:true}));label.position.set(pos.x,3,pos.z);parent.add(label);}

export function createWorld(scene, seed=7) {
  collisionBoxes.length=0;
  scene.background=new THREE.Color(0x0b2635);
  scene.fog=new THREE.FogExp2(0xa9d0dc,.0055);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,70),material(palette.snow));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
  // Wind-carved lane ribbons and a dark, frozen creek cut through the central snowfield.
  box(scene,'Creek ice',0,-.35,12,74,.18,10,palette.deepIce,false);
  for(let x=-39;x<=39;x+=6){box(scene,'Creek snow bank',x,-.04,6.6,5,.42,1.2,palette.shadowSnow,false);box(scene,'Creek snow bank',x,-.04,17.4,5,.42,1.2,palette.shadowSnow,false);}
  box(scene,'Causeway',0,.04,0,78,.28,5,palette.ice,false);
  for(let x=-38;x<=38;x+=8)box(scene,'Causeway rail',x,.25,2.8,7,.45,.28,palette.steel,false);
  // Outer berm and armored perimeter.
  box(scene,'North perimeter',0,0,-34,82,5,1.2,palette.darkSteel);
  box(scene,'South perimeter',0,0,34,82,5,1.2,palette.darkSteel);
  box(scene,'West perimeter',-41,0,0,1.2,5,68,palette.darkSteel);
  box(scene,'East perimeter',41,0,0,1.2,5,68,palette.darkSteel);
  for(let x=-36;x<=36;x+=12){box(scene,'Snow berm',x,0,-31,10,1.6,2,palette.shadowSnow);box(scene,'Snow berm',x,0,31,10,1.6,2,palette.shadowSnow);}
  // A raised service spine: two ramps meet a straight elevated crossing.
  box(scene,'Service walkway',0,4.7,-10,48,.42,3.4,palette.steel);
  for(const x of [-23,23]){const ramp=new THREE.Mesh(new THREE.BoxGeometry(12,.4,3.2),material(palette.steel));ramp.position.set(x,2.35,-10);ramp.rotation.z=x<0?-.39:.39;ramp.castShadow=true;scene.add(ramp);}
  for(let x=-20;x<=20;x+=10){cylinder(scene,'Walkway support',x,0,-10,.22,.34,4.8,palette.darkSteel);}
  for(const x of [-24,-12,0,12,24])box(scene,'Walkway parapet',x,5.12,-11.8,8,.48,.22,palette.ice);
  // A: Comms Array: dish bowls, mast, equipment huts and guarded corners.
  for(const [x,z] of [[-22,-4],[-15,-4]]){
    cylinder(scene,'A dish pedestal',x,0,z,.38,.5,2.5,palette.steel);
    const dish=new THREE.Mesh(new THREE.SphereGeometry(2.25,20,12,0,Math.PI*2,0,Math.PI/2),material(palette.ice,.38,{metalness:.55,side:THREE.DoubleSide}));dish.position.set(x,2.45,z);dish.rotation.x=Math.PI;dish.castShadow=true;scene.add(dish);
    const strut=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3,8),material(palette.orange));strut.position.set(x,3.2,z);strut.rotation.z=.42;scene.add(strut);
  }
  cylinder(scene,'Comms mast',-18,0,3,.18,.28,11,palette.darkSteel);
  for(let y=3;y<=10;y+=2){const bar=new THREE.Mesh(new THREE.TorusGeometry((11-y)*.035,.035,6,12),material(palette.orange));bar.position.set(-18,y,3);scene.add(bar);}
  box(scene,'Array control hut',-27,0,2,6,3,5,palette.darkSteel);box(scene,'Array console',-27,1.1,-1,3,1.1,1,palette.ice);
  box(scene,'A cover container',-12,0,6,7,2.6,2.5,palette.steel);box(scene,'A low barricade',-29,0,-7,5,1.2,1,palette.orange);
  // B: reactor dome surrounded by insulated pipework and machinery.
  const dome=new THREE.Mesh(new THREE.SphereGeometry(5,32,18,0,Math.PI*2,0,Math.PI/2),material(0x557784,.36,{metalness:.4}));dome.position.set(20,0,-1);dome.castShadow=true;scene.add(dome);
  cylinder(scene,'Reactor base',20,0,-1,5.1,5.3,1,palette.darkSteel,24);
  for(let z=-8;z<=6;z+=3){box(scene,'Reactor insulated pipe',13,2,z,.8,.8,2.4,palette.orange);cylinder(scene,'Pipe elbow',13,1.5,z,.48,.48,.8,palette.ice);}
  box(scene,'Reactor control block',28,0,4,5,3,5,palette.steel);box(scene,'B cover container',12,0,7,7,2.5,2.5,palette.darkSteel);box(scene,'B low barricade',30,0,-8,6,1.1,1,palette.orange);
  // scattered hard cover, spaced to break long sightlines without sealing lanes.
  for(const [x,z,w,d,c] of [[-8,-4,3,3,palette.steel],[-3,5,4,2,palette.darkSteel],[7,-3,3,4,palette.steel],[5,8,5,2,palette.ice],[-31,14,5,2,palette.steel],[30,14,5,2,palette.steel],[-8,-22,5,3,palette.darkSteel],[9,-23,4,3,palette.steel]])box(scene,'Field cover',x,0,z,w,2.1,d,c);
  // Floodlight pylons cast a warm opposing hue across the cyan snow.
  const polePositions=[[-33,-24],[-12,-24],[12,-24],[33,-24],[-33,24],[-12,24],[12,24],[33,24]];
  for (const [x, z] of polePositions) {
    cylinder(scene, 'Floodlight mast', x, 0, z, .12, .18, 9, palette.darkSteel);
    const lamp = new THREE.PointLight(palette.warmLight, 180, 42, 1.6);
    lamp.position.set(x, 8.8, z);
    scene.add(lamp);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, .25, .65),
      material(palette.warmLight, .3, { emissive: palette.warmLight, emissiveIntensity: 1.4 })
    );
    cap.position.copy(lamp.position);
    scene.add(cap);

    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffc985,
        transparent: true,
        opacity: .12,
        depthWrite: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, .018, z);
    scene.add(pool);
  }
  const moon=new THREE.DirectionalLight(0xc9f5ff,3.5);
  moon.position.set(-20,35,12);
  moon.castShadow=true;
  moon.shadow.mapSize.set(512,512);
  scene.add(moon);
  scene.add(new THREE.HemisphereLight(0xb7ecff,0x526d78,2.4));
  scene.add(new THREE.AmbientLight(0x82cce0,0.55));
  // Aurora dome, opaque gradient sky with animated ribbons painted as translucent arcs.
  const sky=new THREE.Mesh(new THREE.SphereGeometry(190,32,18),new THREE.MeshBasicMaterial({color:0x0a1a2b,side:THREE.BackSide}));scene.add(sky);
  const bands=[];
  for (let index = 0; index < 5; index += 1) {
    const points = [];
    for (let step = 0; step <= 100; step += 1) {
      const angle = (step / 100) * Math.PI * 2;
      const wave = Math.sin(angle * 3 + index) * 8;
      const height = 38 + index * 5 + wave;
      points.push(new THREE.Vector3(Math.cos(angle) * 132, height, Math.sin(angle) * 132));
    }

    const color = index % 2 ? palette.auroraB : palette.auroraA;
    const ribbon = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 180, 1.5, 5, false),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .52 })
    );
    ribbon.name = 'Aurora ribbon';
    scene.add(ribbon);
    bands.push(ribbon);
  }
  // Deterministic snowfield specks and falling flakes.
  let s=(seed>>>0)||7;const rand=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const snowCount=420, positions=new Float32Array(snowCount*3), speeds=new Float32Array(snowCount);
  for(let i=0;i<snowCount;i++){positions[i*3]=(rand()-.5)*90;positions[i*3+1]=rand()*27;positions[i*3+2]=(rand()-.5)*64;speeds[i]=.7+rand()*1.5;}
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const flakes=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xe5f9ff,size:.12,transparent:true,opacity:.76}));scene.add(flakes);
  siteMarker(scene,'A',sitePositions.A);siteMarker(scene,'B',sitePositions.B);
  function updateWorld(dt,time){for(let i=0;i<snowCount;i++){positions[i*3+1]-=speeds[i]*dt;if(positions[i*3+1]<0){positions[i*3+1]=27;positions[i*3]=(rand()-.5)*90;}}snowGeo.attributes.position.needsUpdate=true;for(let i=0;i<bands.length;i++)bands[i].rotation.y=Math.sin(time*.08+i)*.06;}
  return {updateWorld};
}

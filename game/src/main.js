import * as THREE from 'three';
import { createWorld, collisionBoxes, spawnPoints } from './world.js';
import { createInput } from './input.js';
import { createPlayer, stepPlayer } from './player.js';
import { createViewmodel } from './viewmodel.js';
import { initCombat } from './combat.js';
import { initGrenades } from './grenades.js';
import { initBots } from './bots.js';
import { initRounds, stepRoundEnd } from './rounds.js';
import { initEconomy } from './economy.js';
import { initAudio } from './audio.js';
import { initHud } from './hud.js';

const params=new URLSearchParams(location.search),shot=params.get('shot'),seed=Number(params.get('seed')||7);
const state={scene:null,renderer:null,camera:null,player:null,input:null,world:null,pointerLocked:false,simTime:0,accumulator:0,lastFrame:0,shot,seed,started:false};
state.scene=new THREE.Scene();
state.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
state.renderer.setPixelRatio(1);
state.renderer.setSize(innerWidth,innerHeight);
state.renderer.shadowMap.enabled=true;
state.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
state.renderer.toneMapping=THREE.ACESFilmicToneMapping;
state.renderer.toneMappingExposure=1.48;
document.querySelector('#game').appendChild(state.renderer.domElement);
state.camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,260);state.scene.add(state.camera);
state.world=createWorld(state.scene,seed);
const shotViews={cover:{x:-31,y:2.1,z:10,look:[-19,2,0]},buy:{x:-34,y:2,z:-2,look:[-19,1,0]},action:{x:0,y:2,z:9,look:[19,2,-1]},site:{x:27,y:3,z:-14,look:[19,1,0]}};
if(shot&&shotViews[shot]){const v=shotViews[shot];state.camera.position.set(v.x,v.y,v.z);state.camera.lookAt(...v.look);state.player=createPlayer(new THREE.Vector3(v.x,0,v.z));state.started=true;document.querySelector('#start-overlay').hidden=true;}
else{const start=spawnPoints.aurora[2];state.player=createPlayer(new THREE.Vector3(start.x,0,start.z));}
state.input=createInput(state.renderer.domElement,state.camera,state);
state.viewmodel=createViewmodel(state.camera);
state.flashElement=document.createElement('div');
state.flashElement.style.cssText='position:fixed;inset:0;background:white;opacity:0;pointer-events:none;z-index:10;';
document.body.appendChild(state.flashElement);
state.collisionBoxes=collisionBoxes;
initCombat(state);
initGrenades(state);
initEconomy(state);
initAudio(state);
window.addEventListener('pointerdown',()=>state.audio.unlock(),{once:true});
initBots(state);
initRounds(state);
state.economy.buyBots();
initHud(state);
state.damageElement=document.querySelector('#damage-number');
if(shot==='action'){
  state.phase='live';
  state.buyOpen=false;
  state.viewmodel.root.visible=true;
  state.camera.position.set(0, 1.7, 9);
  state.camera.lookAt(0, 1.4, 2);
  const stagedBot=state.bots.find(bot=>bot.team==='Glacier');
  stageBot(stagedBot, 0, 2);
  state.viewmodel.fire();
  state.viewmodel.animation.flash=0.6;
  state.viewmodel.flash.material.opacity=1;
  state.viewmodel.flashLight.intensity=18;
}
if(shot==='cover'){
  state.phase='live';
  state.buyOpen=false;
  state.camera.position.set(0, 20, 51);
  state.camera.lookAt(0, 0, 0);
  const coverPositions = [
    [-16, 0],
    [-9, 12],
    [-3, -10],
    [5, 0],
    [11, 12],
    [16, -10],
    [-1, 12],
    [8, -10],
    [2, 0]
  ];
  state.bots.forEach((bot, index) => {
    stageBot(bot, coverPositions[index][0], coverPositions[index][1]);
    bot.recentlySeenUntil=state.simTime+3;
  });
}
if(shot==='site'){
  state.camera.position.set(-27, 3, 12);
  state.camera.lookAt(-19, 1, 0);
  state.phase='live';
  state.buyOpen=false;
  state.rounds.plant('A');
}
if(shot==='buy')state.buyOpen=true;
if(shot==='cover')state.viewmodel.root.visible=false;
const STEP=1/60;
function stageBot(bot,x,z){
  bot.position.set(x,0,z);
  bot.meshes.torso.position.set(x,1.1,z);
  bot.meshes.head.position.set(x,1.72,z);
  bot.meshes.visor.position.set(x,1.73,z-.19);
  bot.meshes.legs[0].position.set(x-.2,.4,z);
  bot.meshes.legs[1].position.set(x+.2,.4,z);
  bot.meshes.rifle.position.set(x+.34,1.15,z-.38);
}
function simulate(dt){
  state.simTime+=dt;
  if(state.phase!=='buy'&&state.started){
    stepPlayer(state.player,state.input,state.input.yaw,dt,collisionBoxes);
  }
  state.input.recoverRecoil(dt);
  state.viewmodel.update(dt,state.player,state.input.yaw);
  state.combat.update(dt);
  state.grenade.update(dt);
  if(state.phase==='live')state.botSystem.update(dt);
  state.rounds.update(dt);
  stepRoundEnd(state,dt);
  if(Math.hypot(state.player.velocity.x,state.player.velocity.z)>2&&state.phase==='live'){
    state.footstepTimer=(state.footstepTimer||0)-dt;
    if(state.footstepTimer<=0){state.audio.footstep();state.footstepTimer=.42;}
  }
  state.cameraShake=Math.max(0,(state.cameraShake||0)-dt);
  state.world.updateWorld(dt,state.simTime);
}
function render(alpha){
  if(!state.shot||!shotViews[state.shot]){const p=state.player.position;state.camera.position.set(p.x,p.y+state.player.height-.12,p.z);state.input.updateCamera();}
  state.camera.rotation.z=state.cameraShake>0?(Math.random()-.5)*state.cameraShake*.12:0;
  state.hud.update();
  state.renderer.render(state.scene,state.camera);
}
function frame(now){const elapsed=Math.min(.1,(now-state.lastFrame)/1000||0);state.lastFrame=now;state.accumulator+=elapsed;while(state.accumulator>=STEP){simulate(STEP);state.accumulator-=STEP;}render(state.accumulator/STEP);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
function resize(){state.camera.aspect=innerWidth/innerHeight;state.camera.updateProjectionMatrix();state.renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
const overlay=document.querySelector('#start-overlay'),play=document.querySelector('#play');
if(state.shot){
  overlay.hidden=true;
  overlay.style.display='none';
}
play.addEventListener('click',()=>{state.audio.unlock();state.started=true;overlay.hidden=true;state.input.requestLock();});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&!state.shot)overlay.hidden=false;});

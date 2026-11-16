const PLAYER_RADIUS=.42, PLAYER_HEIGHT=1.72, CROUCH_HEIGHT=1.13;
function overlaps(x,z,box,r){return x+PLAYER_RADIUS>box.minX&&x-PLAYER_RADIUS<box.maxX&&z+PLAYER_RADIUS>box.minZ&&z-PLAYER_RADIUS<box.maxZ;}
function blockedAt(x,z,y,height,boxes){for(const b of boxes){if(y+height<=b.minY||y>=b.maxY)continue;if(overlaps(x,z,b))return b;}return null;}
export function createPlayer(position){return {position:position.clone(),velocity:{x:0,y:0,z:0},health:100,crouched:false,onGround:true,jumpQueued:false,height:PLAYER_HEIGHT};}
export function stepPlayer(player,input,cameraYaw,dt,boxes){
  player.crouched=input.isDown('ControlLeft')||input.isDown('ControlRight');player.height=player.crouched?CROUCH_HEIGHT:PLAYER_HEIGHT;
  let forward=(input.isDown('KeyW')?1:0)-(input.isDown('KeyS')?1:0),strafe=(input.isDown('KeyD')?1:0)-(input.isDown('KeyA')?1:0);
  const length=Math.hypot(forward,strafe)||1;forward/=length;strafe/=length;
  const speed=player.crouched?3.1:6.3, targetX=(Math.sin(cameraYaw)*forward+Math.cos(cameraYaw)*strafe)*speed,targetZ=(-Math.cos(cameraYaw)*forward+Math.sin(cameraYaw)*strafe)*speed;
  const acceleration=player.onGround?22:8;player.velocity.x+=(targetX-player.velocity.x)*Math.min(1,acceleration*dt);player.velocity.z+=(targetZ-player.velocity.z)*Math.min(1,acceleration*dt);
  if(player.jumpQueued&&player.onGround&&!player.crouched){player.velocity.y=6.4;player.onGround=false;}player.jumpQueued=false;
  player.velocity.y-=18*dt;
  const x=player.position.x+player.velocity.x*dt,z=player.position.z+player.velocity.z*dt;
  if(!blockedAt(x,player.position.z,player.position.y,player.height,boxes))player.position.x=x;else player.velocity.x=0;
  if(!blockedAt(player.position.x,z,player.position.y,player.height,boxes))player.position.z=z;else player.velocity.z=0;
  const nextY=player.position.y+player.velocity.y*dt;
  if(nextY<=0){player.position.y=0;player.velocity.y=0;player.onGround=true;}else{const ceiling=blockedAt(player.position.x,player.position.z,nextY,player.height,boxes);if(ceiling&&player.velocity.y>0){player.velocity.y=0;}else{player.position.y=nextY;player.onGround=false;}}
  // Keep the body inside the station's perimeter.
  player.position.x=Math.max(-39.8,Math.min(39.8,player.position.x));player.position.z=Math.max(-32.8,Math.min(32.8,player.position.z));
}

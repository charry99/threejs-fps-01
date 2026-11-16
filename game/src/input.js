export function createInput(canvas, camera, state) {
  const held=new Set();let locked=false, yaw=0,pitch=0,recoilOffset=0;
  const onKeyDown=e=>{
    held.add(e.code);
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.code==='Space')state.player.jumpQueued=true;
    if(e.code.startsWith('Digit')&&state.combat)state.combat.selectWeapon(Number(e.code.slice(5))-1);
    if(e.code==='KeyR'&&state.combat)state.combat.reload();
    if(e.code==='KeyQ'&&state.grenade)state.grenade.cycle();
    if(e.code==='KeyG'&&state.grenade)state.grenade.throw();
    if(e.code==='KeyB'&&state.phase==='buy')state.buyOpen=!state.buyOpen;
    if(e.code==='KeyM'&&state.audio)state.audio.toggleMute();
  };
  const onKeyUp=e=>held.delete(e.code);
  const onMouseMove=e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.48,Math.min(1.48,pitch));};
  let fireClick=false;
  let fireHeld=false;
  const onMouseDown=e=>{if(e.button!==0)return;fireClick=true;fireHeld=true;};
  const onMouseUp=e=>{if(e.button===0)fireHeld=false;};
  const onLock=()=>{locked=document.pointerLockElement===canvas;state.pointerLocked=locked;};
  window.addEventListener('keydown',onKeyDown);
  window.addEventListener('keyup',onKeyUp);
  window.addEventListener('mousemove',onMouseMove);
  window.addEventListener('mousedown',onMouseDown);
  window.addEventListener('mouseup',onMouseUp);
  document.addEventListener('pointerlockchange',onLock);
  return {
    get locked(){return locked;},
    get yaw(){return yaw;},
    get pitch(){return pitch;},
    get fireHeld(){return fireHeld;},
    isDown(code){return held.has(code);},
    consumeFireClick(){const clicked=fireClick;fireClick=false;return clicked;},
    addRecoil(amount){pitch=Math.max(-1.48,Math.min(1.48,pitch-amount));recoilOffset+=amount;},
    recoverRecoil(dt){
      const recovered=Math.min(recoilOffset,dt*.22);
      recoilOffset-=recovered;
      pitch=Math.min(1.48,pitch+recovered);
    },
    requestLock(){canvas.requestPointerLock();},
    updateCamera(){camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;},
    dispose(){
      window.removeEventListener('keydown',onKeyDown);
      window.removeEventListener('keyup',onKeyUp);
      window.removeEventListener('mousemove',onMouseMove);
      window.removeEventListener('mousedown',onMouseDown);
      window.removeEventListener('mouseup',onMouseUp);
      document.removeEventListener('pointerlockchange',onLock);
    }
  };
}

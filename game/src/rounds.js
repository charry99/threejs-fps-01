import * as THREE from 'three';
import { sitePositions, spawnPoints } from './world.js';

const BUY_DURATION = 20;
const ROUND_DURATION = 105;
const CHARGE_FUSE = 35;

export function initRounds(state) {
  state.phase = 'buy';
  state.buyOpen = true;
  state.phaseTimer = BUY_DURATION;
  state.roundNumber = 1;
  state.scores = { Aurora: 0, Glacier: 0 };
  state.charge = { planted: false, site: null, timer: 0, progress: 0, defuseProgress: 0, mesh: null, beepTimer: 0 };
  state.rounds = {
    get phase() {
      return state.phase;
    },
    get charge() {
      return state.charge;
    },
    plant(site, bot = null) {
      if (state.phase !== 'live' || state.charge.planted) return false;
      state.charge.planted = true;
      state.charge.site = site;
      state.charge.timer = CHARGE_FUSE;
      state.charge.beepTimer = 0;
      state.charge.progress = 0;
      const device = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.28, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xff873d, emissive: 0xff4a20, emissiveIntensity: 1.8, metalness: 0.35 })
      );
      device.position.copy(sitePositions[site]);
      device.position.y = 0.24;
      device.castShadow = true;
      state.scene.add(device);
      state.charge.mesh = device;
      state.audio?.beep();
      if (!bot) state.economy?.awardPlant();
      state.roundBanner = `UPLINK PLANTED · SITE ${site}`;
      state.roundBannerTime = 2.5;
      return true;
    },
    defuse() {
      if (!state.charge.planted || state.phase !== 'live') return false;
      removeCharge(state);
      state.charge.planted = false;
      finishRound(state, 'Glacier', 'UPLINK DEFUSED');
      return true;
    },
    update(dt) {
      updateRound(state, dt);
    },
    reset() {
      beginBuyPhase(state);
    }
  };
}

function beginBuyPhase(state) {
  removeCharge(state);
  state.phase = 'buy';
  state.buyOpen = true;
  state.phaseTimer = BUY_DURATION;
  state.charge.planted = false;
  state.charge.site = null;
  state.charge.timer = 0;
  state.charge.progress = 0;
  state.charge.defuseProgress = 0;
  state.buyOpen = true;
  state.roundBanner = `ROUND ${String(state.roundNumber).padStart(2, '0')} · BUY PHASE`;
  state.roundBannerTime = 2.5;
  const spawn = spawnPoints.aurora[2];
  state.player.position.set(spawn.x, 0, spawn.z);
  state.player.velocity.x = 0;
  state.player.velocity.z = 0;
  state.player.velocity.y = 0;
  state.player.health = 100;
  state.armor = Math.max(0, state.armor);
  state.botSystem?.reset();
  state.economy?.buyBots();
  state.audio?.roundStart();
}

function updateRound(state, dt) {
  if (state.roundBannerTime > 0) {
    state.roundBannerTime -= dt;
    if (state.roundBannerTime <= 0 && state.phase !== 'ended' && state.phase !== 'matchover') {
      state.roundBanner = '';
    }
  }
  if (state.phase === 'matchover') return;
  if (state.phase === 'buy') {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
      state.phase = 'live';
      state.phaseTimer = ROUND_DURATION;
      state.buyOpen = false;
      state.roundBanner = 'ROUND LIVE';
      state.roundBannerTime = 2.2;
      state.audio?.roundStart();
    }
    return;
  }

  if (state.phase !== 'live') return;
  state.phaseTimer -= dt;
  updatePlayerObjective(state, dt);
  if (state.charge.planted) {
    state.charge.timer -= dt;
    state.charge.beepTimer -= dt;
    if (state.charge.beepTimer <= 0) {
      state.charge.beepTimer = Math.max(0.18, state.charge.timer / 30);
      state.audio?.beep();
    }
    if (state.charge.mesh) {
      state.charge.mesh.material.emissiveIntensity = 0.4 + (Math.sin(state.simTime * 12) + 1) * 1.2;
    }
    if (state.charge.timer <= 0) {
      state.audio?.grenade();
      finishRound(state, 'Aurora', 'UPLINK DETONATED');
      return;
    }
  }

  let auroraAlive = state.player.health > 0 ? 1 : 0;
  let glacierAlive = 0;
  for (const bot of state.bots) {
    if (bot.health <= 0) continue;
    if (bot.team === 'Aurora') auroraAlive += 1;
    else glacierAlive += 1;
  }
  if (auroraAlive === 0) {
    finishRound(state, 'Glacier', 'AURORA ELIMINATED');
  } else if (glacierAlive === 0) {
    finishRound(state, 'Aurora', 'GLACIER ELIMINATED');
  } else if (state.phaseTimer <= 0) {
    finishRound(state, state.charge.planted ? 'Aurora' : 'Glacier', 'TIME EXPIRED');
  }
}

function updatePlayerObjective(state, dt) {
  const player = state.player.position;
  const active = state.input.isDown('KeyE');
  const siteA = player.distanceTo(sitePositions.A) < 2.2;
  const siteB = player.distanceTo(sitePositions.B) < 2.2;
  const atSite = siteA || siteB;
  const currentSite = siteA ? 'A' : 'B';

  if (!atSite || state.player.health <= 0) {
    state.charge.progress = 0;
    state.charge.defuseProgress = 0;
    state.objectivePrompt = '';
    return;
  }

  if (!state.charge.planted) {
    state.charge.defuseProgress = 0;
    if (!active) {
      state.charge.progress = 0;
      state.objectivePrompt = `HOLD E TO PLANT · SITE ${currentSite}`;
      return;
    }
    state.charge.progress += dt;
    state.objectivePrompt = `HOLD E TO PLANT · ${Math.ceil(4 - state.charge.progress)}s`;
    if (state.charge.progress >= 4) state.rounds.plant(currentSite);
    return;
  }

  state.charge.progress = 0;
  if (state.charge.site !== currentSite) {
    state.charge.defuseProgress = 0;
    state.objectivePrompt = `UPLINK ARMED · SITE ${state.charge.site}`;
    return;
  }
  if (!active) {
    state.charge.defuseProgress = 0;
    state.objectivePrompt = `HOLD E TO DEFUSE · SITE ${currentSite}`;
    return;
  }
  state.charge.defuseProgress += dt;
  state.objectivePrompt = `HOLD E TO DEFUSE · ${Math.ceil(5 - state.charge.defuseProgress)}s`;
  if (state.charge.defuseProgress >= 5) state.rounds.defuse();
}

function finishRound(state, winner, reason) {
  if (state.phase !== 'live') return;
  state.phase = 'ended';
  state.phaseTimer = 4;
  state.scores[winner] += 1;
  state.roundBanner = `${winner.toUpperCase()} WIN · ${reason}`;
  state.roundBannerTime = 4;
  state.economy?.awardRound(winner === 'Aurora');
  state.audio?.beep();
  if (state.scores.Aurora >= 7 || state.scores.Glacier >= 7) {
    state.phase = 'matchover';
    state.roundBanner = `${winner.toUpperCase()} WIN THE MATCH`;
  }
}

function removeCharge(state) {
  const device = state.charge.mesh;
  if (!device) return;
  state.scene.remove(device);
  device.geometry.dispose();
  device.material.dispose();
  state.charge.mesh = null;
}

export function stepRoundEnd(state, dt) {
  if (state.phase !== 'ended') return;
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    state.roundNumber += 1;
    beginBuyPhase(state);
  }
}

export function plantedChargePosition(state, target = new THREE.Vector3()) {
  if (!state.charge.planted) return null;
  return target.copy(sitePositions[state.charge.site]);
}

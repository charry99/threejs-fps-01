import * as THREE from 'three';
import { WEAPONS, createWeaponState } from './weapons.js';

const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();
const startPoint = new THREE.Vector3();
const endPoint = new THREE.Vector3();

// Attach combat state and reusable shot helpers to the single game state.
export function initCombat(state) {
  state.weapons = WEAPONS;
  state.weaponIndex = 0;
  state.weaponStates = WEAPONS.map(createWeaponState);
  state.targets = [];
  state.hitMeshes = [];
  state.effects = [];
  state.lastShot = false;
  state.hitTime = 0;
  state.damageValue = 0;
  state.combat = {
    registerTarget(target) {
      state.targets.push(target);
      if (target.head) state.hitMeshes.push(target.head);
      if (target.body) state.hitMeshes.push(target.body);
    },
    selectWeapon(index) {
      if (index < 0 || index >= WEAPONS.length) return;
      state.weaponIndex = index;
    },
    reload() {
      const ammo = state.weaponStates[state.weaponIndex];
      if (ammo.reloading || ammo.mag >= WEAPONS[state.weaponIndex].magazineSize || ammo.reserve <= 0) return;
      ammo.reloading = true;
      ammo.reloadTimer = WEAPONS[state.weaponIndex].reloadTime;
      state.viewmodel.reload();
      state.audio?.reload();
    },
    update(dt) {
      updateAmmoAndCooldown(state, dt);
      updateEffects(state, dt);
      const weapon = WEAPONS[state.weaponIndex];
      const ammo = state.weaponStates[state.weaponIndex];
      const trigger = state.input.fireHeld;
      const click = state.input.consumeFireClick();
      const wantsShot = state.started && state.phase === 'live' && (weapon.automatic ? trigger : click);
      state.lastShot = false;
      if (wantsShot && ammo.cooldown <= 0 && !ammo.reloading && ammo.mag > 0) {
        fireShot(state, weapon, ammo);
      }
      state.hitTime = Math.max(0, state.hitTime - dt);
    }
  };
}

function updateAmmoAndCooldown(state, dt) {
  for (const ammo of state.weaponStates) {
    ammo.cooldown = Math.max(0, ammo.cooldown - dt);
    if (!ammo.reloading) continue;
    ammo.reloadTimer -= dt;
    if (ammo.reloadTimer <= 0) {
      const weapon = WEAPONS[state.weaponStates.indexOf(ammo)];
      const needed = weapon.magazineSize - ammo.mag;
      const loaded = Math.min(needed, ammo.reserve);
      ammo.mag += loaded;
      ammo.reserve -= loaded;
      ammo.reloading = false;
    }
  }
}

function spreadForShot(state, weapon) {
  const moving = Math.min(1, Math.hypot(state.player.velocity.x, state.player.velocity.z) / 6.3);
  const movementSpread = weapon.spreadMoving * moving;
  const airSpread = state.player.onGround ? 0 : weapon.spreadAirborne;
  const crouchBonus = state.player.crouched ? 0.65 : 1;
  return (weapon.spreadBase + movementSpread + airSpread) * crouchBonus;
}

function fireShot(state, weapon, ammo) {
  ammo.mag -= 1;
  ammo.cooldown = 1 / weapon.fireRate;
  state.lastShot = true;
  state.viewmodel.fire();
  state.audio?.shot(weapon.id);
  state.noise = { position: state.player.position.clone(), time: state.simTime, radius: 32 };
  state.input.addRecoil(weapon.recoilKick);

  const spread = spreadForShot(state, weapon);
  const hitTargets = state.hitMeshes;
  for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
    direction.set(0, 0, -1).applyQuaternion(state.camera.quaternion);
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();
    raycaster.set(state.camera.position, direction);
    raycaster.far = weapon.range;

    const intersections = raycaster.intersectObjects(hitTargets, false);
    const hit = intersections[0];
    if (hit && smokeBlocksShot(state, state.camera.position, hit.point)) continue;
    startPoint.copy(state.viewmodel.muzzleWorld);
    endPoint.copy(hit ? hit.point : state.camera.position).addScaledVector(direction, hit ? 0 : weapon.range);
    addTracer(state, startPoint, endPoint, weapon.tracerColor);

    if (!hit) continue;
    const target = state.targets.find(entry => entry.head === hit.object || entry.body === hit.object);
    if (!target || target.health <= 0) continue;
    const distanceScale = Math.max(0.35, 1 - hit.distance / weapon.range * 0.65);
    const isHead = target.head === hit.object;
    const damage = weapon.damage * (isHead ? weapon.headshotMultiplier : 1) * distanceScale;
    target.health = Math.max(0, target.health - damage);
    if (target.bot) target.bot.health = target.health;
    state.hitTime = 0.16;
    state.damageValue = Math.round(damage);
    state.audio?.hit(isHead);
    addImpact(state, hit.point);
    if (target.health <= 0 && !target.killAwarded) {
      target.killAwarded = true;
      state.economy?.awardKill();
      state.hud?.addKill('AURORA', weapon.name, target.id, isHead);
    }
  }
}

function smokeBlocksShot(state, from, to) {
  for (const cloud of state.smokeClouds) {
    const center = cloud.mesh.position;
    const segment = new THREE.Vector3().subVectors(to, from);
    const lengthSquared = segment.lengthSq();
    const along = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(center, from).dot(segment) / lengthSquared));
    const nearest = new THREE.Vector3().copy(from).addScaledVector(segment, along);
    if (nearest.distanceTo(center) < 4.2) return true;
  }
  return false;
}

function addTracer(state, from, to, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geometry, material);
  state.scene.add(line);
  state.effects.push({ object: line, life: 0.075, maxLife: 0.075 });
}

function addImpact(state, point) {
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc879 })
  );
  spark.position.copy(point);
  state.scene.add(spark);
  state.effects.push({ object: spark, life: 0.22, maxLife: 0.22 });
}

function updateEffects(state, dt) {
  for (let index = state.effects.length - 1; index >= 0; index -= 1) {
    const effect = state.effects[index];
    effect.life -= dt;
    if (effect.life > 0) continue;
    state.scene.remove(effect.object);
    effect.object.geometry.dispose();
    effect.object.material.dispose();
    state.effects.splice(index, 1);
  }
}

export function currentWeapon(state) {
  return WEAPONS[state.weaponIndex];
}

export function currentAmmo(state) {
  return state.weaponStates[state.weaponIndex];
}

import * as THREE from 'three';
import { laneRoutes, waypointGraph, sitePositions, spawnPoints } from './world.js';
import { WEAPONS } from './weapons.js';

const routeNodes = new Map(waypointGraph.map(node => [node.id, node]));
const botRifleMaterial = new THREE.MeshStandardMaterial({ color: 0x243943, metalness: 0.6, roughness: 0.4 });

function makeBotMesh(state, bot) {
  const teamColor = bot.team === 'Aurora' ? 0x60d6ee : 0xff873d;
  const armorMaterial = new THREE.MeshStandardMaterial({ color: teamColor, metalness: 0.28, roughness: 0.58 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x182831, roughness: 0.72 });
  const visorMaterial = new THREE.MeshStandardMaterial({ color: 0xb3f2ff, emissive: teamColor, emissiveIntensity: 0.45 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.84, 0.38), armorMaterial);
  torso.position.set(bot.position.x, bot.position.y + 1.1, bot.position.z);
  torso.castShadow = true;
  state.scene.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), darkMaterial);
  head.position.set(bot.position.x, bot.position.y + 1.72, bot.position.z);
  head.castShadow = true;
  state.scene.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.075, 0.09), visorMaterial);
  visor.position.set(bot.position.x, bot.position.y + 1.73, bot.position.z - 0.19);
  state.scene.add(visor);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.76, 0.3), darkMaterial);
    leg.position.set(bot.position.x + side * 0.2, bot.position.y + 0.4, bot.position.z);
    state.scene.add(leg);
    legs.push(leg);
  }

  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), botRifleMaterial);
  rifle.position.set(bot.position.x + 0.34, bot.position.y + 1.15, bot.position.z - 0.38);
  rifle.castShadow = true;
  state.scene.add(rifle);

  bot.meshes = { torso, head, visor, legs, rifle };
  bot.body = torso;
  bot.headZone = head;
  state.combat.registerTarget({
    id: bot.id,
    team: bot.team,
    health: bot.health,
    body: torso,
    head,
    bot
  });
}

function moveBot(bot, goal, dt, boxes) {
  const dx = goal.x - bot.position.x;
  const dz = goal.z - bot.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.55) {
    bot.velocity.x = 0;
    bot.velocity.z = 0;
    return distance;
  }

  const speed = bot.state === 'engage' ? 2.7 : 3.8;
  const stepX = (dx / distance) * speed * dt;
  const stepZ = (dz / distance) * speed * dt;
  const nextX = bot.position.x + stepX;
  const nextZ = bot.position.z + stepZ;

  if (!botBlocked(nextX, bot.position.z, boxes)) {
    bot.position.x = nextX;
    bot.velocity.x = stepX / dt;
  } else {
    bot.velocity.x = 0;
  }
  if (!botBlocked(bot.position.x, nextZ, boxes)) {
    bot.position.z = nextZ;
    bot.velocity.z = stepZ / dt;
  } else {
    bot.velocity.z = 0;
  }
  return distance;
}

function botBlocked(x, z, boxes) {
  const radius = 0.42;
  for (const box of boxes) {
    if (1.72 <= box.minY || 0 >= box.maxY) continue;
    if (x + radius <= box.minX || x - radius >= box.maxX) continue;
    if (z + radius <= box.minZ || z - radius >= box.maxZ) continue;
    return true;
  }
  return false;
}

function positionBot(bot) {
  const { x, y, z } = bot.position;
  bot.meshes.torso.position.set(x, y + 1.1, z);
  bot.meshes.head.position.set(x, y + 1.72, z);
  bot.meshes.visor.position.set(x, y + 1.73, z - 0.19);
  bot.meshes.legs[0].position.set(x - 0.2, y + 0.4, z);
  bot.meshes.legs[1].position.set(x + 0.2, y + 0.4, z);
  bot.meshes.rifle.position.set(x + 0.34, y + 1.15, z - 0.38);
  bot.meshes.torso.rotation.y = bot.facing;
  bot.meshes.head.rotation.y = bot.facing;
  bot.meshes.rifle.rotation.y = bot.facing;
}

function nearestEnemy(state, bot) {
  const result = bot.enemyScratch;
  result.player = false;
  result.bot = null;
  result.position = null;
  result.distance = Infinity;

  if (bot.team !== 'Aurora') {
    const distance = planarDistance(bot.position.x, bot.position.z, state.player.position.x, state.player.position.z);
    if (distance < result.distance && hasLineOfSight(state, bot.position, state.player.position.x, state.player.position.y + 1.35, state.player.position.z)) {
      result.player = true;
      result.position = state.player.position;
      result.distance = distance;
    }
  }
  for (const other of state.bots) {
    if (other.team === bot.team || other.health <= 0) continue;
    const distance = planarDistance(bot.position.x, bot.position.z, other.position.x, other.position.z);
    if (distance < result.distance && hasLineOfSight(state, bot.position, other.position.x, 1.1, other.position.z)) {
      result.player = false;
      result.bot = other;
      result.position = other.position;
      result.distance = distance;
    }
  }
  return result.position ? result : null;
}

function planarDistance(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

function hasLineOfSight(state, source, targetX, targetY, targetZ) {
  const fromX = source.x;
  const fromY = source.y + 1.25;
  const fromZ = source.z;
  for (const box of state.collisionBoxes) {
    if (segmentHitsBox(fromX, fromY, fromZ, targetX, targetY, targetZ, box)) return false;
  }
  for (const cloud of state.smokeClouds) {
    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const dz = targetZ - fromZ;
    const lengthSquared = dx * dx + dy * dy + dz * dz;
    const along = Math.max(0, Math.min(1, ((cloud.mesh.position.x - fromX) * dx + (cloud.mesh.position.y - fromY) * dy + (cloud.mesh.position.z - fromZ) * dz) / lengthSquared));
    const closestX = fromX + dx * along;
    const closestY = fromY + dy * along;
    const closestZ = fromZ + dz * along;
    if (Math.hypot(cloud.mesh.position.x - closestX, cloud.mesh.position.y - closestY, cloud.mesh.position.z - closestZ) < 4.2) return false;
  }
  return true;
}

function segmentHitsBox(x1, y1, z1, x2, y2, z2, box) {
  let near = 0;
  let far = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  if (!clipAxis(x1, dx, box.minX, box.maxX, near, far)) return false;
  let first = clipAxisFirst;
  let second = clipAxisSecond;
  near = Math.max(near, first);
  far = Math.min(far, second);
  if (near > far) return false;
  if (!clipAxis(y1, dy, box.minY, box.maxY, near, far)) return false;
  first = clipAxisFirst;
  second = clipAxisSecond;
  near = Math.max(near, first);
  far = Math.min(far, second);
  if (near > far) return false;
  if (!clipAxis(z1, dz, box.minZ, box.maxZ, near, far)) return false;
  first = clipAxisFirst;
  second = clipAxisSecond;
  near = Math.max(near, first);
  far = Math.min(far, second);
  if (near > far) return false;
  return far > 0 && near < 1;
}

let clipAxisFirst = 0;
let clipAxisSecond = 1;

function clipAxis(origin, delta, minimum, maximum, near, far) {
  if (Math.abs(delta) < 0.00001) {
    clipAxisFirst = near;
    clipAxisSecond = far;
    return origin >= minimum && origin <= maximum;
  }
  const inverse = 1 / delta;
  let first = (minimum - origin) * inverse;
  let second = (maximum - origin) * inverse;
  if (first > second) {
    const swap = first;
    first = second;
    second = swap;
  }
  clipAxisFirst = first;
  clipAxisSecond = second;
  return true;
}

function botShoot(state, bot, enemy) {
  if (bot.shotCooldown > 0 || bot.health <= 0) return;
  const weapon = WEAPONS[bot.weaponIndex || 0];
  bot.shotCooldown = 1 / weapon.fireRate + Math.random() * 0.12;
  bot.burstLeft -= 1;
  const hitChance = Math.max(0.28, 0.8 - enemy.distance * 0.008);
  if (Math.random() < hitChance) {
    if (enemy.player) {
      const armorScale = state.armor > 0 ? 0.55 : 1;
      state.player.health = Math.max(0, state.player.health - weapon.damage * 0.62 * armorScale);
      state.damageDirection = Math.atan2(bot.position.x - state.player.position.x, bot.position.z - state.player.position.z);
      state.damageDirectionTime = state.simTime + 0.55;
    } else {
      enemy.bot.health = Math.max(0, enemy.bot.health - weapon.damage * 0.62);
      enemy.bot.target.health = enemy.bot.health;
      if (enemy.bot.health <= 0 && !enemy.bot.target.killAwarded) {
        enemy.bot.target.killAwarded = true;
        state.hud?.addKill(bot.id, weapon.name, enemy.bot.id, false);
        if (bot.team === 'Aurora') state.economy?.awardKill();
      }
    }
  }
  state.noise = { position: bot.position.clone(), time: state.simTime, radius: 28 };
  bot.lastFired = state.simTime;
  bot.recentlySeenUntil = state.simTime + 2;
  state.audio?.shot('carbine');
}

function chooseRoute(bot) {
  const routeName = bot.id.charCodeAt(bot.id.length - 1) % 2 === 0 ? 'causeway' : 'frozenCreek';
  const ids = [...laneRoutes[routeName]];
  if (bot.team === 'Glacier') ids.reverse();
  return ids.map(id => routeNodes.get(id));
}

export function initBots(state) {
  state.bots = [];
  const definitions = [];
  for (let index = 0; index < 4; index += 1) {
    definitions.push({ team: 'Aurora', spawn: spawnPoints.aurora[index], carrier: index === 0 });
  }
  for (let index = 0; index < 5; index += 1) {
    definitions.push({ team: 'Glacier', spawn: spawnPoints.glacier[index % spawnPoints.glacier.length], carrier: false });
  }

  definitions.forEach((definition, index) => {
    const bot = {
      id: `${definition.team}-${index}`,
      team: definition.team,
      position: new THREE.Vector3(definition.spawn.x, 0, definition.spawn.z),
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      armor: 50,
      state: 'route',
      route: [],
      routeIndex: 0,
      reaction: 0.2 + Math.random() * 0.55,
      shotCooldown: Math.random() * 0.5,
      burstLeft: 0,
      facing: 0,
      grenadeInventory: { frag: 1, smoke: 1 },
      carrier: definition.carrier,
      holdTime: 0,
      target: null,
      enemyScratch: { player: false, bot: null, position: null, distance: Infinity },
      siteScratch: { key: 'A', distance: Infinity }
    };
    bot.route = chooseRoute(bot);
    makeBotMesh(state, bot);
    bot.target = state.targets[state.targets.length - 1];
    state.bots.push(bot);
  });

  state.botSystem = {
    update(dt) {
      for (const bot of state.bots) {
        if (bot.health <= 0) continue;
        updateBot(state, bot, dt);
      }
    },
    reset() {
      state.bots.forEach((bot, index) => {
        const side = bot.team === 'Aurora' ? 'aurora' : 'glacier';
        const spawn = spawnPoints[side][index % 5];
        bot.position.set(spawn.x, 0, spawn.z);
        bot.health = 100;
        bot.target.health = 100;
        bot.target.killAwarded = false;
        bot.state = 'route';
        bot.routeIndex = 0;
        bot.carrier = bot.team === 'Aurora' && index === 0;
        positionBot(bot);
      });
    }
  };
}

function updateBot(state, bot, dt) {
  bot.shotCooldown = Math.max(0, bot.shotCooldown - dt);
  const enemy = nearestEnemy(state, bot);
  if (enemy && enemy.distance < 20) {
    bot.recentlySeenUntil = state.simTime + 2;
  }
  if (enemy && enemy.distance < 42) {
    bot.state = 'engage';
    bot.facing = Math.atan2(enemy.position.x - bot.position.x, enemy.position.z - bot.position.z);
    bot.reaction -= dt;
    if (bot.reaction <= 0) {
      if (bot.burstLeft <= 0) bot.burstLeft = 2 + Math.floor(Math.random() * 4);
      botShoot(state, bot, enemy);
      if (bot.burstLeft <= 0) bot.reaction = 0.35 + Math.random() * 0.4;
    }
    if (enemy.distance < 8 && Math.random() < dt * 0.35) {
      bot.state = 'engage';
    }
  } else if (state.noise && state.simTime - state.noise.time < 3 && bot.position.distanceTo(state.noise.position) < state.noise.radius) {
    bot.state = 'react';
    moveBot(bot, state.noise.position, dt, state.collisionBoxes);
  } else {
    if (bot.carrier) {
      moveBot(bot, sitePositions.A, dt, state.collisionBoxes);
    } else {
      updateRouteState(state, bot, dt);
    }
  }

  if (bot.carrier && state.rounds && state.rounds.phase === 'live') {
    const site = nearestSite(bot.position, bot.siteScratch);
    if (site.distance < 2.1 && !state.rounds.charge.planted) {
      bot.state = 'plant';
      bot.holdTime += dt;
      if (bot.holdTime >= 4) {
        state.rounds.plant(site.key, bot);
        bot.carrier = false;
        bot.holdTime = 0;
      }
    }
  }

  if (bot.team === 'Glacier' && state.rounds?.charge.planted) {
    const sitePosition = sitePositions[state.rounds.charge.site];
    const distance = bot.position.distanceTo(sitePosition);
    if (distance > 1.8) {
      moveBot(bot, sitePosition, dt, state.collisionBoxes);
      bot.state = 'route';
    } else {
      bot.state = 'defuse';
      bot.holdTime += dt;
      if (bot.holdTime >= 5) {
        state.rounds.defuse(bot);
        bot.holdTime = 0;
      }
    }
  }

  if (enemy && enemy.distance < 17 && Math.random() < dt * 0.018) {
    const grenadeIndex = Math.random() < 0.55 ? 0 : 1;
    const grenadeKey = grenadeIndex === 0 ? 'frag' : 'smoke';
    if (bot.grenadeInventory[grenadeKey] > 0) {
      bot.grenadeInventory[grenadeKey] -= 1;
      state.grenade.throwFrom(bot.position, enemy.position, grenadeIndex);
      state.noise = { position: bot.position.clone(), time: state.simTime, radius: 30 };
    }
  }

  positionBot(bot);
}

function nearestSite(position, result) {
  const a = position.distanceTo(sitePositions.A);
  const b = position.distanceTo(sitePositions.B);
  result.key = a < b ? 'A' : 'B';
  result.distance = Math.min(a, b);
  return result;
}

function updateRouteState(state, bot, dt) {
  const route = bot.route;
  const waypoint = route[bot.routeIndex % route.length];
  const distance = moveBot(bot, waypoint, dt, state.collisionBoxes);
  bot.state = 'route';
  if (waypoint.hold && distance < 1) {
    bot.state = 'hold';
    bot.holdTime += dt;
    if (bot.holdTime < 2.2) return;
    bot.holdTime = 0;
  }
  if (distance < 0.8) {
    bot.routeIndex = (bot.routeIndex + 1) % route.length;
  }
}

import * as THREE from 'three';

export const GRENADE_TYPES = [
  { id: 'frag', name: 'Frostbite Frag', fuse: 2.2, radius: 8 },
  { id: 'smoke', name: 'Whiteout Smoke', fuse: 1.1, duration: 7 },
  { id: 'flash', name: 'Aurora Flash', fuse: 1.4, radius: 16 }
];

// Give the player one of each field grenade and a reusable simulation queue.
export function initGrenades(state) {
  state.grenadeIndex = 0;
  state.grenadeCounts = [1, 1, 1];
  state.grenades = [];
  state.smokeClouds = [];
  state.flashUntil = 0;
  state.grenade = {
    cycle() {
      state.grenadeIndex = (state.grenadeIndex + 1) % GRENADE_TYPES.length;
    },
    throw() {
      if (state.phase !== 'live') return;
      if (state.grenadeCounts[state.grenadeIndex] <= 0) return;
      state.grenadeCounts[state.grenadeIndex] -= 1;
      const type = GRENADE_TYPES[state.grenadeIndex];
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshStandardMaterial({ color: type.id === 'frag' ? 0xff873d : 0x83dff0, metalness: 0.5, roughness: 0.4 })
      );
      mesh.position.copy(state.camera.position);
      state.scene.add(mesh);
      const velocity = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
      velocity.multiplyScalar(11).add(new THREE.Vector3(0, 3.2, 0));
      state.grenades.push({ type, mesh, velocity, fuse: type.fuse });
    },
    throwFrom(origin, target, grenadeIndex = 0) {
      if (state.phase !== 'live') return;
      const grenadeType = GRENADE_TYPES[grenadeIndex];
      const grenadeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshStandardMaterial({ color: grenadeType.id === 'frag' ? 0xff873d : 0x83dff0, metalness: 0.5, roughness: 0.4 })
      );
      grenadeMesh.position.set(origin.x, origin.y + 1.1, origin.z);
      state.scene.add(grenadeMesh);
      const velocity = new THREE.Vector3(target.x - origin.x, 1.8, target.z - origin.z).normalize().multiplyScalar(10);
      velocity.y += 2.4;
      state.grenades.push({ type: grenadeType, mesh: grenadeMesh, velocity, fuse: grenadeType.fuse });
    },
    update(dt) {
      updateThrownGrenades(state, dt);
      updateSmoke(state, dt);
      if (state.flashUntil > state.simTime) {
        state.flashElement.style.opacity = Math.min(1, (state.flashUntil - state.simTime) / 0.25);
      } else {
        state.flashElement.style.opacity = '0';
      }
    }
  };
}

function updateThrownGrenades(state, dt) {
  for (let index = state.grenades.length - 1; index >= 0; index -= 1) {
    const grenade = state.grenades[index];
    grenade.fuse -= dt;
    grenade.velocity.y -= 9.8 * dt;
    grenade.mesh.position.addScaledVector(grenade.velocity, dt);
    if (grenade.mesh.position.y < 0.18) {
      grenade.mesh.position.y = 0.18;
      grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.42;
      grenade.velocity.x *= 0.76;
      grenade.velocity.z *= 0.76;
    }
    bounceFromBoxes(grenade, state.collisionBoxes);
    if (grenade.fuse > 0) continue;
    detonate(state, grenade);
    state.scene.remove(grenade.mesh);
    grenade.mesh.geometry.dispose();
    grenade.mesh.material.dispose();
    state.grenades.splice(index, 1);
  }
}

function bounceFromBoxes(grenade, boxes) {
  const p = grenade.mesh.position;
  for (const box of boxes) {
    if (p.x < box.minX || p.x > box.maxX || p.z < box.minZ || p.z > box.maxZ) continue;
    if (p.y < box.maxY && p.y > box.minY) {
      grenade.velocity.multiplyScalar(-0.42);
      p.addScaledVector(grenade.velocity, 0.025);
      return;
    }
  }
}

function detonate(state, grenade) {
  state.audio?.grenade();
  if (grenade.type.id === 'frag') {
    for (const target of state.targets) {
      const position = target.body.position;
      const distance = position.distanceTo(grenade.mesh.position);
      if (distance < grenade.type.radius) {
        target.health = Math.max(0, target.health - 95 * (1 - distance / grenade.type.radius));
      }
    }
    state.cameraShake = 0.35;
    return;
  }

  if (grenade.type.id === 'smoke') {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xccecf2, transparent: true, opacity: 0.48, depthWrite: false })
    );
    cloud.position.copy(grenade.mesh.position);
    state.scene.add(cloud);
    state.smokeClouds.push({ mesh: cloud, life: grenade.type.duration, maxLife: grenade.type.duration, age: 0 });
    return;
  }

  const distance = state.camera.position.distanceTo(grenade.mesh.position);
  if (distance < grenade.type.radius) {
    state.flashUntil = state.simTime + 1.5 * (1 - distance / grenade.type.radius * 0.5);
  }
}

function updateSmoke(state, dt) {
  for (let index = state.smokeClouds.length - 1; index >= 0; index -= 1) {
    const cloud = state.smokeClouds[index];
    cloud.life -= dt;
    cloud.age += dt;
    const radius = Math.min(4.5, cloud.age * 3.2);
    cloud.mesh.scale.setScalar(radius);
    cloud.mesh.material.opacity = Math.min(0.48, cloud.life / 2 * 0.48);
    if (cloud.life > 0) continue;
    state.scene.remove(cloud.mesh);
    cloud.mesh.geometry.dispose();
    cloud.mesh.material.dispose();
    state.smokeClouds.splice(index, 1);
  }
}

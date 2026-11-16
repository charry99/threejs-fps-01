import * as THREE from 'three';

const iceMetal = new THREE.MeshStandardMaterial({
  color: 0x8fcddd,
  metalness: 0.72,
  roughness: 0.28
});
const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x263d49,
  metalness: 0.68,
  roughness: 0.38
});
const orangeMetal = new THREE.MeshStandardMaterial({
  color: 0xff873d,
  metalness: 0.42,
  roughness: 0.35
});
const glass = new THREE.MeshStandardMaterial({
  color: 0x62d9ff,
  emissive: 0x147ca1,
  emissiveIntensity: 0.8,
  metalness: 0.65,
  roughness: 0.18
});

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, length, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 12),
    material
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Build a legible cold-weather rifle from simple, readable mechanical shapes.
export function createViewmodel(camera) {
  const root = new THREE.Group();
  root.position.set(0.43, -0.36, -0.72);
  root.scale.setScalar(0.68);
  root.rotation.y = -0.055;
  camera.add(root);

  addBox(root, [0.23, 0.17, 0.54], [0, 0, 0], iceMetal); // receiver
  addBox(root, [0.16, 0.105, 0.34], [0, -0.012, -0.39], darkMetal); // handguard
  addCylinder(root, 0.035, 0.045, 0.57, [0, 0.015, -0.77], darkMetal); // barrel
  addCylinder(root, 0.07, 0.055, 0.1, [0, 0.015, -1.08], orangeMetal); // muzzle brake
  addBox(root, [0.13, 0.3, 0.2], [0, -0.23, -0.02], darkMetal); // magazine
  addBox(root, [0.14, 0.29, 0.34], [0, -0.015, 0.39], darkMetal); // stock
  addBox(root, [0.17, 0.12, 0.08], [0, -0.02, 0.57], iceMetal); // shoulder pad
  addBox(root, [0.19, 0.025, 0.49], [0, 0.105, -0.13], darkMetal); // scope rail
  addBox(root, [0.045, 0.14, 0.04], [0, 0.18, -0.03], orangeMetal); // rear sight
  addBox(root, [0.04, 0.12, 0.035], [0, 0.16, -0.94], orangeMetal); // front sight
  addBox(root, [0.095, 0.075, 0.22], [0, 0.22, -0.29], glass); // optic
  addBox(root, [0.25, 0.035, 0.08], [0, 0.016, -0.48], orangeMetal); // handguard stripe
  addBox(root, [0.05, 0.18, 0.11], [0, -0.17, 0.12], iceMetal); // grip

  for (let index = 0; index < 4; index += 1) {
    addBox(root, [0.17, 0.018, 0.025], [0, -0.09 - index * 0.035, -0.4], iceMetal);
  }

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({
      color: 0xffd58a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  flash.position.set(0, 0.015, -1.22);
  root.add(flash);

  const flashLight = new THREE.PointLight(0xffb45e, 0, 8, 2);
  flashLight.position.set(0, 0.02, -1.16);
  root.add(flashLight);

  const animation = {
    time: 0,
    recoil: 0,
    reload: 0,
    flash: 0,
    movement: 0
  };

  return {
    root,
    flash,
    flashLight,
    animation,
    muzzleWorld: new THREE.Vector3(),
    fire() {
      animation.recoil = Math.min(0.12, animation.recoil + 0.055);
      animation.flash = 0.07;
      flash.material.opacity = 1;
      flashLight.intensity = 18;
    },
    reload() {
      animation.reload = 0.42;
    },
    update(dt, player, yaw) {
      animation.time += dt;
      animation.recoil = Math.max(0, animation.recoil - dt * 0.22);
      animation.reload = Math.max(0, animation.reload - dt);
      animation.flash = Math.max(0, animation.flash - dt);
      animation.movement = Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / 6.3);

      const bob = Math.sin(animation.time * 10) * 0.012 * animation.movement;
      const aimSway = Math.sin(yaw * 1.8) * 0.012;
      const reloadDip = Math.sin((0.42 - animation.reload) / 0.42 * Math.PI) * 0.18;
      root.position.y = -0.36 + bob - reloadDip;
      root.position.x = 0.43 + aimSway;
      root.position.z = -0.72 + animation.recoil;
      flash.material.opacity = animation.flash > 0 ? animation.flash / 0.07 : 0;
      flashLight.intensity = animation.flash > 0 ? 18 * animation.flash / 0.07 : 0;
      this.muzzleWorld.set(0, 0.015, -1.22);
      root.localToWorld(this.muzzleWorld);
    }
  };
}

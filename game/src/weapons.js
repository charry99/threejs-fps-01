// Weapon tuning for the Whiteout Relay arsenal.
export const WEAPONS = [
  {
    id: 'carbine',
    name: 'AR-4 Boreal Carbine',
    role: 'Balanced starter rifle',
    damage: 27,
    headshotMultiplier: 2.1,
    fireRate: 8.5,
    magazineSize: 30,
    reserveAmmo: 90,
    reloadTime: 1.8,
    recoilKick: 0.012,
    spreadBase: 0.006,
    spreadMoving: 0.025,
    spreadAirborne: 0.04,
    automatic: true,
    pellets: 1,
    range: 100,
    tracerColor: 0x83ecff
  },
  {
    id: 'longrifle',
    name: 'LR-9 Stillwatch',
    role: 'Slow precision rifle',
    damage: 72,
    headshotMultiplier: 2.5,
    fireRate: 1.4,
    magazineSize: 8,
    reserveAmmo: 32,
    reloadTime: 2.5,
    recoilKick: 0.035,
    spreadBase: 0.0015,
    spreadMoving: 0.045,
    spreadAirborne: 0.075,
    automatic: false,
    pellets: 1,
    range: 160,
    tracerColor: 0xffbd70
  },
  {
    id: 'smg',
    name: 'SM-2 Drift',
    role: 'Fast close-range SMG',
    damage: 17,
    headshotMultiplier: 1.8,
    fireRate: 13,
    magazineSize: 36,
    reserveAmmo: 108,
    reloadTime: 1.65,
    recoilKick: 0.009,
    spreadBase: 0.014,
    spreadMoving: 0.035,
    spreadAirborne: 0.055,
    automatic: true,
    pellets: 1,
    range: 58,
    tracerColor: 0x79a7ff
  },
  {
    id: 'shotgun',
    name: 'SG-6 Avalanche',
    role: 'Heavy short-range scattergun',
    damage: 13,
    headshotMultiplier: 1.55,
    fireRate: 1.1,
    magazineSize: 6,
    reserveAmmo: 30,
    reloadTime: 2.3,
    recoilKick: 0.045,
    spreadBase: 0.045,
    spreadMoving: 0.06,
    spreadAirborne: 0.09,
    automatic: false,
    pellets: 8,
    range: 32,
    tracerColor: 0xff873d
  },
  {
    id: 'pistol',
    name: 'P-3 Skipper',
    role: 'Quick sidearm',
    damage: 21,
    headshotMultiplier: 1.9,
    fireRate: 5,
    magazineSize: 15,
    reserveAmmo: 60,
    reloadTime: 1.25,
    recoilKick: 0.016,
    spreadBase: 0.009,
    spreadMoving: 0.027,
    spreadAirborne: 0.045,
    automatic: false,
    pellets: 1,
    range: 72,
    tracerColor: 0xffd79a
  }
];

// Create independent ammunition and timing state for a weapon slot.
export function createWeaponState(weapon) {
  return {
    mag: weapon.magazineSize,
    reserve: weapon.reserveAmmo,
    cooldown: 0,
    reloading: false,
    reloadTimer: 0
  };
}

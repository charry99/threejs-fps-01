import { WEAPONS } from './weapons.js';
import { GRENADE_TYPES } from './grenades.js';

export const WEAPON_PRICES = [
  0,
  2700,
  1900,
  3200,
  500
];

export const GRENADE_PRICES = [
  300,
  400,
  250
];

export function initEconomy(state) {
  state.money = 4200;
  state.armor = 0;
  state.buyOpen = false;
  state.economy = {
    buyWeapon(index) {
      const price = WEAPON_PRICES[index];
      if (state.phase !== 'buy' || state.money < price) return false;
      state.money -= price;
      state.weaponIndex = index;
      const weapon = WEAPONS[index];
      const ammo = state.weaponStates[index];
      ammo.mag = weapon.magazineSize;
      ammo.reserve = weapon.reserveAmmo;
      return true;
    },
    buyGrenade(index) {
      const price = GRENADE_PRICES[index];
      if (state.phase !== 'buy' || state.money < price) return false;
      state.money -= price;
      state.grenadeCounts[index] += 1;
      return true;
    },
    buyArmor() {
      if (state.phase !== 'buy' || state.money < 650 || state.armor >= 100) return false;
      state.money -= 650;
      state.armor = 100;
      return true;
    },
    awardRound(won) {
      state.money += won ? 3250 : 1900;
      for (const bot of state.bots || []) {
        bot.money = (bot.money || 4200) + (bot.team === (won ? 'Aurora' : 'Glacier') ? 3250 : 1900);
      }
    },
    awardKill() {
      state.money += 300;
    },
    awardPlant() {
      state.money += 300;
    },
    buyBots() {
      for (const bot of state.bots || []) {
        bot.money = bot.money || 4200;
        const botNumber = Number(bot.id.split('-').pop()) || 0;
        const desiredIndex = [0, 2, 1][botNumber % 3];
        const desiredPrice = WEAPON_PRICES[desiredIndex];
        const choice = desiredPrice <= bot.money
          ? { index: desiredIndex, price: desiredPrice }
          : { index: 0, price: 0 };
        bot.money -= choice.price;
        bot.weaponIndex = choice.index;
      }
    }
  };
}

export function getBuyItems() {
  return {
    weapons: WEAPONS.map((weapon, index) => ({
      name: weapon.name,
      price: WEAPON_PRICES[index],
      index
    })),
    grenades: GRENADE_TYPES.map((grenade, index) => ({
      name: grenade.name,
      price: GRENADE_PRICES[index],
      index
    }))
  };
}

import { currentAmmo, currentWeapon } from './combat.js';
import { getBuyItems } from './economy.js';
import { sitePositions } from './world.js';

export function initHud(state) {
  const hud = document.querySelector('#hud');
  state.hudNodes = {
    money: document.querySelector('#money-readout'),
    phase: document.querySelector('#score'),
    prompt: document.querySelector('#objective-prompt'),
    vignette: document.querySelector('#health-vignette'),
    damageDirection: document.querySelector('#damage-direction'),
    killfeed: document.querySelector('#killfeed'),
    buy: document.querySelector('#buy-menu'),
    timer: document.querySelector('#round-timer'),
    score: document.querySelector('#score'),
    banner: document.querySelector('#round-banner'),
    minimap: document.querySelector('#minimap')
  };
  state.hudNodes.money.style.cssText = 'position:absolute;left:32px;bottom:67px;color:#ffbd70;font:13px ui-monospace,monospace;';
  state.hudNodes.phase.style.cssText = 'position:absolute;left:50%;top:72px;transform:translateX(-50%);color:#91a9b5;font:11px ui-monospace,monospace;letter-spacing:.16em;white-space:nowrap;';
  state.hudNodes.prompt.style.cssText = 'position:absolute;left:50%;top:58%;transform:translateX(-50%);color:#ffbd70;font:18px ui-monospace,monospace;text-shadow:0 2px 8px #000;';
  state.hudNodes.vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 0 rgba(255,20,20,0);';
  document.querySelector('#damage-number').style.cssText = 'position:fixed;left:calc(50% + 24px);top:calc(50% - 22px);color:#ffbd70;font:14px ui-monospace,monospace;text-shadow:0 1px 4px #000;';
  state.hudNodes.damageDirection.style.cssText = 'position:absolute;left:50%;top:50%;color:#ff6b52;font-size:34px;opacity:0;transform-origin:center;';
  state.hudNodes.healthBar = document.createElement('div');
  state.hudNodes.healthBar.style.cssText = 'position:absolute;left:32px;bottom:19px;width:145px;height:4px;background:#28434d;';
  state.hudNodes.healthBarFill = document.createElement('div');
  state.hudNodes.healthBarFill.style.cssText = 'height:100%;width:100%;background:#70d9ed;';
  state.hudNodes.healthBar.appendChild(state.hudNodes.healthBarFill);
  hud.appendChild(state.hudNodes.healthBar);
  buildBuyMenu(state);

  state.hud = {
    update() {
      drawHud(state);
    },
    addKill(killer, weapon, victim, headshot) {
      const row = document.createElement('div');
      row.textContent = `${killer}  ▸  ${weapon}  ▸  ${victim}${headshot ? '  ◈' : ''}`;
      row.style.cssText = 'padding:4px 8px;margin:3px 0;background:#07131dcc;color:#d9f7ff;border-right:2px solid #ff873d;';
      state.hudNodes.killfeed.prepend(row);
      setTimeout(() => row.remove(), 4500);
    }
  };
}

function buildBuyMenu(state) {
  const panel = state.hudNodes.buy;
  const funds = document.querySelector('#buy-funds');
  const items = document.querySelector('#buy-items');
  panel.appendChild(funds);
  panel.appendChild(items);
  panel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:80vh;overflow:auto;padding:22px;background:#07131df2;border:1px solid #74cde655;color:#eaf7fa;display:none;pointer-events:auto;';
  panel.querySelector('h2').style.color = '#9deaff';
  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-kind]');
    if (!button) return;
    const index = Number(button.dataset.index);
    let bought = false;
    if (button.dataset.kind === 'weapon') bought = state.economy.buyWeapon(index);
    if (button.dataset.kind === 'grenade') bought = state.economy.buyGrenade(index);
    if (button.dataset.kind === 'armor') bought = state.economy.buyArmor();
    if (bought) state.audio?.purchase();
  });
}

function drawHud(state) {
  const nodes = state.hudNodes;
  const weapon = currentWeapon(state);
  const ammo = currentAmmo(state);
  document.querySelector('#ammo-mag').textContent = String(ammo.mag);
  document.querySelector('#ammo-reserve').textContent = `/ ${ammo.reserve}`;
  document.querySelector('#health').firstChild.textContent = `${Math.ceil(state.player.health)} `;
  document.querySelector('#ammo').dataset.weapon = weapon.name;
  document.querySelector('#aurora-score').textContent = String(state.scores.Aurora);
  document.querySelector('#glacier-score').textContent = String(state.scores.Glacier);
  nodes.timer.textContent = formatTime(state.phase === 'buy' ? state.phaseTimer : state.charge.planted ? state.charge.timer : state.phaseTimer);
  nodes.money.textContent = `CREDITS  $${state.money}`;
  nodes.phase.textContent = `ROUND ${String(state.roundNumber).padStart(2, '0')} · ${state.phase.toUpperCase()}`;
  nodes.prompt.textContent = state.objectivePrompt || '';
  nodes.banner.textContent = state.roundBanner || '';
  nodes.banner.style.display = state.roundBanner ? 'grid' : 'none';
  nodes.buy.style.display = state.phase === 'buy' || state.buyOpen ? 'block' : 'none';
  document.querySelector('#buy-funds').textContent = `AVAILABLE CREDITS: $${state.money}`;
  updateBuyItems(state);
  const healthRatio = Math.max(0, 1 - state.player.health / 100);
  const pulse = 0.025 + Math.sin(state.simTime * 8) * 0.018;
  nodes.vignette.style.boxShadow = `inset 0 0 90px rgba(190,20,25,${healthRatio * pulse})`;
  nodes.healthBarFill.style.width = `${Math.max(0, state.player.health)}%`;
  nodes.healthBarFill.style.background = state.player.health < 35 ? '#ff5547' : '#70d9ed';
  nodes.damageDirection.style.opacity = state.simTime < (state.damageDirectionTime || 0) ? '0.9' : '0';
  nodes.damageDirection.style.transform = `translate(-50%,-50%) rotate(${state.damageDirection || 0}rad)`;
  drawMinimap(state, nodes.minimap);
  document.querySelector('#hitmarker').style.opacity = state.hitTime > 0 ? '1' : '0';
  document.querySelector('#crosshair').style.transform = `translate(-50%,-50%) scale(${1 + Math.hypot(state.player.velocity.x, state.player.velocity.z) * 0.035})`;
  document.querySelector('#damage-number').textContent = state.hitTime > 0 ? String(state.damageValue) : '';
  nodes.prompt.dataset.damageDirection = String(state.damageDirection || 0);
}

function updateBuyItems(state) {
  const container = document.querySelector('#buy-items');
  if (container.dataset.built) return;
  container.dataset.built = '1';
  container.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:7px;';
  const catalog = getBuyItems();
  for (const weapon of catalog.weapons) {
    addBuyButton(container, 'weapon', weapon.index, weapon.name, weapon.price);
  }
  for (const grenade of catalog.grenades) {
    addBuyButton(container, 'grenade', grenade.index, grenade.name, grenade.price);
  }
  addBuyButton(container, 'armor', 0, 'Insulated armor', 650);
}

function addBuyButton(parent, kind, index, name, price) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.kind = kind;
  button.dataset.index = String(index);
  button.textContent = `${name}  ·  $${price}`;
  button.style.cssText = 'padding:10px;text-align:left;color:#eaf7fa;background:#122632;border:1px solid #74cde644;cursor:pointer;';
  parent.appendChild(button);
}

function drawMinimap(state, canvas) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#102f3d';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#b8f4ff';
  context.lineWidth = 2;
  context.strokeRect(8, 8, width - 16, height - 16);
  context.fillStyle = '#3d8093';
  context.fillRect(9, 52, width - 18, 10);
  context.fillRect(9, 77, width - 18, 12);
  context.fillRect(9, 102, width - 18, 11);
  context.strokeStyle = '#85d4e7';
  context.lineWidth = 1;
  context.strokeRect(10, 53, width - 20, 8);
  context.strokeRect(10, 79, width - 20, 8);
  context.strokeRect(10, 104, width - 20, 8);
  drawSite(context, sitePositions.A, 'A', width, height);
  drawSite(context, sitePositions.B, 'B', width, height);
  drawDot(context, state.player.position.x, state.player.position.z, '#eaffff', width, height, 4);
  context.save();
  context.translate(mapX(state.player.position.x, width), mapY(state.player.position.z, height));
  context.rotate(state.input.yaw);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(0, -6);
  context.lineTo(-4, 4);
  context.lineTo(4, 4);
  context.closePath();
  context.fill();
  context.restore();
  for (const bot of state.bots) {
    const visible = bot.team === 'Aurora' || state.simTime < (bot.recentlySeenUntil || 0) || state.simTime - (bot.lastFired || -10) < 2;
    if (!visible || bot.health <= 0) continue;
    drawDot(context, bot.position.x, bot.position.z, bot.team === 'Aurora' ? '#58d9ee' : '#ff873d', width, height, 2.5);
  }
  if (state.charge.planted && Math.floor(state.simTime * 4) % 2 === 0) {
    const site = sitePositions[state.charge.site];
    drawDot(context, site.x, site.z, '#ff4238', width, height, 5);
  }
}

function drawSite(context, position, label, width, height) {
  context.fillStyle = '#ff9b48';
  context.strokeStyle = '#ffd09e';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(mapX(position.x, width), mapY(position.z, height), 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#fff';
  context.font = 'bold 13px monospace';
  context.fillText(label, mapX(position.x, width) - 4, mapY(position.z, height) + 5);
}

function drawDot(context, x, z, color, width, height, radius) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(mapX(x, width), mapY(z, height), radius, 0, Math.PI * 2);
  context.fill();
}

function mapX(x, width) {
  return 8 + (x + 41) / 82 * (width - 16);
}

function mapY(z, height) {
  return 8 + (z + 34) / 68 * (height - 16);
}

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

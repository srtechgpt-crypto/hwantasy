import { assertLevel, finite, integer, random, rollInt } from './common.js';

function check(stats, mon, playerLevel, bal) {
  assertLevel(playerLevel, bal);
  if (!integer(mon?.level, 1) || !finite(mon?.atk) || !finite(mon?.def) ||
      !integer(stats?.weapon?.min, 0) || !integer(stats?.weapon?.max, stats.weapon.min) ||
      !integer(stats?.weapon?.enchant) || !finite(stats?.atkBonus) || !finite(stats?.def) ||
      !finite(stats?.armor?.def) || !integer(stats?.armor?.enchant)) throw new TypeError('전투 능력치가 올바르지 않습니다');
}
const chance = (base, difference, c) => Math.min(c.maxHit, Math.max(c.minHit, base + difference * c.levelHit));
export function playerAttack(stats, mon, playerLevel, rng, bal) {
  check(stats, mon, playerLevel, bal);
  const c = bal.combat;
  if (random(rng) >= chance(c.playerHit, playerLevel - mon.level, c)) return { hit: false, dmg: 0 };
  const die = rollInt(stats.weapon.min, stats.weapon.max, rng);
  return { hit: true, dmg: Math.max(c.minDamage, die + stats.weapon.enchant * c.weaponEnchantDamage + stats.atkBonus - Math.floor(mon.def / c.monsterDefDivisor)) };
}
export function monsterAttack(mon, stats, playerLevel, rng, bal) {
  check(stats, mon, playerLevel, bal);
  const c = bal.combat;
  if (random(rng) >= chance(c.monsterHit, mon.level - playerLevel, c)) return { hit: false, dmg: 0 };
  return { hit: true, dmg: Math.max(c.minDamage, mon.atk - stats.armor.def - stats.armor.enchant - stats.def) };
}

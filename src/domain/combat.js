import { assertLevel, finite, integer, random, rollInt } from './common.js';

function check(stats, mon, playerLevel, bal) {
  assertLevel(playerLevel, bal);
  if (!integer(mon?.level, 1) || !finite(mon?.atk) || !finite(mon?.def) ||
      !integer(stats?.weapon?.min, 0) || !integer(stats?.weapon?.max, stats.weapon.min) ||
      !integer(stats?.weapon?.enchant) || !integer(stats?.dmgBonus) || !integer(stats?.def) || !integer(stats?.hitBonus)) throw new TypeError('전투 능력치가 올바르지 않습니다');
}
// 8차: 명중 = 기본 + 레벨 차 + 추가(%p, 민첩·장갑)을 모두 더한 뒤 한 번만 상·하한. 백분율 정수로 계산(소수 오차 방지)
const chance = (base, difference, c, extraPct = 0) =>
  Math.min(c.maxHit, Math.max(c.minHit, Math.round(base * 100 + difference * c.levelHit * 100 + extraPct) / 100));
// 5차: mult(스킬 피해 배수, 기본 1, 소수 둘째 자리까지) — 순서: 명중 판정(빗나가면 0) → 기존 피해(최소 1) → × mult 내림 → 최소 1
// 9차(⑤ #1·#2): 치명 — stats.critPct가 양수이고 noCrit이 아니면 주사위 다음에 난수 하나 더(없으면 난수를 더 쓰지 않음).
// 배수는 스킬 배수 × 치명 배수를 백분율 정수로 곱한 뒤 마지막에 한 번만 내림. 난수 호출 수: 빗나감 1 · 치명 없음 2 · 치명 판정 3
export function playerAttack(stats, mon, playerLevel, rng, bal, { mult = 1, noCrit = false } = {}) {
  check(stats, mon, playerLevel, bal);
  if (!finite(mult) || mult <= 0) throw new RangeError('피해 배수가 올바르지 않습니다');
  const critPct = noCrit ? 0 : stats.critPct ?? 0;
  if (!finite(critPct) || critPct < 0 || critPct > 100) throw new RangeError('치명 확률이 올바르지 않습니다');
  const c = bal.combat;
  if (random(rng) >= chance(c.playerHit, playerLevel - mon.level, c, stats.hitBonus)) return { hit: false, dmg: 0 };
  const die = rollInt(stats.weapon.min, stats.weapon.max, rng);
  const base = Math.max(c.minDamage, die + stats.weapon.enchant * c.weaponEnchantDamage + stats.dmgBonus - Math.floor(mon.def / c.monsterDefDivisor));
  // 배수는 백분율 정수로 바꿔 곱한다(부동소수점 내림 오차 방지: 90 × 0.7 = 62.999… 같은 경우)
  const crit = critPct > 0 && random(rng) < critPct / 100;
  const pct = Math.round(mult * 100) * (crit ? Math.round(c.critMult * 100) : 100);
  const dmg = Math.max(c.minDamage, Math.floor((base * pct) / 10000));
  return crit ? { hit: true, dmg, crit: true } : { hit: true, dmg };
}
// 5차: reduce(받는 피해 감소율 0 이상 1 미만, 소수 둘째 자리까지) — 순서: 명중 → 기존 피해(최소 1) → × (1 − reduce) 내림 → 최소 1
// 9차(⑤ #2): blockPct(막기 확률 %, 0~100) — 명중 뒤 난수 하나로 막으면 즉시 피해 0(최소 1 없음). blockPct 0이면 난수를 더 쓰지 않음.
// reduce는 incomingReduce로 합산·상한을 거친 값
export function monsterAttack(mon, stats, playerLevel, rng, bal, { reduce = 0, blockPct = 0 } = {}) {
  check(stats, mon, playerLevel, bal);
  if (!finite(reduce) || reduce < 0 || reduce >= 1) throw new RangeError('피해 감소율이 올바르지 않습니다');
  if (!finite(blockPct) || blockPct < 0 || blockPct > 100) throw new RangeError('막기 확률이 올바르지 않습니다');
  const c = bal.combat;
  if (random(rng) >= chance(c.monsterHit, mon.level - playerLevel, c)) return { hit: false, dmg: 0 };
  if (blockPct > 0 && random(rng) < blockPct / 100) return { hit: true, dmg: 0, blocked: true };
  // 8차: stats.def에 모든 방어구(강화 포함)와 레벨·체력 방어가 이미 들어 있다 — 한 번만 뺀다
  const dmg = Math.max(c.minDamage, mon.atk - stats.def);
  return { hit: true, dmg: Math.max(c.minDamage, Math.floor((dmg * Math.round((1 - reduce) * 100)) / 100)) };
}

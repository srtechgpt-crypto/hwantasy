import { assertLevel, assertRates, random, rollInt } from './common.js';

export function rollRewards(monId, playerLevel, rates, rng, bal) {
  assertLevel(playerLevel, bal);
  assertRates(rates, bal, ['exp', 'drop', 'gold']);
  const mon = bal.monsters.find(mon => mon.id === monId);
  if (!mon) throw new RangeError('알 수 없는 몬스터입니다');
  const p = bal.progression;
  const correction = playerLevel - mon.level > p.lowLevelGap ? p.lowLevelRate : 1;
  const exp = Math.floor(mon.exp * rates.exp * correction);
  const gold = Math.floor(rollInt(mon.gold.min, mon.gold.max, rng) * rates.gold);
  // 10차: pool 드랍은 맞으면 다음 난수로 목록 중 하나(균등). 순서는 표 순서 그대로(드랍 하나마다 난수 1개, pool이 맞으면 1개 더)
  const drops = [];
  for (const drop of mon.drops) {
    if (!drop.guaranteed && !(random(rng) < Math.min(1, drop.chance * rates.drop))) continue;
    const id = drop.pool ? drop.pool[Math.floor(random(rng) * drop.pool.length)] : drop.id;
    drops.push({ id, count: drop.count });
  }
  return { exp, gold, drops };
}

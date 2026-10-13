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
  const drops = mon.drops.filter(drop => drop.guaranteed || random(rng) < Math.min(1, drop.chance * rates.drop))
    .map(({ id, count }) => ({ id, count }));
  return { exp, gold, drops };
}

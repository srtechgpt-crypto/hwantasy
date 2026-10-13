import { assertLevel, integer, itemDef } from './common.js';

export function needExp(level, bal) {
  assertLevel(level, bal);
  return Math.round(bal.progression.coefficient * level ** bal.progression.exponent);
}
function assertProgress({ level, exp }, bal) {
  assertLevel(level, bal);
  if (!integer(exp) || (level === bal.progression.maxLevel ? exp !== 0 : exp >= needExp(level, bal))) throw new RangeError('경험치가 올바르지 않습니다');
}
export function addExp(progress, gain, bal) {
  assertProgress(progress, bal);
  if (!integer(gain) || !Number.isSafeInteger(progress.exp + gain)) throw new RangeError('획득 경험치가 올바르지 않습니다');
  let { level, exp } = progress;
  const initial = level;
  exp += gain;
  while (level < bal.progression.maxLevel && exp >= needExp(level, bal)) {
    exp -= needExp(level, bal);
    level++;
  }
  return { level, exp: level === bal.progression.maxLevel ? 0 : exp, levelsGained: level - initial };
}
export function applyDeathPenalty(progress, bal) {
  assertProgress(progress, bal);
  const { level, exp } = progress;
  // Loss is 5% of this level's required EXP, rounded down, never a level loss.
  return { level, exp: level === bal.progression.maxLevel ? 0 : Math.max(0, exp - Math.floor(needExp(level, bal) * bal.progression.deathLoss)) };
}
export function playerStats(level, equip, bal) {
  assertLevel(level, bal);
  if (!equip || !('weapon' in equip) || !('armor' in equip)) throw new TypeError('장비 정보가 필요합니다');
  function resolve(item, kind) {
    if (item === null) return null;
    const def = itemDef(item?.id, bal);
    if (def?.kind !== kind || !integer(item.enchant, 0, bal.enchant[kind].max)) throw new RangeError('장비가 올바르지 않습니다');
    return { ...def, enchant: item.enchant };
  }
  const w = resolve(equip.weapon, 'weapon');
  const a = resolve(equip.armor, 'armor');
  const k = bal.knight;
  return {
    maxHp: k.baseHp + k.hpPerLevel * (level - 1),
    atkBonus: Math.floor(level / k.atkDivisor),
    def: Math.floor(level / k.defDivisor),
    weapon: { min: w?.min ?? bal.combat.bareMin, max: w?.max ?? bal.combat.bareMax, enchant: w?.enchant ?? 0 },
    armor: { def: a?.def ?? 0, enchant: a?.enchant ?? 0 },
  };
}

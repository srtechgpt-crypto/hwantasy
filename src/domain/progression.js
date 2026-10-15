import { assertLevel, integer, isRecord, itemDef, EQUIP_SLOTS, NO_BONUS, slotOf, enchantRule } from './common.js';
import { passiveMods } from './skills.js';

export function needExp(level, bal) {
  assertLevel(level, bal);
  return Math.round(bal.progression.coefficient * level ** bal.progression.exponent * earlyFactor(level, bal));
}
// 초반 레벨은 필요 경험치를 줄여 빨리 오르게 한다: 1레벨 startFactor배 → untilLevel부터 1배.
// power가 클수록 초반에 오래 낮게 머물다 untilLevel 가까이에서 빠르게 1배로 올라간다(power 1 = 직선)
export function earlyFactor(level, bal) {
  const e = bal.progression.early;
  if (!e || level >= e.untilLevel) return 1;
  const t = (level - 1) / (e.untilLevel - 1);
  return e.startFactor + (1 - e.startFactor) * t ** (e.power ?? 1);
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
// 8차 보너스 점수: pointEvery 레벨마다 1점(L40 → 8점)
export const bonusPoints = (level, bal) => Math.floor(level / bal.stats.pointEvery);
export function validBonus(bonus) {
  return isRecord(bonus) && ['str', 'dex', 'con'].every(k => integer(bonus[k])) && Object.keys(bonus).length === 3;
}
// 힘·민첩·체력(자동 + 보너스). 자동 = base + floor((L−1)·num/den)
export function attributes(level, bonus, bal) {
  assertLevel(level, bal);
  if (!validBonus(bonus)) throw new RangeError('보너스 능력치가 올바르지 않습니다');
  const st = bal.stats;
  const auto = ([num, den]) => st.base + Math.floor(((level - 1) * num) / den);
  return { str: auto(st.str) + st.pointValue * bonus.str, dex: auto(st.dex) + st.pointValue * bonus.dex, con: auto(st.con) + st.pointValue * bonus.con };
}
// 8차: 능력치 하나로 고정. equip = {칸: 가방 아이템|null}(빠진 칸은 비어 있음), bonus = {str,dex,con}.
// 반환: maxHp, dmgBonus(힘 + 장갑 피해), def(레벨·체력 + 모든 방어구 방어·강화 — 전투에서 한 번만 뺌), hitBonus(%p, 민첩 + 장갑),
// attackMs, regenPerTick·regenMs, weapon{min,max,enchant}, gear(장비 합), str·dex·con, points
// 9차: 패시브(배운 것) 반영 — 최대 체력 ×(1+hpPct%) 내림, 방어 +def, 공격 간격 ×(1−atkPct%)(최소 간격 지킴),
// critPct(치명 %), lowHpReduce·lowHpRatio(불굴). 저장 검사·체력 정리·레벨업이 모두 이 함수 하나를 쓴다(⑤ #4)
export function playerStats(level, equip, bal, bonus = NO_BONUS) {
  assertLevel(level, bal);
  if (!isRecord(equip)) throw new TypeError('장비 정보가 필요합니다');
  const gear = { def: 0, hp: 0, hit: 0, dmg: 0, regen: 0 };
  let weapon = null;
  for (const slot of EQUIP_SLOTS) {
    const item = equip[slot];
    if (item === null || item === undefined) continue;
    const def = itemDef(item?.id, bal);
    if (slotOf(def) !== slot || !integer(item.enchant, 0, enchantRule(def, bal).max)) throw new RangeError('장비가 올바르지 않습니다');
    if (def.kind === 'weapon') { weapon = { min: def.min, max: def.max, enchant: item.enchant }; continue; }
    gear.def += (def.def ?? 0) + item.enchant;
    gear.hp += def.hp ?? 0; gear.hit += def.hit ?? 0; gear.dmg += def.dmg ?? 0; gear.regen += def.regen ?? 0;
  }
  const a = attributes(level, bonus, bal);
  const k = bal.knight, st = bal.stats, pm = passiveMods(level, bal);
  const str = a.str - st.base, dex = a.dex - st.base, con = a.con - st.base;
  const hpBase = k.baseHp + k.hpPerLevel * (level - 1) + st.hpPerCon * con + gear.hp;
  const atkBase = Math.round(k.attackMs * (1 - st.atkMsPerDex * dex));
  return {
    ...a, points: bonusPoints(level, bal),
    maxHp: Math.floor((hpBase * (100 + pm.hpPct)) / 100),
    dmgBonus: Math.max(Math.floor(level / k.atkDivisor), str) + gear.dmg,
    def: Math.floor(level / k.defDivisor) + Math.floor(con / st.conPerDef) + gear.def + pm.def,
    hitBonus: Math.floor(dex / st.dexPerHit) + gear.hit,
    attackMs: Math.max(st.minAttackMs, Math.round((atkBase * (100 - pm.atkPct)) / 100)),
    critPct: pm.critPct, lowHpReduce: pm.lowHpReduce, lowHpRatio: pm.lowHpRatio,
    regenPerTick: k.regenBase + Math.floor(level / k.regenDivisor) + Math.floor(con / st.conPerRegen) + gear.regen,
    regenMs: k.regenMs,
    weapon: weapon ?? { min: bal.combat.bareMin, max: bal.combat.bareMax, enchant: 0 },
    gear,
  };
}

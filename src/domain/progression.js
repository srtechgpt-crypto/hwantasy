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
// 10차 세트 효과: 7부위(큰 갑옷 제외) 중 같은 등급(희귀 포함 — 정의의 tier) 장착 수. 등급마다 3·5·7 단계를 누적.
// defs = 장착한 장비 정의 목록. 반환 [{ tier, name, count, stage(0·3·5·7), next(다음 단계 개수|null), fx{hp,def,dmg,crit} }] (count ≥ 1인 등급만, 등급 순)
export function activeSets(defs, bal) {
  const count = {};
  // 18차: 장신구(목걸이·반지)는 세트에 세지 않음(7부위만)
  for (const d of defs) if (d?.kind === 'armor' && d.slot && d.slot !== 'armor' && !d.acc && d.tier) count[d.tier] = (count[d.tier] ?? 0) + 1;
  return (bal.sets ?? []).filter(set => count[set.tier]).map(set => {
    const n = count[set.tier], fx = { hp: 0, def: 0, dmg: 0, crit: 0 };
    let stage = 0;
    for (const [need, add] of set.stages) if (n >= need) { stage = need; for (const k of Object.keys(fx)) fx[k] += add[k] ?? 0; }
    const next = set.stages.find(([need]) => n < need)?.[0] ?? null;
    return { tier: set.tier, name: set.name, count: n, stage, next, fx };
  });
}
// 11차: extra = { str, dex } 변신 무작위 능력치(원래 능력치에 그대로 더함 — 보너스 점수가 아니라 ×pointValue 안 함)
// 12차: perm = { hp, def, dmg, hit } 도감·칭호 영구 효과(collect.permOf). 체력은 패시브 % 전에 더한다(⑤ #10). 없으면 0
export function playerStats(level, equip, bal, bonus = NO_BONUS, extra = null, perm = null) {
  assertLevel(level, bal);
  if (!isRecord(equip)) throw new TypeError('장비 정보가 필요합니다');
  const gear = { def: 0, hp: 0, hit: 0, dmg: 0, regen: 0 };
  let weapon = null, wdef = null;
  const defs = [];
  for (const slot of EQUIP_SLOTS) {
    const item = equip[slot];
    if (item === null || item === undefined) continue;
    const def = itemDef(item?.id, bal);
    if (slotOf(def) !== slot || !integer(item.enchant, 0, enchantRule(def, bal).max)) throw new RangeError('장비가 올바르지 않습니다');
    defs.push(def);
    if (def.kind === 'weapon') { weapon = { min: def.min, max: def.max, enchant: item.enchant }; wdef = def; continue; }
    gear.def += (def.def ?? 0) + item.enchant;
    gear.hp += def.hp ?? 0; gear.hit += def.hit ?? 0; gear.dmg += def.dmg ?? 0; gear.regen += def.regen ?? 0;
  }
  // 10차 세트 효과는 장비 합에 더한다(최대 체력·방어·피해), 치명은 따로
  const sets = activeSets(defs, bal);
  let setCrit = 0;
  for (const set of sets) { gear.hp += set.fx.hp; gear.def += set.fx.def; gear.dmg += set.fx.dmg; setCrit += set.fx.crit; }
  // 10차 무기 계열: 최종 피해 %(dmgPct), 공격 간격 %(speedPct — 최소 간격도 같은 비율), 치명·명중 %p
  const speed = 100 + (wdef?.speedPct ?? 0);
  const a = attributes(level, bonus, bal);
  if (extra) { a.str += extra.str ?? 0; a.dex += extra.dex ?? 0; a.con += extra.con ?? 0; } // 15차: 엘릭서 체력
  const k = bal.knight, st = bal.stats, pm = passiveMods(level, bal);
  const str = a.str - st.base, dex = a.dex - st.base, con = a.con - st.base;
  const pmHp = perm?.hp ?? 0, pmDef = perm?.def ?? 0, pmDmg = perm?.dmg ?? 0, pmHit = perm?.hit ?? 0;
  const hpBase = k.baseHp + k.hpPerLevel * (level - 1) + st.hpPerCon * con + gear.hp + pmHp;
  const atkBase = Math.round(k.attackMs * (1 - st.atkMsPerDex * dex));
  return {
    ...a, points: bonusPoints(level, bal),
    maxHp: Math.floor((hpBase * (100 + pm.hpPct)) / 100),
    dmgBonus: Math.max(Math.floor(level / k.atkDivisor), str) + gear.dmg + pmDmg,
    def: Math.floor(level / k.defDivisor) + Math.floor(con / st.conPerDef) + gear.def + pm.def + pmDef,
    hitBonus: Math.floor(dex / st.dexPerHit) + gear.hit + (wdef?.hit ?? 0) + pmHit,
    // 간격 = 민첩 → 패시브 → 무기 계열 순으로 곱하고 한 번 반올림(검은 speed 100이라 9차와 같은 값). 최소 간격도 무기 계열 비율
    attackMs: Math.max(Math.round((st.minAttackMs * speed) / 100), Math.round((atkBase * (100 - pm.atkPct) * speed) / 10000)),
    // ⑤ #8: 최소 간격으로 자르기 전 값 — 날쌘 물약은 이 값에 곱한 뒤 마지막에 한 번만 자른다
    attackMsRaw: (atkBase * (100 - pm.atkPct) * speed) / 10000,
    minAttackMs: Math.round((st.minAttackMs * speed) / 100),
    dmgPct: wdef?.dmgPct ?? 0,
    critPct: pm.critPct + setCrit + (wdef?.crit ?? 0), lowHpReduce: pm.lowHpReduce, lowHpRatio: pm.lowHpRatio,
    regenPerTick: k.regenBase + Math.floor(level / k.regenDivisor) + Math.floor(con / st.conPerRegen) + gear.regen,
    regenMs: k.regenMs,
    weapon: weapon ?? { min: bal.combat.bareMin, max: bal.combat.bareMax, enchant: 0 },
    gear, sets,
  };
}

// 6차: 장비 비교(▲/▼ 표시용). 10차(⑤ #13·#14): '끼었을 때 실제 능력치'로 비교한다 — 무기 계열(피해%·간격·치명·명중),
// 세트 효과, 레벨·힘·강화가 모두 들어간다. 무기는 지금 레벨 사냥터의 평균 몬스터를 기준으로 낸 '초당 평타 피해(근사)',
// 방어구는 전투력(초당 피해 + 방어 × 1.5 + 최대 체력/10 + 재생) 차이로 본다. 근사치라 화면에는 '약'을 붙인다.
// '안 쓰는 장비 모두 팔기'(isJunkGear)는 따로 더 보수적인 규칙(같은 계열·모든 기본 수치 이하·세트 후보 보호)을 쓴다.
import { itemDef, integer, isGearDef, slotOf, EQUIP_SLOTS } from './common.js';
import { playerStats } from './progression.js';
import { applyBuffs } from './buffs.js';
import { baseDamage, finalDamage } from './combat.js';

// 6차 점수(정의만으로, 레벨 무관) — 옛 시험·간단한 정렬용. 10차 무기 = (평균 + 강화 피해) × (100 + 피해%)/(100 + 간격%) × (1 + 치명%/200) + 명중%×0.3
export function gearScore(id, enchant, bal) {
  const def = itemDef(id, bal);
  if (!isGearDef(def)) return null;
  if (!integer(enchant)) throw new RangeError('강화 수치가 올바르지 않습니다');
  return def.kind === 'weapon'
    ? ((def.min + def.max) / 2 + enchant * bal.combat.weaponEnchantDamage) * (100 + (def.dmgPct ?? 0)) / (100 + (def.speedPct ?? 0)) * (1 + (def.crit ?? 0) / 200) + (def.hit ?? 0) * 0.3
    : (def.def ?? 0) + enchant + (def.hp ?? 0) / 10 + (def.hit ?? 0) / 2 + (def.dmg ?? 0) + (def.regen ?? 0);
}

// 지금 레벨의 기준 몬스터: 권장 레벨에 드는 사냥터의 일반 몬스터 평균(레벨·방어). 없으면 가장 가까운 사냥터
const refCache = new WeakMap();
export function refMonster(level, bal) {
  let byLevel = refCache.get(bal);
  if (!byLevel) { byLevel = new Map(); refCache.set(bal, byLevel); }
  if (byLevel.has(level)) return byLevel.get(level);
  const maps = bal.maps.filter(m => m.recommendedLevel);
  const dist = m => (level < m.recommendedLevel.min ? m.recommendedLevel.min - level : level > m.recommendedLevel.max ? level - m.recommendedLevel.max : 0);
  const map = [...maps].sort((a, b) => dist(a) - dist(b))[0];
  const mons = bal.monsters.filter(m => m.mapId === map?.id && !m.isBoss);
  const ref = mons.length ? { level: Math.round(mons.reduce((s, m) => s + m.level, 0) / mons.length), def: Math.round(mons.reduce((s, m) => s + m.def, 0) / mons.length) } : { level, def: 0 };
  byLevel.set(level, ref);
  return ref;
}
// 초당 평타 피해: 명중 × (주사위마다 실제 공격식의 일반타·치명타 피해를 치명 확률로 합한 평균) ÷ 간격
// ⑦ #1: 내림·최소 피해까지 실제 공격과 같은 함수(combat.finalDamage)로 — 기준 몬스터에 대한 정확한 기대값
export function dpsOf(stats, level, bal) {
  const ref = refMonster(level, bal), c = bal.combat, w = stats.weapon;
  const hit = Math.min(c.maxHit, Math.max(c.minHit, Math.round(c.playerHit * 100 + (level - ref.level) * c.levelHit * 100 + stats.hitBonus) / 100));
  const cp = (stats.critPct ?? 0) / 100, dmgPct = stats.dmgPct ?? 0;
  let sum = 0;
  for (let d = w.min; d <= w.max; d++) {
    const base = baseDamage(d, stats, ref.def, bal);
    sum += (1 - cp) * finalDamage(base, { dmgPct }, bal) + cp * finalDamage(base, { crit: true, dmgPct }, bal);
  }
  return (hit * sum) / (w.max - w.min + 1) / (stats.attackMs / 1000);
}
export const powerOf = (stats, level, bal) => dpsOf(stats, level, bal) + stats.def * 1.5 + stats.maxHp / 10 + stats.regenPerTick;

// 지금 장착 + (slot에 item을 바꿔 끼면)의 능력치. item = 가방 아이템 모양({id, enchant}) 또는 null
// ⑦ #2: 켜진 버프(힘·날쌤·수호)도 실제 전투처럼 더한다(힘의 물약은 계열마다 상대 상승률이 달라 비교가 바뀔 수 있음)
export function loadoutStats(save, bal, slot = null, item = undefined) {
  const equip = Object.fromEntries(EQUIP_SLOTS.map(s => [s, save.bag.find(i => i.uid === save.equip?.[s]) ?? null]));
  if (slot) equip[slot] = item ?? null;
  return applyBuffs(playerStats(save.player.level, equip, bal, save.player.bonus), save.buffs, save.player.level, bal);
}
// 이 장비를 그 칸에 끼었을 때의 점수(무기 = 초당 피해, 방어구 = 전투력). 장비가 아니면 null
export function equipScore(save, id, enchant, bal) {
  const def = itemDef(id, bal);
  if (!isGearDef(def)) return null;
  if (!integer(enchant)) throw new RangeError('강화 수치가 올바르지 않습니다');
  const slot = slotOf(def), st = loadoutStats(save, bal, slot, { id, enchant, count: 1 });
  return def.kind === 'weapon' ? dpsOf(st, save.player.level, bal) : powerOf(st, save.player.level, bal);
}
// 지금 낀 같은 칸 장비와 비교: 'up' | 'down' | 'same', 장비가 아니면 null. 같은 칸을 안 끼고 있으면 'up'
// 강화가 없으면 0으로 본다(땅·상점 물건). 장착 칸이 가방에 없는 등 잘못된 참조는 '안 끼고 있음'으로 본다
export function compareGear(save, id, enchant, bal) {
  return compareDetail(save, id, enchant, bal)?.dir ?? null;
}
// 화살표 + 차이(무기 = 초당 피해, 방어구 = 전투력, 0.05 이하 차이는 같음). 장비가 아니면 null
export function compareDetail(save, id, enchant = 0, bal) {
  const score = equipScore(save, id, enchant ?? 0, bal);
  if (score === null) return null;
  const def = itemDef(id, bal), kind = def.kind, slot = slotOf(def);
  const what = kind === 'weapon' ? '초당 피해' : '전투력';
  const worn = save.bag.find(it => it.uid === save.equip?.[slot]);
  if (!worn || slotOf(itemDef(worn.id, bal)) !== slot) return { dir: 'up', diff: score, kind, slot, worn: false, what };
  const diff = score - equipScore(save, worn.id, worn.enchant ?? 0, bal);
  return { dir: diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'same', diff, kind, slot, worn: true, what };
}

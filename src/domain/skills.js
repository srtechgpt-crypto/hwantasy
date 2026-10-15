// 5차 스킬: 레벨로 배우고 쿨타임만 있다(마나 없음). 쿨타임·버프는 저장하지 않는다.
// 9차: 액티브 10개(공격·방어·필살기) + 패시브 5개, 받는 피해 감소 합산, 반격 피해
import { assertLevel, finite } from './common.js';

export function skillDef(id, bal) {
  const def = bal.skills.find(s => s.id === id);
  if (!def) throw new RangeError('알 수 없는 스킬입니다');
  return def;
}
// 배운 액티브 스킬(배우는 레벨 순서)
export function learnedSkills(level, bal) {
  assertLevel(level, bal);
  return bal.skills.filter(s => level >= s.level).sort((a, b) => a.level - b.level).map(s => s.id);
}
export function knows(level, id, bal) { return level >= skillDef(id, bal).level; }
export function isSkillId(id, bal) { return bal.skills.some(s => s.id === id); }

// 9차 패시브 합계(배운 것만). 반환: critPct(%), hpPct(%), def, atkPct(%), lowHpReduce(0~1), lowHpRatio(0~1)
export function passiveMods(level, bal) {
  assertLevel(level, bal);
  const out = { critPct: 0, hpPct: 0, def: 0, atkPct: 0, lowHpReduce: 0, lowHpRatio: 0 };
  for (const p of bal.passives ?? []) {
    if (level < p.level) continue;
    out.critPct += p.critPct ?? 0; out.hpPct += p.hpPct ?? 0; out.def += p.def ?? 0; out.atkPct += p.atkPct ?? 0;
    if (p.lowHpReduce) { out.lowHpReduce += p.lowHpReduce; out.lowHpRatio = Math.max(out.lowHpRatio, p.lowHpRatio); }
  }
  return out;
}
export function learnedPassives(level, bal) {
  assertLevel(level, bal);
  return (bal.passives ?? []).filter(p => level >= p.level).map(p => p.id);
}

// 9차(⑤ #2): 받는 피해 감소율 합산 — 아머(켜져 있으면) + 불굴(맞기 직전 체력이 최대의 lowHpRatio '미만'이면), 상한 combat.maxReduce.
// 백분율 정수로 더해 소수 오차를 막는다
export function incomingReduce({ guardOn = false, hp, maxHp }, stats, bal) {
  if (!finite(hp) || !finite(maxHp) || maxHp <= 0) throw new RangeError('체력 정보가 올바르지 않습니다');
  let pct = 0;
  if (guardOn) pct += Math.round(skillDef('guard', bal).reduce * 100);
  if (stats.lowHpReduce > 0 && hp < maxHp * stats.lowHpRatio) pct += Math.round(stats.lowHpReduce * 100);
  return Math.min(pct, Math.round(bal.combat.maxReduce * 100)) / 100;
}

// 9차(⑤ #3): 반격 피해 — 명중했고 막히지 않았고 받은 피해가 양수일 때만 floor(피해 × counterPct%) 최소 1. 아니면 0
export function counterDamage(result, bal) {
  if (!result?.hit || result.blocked || !(result.dmg > 0)) return 0;
  return Math.max(1, Math.floor((result.dmg * skillDef('counter', bal).counterPct) / 100));
}

// 5차 스킬: 레벨로 배우고 쿨타임만 있다(마나 없음). 쿨타임·버프는 저장하지 않는다.
import { assertLevel } from './common.js';

export function skillDef(id, bal) {
  const def = bal.skills.find(s => s.id === id);
  if (!def) throw new RangeError('알 수 없는 스킬입니다');
  return def;
}
export function learnedSkills(level, bal) {
  assertLevel(level, bal);
  return bal.skills.filter(s => level >= s.level).map(s => s.id);
}
export function knows(level, id, bal) { return level >= skillDef(id, bal).level; }

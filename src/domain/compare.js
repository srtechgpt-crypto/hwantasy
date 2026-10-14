// 6차: 장비 비교(▲/▼ 표시용). 무기 = (최소+최대)/2 + 강화 × 강화당 피해, 갑옷 = 방어 + 강화.
// '안 쓰는 장비 모두 팔기'(isJunkGear: 상점 장비·강화 0·최소·최대 모두 이하)로 팔리는 장비는 이 점수로도 항상 'down' 또는 'same'이다.
// 반대로 ▼라고 모두 자동으로 팔리지는 않는다(강화한 것·보스 장비·평균만 낮은 것은 남김) — 자동 팔기가 더 보수적인 기준.
import { itemDef, integer } from './common.js';

export function gearScore(id, enchant, bal) {
  const def = itemDef(id, bal);
  if (!def || !['weapon', 'armor'].includes(def.kind)) return null;
  if (!integer(enchant)) throw new RangeError('강화 수치가 올바르지 않습니다');
  return def.kind === 'weapon' ? (def.min + def.max) / 2 + enchant * bal.combat.weaponEnchantDamage : def.def + enchant;
}
// 지금 낀 같은 종류 장비와 비교: 'up' | 'down' | 'same', 장비가 아니면 null. 같은 종류를 안 끼고 있으면 'up'
// 강화가 없으면 0으로 본다(땅·상점 물건). 장착 칸이 가방에 없는 등 잘못된 참조는 '안 끼고 있음'으로 본다
export function compareGear(save, id, enchant, bal) {
  return compareDetail(save, id, enchant, bal)?.dir ?? null;
}
// 화살표 + 차이(무기는 평균 공격, 갑옷은 방어). 장비가 아니면 null
export function compareDetail(save, id, enchant = 0, bal) {
  const score = gearScore(id, enchant ?? 0, bal);
  if (score === null) return null;
  const kind = itemDef(id, bal).kind;
  const worn = save.bag.find(it => it.uid === save.equip?.[kind]);
  const cur = worn ? gearScore(worn.id, worn.enchant ?? 0, bal) : null;
  if (cur === null) return { dir: 'up', diff: score, kind, worn: false };
  return { dir: score > cur ? 'up' : score < cur ? 'down' : 'same', diff: score - cur, kind, worn: true };
}

// 11차 변신: 변신 주문서 1장 → 고른 변신으로 20분(게임 시계). 공격 간격·이동 속도·피해·치명 + 무작위 능력치 1개.
// 저장 v7 save.morph = { cur: null | { id, ms, roll: { k, v } }, last: null | id, auto: bool }.
// auto(⑦ #4): 자동 재변신 허용 — 직접 풀면 false(껐다 켜도 유지), 직접 변신하면 true 모든 함수는 새 객체를 돌려준다(원본 안 바꿈)
import { clone, fail, integer, isRecord, random } from './common.js';

export const ROLL_KEYS = ['str', 'dex', 'crit', 'hit'];
export const morphDef = (id, bal) => (bal.morphs ?? []).find(m => m.id === id) ?? null;
export const emptyMorph = () => ({ cur: null, last: null, auto: true });

// 검사(⑤ #3): 객체·키 정확히, cur는 있는 변신·정수 ms 1~지속 시간·roll이 그 범위의 정수, last는 null 또는 있는 변신.
// 레벨은 검사하지 않는다(레벨은 내려가지 않고, 쓸 때 검사함)
export function validMorph(m, bal) {
  if (!isRecord(m) || Object.getPrototypeOf(m) !== Object.prototype) return false;
  const keys = Object.keys(m).sort().join(',');
  if (keys !== 'auto,cur,last' || typeof m.auto !== 'boolean') return false;
  if (m.last !== null && !morphDef(m.last, bal)) return false;
  if (m.cur === null) return true;
  const c = m.cur;
  if (!isRecord(c) || Object.keys(c).sort().join(',') !== 'id,ms,roll') return false;
  if (!morphDef(c.id, bal) || !integer(c.ms, 1, bal.morphDurationMs)) return false;
  const r = c.roll;
  // ⑦ #1: k는 정해진 글자 네 개 중 하나여야(배열·객체 키로 범위를 찾지 않음)
  if (!isRecord(r) || Object.keys(r).sort().join(',') !== 'k,v' || typeof r.k !== 'string' || !ROLL_KEYS.includes(r.k)) return false;
  const range = bal.morphRolls[r.k];
  return integer(r.v, range[0], range[1]);
}

// 힘·민첩은 playerStats의 원래 능력치 공식에 넣는다(⑤ #11) — 여기서는 더할 양만
export function morphExtra(morph) {
  const r = morph?.cur?.roll;
  return { str: r?.k === 'str' ? r.v : 0, dex: r?.k === 'dex' ? r.v : 0 };
}

// 변신 효과(⑤ #10·#12): 피해 %는 dmgPct에 더하고, 치명·명중은 %p로 더하고, 공격 간격은 날쌘 물약과 같은 곱(atkMul)에 곱한 뒤
// 자르기 전 간격(attackMsRaw) × atkMul을 무기 계열 최소 간격으로 한 번만 자른다
export function applyMorph(stats, morph, bal) {
  const c = morph?.cur, d = c ? morphDef(c.id, bal) : null;
  if (!d || !(c.ms > 0)) return stats;
  const out = { ...stats };
  out.dmgPct = (out.dmgPct ?? 0) + (d.dmgPct ?? 0);
  out.critPct = Math.min(100, (out.critPct ?? 0) + (d.critPct ?? 0) + (c.roll.k === 'crit' ? c.roll.v : 0));
  out.hitBonus += c.roll.k === 'hit' ? c.roll.v : 0;
  out.atkMul = (out.atkMul ?? 1) * (100 + (d.attackPct ?? 0)) / 100;
  out.attackMs = Math.max(out.minAttackMs ?? bal.stats.minAttackMs, Math.round((out.attackMsRaw ?? out.attackMs) * out.atkMul));
  out.movePct = (out.movePct ?? 0) + (d.movePct ?? 0);
  out.morph = d.id;
  return out;
}

// 변신 확정(⑤ #14): 레벨·주문서·살아 있음 검사 → 무작위 능력치(네 가지 중 하나를 같은 확률로, 값은 범위 안 같은 확률) → 주문서 1장 →
// 새 변신(지속 시간 처음부터)·last 설정. 난수 오류면 아무것도 안 바뀜. take는 inventory가 넘겨 준다
export function morphInto(next, id, rng, bal, take) {
  const d = morphDef(id, bal);
  if (!d) return fail('없는 변신입니다');
  if (next.player.hp <= 0) return fail('쓰러진 상태에서는 변신할 수 없습니다');
  if (next.player.level < d.level) return fail(`${d.name}은(는) Lv ${d.level}부터 변신할 수 있습니다`);
  // ⑦ #3: 주문서가 없으면 난수를 쓰기 전에 실패
  if (!next.bag.some(it => it.id === 'morphScroll' && it.count > 0)) return fail('변신 주문서가 없습니다');
  let k, v;
  try {
    k = ROLL_KEYS[Math.floor(random(rng) * ROLL_KEYS.length)];
    const [lo, hi] = bal.morphRolls[k];
    v = lo + Math.floor(random(rng) * (hi - lo + 1));
  } catch { return fail('난수가 올바르지 않습니다'); }
  if (take(next, 'morphScroll', 1)) return fail('변신 주문서가 없습니다');
  next.morph = { cur: { id, ms: bal.morphDurationMs, roll: { k, v } }, last: id, auto: true };
  return { ok: true, save: next, id, roll: { k, v } };
}
export function unmorph(save) {
  const next = clone(save);
  next.morph = { cur: null, last: next.morph?.last ?? null, auto: false };
  return next;
}
// 시간 흐름(정수 ms만, 버프와 같은 규칙). 끝나면 cur=null, ended=true
export function tickMorph(morph, dtMs) {
  if (!morph?.cur || !Number.isSafeInteger(dtMs) || dtMs <= 0) return { morph, ended: false };
  const left = morph.cur.ms - dtMs;
  if (left > 0) return { morph: { ...morph, cur: { ...morph.cur, ms: left } }, ended: false };
  return { morph: { ...morph, cur: null }, ended: true };
}
export const ROLL_NAMES = { str: '힘', dex: '민첩', crit: '치명', hit: '명중' };
export const rollText = r => `${ROLL_NAMES[r.k]} +${r.v}${r.k === 'crit' || r.k === 'hit' ? '%' : ''}`;

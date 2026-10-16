// 9차 단축 칸(저장 v5의 save.hotbar): 6칸 × 2쪽 = 12칸.
// { slots: [12개: {t:'skill', id} | {t:'item', id} | null], auto: {스킬id: false}, seen: [스킬id] }
//  - auto: 자동 사냥에서 끈 스킬만 false로 적는다(없으면 켜짐)
//  - seen: 한 번이라도 칸에 넣었거나 자동 배치를 시도한 스킬 — 손으로 지운 스킬이 다시 저절로 들어오지 않게(⑤ #7)
// 모든 함수는 새 객체를 돌려준다(원본 안 바꿈). 쪽 번호(1/2)는 기기 설정이라 여기 없다
import { clone, isRecord } from './common.js';
import { learnedSkills, skillDef, isSkillId } from './skills.js';

export const HOTBAR_SLOTS = 12;
export const PAGE_SIZE = 6;
// 기본 물건 칸: 2쪽 마지막 두 칸에 중급·고급 물약
const DEFAULT_ITEMS = [[10, 'potionMid'], [11, 'potionHigh']];

const same = (a, b) => a && b && a.t === b.t && a.id === b.id;

// 검사는 '있는 스킬·물건인가'까지만(배웠는지는 쓸 때 useSkill이 본다) — 나중에 스킬 배우는 레벨을 바꿔도 옛 기록이 거절되지 않게.
// level은 호출 호환용으로 받는다
export function validHotbar(h, level, bal) {
  if (!isRecord(h) || !Array.isArray(h.slots) || h.slots.length !== HOTBAR_SLOTS || !isRecord(h.auto) || !Array.isArray(h.seen)) return false;
  if (Object.keys(h).length !== 3) return false;
  const items = bal.hotbarItems ?? [];
  const used = [];
  for (const e of h.slots) {
    if (e === null) continue;
    if (!isRecord(e) || Object.keys(e).length !== 2) return false;
    if (e.t === 'skill') { if (!isSkillId(e.id, bal)) return false; }
    else if (e.t === 'item') { if (!items.includes(e.id)) return false; }
    else return false;
    if (used.some(u => same(u, e))) return false;
    used.push(e);
  }
  for (const [id, v] of Object.entries(h.auto)) if (!isSkillId(id, bal) || v !== false) return false;
  if (new Set(h.seen).size !== h.seen.length || h.seen.some(id => !isSkillId(id, bal))) return false;
  return true;
}

// 새 스킬 자리: 공격·필살기는 1쪽 → 2쪽, 방어는 2쪽 → 1쪽 첫 빈 칸
function preferred(def) {
  const p1 = [0, 1, 2, 3, 4, 5], p2 = [6, 7, 8, 9, 10, 11];
  return def.kind === 'defense' ? [...p2, ...p1] : [...p1, ...p2];
}

// 배웠지만 아직 seen에 없는 스킬을 빈 칸에 넣는다. 반환 { hotbar, placed:[id], full:[id] } — 칸이 없어도 seen에는 적는다
export function placeLearned(h, level, bal) {
  const next = clone(h);
  const placed = [], full = [];
  for (const id of learnedSkills(level, bal)) {
    if (next.seen.includes(id)) continue;
    next.seen.push(id);
    if (next.slots.some(e => same(e, { t: 'skill', id }))) continue;
    const at = preferred(skillDef(id, bal)).find(i => next.slots[i] === null);
    if (at === undefined) { full.push(id); continue; }
    next.slots[at] = { t: 'skill', id };
    placed.push(id);
  }
  return { hotbar: next, placed, full };
}

// 새 게임·v4 변환 때 기본 배치: 물약 두 칸 + 배운 스킬 자동 배치
export function defaultHotbar(level, bal) {
  const h = { slots: Array(HOTBAR_SLOTS).fill(null), auto: {}, seen: [] };
  for (const [i, id] of DEFAULT_ITEMS) if ((bal.hotbarItems ?? []).includes(id)) h.slots[i] = { t: 'item', id };
  return placeLearned(h, level, bal).hotbar;
}

// 칸에 넣기: 같은 것이 다른 칸에 있으면 그 칸은 비운다(옮김). 스킬은 배운 것만, 넣으면 seen에 적는다
export function assignSlot(h, index, entry, level, bal) {
  if (!Number.isInteger(index) || index < 0 || index >= HOTBAR_SLOTS) throw new RangeError('단축 칸 번호가 올바르지 않습니다');
  const next = clone(h);
  if (entry === null) { next.slots[index] = null; return next; }
  if (entry?.t === 'skill') { if (!learnedSkills(level, bal).includes(entry.id)) throw new RangeError('아직 배우지 않은 스킬입니다'); }
  else if (entry?.t !== 'item' || !(bal.hotbarItems ?? []).includes(entry.id)) throw new RangeError('단축 칸에 넣을 수 없는 것입니다');
  const e = { t: entry.t, id: entry.id };
  next.slots = next.slots.map(x => (same(x, e) ? null : x));
  next.slots[index] = e;
  if (e.t === 'skill' && !next.seen.includes(e.id)) next.seen.push(e.id);
  return next;
}

// 자동 사냥 사용 켜기/끄기
export function setAutoUse(h, id, on, bal) {
  skillDef(id, bal);
  const next = clone(h);
  if (on) delete next.auto[id]; else next.auto[id] = false;
  return next;
}
export const autoUse = (h, id) => h?.auto?.[id] !== false;

// 12차: 아이템 도감·칭호·사냥 목표판·처치 수. 화면과 무관한 순수 계산(새 save를 돌려줌, 원본 안 바꿈).
// 저장 v8: save.codex = {세트 id: [넣은 아이템 id…]}, save.kills = {몬스터 id: 처치 수}, save.title = 칭호 id | null,
// save.quest = { id: 목표 몬스터, n: 지금까지 잡은 수(0..목표 수−1), done: [처음 끝낸 몬스터…] }
import { clone, integer, isRecord, itemDef, EQUIP_SLOTS } from './common.js';
import { addExp, needExp } from './progression.js';

const plain = v => isRecord(v) && Object.getPrototypeOf(v) === Object.prototype;
export const codexSet = (id, bal) => (bal.codex ?? []).find(set => set.id === id) ?? null;
export const titleDef = (id, bal) => (bal.titles ?? []).find(t => t.id === id) ?? null;
export const normalMonsters = bal => bal.monsters.filter(m => !m.isBoss).sort((a, b) => a.level - b.level);
const monDef = (id, bal) => bal.monsters.find(m => m.id === id) ?? null;
export const questCount = (monId, bal) => bal.quest.count[monDef(monId, bal)?.mapId] ?? 0;
// 22차: 목표판을 누르면 갈 사냥터(목표 몬스터가 사는 지역 id, 없으면 null)
export const questMapId = (save, bal) => monDef(save?.quest?.id, bal)?.mapId ?? null;
export const killsMax = bal => bal.quest?.killsMax ?? 1e12;

// ---------- 검사 ----------
export function validCodex(codex, bal) {
  if (!plain(codex)) return false;
  for (const [setId, ids] of Object.entries(codex)) {
    const set = codexSet(setId, bal);
    if (!set || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !set.items.includes(id))) return false;
  }
  return true;
}
export function validKills(kills, bal) {
  return plain(kills) && Object.entries(kills).every(([id, n]) => monDef(id, bal) && integer(n, 1, killsMax(bal)));
}
export function validQuest(q, kills, bal) {
  if (!plain(q) || Object.keys(q).length !== 3 || !Array.isArray(q.done)) return false;
  const normal = id => monDef(id, bal) && !monDef(id, bal).isBoss;
  if (!normal(q.id) || !integer(q.n, 0, questCount(q.id, bal) - 1)) return false;
  // ⑦ #2: 목표 진행은 그 몬스터 누적 처치 수를 넘을 수 없다(처치 수는 1e12에서 멈추지만 n은 목표 수 미만)
  if (q.n > (kills?.[q.id] ?? 0)) return false;
  if (new Set(q.done).size !== q.done.length) return false;
  // 처음 끝낸 몬스터는 적어도 목표 수만큼 잡았어야 한다
  return q.done.every(id => normal(id) && (kills?.[id] ?? 0) >= questCount(id, bal));
}
// 칭호 검사: null 또는 지금 기록으로 자격이 있는 칭호
export const validTitle = (title, save, bal) => title === null || (titleDef(title, bal) !== null && titleEarned(titleDef(title, bal), save, bal));

// ---------- 도감 ----------
export const doneSets = (codex, bal) => (bal.codex ?? []).filter(set => (codex?.[set.id]?.length ?? 0) === set.items.length);
// 이 세트의 비어 있는 칸마다 가방에서 쓸 장비 하나: +0·장착 안 함·가방(창고 아님), 여럿이면 uid 작은 것.
// 화면 표시·확인 상자·실제 등록이 모두 이 함수 하나를 쓴다(⑤ #15·#17)
export function codexPlan(save, setId, bal) {
  const set = codexSet(setId, bal);
  if (!set) return [];
  const have = save.codex?.[setId] ?? [];
  const worn = new Set(EQUIP_SLOTS.map(slot => save.equip?.[slot]).filter(uid => uid !== null && uid !== undefined));
  const plan = [];
  for (const id of set.items) {
    if (have.includes(id)) continue;
    const item = save.bag.filter(it => it.id === id && it.enchant === 0 && it.count === 1 && !worn.has(it.uid) && it.lock !== true).sort((a, b) => a.uid - b.uid)[0];
    if (item) plan.push({ id, uid: item.uid });
  }
  return plan;
}
// 비어 있는 도감 칸을 채울 장비(칸마다 하나씩만 — ⑤ #18). 안 쓰는 장비 모두 팔기가 이것은 팔지 않는다
export function codexReserved(save, bal) {
  const out = new Set();
  if (!save.codex) return out;
  for (const set of bal.codex ?? []) for (const p of codexPlan(save, set.id, bal)) out.add(p.uid);
  return out;
}
// 지금 등록할 수 있는 세트가 있는지(정보 버튼 '!')
export const codexReady = (save, bal) => !!save.codex && (bal.codex ?? []).some(set => codexPlan(save, set.id, bal).length > 0);

// ---------- 칭호 ----------
export function titleEarned(t, save, bal) {
  if (t.kind === 'kills') return (save.kills?.[t.mon] ?? 0) >= t.need;
  if (t.kind === 'codex') return doneSets(save.codex, bal).length >= t.need;
  return false;
}
export const earnedTitles = (save, bal) => (bal.titles ?? []).filter(t => titleEarned(t, save, bal)).map(t => t.id);
// 칭호 진행(화면용): { have, need }
export const titleProgress = (t, save, bal) => ({ have: t.kind === 'kills' ? (save.kills?.[t.mon] ?? 0) : doneSets(save.codex, bal).length, need: t.need });

// ---------- 영구 효과 ----------
const ZERO = () => ({ hp: 0, def: 0, dmg: 0, hit: 0, expPct: 0, goldPct: 0 });
// 다 채운 도감 세트 효과 합 + 쓰는 칭호 효과. v7 이하 기록(필드 없음)은 0
// 25차: 낀 장비의 경험치·돈 %도 더한다(도감·칭호·인형과 합쳐 bonusExp·bonusGold가 한 번 곱함). 장비의 체력·방어·피해·명중은
// playerStats가 이미 장비로 세므로 여기에는 더하지 않는다(두 번 세지 않게 — ⑤ #7)
export function permOf(save, bal) {
  const out = ZERO();
  for (const uid of Object.values(save?.equip ?? {})) {
    if (uid === null || uid === undefined) continue;
    const def = itemDef(save.bag?.find(i => i.uid === uid)?.id, bal);
    out.expPct += def?.expPct ?? 0; out.goldPct += def?.goldPct ?? 0;
  }
  if (!save?.codex) return out;
  const add = fx => { for (const k of Object.keys(out)) out[k] += fx?.[k] ?? 0; };
  for (const set of doneSets(save.codex, bal)) add(set.fx);
  if (save.title) add(titleDef(save.title, bal)?.fx);
  if (save.dolls?.cur) add((bal.dolls ?? []).find(d => d.id === save.dolls.cur)?.fx); // 15차 마법인형
  return out;
}
// 경험치 보너스: 영구 경험치%와 (처치면) 두루마리%를 **더해서** 한 번 곱하고 내림(⑤ #12). 배율·저레벨 보정은 이미 들어간 값
export function bonusExp(exp, save, bal, scrollPct = 0) {
  const pct = permOf(save, bal).expPct + scrollPct;
  return pct ? Math.floor((exp * (100 + pct)) / 100) : exp;
}
export function bonusGold(gold, save, bal) {
  const pct = permOf(save, bal).goldPct;
  return pct ? Math.floor((gold * (100 + pct)) / 100) : gold;
}

// ---------- 사냥 목표판 ----------
// 다음 목표: 레벨 순서로 처음 끝내지 않았고 레벨 ≤ 내 레벨 + aheadLevels인 첫 몬스터, 없으면 그 범위에서 가장 높은 몬스터(반복).
// 풀젤리(L1)가 늘 범위 안이라 목표가 없는 일은 없다
export function pickQuest(level, done, bal) {
  const ok = normalMonsters(bal).filter(m => m.level <= level + bal.quest.aheadLevels);
  return (ok.find(m => !done.includes(m.id)) ?? ok[ok.length - 1]).id;
}
export const firstQuest = (level, bal) => ({ id: pickQuest(level, [], bal), n: 0, done: [] });
// 목표 보상(완료 순간의 배율·도감·칭호로, 두루마리는 빼고 — ⑤ #13). first = 처음 끝내는지. 화면 표시도 이 함수
export function questReward(save, monId, first, bal) {
  const mon = monDef(monId, bal), n = questCount(monId, bal), q = bal.quest, r = save.rates;
  const exp = Math.floor(mon.exp * r.exp * n * (first ? q.firstRate : q.repeatExp));
  const gold = Math.floor(((mon.gold.min + mon.gold.max) / 2) * r.gold * n * (first ? q.firstRate : q.repeatGold));
  return { exp: bonusExp(exp, save, bal), gold: bonusGold(gold, save, bal) };
}
// 경험치 진행 비율(레벨 1개 = 1): 레벨 구간마다 채운 비율 합(⑤ #22). 최대 레벨에서 버린 경험치는 넣지 않음
function frac(level, exp, bal) { return level >= bal.progression.maxLevel ? 0 : exp / needExp(level, bal); }

// 일반 몬스터 한 마리 처치(⑤ #7·#8): 처치 수 → 처치 경험치 → (목표 완료면) 목표 보상 → 최종 레벨 → 다음 목표를 새 save 하나로.
// exp = 이미 배율·보정·보너스가 들어간 처치 경험치. 돈·아이템은 땅에 떨어뜨리므로 여기서 다루지 않는다(목표 돈만 바로 들어감).
// 반환 { save, levelsGained, pct(경험치 진행, 레벨 단위), quest: null | { mon, first, exp, gold, next } }
export function applyKill(save, monId, exp, bal) {
  const mon = monDef(monId, bal);
  if (!mon || mon.isBoss) throw new RangeError('알 수 없는 몬스터입니다');
  const next = clone(save);
  const p = next.player;
  const start = p.level + frac(p.level, p.exp, bal);
  if (next.kills) next.kills[monId] = Math.min(killsMax(bal), (next.kills[monId] ?? 0) + 1);
  const before = p.level;
  let r = addExp({ level: p.level, exp: p.exp }, exp, bal);
  p.level = r.level; p.exp = r.exp;
  let quest = null;
  const q = next.quest;
  if (q && q.id === monId) {
    q.n += 1;
    if (q.n >= questCount(monId, bal)) {
      const first = !q.done.includes(monId);
      const rw = questReward(next, monId, first, bal);
      r = addExp({ level: p.level, exp: p.exp }, rw.exp, bal);
      p.level = r.level; p.exp = r.exp;
      const gold = Number.isSafeInteger(p.gold + rw.gold) ? rw.gold : 0;
      p.gold += gold;
      if (first) q.done.push(monId);
      q.id = pickQuest(p.level, q.done, bal); q.n = 0; // 완료한 처치는 다음 목표에 세지 않는다
      quest = { mon: monId, first, exp: rw.exp, gold, next: q.id };
    }
  }
  const end = p.level + frac(p.level, p.exp, bal);
  return { save: next, levelsGained: p.level - before, pct: Math.max(0, end - start), quest };
}
// 경험치 진행 비율(보스 처치처럼 다른 곳에서 레벨이 바뀐 경우): 전후 {level, exp}
export function expProgress(a, b, bal) {
  return Math.max(0, (b.level + frac(b.level, b.exp, bal)) - (a.level + frac(a.level, a.exp, bal)));
}
// 효과 글자: { hp:10, def:1 } → '체력 +10 · 방어 +1'
const FX_NAMES = { hp: ['체력', ''], def: ['방어', ''], dmg: ['피해', ''], hit: ['명중', '%'], expPct: ['경험치', '%'], goldPct: ['돈', '%'] };
export const fxText = fx => Object.entries(fx ?? {}).filter(([, v]) => v).map(([k, v]) => `${FX_NAMES[k][0]} +${v}${FX_NAMES[k][1]}`).join(' · ');
export const isCodexItem = (id, bal) => (bal.codex ?? []).some(set => set.items.includes(id));
export const codexItemName = (id, bal) => itemDef(id, bal)?.name ?? id;

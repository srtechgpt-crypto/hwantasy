// 26차 캐릭터 여러 명·창고 돈. 모든 함수는 새 save를 돌려준다(원본 안 바꿈). 실패면 { ok:false, reason }, 성공이면 { ok:true, save }.
// 저장 모양: 지금 캐릭터 필드는 맨 위, 쉬는 캐릭터는 save.roster(캐릭터 필드만, cid 순). 함께 쓰는 것 = 창고·창고 돈·배율·보스·선물·nextUid
import { clone, fail, integer } from './common.js';
import { validate, newCharFields, charPart, CHAR_ALL, heroNameOk } from './save.js';
import { isClassId } from './classes.js';

export const charsOf = save => [charPart(save), ...(save.roster ?? [])].sort((a, b) => a.hero.cid - b.hero.cid);
const done = (next, bal) => {
  const check = validate(next, bal);
  return check.ok ? { ok: true, save: next } : fail(check.errors.join('; '));
};
const checkIn = (save, bal) => validate(save, bal).ok;
// ⑤ #1: 맨 위 캐릭터 필드를 모두 지운 뒤(선택 필드 포함) 대상 필드만 복사 — 이전 캐릭터 값이 남지 않게
function putOnTop(next, c) {
  for (const k of CHAR_ALL) delete next[k];
  for (const k of CHAR_ALL) if (Object.hasOwn(c, k)) next[k] = c[k];
}

// 새 캐릭터: 6명 미만·직업·이름(공백 없이 1~8글자, 겹치지 않음). 지금 캐릭터는 명단으로, 새 캐릭터가 맨 위(지금 캐릭터)가 된다
export function addChar(save, cls, name, bal) {
  if (!checkIn(save, bal)) return fail('저장 상태가 올바르지 않습니다');
  if (!isClassId(cls)) return fail('알 수 없는 직업입니다');
  if (!heroNameOk(name)) return fail('이름은 띄어쓰기 없이 1~8글자로 지어 주세요');
  const all = charsOf(save);
  if (all.length >= (bal.maxChars ?? 6)) return fail(`캐릭터는 ${bal.maxChars ?? 6}명까지 만들 수 있습니다`);
  if (all.some(c => c.hero.name === name)) return fail('같은 이름의 캐릭터가 이미 있습니다');
  const cid = Math.max(...all.map(c => c.hero.cid)) + 1;
  if (!integer(cid, 1, 99)) return fail('캐릭터 번호를 더 만들 수 없습니다');
  const next = clone(save);
  let made;
  try { made = newCharFields(next, cls, name, cid, bal); } catch (e) { return fail(e.message); }
  next.roster = [...next.roster, charPart(next)].sort((a, b) => a.hero.cid - b.hero.cid);
  putOnTop(next, made.fields);
  next.nextUid = made.nextUid;
  return done(next, bal);
}

// 명단의 cid 캐릭터와 지금 캐릭터를 맞바꾼다. 쉬는 캐릭터의 버프·변신은 남은 시간 그대로 보관(쉬는 동안 줄지 않음)
export function switchChar(save, cid, bal) {
  if (!checkIn(save, bal)) return fail('저장 상태가 올바르지 않습니다');
  if (save.hero.cid === cid) return { ok: true, save: clone(save) };
  const i = save.roster.findIndex(c => c.hero.cid === cid);
  if (i < 0) return fail('그 캐릭터가 없습니다');
  const next = clone(save);
  const target = next.roster[i];
  const roster = next.roster.filter((_, j) => j !== i);
  roster.push(charPart(next));
  putOnTop(next, target);
  next.roster = roster.sort((a, b) => a.hero.cid - b.hero.cid);
  return done(next, bal);
}

// ⑤ #7 창고 돈: 1 이상 정수, 전액 성공 또는 아무것도 안 바뀜. 맡기기 = 지금 캐릭터 돈 → 창고 돈(상한 wgoldMax)
export function depositGold(save, amount, bal) {
  if (!checkIn(save, bal)) return fail('저장 상태가 올바르지 않습니다');
  if (!integer(amount, 1)) return fail('금액은 1원 이상 정수로 넣어 주세요');
  if (amount > save.player.gold) return fail('가진 돈이 모자랍니다');
  if (save.wgold + amount > (bal.wgoldMax ?? 1e15)) return fail('창고에 더 맡길 수 없습니다');
  const next = clone(save);
  next.player.gold -= amount; next.wgold += amount;
  return done(next, bal);
}
export function withdrawGold(save, amount, bal) {
  if (!checkIn(save, bal)) return fail('저장 상태가 올바르지 않습니다');
  if (!integer(amount, 1)) return fail('금액은 1원 이상 정수로 넣어 주세요');
  if (amount > save.wgold) return fail('창고 돈이 모자랍니다');
  if (!Number.isSafeInteger(save.player.gold + amount)) return fail('돈을 더 가질 수 없습니다');
  const next = clone(save);
  next.player.gold += amount; next.wgold -= amount;
  return done(next, bal);
}
// 시작 화면 카드용 요약
export const charSummary = c => ({ cid: c.hero.cid, cls: c.hero.cls, name: c.hero.name, level: c.player.level, map: c.player.map });


// 15차 캐릭터 성장: 엘릭서(능력치 영구 +1)·경험치 복구·마법인형. 저장은 모두 선택 필드(v11):
//   player.elixir = {str, dex, con}(0~elixirMax 정수), save.recover = {exp}(쓰러져 잃은 경험치, 마지막 한 번), save.dolls = {owned:[id…], cur:id|null}
import { integer, isRecord } from './common.js';

export const ELIXIR_KEYS = ['str', 'dex', 'con'];
export const elixirOf = save => save?.player?.elixir ?? null;
// 능력치 계산(playerStats extra)에 더할 값. 없으면 null
export function elixirExtra(save) {
  const e = elixirOf(save);
  return e ? { str: e.str, dex: e.dex, con: e.con } : null;
}
// 두 extra(엘릭서·변신)를 더한다
export function sumExtra(...list) {
  const xs = list.filter(Boolean);
  if (!xs.length) return null;
  const out = { str: 0, dex: 0, con: 0 };
  for (const x of xs) for (const k of ELIXIR_KEYS) out[k] += x[k] ?? 0;
  return out;
}
export function validElixir(e, bal) {
  return isRecord(e) && Object.getPrototypeOf(e) === Object.prototype && Object.keys(e).length === 3
    && ELIXIR_KEYS.every(k => integer(e[k], 0, bal.elixirMax)) && ELIXIR_KEYS.some(k => e[k] > 0);
}
export const validRecover = r => isRecord(r) && Object.getPrototypeOf(r) === Object.prototype && Object.keys(r).length === 1 && integer(r.exp, 1);
export const dollDef = (id, bal) => (bal.dolls ?? []).find(d => d.id === id) ?? null;
export function validDolls(d, bal) {
  if (!isRecord(d) || Object.getPrototypeOf(d) !== Object.prototype || Object.keys(d).length !== 2) return false;
  if (!Array.isArray(d.owned) || !d.owned.length || new Set(d.owned).size !== d.owned.length || d.owned.some(id => !dollDef(id, bal))) return false;
  return d.cur === null || d.owned.includes(d.cur);
}
// 데리고 다니는 인형의 효과(영구 효과 permOf와 같은 모양: hp·def·dmg·hit·expPct·goldPct)
export const dollFx = (save, bal) => (save?.dolls?.cur ? dollDef(save.dolls.cur, bal)?.fx ?? null : null);
// 복구 비용(돈) = ceil(잃은 경험치 × recoverGoldPerExp)
export const recoverCost = (exp, bal) => Math.ceil(exp * bal.recoverGoldPerExp);

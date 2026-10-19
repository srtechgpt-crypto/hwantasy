// 10차 버프(쓰는 아이템): 힘·날쌤·수호 물약, 경험치 두루마리.
// 저장 v6의 save.buffs = { 버프id: 남은 ms(정수 1~상한) } — 끝난 버프는 키를 지운다. 시간은 게임 시계(멈추면 안 줄어듦).
// 모든 함수는 새 객체를 돌려준다(원본 안 바꿈)
import { clone, fail, integer, isRecord, itemDef } from './common.js';

export const buffDef = (id, bal) => (bal.buffs ?? []).find(b => b.id === id) ?? null;
export const buffOfItem = (itemId, bal) => (bal.buffs ?? []).find(b => b.item === itemId) ?? null;
export const buffCap = (def, bal) => def.durationMs * (bal.buffStackMax ?? 1);

export function validBuffs(buffs, bal) {
  if (!isRecord(buffs) || Object.getPrototypeOf(buffs) !== Object.prototype) return false;
  return Object.entries(buffs).every(([id, ms]) => { const d = buffDef(id, bal); return !!d && integer(ms, 1, buffCap(d, bal)); });
}

// 켜진 버프를 능력치에 더한다(최대 체력은 바꾸지 않음 — 저장 검사·hp 정리는 버프와 무관).
// power: 최종 피해 % +, haste: 공격 간격 × (100 + speedPct)/100(무기 계열 최소 간격 지킴), guard: 방어 + defBase + floor(L/defPerLevels)
export function applyBuffs(stats, buffs, level, bal) {
  if (!buffs || !Object.keys(buffs).length) return stats;
  const out = { ...stats };
  for (const [id, ms] of Object.entries(buffs)) {
    const d = buffDef(id, bal);
    if (!d || !(ms > 0)) continue;
    if (d.dmgPct) out.dmgPct = (out.dmgPct ?? 0) + d.dmgPct;
    // 11차(⑤ #10): 간격 배율은 atkMul 하나에 곱해 두고(변신도 같은 곳), 자르기 전 간격 × atkMul을 마지막에 한 번 자름
    if (d.speedPct) { out.atkMul = (out.atkMul ?? 1) * (100 + d.speedPct) / 100; out.attackMs = Math.max(out.minAttackMs ?? bal.stats.minAttackMs, Math.round((out.attackMsRaw ?? out.attackMs) * out.atkMul)); }
    if (d.defBase !== undefined) out.def += d.defBase + Math.floor(level / d.defPerLevels);
  }
  return out;
}

// 처치 경험치에 경험치 두루마리 반영(배율 적용 뒤, 내림)
export function buffedExp(exp, buffs, bal) {
  const pct = scrollExpPct(buffs, bal);
  return pct ? Math.floor((exp * (100 + pct)) / 100) : exp;
}
// 12차: 켜진 경험치 두루마리 % 합(도감·칭호 경험치%와 더해서 한 번 곱함 — collect.bonusExp)
export function scrollExpPct(buffs, bal) {
  let pct = 0;
  for (const [id, ms] of Object.entries(buffs ?? {})) { const d = buffDef(id, bal); if (d?.expPct && ms > 0) pct += d.expPct; }
  return pct;
}

// 시간 흐름: 정수 dtMs만큼 모든 버프를 줄이고 0 이하는 지운다(⑤ #6: 소수 ms는 부르는 쪽이 모아 정수로 넘김 — 저장값은 항상 정수).
// 바뀐 게 없으면 같은 객체, 끝난 버프 id 목록도 돌려줌
export function tickBuffs(buffs, dtMs) {
  if (!buffs || !Number.isSafeInteger(dtMs) || dtMs <= 0) return { buffs, ended: [] };
  const keys = Object.keys(buffs);
  if (!keys.length) return { buffs, ended: [] };
  const next = {}, ended = [];
  for (const id of keys) {
    const left = buffs[id] - dtMs;
    if (left > 0) next[id] = left; else ended.push(id);
  }
  return { buffs: next, ended };
}

// 버프 아이템 쓰기(물약·두루마리): 가방에서 1개 빼고 남은 시간에 더한다(상한). 이미 상한이면 쓰지 않음
// take(next, id, 1)은 inventory.js가 넘겨 준다(순환 참조 없이 거래 함수 안에서 쓰려고)
export function applyBuffItem(next, itemId, bal, take) {
  const def = itemDef(itemId, bal), b = def?.buff ? buffDef(def.buff, bal) : null;
  if (!b) return fail('버프 아이템이 아닙니다');
  if (next.player.hp <= 0) return fail('쓰러진 상태에서는 쓸 수 없습니다');
  const cur = next.buffs?.[b.id] ?? 0, cap = buffCap(b, bal);
  if (cur >= cap) return fail(`${b.name} 효과가 이미 최대 시간입니다`);
  if (take(next, itemId, 1)) return fail(`${def.name}이(가) 없습니다`);
  next.buffs = { ...(next.buffs ?? {}), [b.id]: Math.min(cap, cur + b.durationMs) };
  return { ok: true, save: next, buff: b.id, ms: next.buffs[b.id] };
}
export const cloneBuffs = buffs => clone(buffs ?? {});

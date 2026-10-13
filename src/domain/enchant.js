import { assertRates, fail, integer, itemDef, random } from './common.js';
import { removeItem } from './inventory.js';
import { validate } from './save.js';

export function enchantInfo(item, rates, bal) {
  const def = itemDef(item?.id, bal);
  if (!['weapon', 'armor'].includes(def?.kind)) throw new TypeError('강화할 장비가 아닙니다');
  const rule = bal.enchant[def.kind];
  if (!integer(item.enchant, 0, rule.max)) throw new RangeError('강화 단계가 올바르지 않습니다');
  assertRates(rates, bal, ['enchant']);
  const current = item.enchant, next = current < rule.max ? current + 1 : null;
  const safe = next !== null && next <= rule.safe;
  const chance = next === null ? 0 : safe ? 1 : Math.min(1, rule.riskyChances[next - rule.safe - 1] * rates.enchant);
  return { kind: def.kind, current, next, chance, safe, max: rule.max, destroyOnFail: next !== null && !safe };
}
export function tryEnchant(save, uid, rng, bal) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  const item = save.bag.find(item => item.uid === uid);
  let info;
  try { info = enchantInfo(item, save.rates, bal); }
  catch { return fail('강화할 장비가 아닙니다'); }
  if (info.next === null) return fail('이미 최대 강화 단계입니다');
  const consumed = removeItem(save, bal.enchant[info.kind].scrollId, 1, bal);
  if (!consumed.ok) return fail('강화 주문서가 없습니다');
  let success;
  try { success = info.safe || random(rng) < info.chance; }
  catch { return fail('난수 함수가 올바르지 않습니다'); }
  const next = consumed.save;
  if (success) {
    next.bag.find(candidate => candidate.uid === uid).enchant++;
    return { ok: true, result: 'success', save: next };
  }
  next.bag = next.bag.filter(candidate => candidate.uid !== uid);
  if (next.equip[info.kind] === uid) next.equip[info.kind] = null;
  return { ok: true, result: 'destroyed', save: next };
}

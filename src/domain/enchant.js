import { assertRates, fail, integer, itemDef, random, isGearDef, slotOf, enchantRule } from './common.js';
import { removeItem } from './inventory.js';
import { validate, settleHp } from './save.js';

export function enchantInfo(item, rates, bal) {
  const def = itemDef(item?.id, bal);
  if (!isGearDef(def)) throw new TypeError('강화할 장비가 아닙니다');
  const rule = enchantRule(def, bal);
  if (!integer(item.enchant, 0, rule.max)) throw new RangeError('강화 단계가 올바르지 않습니다');
  assertRates(rates, bal, ['enchant']);
  const current = item.enchant, next = current < rule.max ? current + 1 : null;
  const safe = next !== null && next <= rule.safe;
  const chance = next === null ? 0 : safe ? 1 : Math.min(1, rule.riskyChances[next - rule.safe - 1] * rates.enchant);
  return { kind: def.kind, slot: slotOf(def), scrollId: rule.scrollId, safeMax: rule.safe, current, next, chance, safe, max: rule.max, destroyOnFail: next !== null && !safe };
}
export function tryEnchant(save, uid, rng, bal) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  const item = save.bag.find(item => item.uid === uid);
  let info;
  try { info = enchantInfo(item, save.rates, bal); }
  catch { return fail('강화할 장비가 아닙니다'); }
  if (info.next === null) return fail('이미 최대 강화 단계입니다');
  const consumed = removeItem(save, info.scrollId, 1, bal);
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
  if (next.equip[info.slot] === uid) next.equip[info.slot] = null;
  // 8차(⑤ #2): 체력 장비가 사라지면 최대 체력이 준다 — 마지막에 hp를 맞춘다
  settleHp(next, bal);
  return { ok: true, result: 'destroyed', save: next };
}

// 2026-10-16 한 번에 강화(대표님 의견): 목표 단계까지 tryEnchant를 차례로. 전체를 한 거래로 돌려준다(저장은 부르는 쪽이 한 번에, mustSave).
// 멈추는 때: 목표 도달('target') / 주문서가 떨어짐('noScroll') / 위험 단계 실패로 장비가 사라짐('destroyed'). 그 밖의 오류는 전체 실패.
// 난수는 tryEnchant와 같이 위험 단계마다 1개, 안전 단계는 쓰지 않는다. 한 단계도 못 했으면 실패(아무것도 안 바뀜)
export function enchantPlan(item, target, rates, bal) {
  const info = enchantInfo(item, rates, bal);
  if (!integer(target, info.current + 1, info.max)) throw new RangeError('목표 강화 단계가 올바르지 않습니다');
  const steps = [];
  let all = 1;
  for (let lv = info.current + 1; lv <= target; lv++) {
    const safe = lv <= info.safeMax;
    const chance = safe ? 1 : Math.min(1, enchantRule(itemDef(item.id, bal), bal).riskyChances[lv - info.safeMax - 1] * rates.enchant);
    steps.push({ level: lv, safe, chance });
    all *= chance;
  }
  return { from: info.current, target, steps, scrolls: steps.length, scrollId: info.scrollId, risky: steps.filter(s => !s.safe), allChance: all };
}
export function enchantTo(save, uid, target, rng, bal) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  const item = save.bag.find(it => it.uid === uid);
  let plan;
  try { plan = enchantPlan(item, target, save.rates, bal); }
  catch (e) { return fail(e instanceof RangeError ? e.message : '강화할 장비가 아닙니다'); }
  let cur = save, used = 0, stop = 'target';
  const steps = [];
  for (const step of plan.steps) {
    const r = tryEnchant(cur, uid, rng, bal);
    if (!r.ok) {
      if (r.reason === '강화 주문서가 없습니다') { stop = 'noScroll'; break; }
      return r; // ⑤ #4: 난수·검사 오류는 지금까지 굴린 것까지 모두 버린다(원본 save 그대로)
    }
    cur = r.save; used++;
    steps.push({ level: step.level, result: r.result });
    if (r.result === 'destroyed') { stop = 'destroyed'; break; }
  }
  if (!used) return fail(`${itemDef(plan.scrollId, bal).name}이(가) 없습니다`);
  return done();
  function done() {
    const last = steps.at(-1);
    return { ok: true, save: cur, from: plan.from, target, to: last.result === 'destroyed' ? null : last.level, steps, used, stop };
  }
}

// 11차 고급 강화(⑤ #7·#8): 주문서 1장, k단계(1·2·3, bal.blessed.weights) 난수 1개, 도착 = min(최대, 현재+k).
// 도착 ≤ 안전이면 성공. 도착 > 안전이면 그 단계의 일반 확률(riskyChances[도착−안전−1] × 강화 배율, 상한 1)로 난수 1개 더 — 실패면 사라짐.
// 규칙은 enchantRule(부위는 안전 +2·최대 +6). 이미 최대면 소비·난수 전에 거절
export const blessedScrollOf = (def, bal) => (def?.kind === 'weapon' ? bal.blessed.weaponScroll : bal.blessed.armorScroll);
export function blessedPlan(item, rates, bal) {
  const info = enchantInfo(item, rates, bal);
  if (info.next === null) throw new RangeError('이미 최대 강화 단계입니다');
  const rule = enchantRule(itemDef(item.id, bal), bal), w = bal.blessed.weights, total = w.reduce((a, b) => a + b, 0);
  const byLevel = new Map();
  w.forEach((wt, i) => { const lv = Math.min(info.max, info.current + i + 1); byLevel.set(lv, (byLevel.get(lv) ?? 0) + wt / total); });
  const outcomes = [...byLevel].map(([level, q]) => {
    const p = level <= rule.safe ? 1 : Math.min(1, rule.riskyChances[level - rule.safe - 1] * rates.enchant);
    return { level, arrive: q, success: q * p, destroy: q * (1 - p), chance: p, safe: level <= rule.safe };
  });
  return { from: info.current, scrollId: blessedScrollOf(itemDef(item.id, bal), bal), outcomes,
    destroy: outcomes.reduce((s, o) => s + o.destroy, 0), anyRisk: outcomes.some(o => o.destroy > 0) };
}
export function tryBlessed(save, uid, rng, bal) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  const item = save.bag.find(it => it.uid === uid);
  let plan;
  try { plan = blessedPlan(item, save.rates, bal); }
  catch (e) { return fail(e instanceof RangeError ? e.message : '강화할 장비가 아닙니다'); }
  const consumed = removeItem(save, plan.scrollId, 1, bal);
  if (!consumed.ok) return fail(`${itemDef(plan.scrollId, bal).name}이(가) 없습니다`);
  const w = bal.blessed.weights, total = w.reduce((a, b) => a + b, 0);
  let k, success;
  try {
    let r = random(rng) * total; k = 0;
    while (k < w.length - 1 && r >= w[k]) { r -= w[k]; k++; }
    k += 1;
    const level = Math.min(enchantInfo(item, save.rates, bal).max, plan.from + k);
    const o = plan.outcomes.find(x => x.level === level);
    success = o.safe || random(rng) < o.chance; // ⑦ #2: 위험 단계는 확률이 100%여도 판정 난수 1개
    const next = consumed.save;
    if (success) { next.bag.find(c => c.uid === uid).enchant = level; return { ok: true, result: 'success', save: settleHp(next, bal), from: plan.from, to: level, k }; }
    const slot = slotOf(itemDef(item.id, bal));
    next.bag = next.bag.filter(c => c.uid !== uid);
    if (next.equip[slot] === uid) next.equip[slot] = null;
    return { ok: true, result: 'destroyed', save: settleHp(next, bal), from: plan.from, to: level, k };
  } catch { return fail('난수 함수가 올바르지 않습니다'); }
}
// 11차 강화 하락 주문서: −1(0이면 못 씀), 난수 없음, 사라지지 않음
export function lowerEnchant(save, uid, bal) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  const item = save.bag.find(it => it.uid === uid);
  if (!isGearDef(itemDef(item?.id, bal))) return fail('장비가 아닙니다');
  if (!(item.enchant > 0)) return fail('이미 +0입니다');
  const consumed = removeItem(save, 'downScroll', 1, bal);
  if (!consumed.ok) return fail('강화 하락 주문서가 없습니다');
  const next = consumed.save;
  next.bag.find(c => c.uid === uid).enchant -= 1;
  return { ok: true, save: settleHp(next, bal), from: item.enchant, to: item.enchant - 1 };
}

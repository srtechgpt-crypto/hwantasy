import { assertRates, fail, integer, itemDef, random, isGearDef, slotOf, enchantRule, isLocked, LOCKED_ENCHANT } from './common.js';
import { removeItem, countItem } from './inventory.js';
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
  if (isLocked(item)) return fail(LOCKED_ENCHANT); // 13차
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
  if (isLocked(item)) return fail(LOCKED_ENCHANT); // 13차
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

// 24차 같은 장비 함께 강화(리니지M [동일 장비 선택]): 같은 id·잠금 아님·끼지 않은 장비 여러 개를 같은 목표까지 한 거래로.
// 순서 = 지금 단계 높은 것부터(같으면 uid 작은 것) — 주문서가 모자랄 때 완성품을 많이. 사라져도 다음 장비 계속, 주문서가 떨어지면 나머지는 손대지 않음
const isWorn = (save, uid) => Object.values(save.equip).includes(uid);
export function sameGearCandidates(save, id, bal) {
  if (!isGearDef(itemDef(id, bal))) return [];
  return save.bag.filter(it => it.id === id && !isLocked(it) && !isWorn(save, it.uid) && enchantInfo(it, save.rates, bal).next !== null);
}
export function enchantManyPlan(save, uids, target, bal) {
  if (!Array.isArray(uids) || uids.length < 2 || new Set(uids).size !== uids.length) throw new RangeError('함께 강화할 장비를 2개 이상 골라 주세요');
  const items = uids.map(uid => save.bag.find(it => it.uid === uid));
  if (items.some(it => !it)) throw new RangeError('고른 장비가 가방에 없습니다');
  if (!isGearDef(itemDef(items[0].id, bal)) || items.some(it => it.id !== items[0].id)) throw new RangeError('같은 종류의 장비만 함께 강화할 수 있습니다');
  if (items.some(isLocked)) throw new RangeError(LOCKED_ENCHANT);
  if (items.some(it => isWorn(save, it.uid))) throw new RangeError('끼고 있는 장비는 함께 강화할 수 없습니다');
  const list = items.map(it => ({ uid: it.uid, from: it.enchant, plan: enchantPlan(it, target, save.rates, bal) }))
    .sort((a, b) => b.from - a.from || a.uid - b.uid);
  const scrollId = list[0].plan.scrollId, have = countItem(save, scrollId);
  const need = list.reduce((a, p) => a + p.plan.scrolls, 0);
  // ⑤ #1: 앞 장비가 일찍 사라지면 남은 주문서가 뒤 장비로 간다 → 예상 사라짐은 (장비 순번, 남은 주문서) 갈래를 모두 따진 정확한 기대값.
  // 위험 여부도 '어떤 장비든 주문서 have장 안에 닿을 수 있는 위험 단계가 있나'로(배분과 무관하게 보수적으로)
  const needFrom = list.map((_, i) => list.slice(i).reduce((a, p) => a + p.plan.scrolls, 0));
  const memo = new Map();
  const lossFrom = (i, left) => {
    if (i >= list.length || left < 1) return 0;
    const L = Math.min(left, needFrom[i]), key = i * (need + 1) + L;
    if (memo.has(key)) return memo.get(key);
    const steps = list[i].plan.steps;
    let reach = 1, e = 0;
    for (let k = 0; k < steps.length && reach > 0; k++) {
      if (k >= L) { reach = 0; break; } // 주문서가 떨어져 멈춤 — 뒤 장비는 손대지 않음
      e += reach * (1 - steps[k].chance) * (1 + lossFrom(i + 1, L - k - 1));
      reach *= steps[k].chance;
    }
    if (reach > 0) e += reach * lossFrom(i + 1, L - steps.length);
    memo.set(key, e);
    return e;
  };
  const risky = list.some(p => p.plan.steps.slice(0, have).some(st => !st.safe));
  return { id: items[0].id, target, scrollId, have, items: list, order: list.map(p => p.uid), need, maxUse: Math.min(have, need), risky, expectLoss: lossFrom(0, have) };
}
export function enchantMany(save, uids, target, rng, bal) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  let plan;
  try { plan = enchantManyPlan(save, uids, target, bal); }
  catch (e) { return fail(e instanceof RangeError ? e.message : '함께 강화할 수 없습니다'); }
  let cur = save, used = 0, out = false;
  const results = [];
  for (const p of plan.items) {
    const skip = { uid: p.uid, from: p.from, to: p.from, stop: 'skipped', used: 0 };
    // ⑤ #2: 부르기 전에 주문서를 센다(앞 장비가 마지막 주문서로 끝난 경우). 그 밖의 실패는 모두 오류
    if (!out && countItem(cur, plan.scrollId) < 1) out = true;
    if (out) { results.push(skip); continue; }
    const r = enchantTo(cur, p.uid, target, rng, bal);
    if (!r.ok) return r; // 난수·검사 오류 — 지금까지 굴린 것까지 모두 버린다(원본 그대로)
    cur = r.save; used += r.used;
    results.push({ uid: p.uid, from: p.from, to: r.to, stop: r.stop, used: r.used, ...(r.stop === 'destroyed' ? { failAt: r.steps.at(-1).level } : {}) });
    if (r.stop === 'noScroll') out = true;
  }
  if (!used) return fail(`${itemDef(plan.scrollId, bal).name}이(가) 없습니다`);
  settleHp(cur, bal);
  if (!validate(cur, bal).ok) return fail('강화 결과가 올바르지 않아 취소했습니다'); // ⑤ #9: 최종본 검사
  const n = (k) => results.filter(x => x.stop === k).length;
  return { ok: true, save: cur, id: plan.id, target, scrollId: plan.scrollId, results, used, done: n('target'), lost: n('destroyed'), partial: n('noScroll'), untouched: n('skipped'), short: n('noScroll') + n('skipped') };
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
  if (isLocked(item)) return fail(LOCKED_ENCHANT); // 13차
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
  if (isLocked(item)) return fail(LOCKED_ENCHANT); // 13차
  if (!(item.enchant > 0)) return fail('이미 +0입니다');
  const consumed = removeItem(save, 'downScroll', 1, bal);
  if (!consumed.ok) return fail('강화 하락 주문서가 없습니다');
  const next = consumed.save;
  next.bag.find(c => c.uid === uid).enchant -= 1;
  return { ok: true, save: settleHp(next, bal), from: item.enchant, to: item.enchant - 1 };
}

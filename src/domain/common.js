export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
export const finite = (value, min = 0) => Number.isFinite(value) && value >= min;
export const clone = value => structuredClone(value);
export const itemDef = (id, bal) => [...bal.weapons, ...bal.armors, ...bal.consumables].find(item => item.id === id);
export function assertLevel(level, bal) {
  if (!integer(level, 1, bal.progression.maxLevel)) throw new RangeError('레벨이 올바르지 않습니다');
}
export function random(rng) {
  if (typeof rng !== 'function') throw new TypeError('난수 함수가 필요합니다');
  const value = rng();
  if (!finite(value) || value >= 1) throw new RangeError('난수는 0 이상 1 미만이어야 합니다');
  return value;
}
export function rollInt(min, max, rng) {
  return min + Math.floor(random(rng) * (max - min + 1));
}
export function assertRates(rates, bal, keys = Object.keys(bal.rates)) {
  if (!isRecord(rates) || keys.some(key => !bal.rates[key].includes(rates[key]))) throw new RangeError('배율이 올바르지 않습니다');
}
export const fail = reason => ({ ok: false, reason });
// 8차: 장착 칸 9개(무기 + 갑옷 + 7부위). 방어구 정의는 kind 'armor' + slot
export const EQUIP_SLOTS = ['weapon', 'armor', 'helm', 'shirt', 'cloak', 'gloves', 'belt', 'pants', 'boots'];
export const slotOf = def => def?.kind === 'weapon' ? 'weapon' : def?.kind === 'armor' ? (def.slot ?? 'armor') : null;
export const isGearDef = def => def?.kind === 'weapon' || def?.kind === 'armor';
// 8차: 강화 규칙 — 무기·갑옷은 그대로, 7부위는 enchant.part(안전 단계가 낮음)
export const enchantRule = (def, bal) => def?.kind === 'armor' && def.slot && def.slot !== 'armor' ? bal.enchant.part : bal.enchant[def?.kind];
export const NO_BONUS = Object.freeze({ str: 0, dex: 0, con: 0 });

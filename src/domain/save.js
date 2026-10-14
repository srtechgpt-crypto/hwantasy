import defaultBalance from '../../data/balance.js';
import { clone, finite, integer, isRecord, itemDef } from './common.js';
import { needExp } from './progression.js';

// 저장 형식 버전. 2 = 2026-10-13 경험치 곡선 변경(초반 빠르게). 1 → 2는 '현재 레벨에서 채운 비율'로 변환한다.
// 3 = 2026-10-14 4차: 보스 두 마리(boss → bosses 맵), 최대 레벨 40. 2 → 3은 v2 규칙으로 전부 검사한 뒤에만 바꾼다.
export const SAVE_VERSION = 3;
const KEYS = ['hwantasy.A', 'hwantasy.B'];
export const V1_BACKUP_KEY = 'hwantasy.v1backup';
export const V2_BACKUP_KEY = 'hwantasy.v2backup';
// v3 보스 키(고정). 보스를 더 늘리면 버전을 올리고 변환을 추가한다
export const V3_BOSSES = ['boss', 'lich'];
// 버전 1 때의 경험치 공식(고정): round(72 × L^2.15). 변환 전 v1 검사·비율 계산에만 쓴다
const V1_PROGRESSION = { coefficient: 72, exponent: 2.15 };
// 버전 2(3차 게시본) 때의 경험치 공식(고정): 계수 127·초반 감소. 5차에서 계수를 바꿔도 v2 기록은 이 공식으로 검사·비율 변환
const V2_PROGRESSION = { coefficient: 127, exponent: 2.15, early: { untilLevel: 22, startFactor: 0.04, power: 2.5 } };
// v1·v2 당시의 고정 규칙: 최대 레벨 30, 아이템 16종, 지도 3곳(지금 밸런스가 바뀌어도 옛 기록은 옛 규칙으로 검사)
const LEGACY_ITEMS = ['woodSword', 'ironSword', 'steelSword', 'deepSword', 'clothArmor', 'leatherArmor', 'chainArmor', 'plateArmor',
  'potion', 'returnScroll', 'weaponScroll', 'armorScroll'];
const LEGACY_MAPS = ['field', 'forest', 'mine'];
function legacyBal(bal, version) {
  const keep = list => list.filter(def => LEGACY_ITEMS.includes(def.id));
  return {
    ...bal,
    weapons: keep(bal.weapons), armors: keep(bal.armors), consumables: keep(bal.consumables),
    maps: bal.maps.filter(map => LEGACY_MAPS.includes(map.id)),
    progression: version === 1
      ? { ...bal.progression, ...V1_PROGRESSION, early: undefined, maxLevel: 30 }
      : { ...bal.progression, ...V2_PROGRESSION, maxLevel: 30 },
  };
}
// 버전에 맞는 검사 규칙(v3은 지금 밸런스 그대로)
export const balFor = (bal, version) => (version === SAVE_VERSION ? bal : legacyBal(bal, version));

// uid and nextUid are positive safe integers. Gear: {uid,id,count:1,enchant};
// consumables: {uid,id,count}. Equip holds references to bag gear, never copies.
export function newGame(bal) {
  const bag = [
    { uid: 1, id: bal.start.weapon, count: 1, enchant: 0 },
    { uid: 2, id: bal.start.armor, count: 1, enchant: 0 },
    ...bal.start.items.map((item, i) => ({ uid: i + 3, ...item })),
  ];
  return {
    version: SAVE_VERSION, seq: 0, savedAt: 0,
    player: { level: 1, exp: 0, hp: bal.knight.baseHp, gold: bal.start.gold, map: bal.town.id, x: bal.town.x, y: bal.town.y },
    equip: { weapon: 1, armor: 2 }, bag, warehouse: [],
    rates: { exp: 1, drop: 1, gold: 1, enchant: 1 },
    bosses: Object.fromEntries(V3_BOSSES.map(id => [id, null])), nextUid: bag.length + 1,
  };
}
export function validate(save, bal, version = SAVE_VERSION) {
  const errors = [];
  const bad = message => errors.push(message);
  if (!isRecord(save)) return { ok: false, errors: ['저장은 객체여야 합니다'] };
  if (save.version !== version) bad('지원하지 않는 저장 버전입니다');
  if (!integer(save.seq)) bad('저장 순번이 올바르지 않습니다');
  if (!integer(save.savedAt)) bad('저장 시각이 올바르지 않습니다');
  if (!integer(save.nextUid, 1)) bad('다음 uid가 올바르지 않습니다');
  const p = save.player;
  const levelOk = isRecord(p) && integer(p.level, 1, bal.progression.maxLevel);
  if (!levelOk) bad('플레이어 레벨이 올바르지 않습니다');
  if (!isRecord(p)) bad('플레이어 정보가 없습니다');
  else {
    if (!integer(p.exp) || (levelOk && (p.level === bal.progression.maxLevel ? p.exp !== 0 : p.exp >= needExp(p.level, bal)))) bad('경험치가 올바르지 않습니다');
    if (!finite(p.hp) || (levelOk && p.hp > bal.knight.baseHp + bal.knight.hpPerLevel * (p.level - 1))) bad('체력이 올바르지 않습니다');
    if (!integer(p.gold)) bad('돈이 올바르지 않습니다');
    if (![bal.town.id, ...bal.maps.map(map => map.id)].includes(p.map)) bad('지도가 올바르지 않습니다');
    if (!finite(p.x) || !finite(p.y)) bad('위치가 올바르지 않습니다');
  }
  const ids = new Set();
  let maxUid = 0;
  for (const [key, limit] of [['bag', bal.inventory.bagSlots], ['warehouse', bal.inventory.warehouseSlots]]) {
    if (!Array.isArray(save[key])) { bad(`${key} 목록이 없습니다`); continue; }
    if (save[key].length > limit) bad(`${key} 칸 수를 초과했습니다`);
    for (const item of save[key]) {
      if (!isRecord(item)) { bad(`${key} 아이템 형식이 올바르지 않습니다`); continue; }
      if (!integer(item.uid, 1)) bad('아이템 uid가 올바르지 않습니다');
      else {
        if (ids.has(item.uid)) bad('아이템 uid가 중복되었습니다');
        ids.add(item.uid); maxUid = Math.max(maxUid, item.uid);
      }
      const def = itemDef(item.id, bal);
      if (!def) { bad('알 수 없는 아이템입니다'); continue; }
      const gear = def.kind === 'weapon' || def.kind === 'armor';
      if (!integer(item.count, 1, gear ? 1 : bal.inventory.stackMax)) bad('아이템 수량이 올바르지 않습니다');
      if (gear ? !integer(item.enchant, 0, bal.enchant[def.kind].max) : item.enchant !== undefined) bad('아이템 강화 단계가 올바르지 않습니다');
    }
  }
  if (integer(save.nextUid, 1) && save.nextUid <= maxUid) bad('다음 uid는 기존 uid보다 커야 합니다');
  if (!isRecord(save.equip)) bad('장착 정보가 없습니다');
  else for (const kind of ['weapon', 'armor']) {
    const uid = save.equip[kind];
    if (uid === null) continue;
    const item = Array.isArray(save.bag) ? save.bag.find(item => isRecord(item) && item.uid === uid) : null;
    if (!integer(uid, 1) || !item || itemDef(item.id, bal)?.kind !== kind) bad('장착 장비는 가방 안의 맞는 종류를 가리켜야 합니다');
  }
  if (!isRecord(save.rates) || Object.keys(bal.rates).some(key => !bal.rates[key].includes(save.rates[key]))) bad('배율이 올바르지 않습니다');
  const bossTime = at => at === null || integer(at);
  if (version < 3) {
    if (!isRecord(save.boss) || !bossTime(save.boss.defeatedAt)) bad('보스 처치 시각이 올바르지 않습니다');
  } else {
    const b = save.bosses;
    const keys = isRecord(b) ? Object.keys(b) : [];
    if (!isRecord(b) || Object.getPrototypeOf(b) !== Object.prototype || keys.length !== V3_BOSSES.length
      || V3_BOSSES.some(id => !Object.hasOwn(b, id) || !bossTime(b[id]))) bad('보스 처치 시각이 올바르지 않습니다');
    if ('boss' in save && save.boss !== undefined) bad('옛 보스 기록이 남아 있습니다');
  }
  return { ok: errors.length === 0, errors };
}
// 저장을 지금 버전(3)으로 바꾼다. 한 단계씩(1→2→3), 각 단계 전에 그 버전의 옛 규칙으로 전부 검사한다.
// 1→2 경험치: 레벨 유지, 새 경험치 = 옛 비율 × 새 필요치(반올림, 새 필요치 − 1 이하). 1점 미만은 잘린다.
function v1to2(save, bal) {
  const old = balFor(bal, 1), v2 = balFor(bal, 2);
  const check = validate(save, old, 1);
  if (!check.ok) throw new TypeError(`버전 1 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 2;
  const p = next.player;
  if (p.level < v2.progression.maxLevel) {
    const ratio = p.exp / needExp(p.level, old);
    const need = needExp(p.level, v2);
    p.exp = Math.min(need - 1, Math.round(ratio * need));
  }
  return next;
}
// 2→3: 아이템은 그대로, 경험치는 1→2처럼 옛 비율 × 새 필요치(5차 계수 변경), boss.defeatedAt → bosses.boss, 기사왕은 처치 기록 없음
function v2to3(save, bal) {
  const old = balFor(bal, 2);
  const check = validate(save, old, 2);
  if (!check.ok) throw new TypeError(`버전 2 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 3;
  const p = next.player;
  if (p.level < old.progression.maxLevel) {
    const need = needExp(p.level, bal);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  }
  next.bosses = { boss: save.boss.defeatedAt, lich: null };
  delete next.boss;
  return next;
}
export function migrate(save, bal = defaultBalance) {
  if (!isRecord(save)) throw new TypeError('지원하지 않는 저장 버전입니다');
  if (save.version === SAVE_VERSION) return clone(save);
  if (save.version !== 1 && save.version !== 2) throw new TypeError('지원하지 않는 저장 버전입니다');
  let next = save;
  if (next.version === 1) next = v1to2(next, bal);
  return v2to3(next, bal);
}
// 지원하는 버전보다 새 기록(앱을 옛 버전으로 되돌린 경우 등)인지
function futureVersion(raw) {
  try { const v = JSON.parse(raw)?.version; return Number.isSafeInteger(v) && v > SAVE_VERSION; } catch { return false; }
}
// 두 칸 중 검사를 통과한 정상 기록들(손상·미래 버전은 제외), 최근 순
function validSlots(storage, bal) {
  const out = [];
  if (typeof storage?.getItem !== 'function') return out;
  for (const key of KEYS) {
    try {
      const raw = storage.getItem(key);
      if (raw === null || raw === undefined) continue;
      const save = migrate(JSON.parse(raw), bal);
      if (validate(save, bal).ok) out.push({ key, save });
    } catch { /* 손상 칸은 건너뜀 */ }
  }
  return out.sort((a, b) => b.save.seq - a.save.seq || b.save.savedAt - a.save.savedAt);
}
function keepLegacyRaw(storage) {
  if (typeof storage?.getItem !== 'function') return { ok: true };
  const newest = {};
  for (const key of KEYS) {
    let raw = null, v, seq;
    try { raw = storage.getItem(key); } catch { return { ok: false, reason: '저장 공간을 읽지 못해 저장하지 않았습니다' }; }
    if (raw === null || raw === undefined) continue;
    try { const o = JSON.parse(raw); v = o?.version; seq = Number.isSafeInteger(o?.seq) ? o.seq : -1; } catch { continue; }
    if ((v === 1 || v === 2) && (!newest[v] || seq > newest[v].seq)) newest[v] = { raw, seq };
  }
  for (const [v, { raw }] of Object.entries(newest)) {
    const backupKey = v === '1' ? V1_BACKUP_KEY : V2_BACKUP_KEY;
    try {
      if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
      if (storage.getItem(backupKey) === null) throw new Error('보관 확인 실패');
    } catch (error) {
      return { ok: false, reason: `옛 기록을 따로 보관하지 못해 저장하지 않았습니다(${error?.message ?? '알 수 없는 오류'}). 폰 저장 공간을 확인해 주세요` };
    }
  }
  return { ok: true };
}
export function writeSave(storage, save, bal = defaultBalance) {
  try {
    const check = validate(save, bal);
    if (!check.ok) return { ok: false, reason: check.errors.join('; ') };
    // 더 새 버전 기록이 있으면 덮어쓰지 않는다(그 기록을 지키려고 저장을 멈춤).
    // 어느 칸이든 읽지 못하면(예외) 그 칸이 무엇인지 모르므로 쓰지 않는다(4차, 읽지 못한 원본 보호)
    for (const key of KEYS) {
      let raw = null;
      try { raw = typeof storage.getItem === 'function' ? storage.getItem(key) ?? null : null; } catch { return { ok: false, reason: '저장 공간을 읽지 못해 저장하지 않았습니다' }; }
      if (raw !== null && futureVersion(raw)) return { ok: false, reason: '더 새 버전의 기록이 있어 저장하지 않았습니다. 앱을 새 버전으로 열어 주세요' };
    }
    // 4차 ⑦: 칸에 옛 버전(1·2) 기록이 남아 있으면, 그 원문(가장 최근 것)이 버전별 보관 칸에 들어 있어야만 쓴다.
    // 보관이 비어 있으면 지금 보관해 보고, 실패하면(용량 부족 등) 저장하지 않는다 — 옛 원문 없이 칸이 v3로 바뀌는 일을 막음
    const kept = keepLegacyRaw(storage);
    if (!kept.ok) return kept;
    const valid = validSlots(storage, bal);
    const next = clone(save);
    // 순번은 정상 기록 중 가장 큰 것보다 크게(손상 칸의 순번은 쓰지 않음)
    next.seq = Math.max(save.seq, valid[0]?.save.seq ?? 0) + 1;
    if (!Number.isSafeInteger(next.seq)) return { ok: false, reason: '저장 순번 한도를 초과했습니다' };
    next.savedAt = Date.now();
    // 가장 최근 정상 기록은 남겨 두고 다른 칸에 쓴다. 정상 기록이 없으면 빈 칸, 그것도 없으면 A
    const empty = k => { try { const r = storage.getItem?.(k); return r === null || r === undefined; } catch { return false; } };
    const target = valid[0] ? KEYS.find(k => k !== valid[0].key) : KEYS.find(empty) ?? KEYS[0];
    storage.setItem(target, JSON.stringify(next));
    return { ok: true, save: next, source: target };
  } catch (error) {
    return { ok: false, reason: `저장하지 못했습니다: ${error?.message ?? '알 수 없는 오류'}` };
  }
}
export function loadSave(storage, bal) {
  const valid = [], broken = [];
  let future = false;
  for (const key of KEYS) {
    let raw = null;
    try {
      raw = storage.getItem(key);
      if (raw === null || raw === undefined) continue;
      if (futureVersion(raw)) { future = true; throw new TypeError('더 새 버전의 기록입니다'); }
      const parsed = JSON.parse(raw);
      const save = migrate(parsed, bal);
      const check = validate(save, bal);
      if (!check.ok) throw new TypeError(check.errors.join('; '));
      valid.push({ save, source: key, raw, from: parsed.version });
    } catch (error) { broken.push({ key, raw, reason: error?.message ?? '읽기 오류' }); }
  }
  valid.sort((a, b) => b.save.seq - a.save.seq || b.save.savedAt - a.save.savedAt);
  // 옛 버전 원문은 처음 변환할 때 실제로 불러오는 최신 기록을 버전별로 한 번 보관한다(되돌림용)
  const backupKey = { 1: V1_BACKUP_KEY, 2: V2_BACKUP_KEY }[valid[0]?.from];
  if (backupKey) {
    try { if (storage.getItem(backupKey) === null) storage.setItem(backupKey, valid[0].raw); } catch { /* 보관 실패는 진행 */ }
  }
  return {
    save: valid[0]?.save ?? null, source: valid[0]?.source ?? null,
    warning: future ? '더 새 버전의 기록이 있습니다. 앱을 새 버전으로 열어 주세요(이 버전에서는 저장하지 않습니다)'
      : broken.length ? (valid.length ? '손상된 저장을 건너뛰고 정상 저장을 불러왔습니다' : '저장을 읽지 못했습니다. 원본을 보존했습니다') : null,
    broken, future,
  };
}
export function exportCode(save, bal = defaultBalance) {
  const check = validate(save, bal);
  if (!check.ok) throw new TypeError(check.errors.join('; '));
  return `HWANTASY1\n${JSON.stringify(save)}`;
}
export function importCode(text, bal) {
  try {
    if (typeof text !== 'string' || !text.trim().startsWith('HWANTASY1\n')) throw new TypeError('환타지 저장 코드가 아닙니다');
    const save = migrate(JSON.parse(text.trim().slice('HWANTASY1\n'.length)), bal);
    const check = validate(save, bal);
    if (!check.ok) return { ok: false, reason: '저장 코드 검사에 실패했습니다', errors: check.errors };
    return { ok: true, save };
  } catch (error) { return { ok: false, reason: error?.message ?? '저장 코드가 올바르지 않습니다' }; }
}

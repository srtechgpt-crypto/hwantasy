import defaultBalance from '../../data/balance.js';
import { clone, finite, integer, isRecord, itemDef } from './common.js';
import { needExp } from './progression.js';

// uid and nextUid are positive safe integers. Gear: {uid,id,count:1,enchant};
// consumables: {uid,id,count}. Equip holds references to bag gear, never copies.
export function newGame(bal) {
  const bag = [
    { uid: 1, id: bal.start.weapon, count: 1, enchant: 0 },
    { uid: 2, id: bal.start.armor, count: 1, enchant: 0 },
    ...bal.start.items.map((item, i) => ({ uid: i + 3, ...item })),
  ];
  return {
    version: 1, seq: 0, savedAt: 0,
    player: { level: 1, exp: 0, hp: bal.knight.baseHp, gold: bal.start.gold, map: bal.town.id, x: bal.town.x, y: bal.town.y },
    equip: { weapon: 1, armor: 2 }, bag, warehouse: [],
    rates: { exp: 1, drop: 1, gold: 1, enchant: 1 },
    boss: { defeatedAt: null }, nextUid: bag.length + 1,
  };
}
export function validate(save, bal) {
  const errors = [];
  const bad = message => errors.push(message);
  if (!isRecord(save)) return { ok: false, errors: ['저장은 객체여야 합니다'] };
  if (save.version !== 1) bad('지원하지 않는 저장 버전입니다');
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
  if (!isRecord(save.boss) || (save.boss.defeatedAt !== null && !integer(save.boss.defeatedAt))) bad('보스 처치 시각이 올바르지 않습니다');
  return { ok: errors.length === 0, errors };
}
export function migrate(save) {
  // Version 1 is the first published schema: no invented conversions from v0.
  if (!isRecord(save) || save.version !== 1) throw new TypeError('지원하지 않는 저장 버전입니다');
  return clone(save);
}
// 저장 칸 두 곳에 남은 가장 큰 seq (깨진 기록은 무시)
function storedSeq(storage) {
  let max = 0;
  if (typeof storage?.getItem !== 'function') return max;
  for (const key of ['hwantasy.A', 'hwantasy.B']) {
    try {
      const seq = JSON.parse(storage.getItem(key))?.seq;
      if (Number.isSafeInteger(seq) && seq > max) max = seq;
    } catch { /* 깨진 칸은 건너뜀 */ }
  }
  return max;
}
export function writeSave(storage, save, bal = defaultBalance) {
  try {
    const check = validate(save, bal);
    if (!check.ok) return { ok: false, reason: check.errors.join('; ') };
    if (save.seq === Number.MAX_SAFE_INTEGER) return { ok: false, reason: '저장 순번 한도를 초과했습니다' };
    const next = clone(save);
    // 새 게임·가져오기는 seq가 낮을 수 있음 → 두 칸에 남은 기록보다 항상 크게(옛 기록이 다시 불려 오지 않게)
    next.seq = Math.max(save.seq, storedSeq(storage)) + 1;
    if (!Number.isSafeInteger(next.seq)) return { ok: false, reason: '저장 순번 한도를 초과했습니다' };
    next.savedAt = Date.now();
    const source = next.seq % 2 === 1 ? 'hwantasy.A' : 'hwantasy.B';
    storage.setItem(source, JSON.stringify(next));
    return { ok: true, save: next, source };
  } catch (error) {
    return { ok: false, reason: `저장하지 못했습니다: ${error?.message ?? '알 수 없는 오류'}` };
  }
}
export function loadSave(storage, bal) {
  const valid = [], broken = [];
  for (const key of ['hwantasy.A', 'hwantasy.B']) {
    let raw = null;
    try {
      raw = storage.getItem(key);
      if (raw === null || raw === undefined) continue;
      const save = migrate(JSON.parse(raw));
      const check = validate(save, bal);
      if (!check.ok) throw new TypeError(check.errors.join('; '));
      valid.push({ save, source: key });
    } catch (error) { broken.push({ key, raw, reason: error?.message ?? '읽기 오류' }); }
  }
  valid.sort((a, b) => b.save.seq - a.save.seq || b.save.savedAt - a.save.savedAt);
  return {
    save: valid[0]?.save ?? null, source: valid[0]?.source ?? null,
    warning: broken.length ? (valid.length ? '손상된 저장을 건너뛰고 정상 저장을 불러왔습니다' : '저장을 읽지 못했습니다. 원본을 보존했습니다') : null,
    broken,
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
    const save = migrate(JSON.parse(text.trim().slice('HWANTASY1\n'.length)));
    const check = validate(save, bal);
    if (!check.ok) return { ok: false, reason: '저장 코드 검사에 실패했습니다', errors: check.errors };
    return { ok: true, save };
  } catch (error) { return { ok: false, reason: error?.message ?? '저장 코드가 올바르지 않습니다' }; }
}

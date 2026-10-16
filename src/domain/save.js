import defaultBalance from '../../data/balance.js';
import { clone, finite, integer, isRecord, itemDef, EQUIP_SLOTS, isGearDef, slotOf, enchantRule } from './common.js';
import { needExp, playerStats, bonusPoints, validBonus } from './progression.js';
import { defaultHotbar, validHotbar } from './hotbar.js';
import { validBuffs } from './buffs.js';
import { validMorph, emptyMorph } from './morph.js';

// 저장 형식 버전. 2 = 2026-10-13 경험치 곡선 변경(초반 빠르게). 1 → 2는 '현재 레벨에서 채운 비율'로 변환한다.
// 3 = 2026-10-14 4차: 보스 두 마리(boss → bosses 맵), 최대 레벨 40. 2 → 3은 v2 규칙으로 전부 검사한 뒤에만 바꾼다.
// 4 = 2026-10-15 8차: 장비 9칸(equip 키 9개), player.bonus(보너스 능력치 배분), player.rewards(받은 레벨 보상), 가방 50·창고 100.
//     3 → 4는 v3 고정 규칙으로 전부 검사한 뒤 필드만 더한다(경험치 공식이 바뀌었으면 비율 변환)
// 5 = 2026-10-15 9차: save.hotbar(단축 칸 12칸·자동 사용·seen). 4 → 5는 지금 규칙으로 검사한 뒤 기본 배치만 더한다
//     (9차 패시브는 최대 체력을 늘리기만 하므로 v4 기록의 hp는 지금 규칙으로도 범위 안)
// 6 = 2026-10-16 10차: save.buffs(버프 남은 시간). 아이템은 늘기만(무기 계열·희귀·쓰는 아이템). 5 → 6은 v5 규칙으로 검사한 뒤 buffs {}만 더한다
// 7 = 2026-10-16 11차: save.morph(변신 상태). 아이템은 늘기만(고급·하락·변신 주문서). 6 → 7은 v6 고정 규칙으로 검사한 뒤 morph 기본값만 더한다
export const SAVE_VERSION = 7;
const KEYS = ['hwantasy.A', 'hwantasy.B'];
export const V1_BACKUP_KEY = 'hwantasy.v1backup';
export const V2_BACKUP_KEY = 'hwantasy.v2backup';
export const V3_BACKUP_KEY = 'hwantasy.v3backup';
export const V4_BACKUP_KEY = 'hwantasy.v4backup';
export const V5_BACKUP_KEY = 'hwantasy.v5backup';
export const V6_BACKUP_KEY = 'hwantasy.v6backup';
const BACKUP_KEYS = { 1: V1_BACKUP_KEY, 2: V2_BACKUP_KEY, 3: V3_BACKUP_KEY, 4: V4_BACKUP_KEY, 5: V5_BACKUP_KEY, 6: V6_BACKUP_KEY };
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
// 버전 3(4~7차 게시본) 고정 규칙: 계수 155·최대 40, 아이템 16종(+미스릴·망령 4종), 지도 4곳, 가방 30·창고 60, 장비 2칸,
// 최대 체력 80 + 16(L−1). 8차에서 밸런스를 바꿔도 v3 기록은 이 규칙으로 검사·변환한다
const V3_PROGRESSION = { coefficient: 155, exponent: 2.15, early: { untilLevel: 22, startFactor: 0.04, power: 2.5 }, maxLevel: 40 };
const V3_ITEMS = [...LEGACY_ITEMS, 'mithrilSword', 'wraithSword', 'mithrilArmor', 'wraithArmor'];
const V3_MAPS = ['field', 'forest', 'mine', 'ruin'];
const LEGACY_HP = { baseHp: 80, hpPerLevel: 16 };
const LEGACY_INVENTORY = { bagSlots: 30, warehouseSlots: 60, stackMax: 999 };
function legacyBal(bal, version) {
  const ids = version === 3 ? V3_ITEMS : LEGACY_ITEMS;
  const maps = version === 3 ? V3_MAPS : LEGACY_MAPS;
  const keep = list => list.filter(def => ids.includes(def.id));
  return {
    ...bal,
    weapons: keep(bal.weapons), armors: keep(bal.armors), consumables: keep(bal.consumables),
    maps: bal.maps.filter(map => maps.includes(map.id)),
    inventory: LEGACY_INVENTORY,
    knight: { ...bal.knight, ...LEGACY_HP },
    progression: version === 1
      ? { ...bal.progression, ...V1_PROGRESSION, early: undefined, maxLevel: 30 }
      : version === 2 ? { ...bal.progression, ...V2_PROGRESSION, maxLevel: 30 }
        : { ...bal.progression, ...V3_PROGRESSION },
  };
}
// 버전에 맞는 검사 규칙(지금 버전만 지금 밸런스 그대로)
// v4(8차 게시본) 고정 규칙: 경험치 계수 155. 아이템·지도·체력 공식은 9차에 줄지 않아 지금 것으로 검사(패시브는 최대 체력을 늘리기만 함)
const V4_PROGRESSION = { coefficient: 155 };
// v5(9차 게시본) 고정 규칙(⑤ #1·#3): 경험치 계수 175, 10차에 새로 생긴 아이템(무기 계열·희귀·버프·사냥터 주문서)과 단축 칸 물건은 없음.
// 체력 공식·부위·보상은 9차와 같다(10차 세트·무기는 최대 체력을 줄이지 않음 — v5 기록은 세트가 있어도 hp ≤ 새 최대)
const V5_PROGRESSION = { coefficient: 175 };
const V5_HOTBAR_ITEMS = ['potion', 'potionMid', 'potionHigh', 'returnScroll'];
export const isPhase10Item = def => !!def.rare || (def.kind === 'weapon' && (def.type ?? 'sword') !== 'sword') || !!def.buff || def.id === 'huntScroll';
// 11차 새 아이템(⑤ #2): v6 이하 기록에는 있을 수 없다
const PHASE11_ITEMS = ['weaponScrollB', 'armorScrollB', 'downScroll', 'morphScroll'];
export const isPhase11Item = def => PHASE11_ITEMS.includes(def.id);
// v6(10차 게시본) 고정 규칙: 경험치 계수 176, 11차 아이템 없음, 단축 칸 물건 9종
const V6_PROGRESSION = { coefficient: 176 };
const V6_HOTBAR_ITEMS = ['potion', 'potionMid', 'potionHigh', 'returnScroll', 'powerPotion', 'hastePotion', 'guardPotion', 'expScroll', 'huntScroll'];
function v6Bal(bal) {
  const keep = list => list.filter(def => !isPhase11Item(def));
  return { ...bal, weapons: keep(bal.weapons), armors: keep(bal.armors), consumables: keep(bal.consumables), hotbarItems: V6_HOTBAR_ITEMS,
    progression: { ...bal.progression, ...V6_PROGRESSION } };
}
function v5Bal(bal) {
  const keep = list => list.filter(def => !isPhase10Item(def) && !isPhase11Item(def));
  return { ...bal, weapons: keep(bal.weapons), armors: keep(bal.armors), consumables: keep(bal.consumables), hotbarItems: V5_HOTBAR_ITEMS,
    progression: { ...bal.progression, ...V5_PROGRESSION } };
}
export const balFor = (bal, version) => (version === SAVE_VERSION ? bal
  : version === 6 ? v6Bal(bal)
  : version === 5 ? v5Bal(bal)
  : version === 4 ? { ...v5Bal(bal), progression: { ...bal.progression, ...V4_PROGRESSION } } : legacyBal(bal, version));

// uid and nextUid are positive safe integers. Gear: {uid,id,count:1,enchant};
// consumables: {uid,id,count}. Equip holds references to bag gear, never copies.
export function newGame(bal) {
  const bag = [
    { uid: 1, id: bal.start.weapon, count: 1, enchant: 0 },
    { uid: 2, id: bal.start.armor, count: 1, enchant: 0 },
    ...bal.start.items.map((item, i) => ({ uid: i + 3, ...item })),
  ];
  const equip = Object.fromEntries(EQUIP_SLOTS.map(slot => [slot, null]));
  Object.assign(equip, { weapon: 1, armor: 2 });
  const save = {
    version: SAVE_VERSION, seq: 0, savedAt: 0,
    player: { level: 1, exp: 0, hp: 0, gold: bal.start.gold, map: bal.town.id, x: bal.town.x, y: bal.town.y, bonus: { str: 0, dex: 0, con: 0 }, rewards: [] },
    equip, bag, warehouse: [],
    rates: { exp: 1, drop: 1, gold: 1, enchant: 1 },
    bosses: Object.fromEntries(V3_BOSSES.map(id => [id, null])), nextUid: bag.length + 1,
  };
  save.player.hp = statsOf(save, bal).maxHp;
  save.hotbar = defaultHotbar(1, bal);
  save.buffs = {};
  save.morph = emptyMorph();
  return save;
}
// 8차: 저장의 장착 장비·보너스로 계산한 능력치(v4 형식만)
export function statsOf(save, bal) {
  const equip = Object.fromEntries(EQUIP_SLOTS.map(slot => [slot, save.bag.find(item => item.uid === save.equip[slot]) ?? null]));
  return playerStats(save.player.level, equip, bal, save.player.bonus);
}
// 8차(⑤ #2): 거래 마무리 — 최종 장비·능력치로 최대 체력을 다시 계산해 hp를 그 안으로(장비·체력 능력치가 빠져 최대가 줄 때)
export function settleHp(save, bal) {
  const max = statsOf(save, bal).maxHp;
  if (save.player.hp > max) save.player.hp = max;
  return save;
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
    if (!finite(p.hp) || (levelOk && version < 4 && p.hp > bal.knight.baseHp + bal.knight.hpPerLevel * (p.level - 1))) bad('체력이 올바르지 않습니다');
    if (version >= 4) {
      if (!validBonus(p.bonus) || (levelOk && p.bonus.str + p.bonus.dex + p.bonus.con > bonusPoints(p.level, bal))) bad('보너스 능력치가 올바르지 않습니다');
      const levels = (bal.levelRewards ?? []).map(r => r.level);
      if (!Array.isArray(p.rewards) || p.rewards.some((lv, i) => !levels.includes(lv) || (levelOk && lv > p.level) || (i > 0 && lv <= p.rewards[i - 1]))) bad('레벨 보상 기록이 올바르지 않습니다');
    }
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
      const gear = isGearDef(def);
      if (!integer(item.count, 1, gear ? 1 : bal.inventory.stackMax)) bad('아이템 수량이 올바르지 않습니다');
      if (gear ? !integer(item.enchant, 0, enchantRule(def, bal).max) : item.enchant !== undefined) bad('아이템 강화 단계가 올바르지 않습니다');
    }
  }
  if (integer(save.nextUid, 1) && save.nextUid <= maxUid) bad('다음 uid는 기존 uid보다 커야 합니다');
  const slots = version >= 4 ? EQUIP_SLOTS : ['weapon', 'armor'];
  let equipOk = isRecord(save.equip);
  if (!equipOk) bad('장착 정보가 없습니다');
  else {
    if (version >= 4 && (Object.keys(save.equip).length !== slots.length || slots.some(slot => !Object.hasOwn(save.equip, slot)))) { bad('장착 칸이 올바르지 않습니다'); equipOk = false; }
    const used = new Set();
    for (const slot of slots) {
      const uid = save.equip[slot];
      if (uid === null) continue;
      const item = Array.isArray(save.bag) ? save.bag.find(item => isRecord(item) && item.uid === uid) : null;
      if (!integer(uid, 1) || !item || slotOf(itemDef(item.id, bal)) !== slot || used.has(uid)) { bad('장착 장비는 가방 안의 맞는 종류를 가리켜야 합니다'); equipOk = false; }
      used.add(uid);
    }
  }
  // 8차: 최대 체력은 장비·체력 능력치에 따라 달라진다 — 다른 검사가 모두 통과했을 때만 계산해 hp 범위를 본다
  if (version >= 4 && errors.length === 0 && equipOk) {
    try { if (p.hp > statsOf(save, bal).maxHp) bad('체력이 올바르지 않습니다'); }
    catch { bad('장비 정보가 올바르지 않습니다'); }
  }
  if (!isRecord(save.rates) || Object.keys(bal.rates).some(key => !bal.rates[key].includes(save.rates[key]))) bad('배율이 올바르지 않습니다');
  if (version >= 5) { try { if (!levelOk || !validHotbar(save.hotbar, p.level, bal)) bad('단축 칸이 올바르지 않습니다'); } catch { bad('단축 칸이 올바르지 않습니다'); } }
  else if ('hotbar' in save) bad('옛 버전 기록에 단축 칸이 있습니다');
  if (version >= 6) { if (!validBuffs(save.buffs, bal)) bad('버프 기록이 올바르지 않습니다'); }
  else if ('buffs' in save) bad('옛 버전 기록에 버프가 있습니다');
  if (version >= 7) { if (!validMorph(save.morph, bal)) bad('변신 기록이 올바르지 않습니다'); }
  else if ('morph' in save) bad('옛 버전 기록에 변신이 있습니다');
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
// 저장을 지금 버전(5)으로 바꾼다. 한 단계씩(1→2→3→4→5), 각 단계 전에 그 버전의 옛 규칙으로 전부 검사한다.
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
// 8차(⑤ #1): 목표 필요치는 지금 밸런스가 아니라 v3 고정 규칙으로(다음 단계 v3 검사가 통과하도록)
function v2to3(save, bal) {
  const old = balFor(bal, 2), v3 = balFor(bal, 3);
  const check = validate(save, old, 2);
  if (!check.ok) throw new TypeError(`버전 2 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 3;
  const p = next.player;
  if (p.level < old.progression.maxLevel) {
    const need = needExp(p.level, v3);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  }
  next.bosses = { boss: save.boss.defeatedAt, lich: null };
  delete next.boss;
  return next;
}
// 3→4: 장비 칸 7개(null)·보너스 0·받은 보상 없음을 더한다. 경험치 공식이 v3과 다르면 비율 변환(최대 레벨은 0 유지).
// hp는 새 최대 체력 이하로(새 공식은 옛 값 이상이라 보통 그대로)
function v3to4(save, bal) {
  const old = balFor(bal, 3);
  const check = validate(save, old, 3);
  if (!check.ok) throw new TypeError(`버전 3 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 4;
  next.equip = Object.fromEntries(EQUIP_SLOTS.map(slot => [slot, save.equip[slot] ?? null]));
  const p = next.player;
  p.bonus = { str: 0, dex: 0, con: 0 };
  p.rewards = [];
  // 9차: 목표는 v4 고정 규칙(계수 155) — 다음 단계(v4→v5) 검사를 통과하고 거기서 다시 비율 변환
  if (p.level < bal.progression.maxLevel && p.level < old.progression.maxLevel) {
    const need = needExp(p.level, balFor(bal, 4));
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  } else p.exp = 0;
  return settleHp(next, bal);
}
// 4→5: 지금 규칙(v4)으로 전부 검사한 뒤 레벨에 맞는 기본 단축 칸을 더한다
function v4to5(save, bal) {
  const check = validate(save, balFor(bal, 4), 4);
  if (!check.ok) throw new TypeError(`버전 4 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 5;
  next.hotbar = defaultHotbar(next.player.level, bal);
  // 경험치 계수가 바뀌었으면(155→175) 지금 레벨에서 채운 비율을 지킨다
  // 10차(⑤ #2): 목표는 v5 고정 규칙(계수 175) — 다음 단계(v5→v6) 검사를 통과하고 거기서 다시 비율 변환
  const old = balFor(bal, 4), v5 = balFor(bal, 5), p = next.player;
  if (p.level < v5.progression.maxLevel) {
    const need = needExp(p.level, v5);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  } else p.exp = 0;
  return settleHp(next, v5);
}
// 5→6: v5 규칙으로 전부 검사한 뒤 빈 버프 기록만 더한다(경험치·장비·단축 칸 그대로)
function v5to6(save, bal) {
  const check = validate(save, balFor(bal, 5), 5);
  if (!check.ok) throw new TypeError(`버전 5 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 6;
  next.buffs = {};
  // 경험치 계수가 v5(175)와 다르면 지금 레벨에서 채운 비율을 지킨다(같으면 그대로)
  // 11차: 목표는 v6 고정 규칙(다음 단계 v6→v7 검사를 통과하고 거기서 다시 비율 변환)
  const old = balFor(bal, 5), v6 = balFor(bal, 6), p = next.player;
  if (p.level < v6.progression.maxLevel && needExp(p.level, old) !== needExp(p.level, v6)) {
    const need = needExp(p.level, v6);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  } else if (p.level >= v6.progression.maxLevel) p.exp = 0;
  return settleHp(next, v6);
}
// 6→7(⑤ #1): v6 고정 규칙으로 전부 검사한 뒤 변신 기본값만 더한다(경험치 계수가 바뀌었으면 비율 변환)
function v6to7(save, bal) {
  const old = balFor(bal, 6);
  const check = validate(save, old, 6);
  if (!check.ok) throw new TypeError(`버전 6 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 7;
  next.morph = emptyMorph();
  const p = next.player;
  if (p.level < bal.progression.maxLevel && needExp(p.level, old) !== needExp(p.level, bal)) {
    const need = needExp(p.level, bal);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  } else if (p.level >= bal.progression.maxLevel) p.exp = 0;
  return settleHp(next, bal);
}
export function migrate(save, bal = defaultBalance) {
  if (!isRecord(save)) throw new TypeError('지원하지 않는 저장 버전입니다');
  if (save.version === SAVE_VERSION) return clone(save);
  if (![1, 2, 3, 4, 5, 6].includes(save.version)) throw new TypeError('지원하지 않는 저장 버전입니다');
  let next = save;
  if (next.version === 1) next = v1to2(next, bal);
  if (next.version === 2) next = v2to3(next, bal);
  if (next.version === 3) next = v3to4(next, bal);
  if (next.version === 4) next = v4to5(next, bal);
  if (next.version === 5) next = v5to6(next, bal);
  return v6to7(next, bal);
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
    if (BACKUP_KEYS[v] && (!newest[v] || seq > newest[v].seq)) newest[v] = { raw, seq };
  }
  for (const [v, { raw }] of Object.entries(newest)) {
    const backupKey = BACKUP_KEYS[v];
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
  const backupKey = BACKUP_KEYS[valid[0]?.from];
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
    // 2026-10-16: 폰·대화창에서 복사하면 줄바꿈이 \r\n이 되거나, 머리글이 같은 줄에 붙거나, 긴 줄 중간에 줄바꿈·공백이 끼어든다.
    // 저장 JSON에는 공백이 뜻을 갖는 값이 없으므로(아이디·지도 이름에 공백 없음) 머리글 뒤 모든 공백을 지우고 읽는다
    if (typeof text !== 'string') throw new TypeError('환타지 저장 코드가 아닙니다');
    const at = text.indexOf('HWANTASY1');
    if (at < 0) throw new TypeError('환타지 저장 코드가 아닙니다(맨 앞 HWANTASY1이 없습니다)');
    const body = text.slice(at + 'HWANTASY1'.length).replace(/\s+/g, '');
    let parsed;
    try { parsed = JSON.parse(body); } catch { throw new TypeError('저장 글자가 중간에 잘렸습니다. 맨 끝 } 까지 통째로 복사해 주세요'); }
    const save = migrate(parsed, bal);
    const check = validate(save, bal);
    if (!check.ok) return { ok: false, reason: '저장 코드 검사에 실패했습니다', errors: check.errors };
    return { ok: true, save };
  } catch (error) { return { ok: false, reason: error?.message ?? '저장 코드가 올바르지 않습니다' }; }
}

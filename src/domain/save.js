import defaultBalance from '../../data/balance.js';
import { clone, finite, integer, isRecord, itemDef, EQUIP_SLOTS, V4_SLOTS, V12_SLOTS, isGearDef, slotOf, enchantRule } from './common.js';
import { needExp, playerStats, bonusPoints, validBonus } from './progression.js';
import { defaultHotbar, validHotbar } from './hotbar.js';
import { validBuffs } from './buffs.js';
import { validMorph, emptyMorph } from './morph.js';
import { validCodex, validKills, validQuest, validTitle, firstQuest, permOf } from './collect.js';
import { validSkillLv } from './skills.js';
import { elixirExtra, validElixir, validRecover, validDolls } from './growth.js';

// 저장 형식 버전. 2 = 2026-10-13 경험치 곡선 변경(초반 빠르게). 1 → 2는 '현재 레벨에서 채운 비율'로 변환한다.
// 3 = 2026-10-14 4차: 보스 두 마리(boss → bosses 맵), 최대 레벨 40. 2 → 3은 v2 규칙으로 전부 검사한 뒤에만 바꾼다.
// 4 = 2026-10-15 8차: 장비 9칸(equip 키 9개), player.bonus(보너스 능력치 배분), player.rewards(받은 레벨 보상), 가방 50·창고 100.
//     3 → 4는 v3 고정 규칙으로 전부 검사한 뒤 필드만 더한다(경험치 공식이 바뀌었으면 비율 변환)
// 5 = 2026-10-15 9차: save.hotbar(단축 칸 12칸·자동 사용·seen). 4 → 5는 지금 규칙으로 검사한 뒤 기본 배치만 더한다
//     (9차 패시브는 최대 체력을 늘리기만 하므로 v4 기록의 hp는 지금 규칙으로도 범위 안)
// 6 = 2026-10-16 10차: save.buffs(버프 남은 시간). 아이템은 늘기만(무기 계열·희귀·쓰는 아이템). 5 → 6은 v5 규칙으로 검사한 뒤 buffs {}만 더한다
// 7 = 2026-10-16 11차: save.morph(변신 상태). 아이템은 늘기만(고급·하락·변신 주문서). 6 → 7은 v6 고정 규칙으로 검사한 뒤 morph 기본값만 더한다
// 8 = 2026-10-19 12차: save.codex(도감)·kills(처치 수)·title(쓰는 칭호)·quest(사냥 목표). 7 → 8은 v7 고정 규칙(계수 176, 도감·칭호 없음)으로 검사한 뒤
//     기본값만 더한다(보스 처치 시각이 남아 있으면 그 보스 처치 수 1)
// 9 = 2026-10-20 13차(⑤ #1): 장비 잠금 item.lock·자동 보충 save.restock(둘 다 선택 필드). 옛 앱이 잠금을 모른 채 잠긴 장비를
//     팔거나 강화로 잃지 않게 버전을 올린다(옛 앱은 '더 새 버전'이라 열지 않음). 8 → 9는 v8 규칙으로 검사한 뒤 버전만 바꾼다
// 10 = 2026-10-20 14차: 스킬 카드 아이템(card_*)·스킬 레벨 save.skillLv(선택 필드). 9 → 10은 v9 규칙(카드 없음)으로 검사한 뒤 버전만 바꾼다
// 11 = 2026-10-20 15차: 엘릭서·마법인형 상자 아이템(p15), player.elixir·save.recover·save.dolls(선택 필드). 10 → 11은 v10 규칙으로 검사 후 버전만
// 12 = 2026-10-20 18차: 장신구 2칸(equip.neck·ring)·장신구 아이템(p18). 11 → 12는 v11 규칙(9칸·장신구 없음)으로 검사 후 두 칸(null)만 더한다
// 13 = 2026-10-20 19차: 보스 코인 아이템(p19). 12 → 13은 v12 규칙(코인 없음)으로 검사 후 버전만
// 14 = 2026-10-20 20차: 장비 세트 save.loadouts(선택 필드, 3칸). 13 → 14는 v13 규칙(세트 없음)으로 검사 후 버전만
// 15 = 2026-10-21 21차: 서리 봉우리(지도 frost)·보스 서리 용(bosses.drake)·최대 레벨 50·21차 아이템(p21).
//      14 → 15는 v14 규칙(최대 40·서리 없음·p21 없음·보스 2)으로 검사한 뒤 bosses.drake = null만 더한다(경험치 공식 같음)
// 16 = 2026-10-22 23차: 장신구 2칸(equip.ear·wrist, 장비 세트도 13칸)·23차 아이템(p23: 귀걸이·팔찌·영웅/전설)·선물 save.gifts(선택 필드).
//      15 → 16은 v15 규칙(11칸·p23 없음·선물 없음)으로 검사한 뒤 두 칸(null)만 더한다
export const SAVE_VERSION = 16;
const KEYS = ['hwantasy.A', 'hwantasy.B'];
export const V1_BACKUP_KEY = 'hwantasy.v1backup';
export const V2_BACKUP_KEY = 'hwantasy.v2backup';
export const V3_BACKUP_KEY = 'hwantasy.v3backup';
export const V4_BACKUP_KEY = 'hwantasy.v4backup';
export const V5_BACKUP_KEY = 'hwantasy.v5backup';
export const V6_BACKUP_KEY = 'hwantasy.v6backup';
export const V7_BACKUP_KEY = 'hwantasy.v7backup';
export const V8_BACKUP_KEY = 'hwantasy.v8backup';
export const V9_BACKUP_KEY = 'hwantasy.v9backup';
export const V10_BACKUP_KEY = 'hwantasy.v10backup';
export const V11_BACKUP_KEY = 'hwantasy.v11backup';
export const V12_BACKUP_KEY = 'hwantasy.v12backup';
export const V13_BACKUP_KEY = 'hwantasy.v13backup';
export const V14_BACKUP_KEY = 'hwantasy.v14backup';
export const V15_BACKUP_KEY = 'hwantasy.v15backup';
const BACKUP_KEYS = { 1: V1_BACKUP_KEY, 2: V2_BACKUP_KEY, 3: V3_BACKUP_KEY, 4: V4_BACKUP_KEY, 5: V5_BACKUP_KEY, 6: V6_BACKUP_KEY, 7: V7_BACKUP_KEY, 8: V8_BACKUP_KEY, 9: V9_BACKUP_KEY, 10: V10_BACKUP_KEY, 11: V11_BACKUP_KEY, 12: V12_BACKUP_KEY, 13: V13_BACKUP_KEY, 14: V14_BACKUP_KEY, 15: V15_BACKUP_KEY };
// v3 보스 키(고정). 보스를 더 늘리면 버전을 올리고 변환을 추가한다
export const V3_BOSSES = ['boss', 'lich'];
export const V15_BOSSES = ['boss', 'lich', 'drake']; // 21차
export const bossIdsFor = version => (version >= 15 ? V15_BOSSES : V3_BOSSES);
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
  const keep = list => list.filter(def => !isPhase11Item(def) && !def.card && !def.p15);
  return { ...bal, weapons: keep(bal.weapons), armors: keep(bal.armors).filter(def => !def.p18), consumables: keep(bal.consumables), hotbarItems: V6_HOTBAR_ITEMS,
    progression: { ...bal.progression, ...V6_PROGRESSION } };
}
function v5Bal(bal) {
  const keep = list => list.filter(def => !isPhase10Item(def) && !isPhase11Item(def) && !def.card && !def.p15);
  return { ...bal, weapons: keep(bal.weapons), armors: keep(bal.armors).filter(def => !def.p18), consumables: keep(bal.consumables), hotbarItems: V5_HOTBAR_ITEMS,
    progression: { ...bal.progression, ...V5_PROGRESSION } };
}
// v7(11차 게시본) 고정 규칙(⑤ #2): 경험치 계수 176. 아이템·체력 공식은 12차에 줄지 않음, 도감·칭호 효과는 v7 기록에 없음(statsOf가 version으로 0)
const V7_PROGRESSION = { coefficient: 176 };
const v7Bal = bal => ({ ...noAcc(bal), consumables: bal.consumables.filter(def => !def.card && !def.p15), progression: { ...bal.progression, ...V7_PROGRESSION } });
// v8(12차)·v9(13차) 규칙 = 지금 밸런스에서 14차 스킬 카드만 뺀 것. 잠금·자동 보충·스킬 레벨은 validate가 버전으로 막는다
export const isCardItem = def => !!def?.card;
// v10(14차) 규칙 = 지금 밸런스에서 15차 아이템(p15)만 뺀 것, v8·v9는 카드도 뺀 것
const noAcc = bal => ({ ...bal, armors: bal.armors.filter(def => !def.p18) }); // 18차 장신구는 v11 이하에 없음
const v11Bal = bal => noAcc(bal);
const v10Bal = bal => ({ ...noAcc(bal), consumables: bal.consumables.filter(def => !def.p15) });
const v9Bal = bal => ({ ...noAcc(bal), consumables: bal.consumables.filter(def => !isCardItem(def) && !def.p15) });
// 19차: v12 이하 규칙에는 보스 코인(p19)이 없다
const no19 = b => ({ ...b, consumables: b.consumables.filter(def => !def.p19) });
// 21차: v14 이하 규칙 = 서리 봉우리·서리 용·p21 아이템·41~50 보상 없음, 최대 레벨 40(⑤ #1: v1·v2의 30은 그대로 — 더 작은 값을 지킴)
const FROST_IDS = new Set(['frost', 'drake']);
export const no21 = b => {
  const keep = list => list.filter(def => !def.p21);
  const mons = b.monsters.filter(m => m.mapId !== 'frost' && !FROST_IDS.has(m.id));
  const monIds = new Set(mons.map(m => m.id));
  const items = new Set([...b.weapons, ...b.armors, ...b.consumables].filter(def => !def.p21).map(def => def.id));
  const maxLevel = Math.min(b.progression.maxLevel, 40);
  const { frost, ...count } = b.quest?.count ?? {};
  return {
    ...b,
    weapons: keep(b.weapons), armors: keep(b.armors), consumables: keep(b.consumables),
    maps: b.maps.filter(m => m.id !== 'frost'), monsters: mons,
    teleport: (b.teleport ?? []).filter(t => t.id !== 'frost'),
    progression: { ...b.progression, maxLevel, late: undefined }, // late(41레벨~ 필요치 배수)는 21차 것
    levelRewards: (b.levelRewards ?? []).filter(r => r.level <= maxLevel),
    hotbarItems: b.hotbarItems?.filter(id => items.has(id)), restockItems: b.restockItems?.filter(id => items.has(id)),
    morphs: b.morphs?.filter(m => !m.p21), sets: b.sets?.filter(st => st.tier <= 4),
    codex: b.codex?.filter(c => c.items.every(id => items.has(id))),
    titles: b.titles?.filter(t => t.kind !== 'kills' || monIds.has(t.mon)),
    quest: b.quest && { ...b.quest, count },
    coinShop: b.coinShop?.filter(c => items.has(c.id)),
  };
};
// ⑤ #2: v13·v14는 '20차 밸런스'(= 지금 밸런스에서 21차를 뺀 것). SAVE_VERSION을 쓰지 않고 번호로 고정
const balFor14 = (bal, version) => (version === 14 || version === 13 ? bal : no19(balFor12(bal, version)));
// 23차: v15 이하 규칙 = 23차 아이템(p23)·그 아이템이 든 드랍 항목·선물 없음(no23은 여러 번 써도 같음)
export const no23 = b => {
  const items = list => list.filter(def => !def.p23);
  const gone = new Set([...b.weapons, ...b.armors, ...b.consumables].filter(def => def.p23).map(def => def.id));
  return {
    ...b, weapons: items(b.weapons), armors: items(b.armors), consumables: items(b.consumables),
    monsters: b.monsters.map(m => ({ ...m, drops: m.drops.filter(d => !(d.pool ?? [d.id]).some(id => gone.has(id))) })),
    gifts: [],
  };
};
export const balFor = (bal, version) => (version === 16 ? bal : version === 15 ? no23(bal) : no23(no21(balFor14(bal, version))));
const balFor12 = (bal, version) => (version === 12 ? bal
  : version === 11 ? v11Bal(bal)
  : version === 10 ? v10Bal(bal)
  : version === 9 || version === 8 ? v9Bal(bal)
  : version === 7 ? v7Bal(bal)
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
    bosses: Object.fromEntries(V15_BOSSES.map(id => [id, null])), nextUid: bag.length + 1,
  };
  // 12차(⑤ #5): 새 필드를 먼저 넣고 체력을 계산한다
  save.hotbar = defaultHotbar(1, bal);
  save.buffs = {};
  save.morph = emptyMorph();
  Object.assign(save, newCollect(1, bal));
  save.gifts = (bal.gifts ?? []).map(g => g.id); // 23차: 새 캐릭터는 지금 있는 선물을 받지 않는다
  save.player.hp = statsOf(save, bal).maxHp;
  return save;
}
const newCollect = (level, bal) => ({ codex: {}, kills: {}, title: null, quest: firstQuest(level, bal) });
// 8차: 저장의 장착 장비·보너스로 계산한 능력치(v4 형식만). 12차: v8부터 도감·칭호 영구 효과(v7 이하는 0 — ⑤ #2·#5)
export function statsOf(save, bal) {
  const equip = Object.fromEntries(EQUIP_SLOTS.map(slot => [slot, save.bag.find(item => item.uid === save.equip[slot]) ?? null]));
  return playerStats(save.player.level, equip, bal, save.player.bonus, elixirExtra(save), save.version >= 8 ? permOf(save, bal) : null); // 15차 엘릭서
}
// 8차(⑤ #2): 거래 마무리 — 최종 장비·능력치로 최대 체력을 다시 계산해 hp를 그 안으로(장비·체력 능력치가 빠져 최대가 줄 때)
export function settleHp(save, bal) {
  const max = statsOf(save, bal).maxHp;
  if (save.player.hp > max) save.player.hp = max;
  return save;
}
// 20차: 이름은 앞뒤 공백 없이 1~8글자(글자 = 코드 포인트), 한 세트 안 uid 중복 없음(⑤ #2·#3·#5)
export const loadoutNameOk = name => typeof name === 'string' && name === name.trim() && [...name].length >= 1 && [...name].length <= 8;
// 23차: 칸 목록은 버전별(v14·v15 = 11칸, v16 = 13칸)
function validLoadouts(list, slots = EQUIP_SLOTS) {
  if (!Array.isArray(list) || list.length !== 3) return false;
  return list.every(l => {
    if (l === null) return true;
    if (!isRecord(l) || Object.keys(l).length !== 2 || !loadoutNameOk(l.name) || !isRecord(l.equip) || Object.keys(l.equip).length !== slots.length) return false;
    const uids = slots.map(sl => l.equip[sl]);
    if (!slots.every(sl => Object.hasOwn(l.equip, sl)) || uids.some(u => u !== null && !integer(u, 1))) return false;
    const used = uids.filter(u => u !== null);
    return new Set(used).size === used.length;
  });
}
function validGifts(list, bal) {
  const known = new Set((bal.gifts ?? []).map(g => g.id));
  return Array.isArray(list) && list.every(id => typeof id === 'string' && known.has(id)) && new Set(list).size === list.length;
}
function validRestock(r, bal) {
  if (!isRecord(r) || Object.getPrototypeOf(r) !== Object.prototype) return false;
  const keys = Object.keys(r);
  return keys.length > 0 && keys.every(id => (bal.restockItems ?? []).includes(id) && integer(r[id], 1, bal.inventory.stackMax));
}
export function validate(save, bal, version = SAVE_VERSION) {
  // 21차 ⑤ #5: 옛 버전을 지금 밸런스로 넘겨도 21차 것(최대 50·서리·p21)은 받지 않게(no21은 여러 번 써도 같음)
  if (version < 15 && isRecord(bal?.progression) && Array.isArray(bal.monsters)) bal = no21(bal); // ⑦ #1: 최대 레벨과 상관없이 늘 적용
  if (version < 16 && Array.isArray(bal?.weapons) && Array.isArray(bal.monsters)) bal = no23(bal); // 23차: 같은 방식
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
    if (![bal.town.id, ...bal.maps.map(map => map.id)].includes(p.map) || (version < 15 && p.map === 'frost')) bad('지도가 올바르지 않습니다');
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
      if (def.p18 && version < 12) bad('옛 버전 기록에 장신구가 있습니다'); // 18차 ⑤ #1: 넘긴 밸런스와 상관없이 버전으로도 막음
      if (def.p19 && version < 13) bad('옛 버전 기록에 보스 코인이 있습니다'); // 19차
      if (def.p21 && version < 15) bad('옛 버전 기록에 21차 아이템이 있습니다'); // 21차 ⑤ #5
      if (def.p23 && version < 16) bad('옛 버전 기록에 23차 아이템이 있습니다'); // 23차
      if (!integer(item.count, 1, gear ? 1 : bal.inventory.stackMax)) bad('아이템 수량이 올바르지 않습니다');
      if (gear ? !integer(item.enchant, 0, enchantRule(def, bal).max) : item.enchant !== undefined) bad('아이템 강화 단계가 올바르지 않습니다');
      // 13차: 잠금은 v9 장비에만, 값은 true만(없으면 안 잠김)
      if (item.lock !== undefined && (version < 9 || item.lock !== true || !gear)) bad('잠금 표시가 올바르지 않습니다');
    }
  }
  if (integer(save.nextUid, 1) && save.nextUid <= maxUid) bad('다음 uid는 기존 uid보다 커야 합니다');
  const slots = version >= 16 ? EQUIP_SLOTS : version >= 12 ? V12_SLOTS : version >= 4 ? V4_SLOTS : ['weapon', 'armor']; // 18차: v12부터 11칸, 23차: v16부터 13칸
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
  if (!isRecord(save.rates) || Object.keys(bal.rates).some(key => !bal.rates[key].includes(save.rates[key]))) bad('배율이 올바르지 않습니다');
  if (version >= 5) { try { if (!levelOk || !validHotbar(save.hotbar, p.level, bal)) bad('단축 칸이 올바르지 않습니다'); } catch { bad('단축 칸이 올바르지 않습니다'); } }
  else if ('hotbar' in save) bad('옛 버전 기록에 단축 칸이 있습니다');
  if (version >= 6) { if (!validBuffs(save.buffs, bal)) bad('버프 기록이 올바르지 않습니다'); }
  else if ('buffs' in save) bad('옛 버전 기록에 버프가 있습니다');
  if (version >= 7) { if (!validMorph(save.morph, bal)) bad('변신 기록이 올바르지 않습니다'); }
  else if ('morph' in save) bad('옛 버전 기록에 변신이 있습니다');
  // 12차(⑤ #6): 도감·처치 수·칭호·목표. 칭호 자격은 도감·처치 수가 정상일 때만 본다
  if (version >= 8) {
    const codexOk = validCodex(save.codex, bal), killsOk = validKills(save.kills, bal);
    if (!codexOk) bad('도감 기록이 올바르지 않습니다');
    if (!killsOk) bad('처치 기록이 올바르지 않습니다');
    if (!(codexOk && killsOk && validTitle(save.title, save, bal))) bad('칭호가 올바르지 않습니다');
    if (!killsOk || !validQuest(save.quest, save.kills, bal)) bad('사냥 목표가 올바르지 않습니다');
  } else if (['codex', 'kills', 'title', 'quest'].some(k => k in save)) bad('옛 버전 기록에 도감·칭호·목표가 있습니다');
  // 13차 자동 보충(선택 필드): 있으면 v9이고, 보충 목록 안의 물건 → 목표 1~stackMax 정수, 빈 객체는 안 됨
  if ('restock' in save && (version < 9 || !validRestock(save.restock, bal))) bad('자동 보충 설정이 올바르지 않습니다');
  // 14차 스킬 레벨(선택 필드): v10만, 배운 스킬의 2~5
  if ('skillLv' in save && (version < 10 || !levelOk || !validSkillLv(save.skillLv, p.level, bal))) bad('스킬 레벨이 올바르지 않습니다');
  // 20차 장비 세트(선택 필드, v14만): 길이 3, 칸마다 null 또는 {name, equip:{칸: uid|null}} — uid는 가방에 없어도 됨(바꿀 때 있는 것만)
  if ('loadouts' in save && (version < 14 || !validLoadouts(save.loadouts, slots))) bad('장비 세트 기록이 올바르지 않습니다');
  // 23차 선물(v16부터 꼭 있음 — ⑤ #1): 받은 선물 id 목록, 알려진 id만·중복 없음. 선물 id는 bal.gifts에서 지우지 않는다(⑤ #4)
  if (version >= 16 ? !validGifts(save.gifts, bal) : 'gifts' in save) bad('선물 기록이 올바르지 않습니다');
  // 15차(선택 필드, v11만): 엘릭서·경험치 복구·마법인형
  if (isRecord(p) && 'elixir' in p && (version < 11 || !validElixir(p.elixir, bal))) bad('엘릭서 기록이 올바르지 않습니다');
  if ('recover' in save && (version < 11 || !validRecover(save.recover))) bad('경험치 복구 기록이 올바르지 않습니다');
  if ('dolls' in save && (version < 11 || !validDolls(save.dolls, bal))) bad('마법인형 기록이 올바르지 않습니다');
  const bossTime = at => at === null || integer(at);
  if (version < 3) {
    if (!isRecord(save.boss) || !bossTime(save.boss.defeatedAt)) bad('보스 처치 시각이 올바르지 않습니다');
  } else {
    const b = save.bosses, ids = bossIdsFor(version); // 21차: 보스 키는 버전으로
    const keys = isRecord(b) ? Object.keys(b) : [];
    if (!isRecord(b) || Object.getPrototypeOf(b) !== Object.prototype || keys.length !== ids.length
      || ids.some(id => !Object.hasOwn(b, id) || !bossTime(b[id]))) bad('보스 처치 시각이 올바르지 않습니다');
    if ('boss' in save && save.boss !== undefined) bad('옛 보스 기록이 남아 있습니다');
  }
  // 8차: 최대 체력은 장비·체력 능력치(12차: 도감·칭호)에 따라 달라진다 — 다른 검사가 모두 통과했을 때만 맨 끝에 계산해 hp 범위를 본다(⑤ #5)
  if (version >= 4 && errors.length === 0 && equipOk) {
    try { if (p.hp > statsOf(save, bal).maxHp) bad('체력이 올바르지 않습니다'); }
    catch { bad('장비 정보가 올바르지 않습니다'); }
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
  next.equip = Object.fromEntries(V4_SLOTS.map(slot => [slot, save.equip[slot] ?? null])); // v4는 9칸(18차에 고정)
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
  // 12차: 목표는 v7 고정 규칙(다음 단계 v7→v8 검사를 통과하고 거기서 다시 비율 변환)
  const v7 = balFor(bal, 7), p = next.player;
  if (p.level < v7.progression.maxLevel && needExp(p.level, old) !== needExp(p.level, v7)) {
    const need = needExp(p.level, v7);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  } else if (p.level >= v7.progression.maxLevel) p.exp = 0;
  return settleHp(next, v7);
}
// 7→8(⑤ #1·#20): v7 고정 규칙으로 전부 검사한 뒤 도감·처치 수·칭호·목표 기본값을 더한다. 처치 수는 업데이트 뒤부터 세고,
// 보스는 처치 시각이 남아 있으면 1회로 이어 준다. 경험치 계수가 바뀌었으면 비율 변환. 도감·칭호가 비어 최대 체력은 v7과 같다
function v7to8(save, bal) {
  const old = balFor(bal, 7), v8 = balFor(bal, 8); // 21차 ⑤ #4: 목표는 v8 규칙(지금 밸런스가 아니라)
  const check = validate(save, old, 7);
  if (!check.ok) throw new TypeError(`버전 7 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 8;
  const p = next.player;
  if (p.level < v8.progression.maxLevel && needExp(p.level, old) !== needExp(p.level, v8)) {
    const need = needExp(p.level, v8);
    p.exp = Math.min(need - 1, Math.round((p.exp / needExp(p.level, old)) * need));
  } else if (p.level >= v8.progression.maxLevel) p.exp = 0;
  Object.assign(next, newCollect(p.level, v8));
  for (const id of bossIdsFor(8)) if (Object.hasOwn(next.bosses, id) && next.bosses[id] !== null && v8.monsters.some(m => m.id === id)) next.kills[id] = 1;
  return settleHp(next, v8);
}
// 8→9(13차): v8 규칙(잠금·자동 보충 없음)으로 전부 검사한 뒤 버전만 바꾼다(필드는 그대로, 경험치 공식 같음)
function v8to9(save, bal) {
  const check = validate(save, balFor(bal, 8), 8);
  if (!check.ok) throw new TypeError(`버전 8 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 9;
  return next;
}
// 15→16(23차): v15 규칙(11칸·p23 없음)으로 검사한 뒤 귀걸이·팔찌 칸(null)을 장착·장비 세트에 더한다
function v15to16(save, bal) {
  const check = validate(save, balFor(bal, 15), 15);
  if (!check.ok) throw new TypeError(`버전 15 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 16;
  const widen = equip => Object.fromEntries(EQUIP_SLOTS.map(slot => [slot, equip[slot] ?? null]));
  next.equip = widen(save.equip);
  next.gifts = []; // ⑤ #1: 넘어온 기록은 선물을 아직 안 받음(v16부터 gifts는 꼭 있음)
  if (Array.isArray(next.loadouts)) next.loadouts = next.loadouts.map(l => (l === null ? null : { name: l.name, equip: widen(l.equip) }));
  return next;
}
// 14→15(21차): v14 규칙(최대 40·서리 없음·보스 2)으로 검사한 뒤 서리 용 처치 기록(null)만 더한다
function v14to15(save, bal) {
  const check = validate(save, balFor(bal, 14), 14);
  if (!check.ok) throw new TypeError(`버전 14 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 15;
  next.bosses = { ...next.bosses, drake: null };
  return next;
}
// 13→14(20차): v13 규칙(장비 세트 없음)으로 검사한 뒤 버전만
function v13to14(save, bal) {
  const check = validate(save, balFor(bal, 13), 13);
  if (!check.ok) throw new TypeError(`버전 13 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 14;
  return next;
}
// 12→13(19차): v12 규칙(보스 코인 없음)으로 검사한 뒤 버전만
function v12to13(save, bal) {
  const check = validate(save, balFor(bal, 12), 12);
  if (!check.ok) throw new TypeError(`버전 12 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 13;
  return next;
}
// 11→12(18차): v11 규칙(9칸·장신구 없음)으로 검사한 뒤 장신구 두 칸(null)을 더한다
function v11to12(save, bal) {
  const check = validate(save, balFor(bal, 11), 11);
  if (!check.ok) throw new TypeError(`버전 11 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 12;
  next.equip = Object.fromEntries(V12_SLOTS.map(slot => [slot, save.equip[slot] ?? null])); // 23차: v12는 11칸(고정)
  return next;
}
// 10→11(15차): v10 규칙(엘릭서·인형 없음)으로 검사한 뒤 버전만
function v10to11(save, bal) {
  const check = validate(save, balFor(bal, 10), 10);
  if (!check.ok) throw new TypeError(`버전 10 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 11;
  return next;
}
// 9→10(14차): v9 규칙(스킬 카드·스킬 레벨 없음)으로 검사한 뒤 버전만
function v9to10(save, bal) {
  const check = validate(save, balFor(bal, 9), 9);
  if (!check.ok) throw new TypeError(`버전 9 저장 검사 실패: ${check.errors.join('; ')}`);
  const next = clone(save);
  next.version = 10;
  return next;
}
export function migrate(save, bal = defaultBalance) {
  if (!isRecord(save)) throw new TypeError('지원하지 않는 저장 버전입니다');
  if (save.version === SAVE_VERSION) return clone(save);
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(save.version)) throw new TypeError('지원하지 않는 저장 버전입니다');
  // 21차 ⑤ #3: 모든 경로가 마지막에 v14→15를 지난다. 23차: 그 뒤 v15→16
  if (save.version === 15) return v15to16(save, bal);
  if (save.version === 14) return v15to16(v14to15(save, bal), bal);
  const to14 = s => v15to16(v14to15(v13to14(s, bal), bal), bal);
  if (save.version === 13) return to14(save);
  if (save.version === 12) return to14(v12to13(save, bal));
  if (save.version === 11) return to14(v12to13(v11to12(save, bal), bal));
  if (save.version === 10) return to14(v12to13(v11to12(v10to11(save, bal), bal), bal));
  if (save.version === 9) return to14(v12to13(v11to12(v10to11(v9to10(save, bal), bal), bal), bal));
  if (save.version === 8) return to14(v12to13(v11to12(v10to11(v9to10(v8to9(save, bal), bal), bal), bal), bal));
  let next = save;
  if (next.version === 1) next = v1to2(next, bal);
  if (next.version === 2) next = v2to3(next, bal);
  if (next.version === 3) next = v3to4(next, bal);
  if (next.version === 4) next = v4to5(next, bal);
  if (next.version === 5) next = v5to6(next, bal);
  if (next.version === 6) next = v6to7(next, bal);
  return to14(v12to13(v11to12(v10to11(v9to10(v8to9(v7to8(next, bal), bal), bal), bal), bal), bal));
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

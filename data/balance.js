// All times are milliseconds unless their name ends in Sec. Prices are gold.
// v2 leaves individual normal drops and gold ranges open; their choices live here.
const weapons = [
  { id: 'woodSword', name: '나무검', kind: 'weapon', min: 1, max: 5, price: 50, shop: true, sellRate: 0.25 },
  { id: 'ironSword', name: '철검', kind: 'weapon', min: 3, max: 9, price: 300, shop: true, sellRate: 0.25 },
  { id: 'steelSword', name: '강철검', kind: 'weapon', min: 5, max: 14, price: 1500, shop: true, sellRate: 0.25 },
  { id: 'deepSword', name: '깊은돌검', kind: 'weapon', min: 8, max: 20, price: 6000, shop: false, sellRate: 0.25 },
  // 4차: 미스릴(대장장이 판매)·망령(기사왕 전용)
  { id: 'mithrilSword', name: '미스릴검', kind: 'weapon', min: 9, max: 22, price: 60000, shop: true, sellRate: 0.25 },
  { id: 'wraithSword', name: '망령검', kind: 'weapon', min: 13, max: 30, price: 30000, shop: false, sellRate: 0.25 },
];
const armors = [
  { id: 'clothArmor', name: '천옷', kind: 'armor', def: 1, price: 40, shop: true, sellRate: 0.25 },
  { id: 'leatherArmor', name: '가죽갑옷', kind: 'armor', def: 3, price: 250, shop: true, sellRate: 0.25 },
  { id: 'chainArmor', name: '사슬갑옷', kind: 'armor', def: 6, price: 1200, shop: true, sellRate: 0.25 },
  { id: 'plateArmor', name: '판금갑옷', kind: 'armor', def: 9, price: 4800, shop: false, sellRate: 0.25 },
  { id: 'mithrilArmor', name: '미스릴갑옷', kind: 'armor', def: 11, price: 50000, shop: true, sellRate: 0.25 },
  { id: 'wraithArmor', name: '망령갑옷', kind: 'armor', def: 14, price: 26000, shop: false, sellRate: 0.25 },
].map(def => ({ slot: 'armor', ...def }));
// 8차: 갑옷 외 7부위(kind 'armor' + slot). 4등급 = 들판·숲·폐광·성터. 강화는 갑옷 주문서, 1단계마다 방어 +1
const PARTS = [
  ['helm', '투구', ['가죽', '철', '강철', '미스릴'], t => ({ def: [1, 1, 2, 3][t], hp: [0, 10, 15, 25][t] })],
  ['shirt', '티셔츠', ['면', '질긴', '수호', '미스릴'], t => ({ hp: [10, 25, 45, 70][t] })],
  ['cloak', '망토', ['천', '가죽', '수호', '미스릴'], t => ({ def: [1, 1, 2, 3][t], regen: [0, 1, 1, 2][t] })],
  ['gloves', '장갑', ['가죽', '철', '강철', '미스릴'], t => ({ hit: [2, 4, 6, 8][t], dmg: [0, 1, 2, 3][t] })],
  ['belt', '벨트', ['가죽', '철', '강철', '미스릴'], t => ({ hp: [15, 30, 50, 80][t] })],
  ['pants', '바지', ['천', '가죽', '사슬', '미스릴'], t => ({ def: [1, 2, 2, 3][t], hp: [0, 0, 15, 25][t] })],
  ['boots', '부츠', ['가죽', '철', '강철', '미스릴'], t => ({ def: [0, 1, 1, 2][t], regen: t + 1 })],
];
export const PART_SLOTS = PARTS.map(([slot]) => slot);
const PART_PRICE = [120, 750, 3800, 25000];
const parts = PARTS.flatMap(([slot, noun, tiers, fx]) => tiers.map((pre, t) => ({
  id: `${slot}${t + 1}`, name: `${pre} ${noun}`, kind: 'armor', slot, tier: t + 1, def: 0, ...fx(t), price: PART_PRICE[t], shop: true, sellRate: 0.25,
})));
const partIds = t => PARTS.map(([slot]) => `${slot}${t}`);
armors.push(...parts);
const consumables = [
  { id: 'potion', name: '초급 회복 물약', kind: 'consumable', price: 10, heal: 30, cooldownMs: 1000, shop: true, sellRate: 0.25 },
  { id: 'potionMid', name: '중급 회복 물약', kind: 'consumable', price: 40, heal: 90, cooldownMs: 1000, shop: true, sellRate: 0.25 },
  { id: 'potionHigh', name: '고급 회복 물약', kind: 'consumable', price: 120, heal: 220, cooldownMs: 1000, shop: true, sellRate: 0.25 },
  { id: 'returnScroll', name: '귀환 주문서', kind: 'consumable', price: 15, shop: true, sellRate: 0.25 },
  { id: 'weaponScroll', name: '무기 강화 주문서', kind: 'consumable', price: 120, shop: true, sellRate: 0.25 },
  { id: 'armorScroll', name: '갑옷 강화 주문서', kind: 'consumable', price: 80, shop: true, sellRate: 0.25 },
];
// 일반 몬스터 드랍(지역 단계별). 4차부터 몬스터마다 드랍을 명시한다(순번으로 정하지 않음)
// 8차: 물약 종류(지역별)·부위 장비(그 지역 등급, 부위마다 partChance)
const normalDrops = (scroll, scrollA, weapon, armor, gearChance, potions, tier, partChance) => [
  ...potions.map(([id, chance]) => ({ id, count: 1, chance })),
  ...partIds(tier).map(id => ({ id, count: 1, chance: partChance })),
  { id: 'weaponScroll', count: 1, chance: scroll },
  { id: 'armorScroll', count: 1, chance: scrollA },
  { id: weapon, count: 1, chance: gearChance },
  { id: armor, count: 1, chance: gearChance },
];
const FIELD_DROPS = normalDrops(0.01, 0.015, 'ironSword', 'leatherArmor', 0.005, [['potion', 0.06]], 1, 0.0015);
const FOREST_DROPS = normalDrops(0.02, 0.025, 'steelSword', 'chainArmor', 0.01, [['potion', 0.04], ['potionMid', 0.02]], 2, 0.002);
const MINE_DROPS = normalDrops(0.03, 0.04, 'steelSword', 'chainArmor', 0.01, [['potionMid', 0.04], ['potionHigh', 0.01]], 3, 0.002);
const RUIN_DROPS = normalDrops(0.03, 0.04, 'mithrilSword', 'mithrilArmor', 0.01, [['potionMid', 0.03], ['potionHigh', 0.03]], 4, 0.002);
// [id, 이름, 레벨, 체력, 공격, 방어, 경험치, 평균 돈, 지역, 보스, 드랍]
// 8차 몬스터: 기사 능력치 성장(힘·민첩·체력)·부위 장비를 상쇄하려고 체력 ×1.5~2.0, 방어는 지역 안 레벨이 높을수록 더(tools/tune8.mjs로 맞춤).
// 공격은 그대로(옛 기록이 변환 직후 위험해지지 않게)
const rows = [
  ['jelly', '풀젤리', 1, 24, 4, 2, 8, 5, 'field', false, FIELD_DROPS],
  ['mouse', '들쥐', 2, 36, 6, 3, 14, 7, 'field', false, FIELD_DROPS],
  ['hopfrog', '개굴새', 4, 60, 9, 4, 32, 11, 'field', false, FIELD_DROPS],
  ['goblin', '숲고블린', 6, 90, 12, 5, 58, 16, 'field', false, FIELD_DROPS],
  ['raccoon', '들너구리', 9, 166, 17, 8, 120, 26, 'forest', false, FOREST_DROPS],
  ['vine', '덩굴뱀', 11, 219, 20, 11, 170, 33, 'forest', false, FOREST_DROPS],
  ['nightwing', '밤깃발톱', 13, 263, 24, 13, 230, 40, 'forest', false, FOREST_DROPS],
  ['crab', '광맥게', 17, 437, 31, 22, 400, 60, 'mine', false, MINE_DROPS],
  ['ember', '잿불턱', 20, 551, 36, 28, 560, 75, 'mine', false, MINE_DROPS],
  ['stalker', '흑암보행자', 24, 703, 43, 35, 800, 95, 'mine', false, MINE_DROPS],
  ['boss', '폐광의 큰울림', 28, 5600, 74, 32, 9000, 1500, 'mine', true, [
    { id: 'weaponScroll', count: 2, guaranteed: true },
    { id: 'armorScroll', count: 2, guaranteed: true },
    { id: 'deepSword', count: 1, chance: 0.15 },
    { id: 'plateArmor', count: 1, chance: 0.15 },
  ]],
  // 4차: 망자의 성터(권장 31~40)
  ['wisp', '떠도는 넋', 30, 940, 48, 40, 1102, 120, 'ruin', false, RUIN_DROPS],
  ['skull', '불꽃해골', 33, 1120, 64, 52, 1598, 140, 'ruin', false, RUIN_DROPS],
  ['warden', '성터 파수꾼', 36, 1400, 68, 64, 2344, 165, 'ruin', false, RUIN_DROPS],
  ['eye', '저주의 눈', 39, 1640, 70, 76, 3380, 190, 'ruin', false, RUIN_DROPS],
  ['lich', '망령 기사왕', 42, 9000, 96, 50, 30000, 3000, 'ruin', true, [
    { id: 'weaponScroll', count: 3, guaranteed: true },
    { id: 'armorScroll', count: 3, guaranteed: true },
    { id: 'wraithSword', count: 1, chance: 0.1 },
    { id: 'wraithArmor', count: 1, chance: 0.1 },
  ]],
];
// 5차(대표님 의견 '돈이 너무 없다'): 일반 몬스터 돈 평균 × 2.5(반올림). 보스는 그대로
const NORMAL_GOLD_MULT = 2.5;
const monsters = rows.map(([id, name, level, hp, atk, def, exp, base, mapId, isBoss, drops]) => ({ id, name, level, hp, atk, def, exp, mapId, isBoss, drops, average: isBoss ? base : Math.round(base * NORMAL_GOLD_MULT) }))
  .map(({ id, name, level, hp, atk, def, exp, average, mapId, isBoss, drops }) => ({
  id, name, level, hp, atk, def, exp, mapId, isBoss,
  gold: { min: Math.ceil(average * 0.8), max: 2 * average - Math.ceil(average * 0.8) },
  drops: drops.map(drop => ({ ...drop })),
}));

export default {
  version: 1,
  // 5차(스킬·돈 ×2.5): a=155, 성터 경험치 ×1.08 → 시뮬레이터 3회 1→30 10.12h, 30→40 9.85h, 합 19.97h(게임 시계).
  // 계수는 올리기만 한다(v3 기록의 exp가 새 필요치보다 작아야 검사 통과). v2 이하 기록은 save.js의 고정 공식으로 검사·비율 변환
  progression: { coefficient: 155, exponent: 2.15, early: { untilLevel: 22, startFactor: 0.04, power: 2.5 }, maxLevel: 40, deathLoss: 0.05, lowLevelGap: 5, lowLevelRate: 0.3 },
  knight: { baseHp: 80, hpPerLevel: 16, atkDivisor: 2, defDivisor: 4, attackMs: 750, regenBase: 2, regenDivisor: 4, regenMs: 3000 },
  combat: { playerHit: 0.8, monsterHit: 0.7, levelHit: 0.03, minHit: 0.3, maxHit: 0.95, minDamage: 1, weaponEnchantDamage: 2, monsterDefDivisor: 2, monsterAttackMs: 1200, bareMin: 1, bareMax: 1 },
  weapons, armors, consumables, monsters,
  maps: [
    { id: 'field', name: '이슬 들판', recommendedLevel: { min: 1, max: 7 } },
    { id: 'forest', name: '그늘 숲', recommendedLevel: { min: 8, max: 14 } },
    { id: 'mine', name: '잿돌 폐광', recommendedLevel: { min: 15, max: 29 } },
    { id: 'ruin', name: '망자의 성터', recommendedLevel: { min: 30, max: 40 } },
  ],
  town: { id: 'town', name: '바람 마을', x: 0, y: 0 },
  enchant: {
    weapon: { safe: 6, max: 10, scrollId: 'weaponScroll', riskyChances: [0.4, 0.33, 0.25, 0.15] },
    armor: { safe: 4, max: 8, scrollId: 'armorScroll', riskyChances: [0.4, 0.33, 0.25, 0.15] },
    // 8차: 7부위(투구·티셔츠·망토·장갑·벨트·바지·부츠)는 갑옷 주문서로, 안전 +2·최대 +6
    part: { safe: 2, max: 6, scrollId: 'armorScroll', riskyChances: [0.4, 0.33, 0.25, 0.15] },
  },
  rates: { exp: [0.5, 1, 2, 3, 5, 10, 20, 50, 100], drop: [0.5, 1, 2, 3, 5, 10, 20, 50, 100], gold: [0.5, 1, 2, 3, 5, 10, 20, 50, 100], enchant: [0.5, 1, 1.5, 2, 3] },
  // 8차: 9부위 장착(장착 장비도 가방 칸을 차지) → 가방 50·창고 100
  inventory: { bagSlots: 50, warehouseSlots: 100, stackMax: 999 },
  // 8차 능력치: 자동(레벨) + 보너스(pointEvery 레벨마다 1점, 1점 = 능력치 pointValue). 계산은 progression.playerStats.
  // 힘 = 10 + floor((L−1)·str) + 3b → 피해 +1/힘. 민첩 = 10 + floor((L−1)·dex) + 3b → 명중 +1%p/dexPerHit, 공격 간격 −atkMsPerDex/민첩.
  // 체력 = 10 + floor((L−1)·con) + 3b → 최대 체력 +hpPerCon, 방어 +1/conPerDef, 재생 +1/conPerRegen.
  // 옛 값 이상 보장: 피해 ≥ floor(L/2), 방어 ≥ floor(L/4), 재생 ≥ 2 + floor(L/4)(knight 기존 식을 바탕으로 더함)
  stats: { base: 10, pointEvery: 5, pointValue: 2, str: [1, 1], dex: [1, 3], con: [1, 2],
    dexPerHit: 1, atkMsPerDex: 0.015, minAttackMs: 500, hpPerCon: 6, conPerDef: 3, conPerRegen: 1, resetGoldPerLevel: 1000 },
  // 8차 레벨 보상(한 번만, [내 정보] 창 보상 탭)
  levelRewards: [
    { level: 5, gold: 0, items: [{ id: 'potion', count: 30 }, { id: 'returnScroll', count: 3 }, { id: 'helm1', count: 1 }] },
    { level: 10, gold: 0, items: [{ id: 'potionMid', count: 20 }, { id: 'weaponScroll', count: 2 }, { id: 'gloves1', count: 1 }] },
    { level: 15, gold: 0, items: [{ id: 'potionMid', count: 30 }, { id: 'armorScroll', count: 3 }, { id: 'cloak2', count: 1 }] },
    { level: 20, gold: 0, items: [{ id: 'potionHigh', count: 10 }, { id: 'weaponScroll', count: 3 }, { id: 'boots2', count: 1 }] },
    { level: 25, gold: 0, items: [{ id: 'potionHigh', count: 20 }, { id: 'armorScroll', count: 3 }, { id: 'belt3', count: 1 }] },
    { level: 30, gold: 0, items: [{ id: 'potionHigh', count: 30 }, { id: 'weaponScroll', count: 3 }, { id: 'armorScroll', count: 3 }] },
    { level: 35, gold: 0, items: [{ id: 'potionHigh', count: 40 }, { id: 'shirt4', count: 1 }] },
    { level: 40, gold: 10000, items: [{ id: 'potionHigh', count: 50 }, { id: 'weaponScroll', count: 5 }, { id: 'armorScroll', count: 5 }] },
  ],
  start: { gold: 200, weapon: 'woodSword', armor: 'clothArmor', items: [{ id: 'potion', count: 30 }, { id: 'returnScroll', count: 3 }] },
  // 보스: 재등장은 실제 시각, 방 이탈 초기화·땅 울림은 게임 시각(멈추면 안 흐름)
  boss: { respawnMs: 600000, roomResetMs: 30000, slamEvery: 4, slamMult: 1.5, slamRadiusTiles: 2, slamWarnMs: 1000 },
  // 마을 순간이동 마법사(2차 신규, ④ 승인 2026-10-12). 좌표는 data/maps.js TELEPORTS
  teleport: [
    { id: 'field', name: '이슬 들판 입구', price: 0 },
    { id: 'forest', name: '그늘 숲 입구', price: 40 },
    { id: 'mine', name: '잿돌 폐광 입구', price: 100 },
    { id: 'ruin', name: '망자의 성터 입구', price: 200 },
  ],
  autohunt: { radiusTiles: 8, stuckSec: 3, potionHp: 0.5, returnHp: 0.2, pickupNearTiles: 1.5, guardHp: 0.7, stunHpRatio: 0.4 },
  // 5차 스킬(마나 없음, 레벨이 되면 배움, 쿨타임은 게임 시계·저장 안 함). 공격 스킬은 일반 공격 한 번을 대신한다
  skills: [
    { id: 'bash', name: '강타', level: 5, cooldownMs: 6000, mult: 2 },
    { id: 'stun', name: '쇼크 스턴', level: 15, cooldownMs: 12000, mult: 1.2, stunMs: 2000 },
    { id: 'whirl', name: '회오리 베기', level: 25, cooldownMs: 15000, mult: 1, radiusTiles: 2.5 },
    { id: 'guard', name: '리덕션 아머', level: 32, cooldownMs: 60000, reduce: 0.3, durationMs: 20000 },
  ],
  simulation: { walkSec: 3.5, serviceSec: 60, potionStock: 200, seed: 20261011 },
};

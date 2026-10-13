// All times are milliseconds unless their name ends in Sec. Prices are gold.
// v2 leaves individual normal drops and gold ranges open; their choices live here.
const weapons = [
  { id: 'woodSword', name: '나무검', kind: 'weapon', min: 1, max: 5, price: 50, shop: true, sellRate: 0.25 },
  { id: 'ironSword', name: '철검', kind: 'weapon', min: 3, max: 9, price: 300, shop: true, sellRate: 0.25 },
  { id: 'steelSword', name: '강철검', kind: 'weapon', min: 5, max: 14, price: 1500, shop: true, sellRate: 0.25 },
  { id: 'deepSword', name: '깊은돌검', kind: 'weapon', min: 8, max: 20, price: 6000, shop: false, sellRate: 0.25 },
];
const armors = [
  { id: 'clothArmor', name: '천옷', kind: 'armor', def: 1, price: 40, shop: true, sellRate: 0.25 },
  { id: 'leatherArmor', name: '가죽갑옷', kind: 'armor', def: 3, price: 250, shop: true, sellRate: 0.25 },
  { id: 'chainArmor', name: '사슬갑옷', kind: 'armor', def: 6, price: 1200, shop: true, sellRate: 0.25 },
  { id: 'plateArmor', name: '판금갑옷', kind: 'armor', def: 9, price: 4800, shop: false, sellRate: 0.25 },
];
const consumables = [
  { id: 'potion', name: '회복 물약', kind: 'consumable', price: 10, heal: 30, cooldownMs: 1000, shop: true, sellRate: 0.25 },
  { id: 'returnScroll', name: '귀환 주문서', kind: 'consumable', price: 15, shop: true, sellRate: 0.25 },
  { id: 'weaponScroll', name: '무기 강화 주문서', kind: 'consumable', price: 120, shop: true, sellRate: 0.25 },
  { id: 'armorScroll', name: '갑옷 강화 주문서', kind: 'consumable', price: 80, shop: true, sellRate: 0.25 },
];
const rows = [
  ['jelly', '풀젤리', 1, 16, 4, 0, 8, 5, 'field'],
  ['mouse', '들쥐', 2, 24, 6, 1, 14, 7, 'field'],
  ['hopfrog', '개굴새', 4, 40, 9, 2, 32, 11, 'field'],
  ['goblin', '숲고블린', 6, 60, 12, 3, 58, 16, 'field'],
  ['raccoon', '들너구리', 9, 95, 17, 5, 120, 26, 'forest'],
  ['vine', '덩굴뱀', 11, 125, 20, 7, 170, 33, 'forest'],
  ['nightwing', '밤깃발톱', 13, 150, 24, 8, 230, 40, 'forest'],
  ['crab', '광맥게', 17, 230, 31, 12, 400, 60, 'mine'],
  ['ember', '잿불턱', 20, 290, 36, 14, 560, 75, 'mine'],
  ['stalker', '흑암보행자', 24, 370, 43, 17, 800, 95, 'mine'],
  ['boss', '폐광의 큰울림', 28, 3200, 58, 20, 9000, 1500, 'mine'],
];
const monsters = rows.map(([id, name, level, hp, atk, def, exp, average, mapId], i) => ({
  id, name, level, hp, atk, def, exp, mapId, isBoss: id === 'boss',
  gold: { min: Math.ceil(average * 0.8), max: 2 * average - Math.ceil(average * 0.8) },
  drops: id === 'boss' ? [
    { id: 'weaponScroll', count: 2, guaranteed: true },
    { id: 'armorScroll', count: 2, guaranteed: true },
    { id: 'deepSword', count: 1, chance: 0.15 },
    { id: 'plateArmor', count: 1, chance: 0.15 },
  ] : [
    { id: 'potion', count: 1, chance: 0.06 },
    { id: 'weaponScroll', count: 1, chance: i < 4 ? 0.01 : i < 7 ? 0.02 : 0.03 },
    { id: 'armorScroll', count: 1, chance: i < 4 ? 0.015 : i < 7 ? 0.025 : 0.04 },
    { id: i < 4 ? 'ironSword' : 'steelSword', count: 1, chance: i < 4 ? 0.005 : 0.01 },
    { id: i < 4 ? 'leatherArmor' : 'chainArmor', count: 1, chance: i < 4 ? 0.005 : 0.01 },
  ],
}));

export default {
  version: 1,
  // 30 seeded runs (20261011..20261040), safe enchants, 4s walking + 60s
  // service: a=75 gave 10.410h; a=72 gives 10.001h (9.681..10.492h).
  progression: { coefficient: 72, exponent: 2.15, maxLevel: 30, deathLoss: 0.05, lowLevelGap: 5, lowLevelRate: 0.3 },
  knight: { baseHp: 80, hpPerLevel: 16, atkDivisor: 2, defDivisor: 4, attackMs: 1000, regenBase: 2, regenDivisor: 4, regenMs: 3000 },
  combat: { playerHit: 0.8, monsterHit: 0.7, levelHit: 0.03, minHit: 0.3, maxHit: 0.95, minDamage: 1, weaponEnchantDamage: 2, monsterDefDivisor: 2, monsterAttackMs: 1200, bareMin: 1, bareMax: 1 },
  weapons, armors, consumables, monsters,
  maps: [
    { id: 'field', name: '이슬 들판', recommendedLevel: { min: 1, max: 7 } },
    { id: 'forest', name: '그늘 숲', recommendedLevel: { min: 8, max: 15 } },
    { id: 'mine', name: '잿돌 폐광', recommendedLevel: { min: 16, max: 30 } },
  ],
  town: { id: 'town', name: '바람 마을', x: 0, y: 0 },
  enchant: {
    weapon: { safe: 6, max: 10, scrollId: 'weaponScroll', riskyChances: [0.4, 0.33, 0.25, 0.15] },
    armor: { safe: 4, max: 8, scrollId: 'armorScroll', riskyChances: [0.4, 0.33, 0.25, 0.15] },
  },
  rates: { exp: [0.5, 1, 2, 3, 5, 10, 20, 50, 100], drop: [0.5, 1, 2, 3, 5, 10, 20, 50, 100], gold: [0.5, 1, 2, 3, 5, 10, 20, 50, 100], enchant: [0.5, 1, 1.5, 2, 3] },
  inventory: { bagSlots: 30, warehouseSlots: 60, stackMax: 999 },
  start: { gold: 200, weapon: 'woodSword', armor: 'clothArmor', items: [{ id: 'potion', count: 30 }, { id: 'returnScroll', count: 3 }] },
  // 보스: 재등장은 실제 시각, 방 이탈 초기화·땅 울림은 게임 시각(멈추면 안 흐름)
  boss: { respawnMs: 600000, roomResetMs: 30000, slamEvery: 4, slamMult: 1.5, slamRadiusTiles: 2, slamWarnMs: 1000 },
  // 마을 순간이동 마법사(2차 신규, ④ 승인 2026-10-12). 좌표는 data/maps.js TELEPORTS
  teleport: [
    { id: 'field', name: '이슬 들판 입구', price: 0 },
    { id: 'forest', name: '그늘 숲 입구', price: 40 },
    { id: 'mine', name: '잿돌 폐광 입구', price: 100 },
  ],
  autohunt: { radiusTiles: 8, stuckSec: 3, potionHp: 0.5, returnHp: 0.2 },
  simulation: { walkSec: 4, serviceSec: 60, potionStock: 200, seed: 20261011 },
};

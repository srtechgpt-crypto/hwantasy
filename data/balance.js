// All times are milliseconds unless their name ends in Sec. Prices are gold.
// v2 leaves individual normal drops and gold ranges open; their choices live here.
const weapons = [
  { id: 'woodSword', name: '나무검', kind: 'weapon', min: 1, max: 5, price: 50, shop: true, sellRate: 0.25 },
  { id: 'ironSword', name: '철검', kind: 'weapon', min: 3, max: 9, price: 300, shop: true, sellRate: 0.25, tier: 1 },
  { id: 'steelSword', name: '강철검', kind: 'weapon', min: 5, max: 14, price: 1500, shop: true, sellRate: 0.25, tier: 2 },
  { id: 'deepSword', name: '깊은돌검', kind: 'weapon', min: 8, max: 20, price: 6000, shop: false, sellRate: 0.25, tier: 3 },
  // 4차: 미스릴(대장장이 판매)·망령(기사왕 전용)
  { id: 'mithrilSword', name: '미스릴검', kind: 'weapon', min: 9, max: 22, price: 60000, shop: true, sellRate: 0.25, tier: 4 },
  { id: 'wraithSword', name: '망령검', kind: 'weapon', min: 13, max: 30, price: 30000, shop: false, sellRate: 0.25 },
].map(def => ({ type: 'sword', ...def }));
// 10차 무기 계열: 검 등급(철·강철·깊은돌·미스릴)의 주사위를 바탕으로 계열마다 성격을 준다.
// dmgPct = 최종 피해 %(스킬·치명과 함께 곱함), speedPct = 공격 간격 %(+는 느림, 최소 간격도 같은 비율), crit = 치명 %p, hit = 명중 %p.
// 대검·단검은 피해와 간격이 같은 비율이라 초당 피해는 검과 거의 같고(대검 +4%), 성격(한 방·빠름·치명)만 다르다
export const WEAPON_TYPES = [
  { type: 'sword', noun: '검', desc: '기본 무기' },
  { type: 'twohand', key: 'Greatsword', noun: '대검', dmgPct: 40, speedPct: 35, desc: '느리지만 한 방이 큼' },
  { type: 'axe', key: 'Axe', noun: '도끼', die: [0.4, 1.3], crit: 5, hit: -3, desc: '피해가 들쭉날쭉 · 치명 +5%' },
  { type: 'spear', key: 'Spear', noun: '창', hit: 5, desc: '명중 +5%' },
  { type: 'dagger', key: 'Dagger', noun: '단검', dmgPct: -25, speedPct: -25, crit: 10, desc: '빠르고 치명 +10%' },
];
const WEAPON_TIERS = [['iron', '철', 'ironSword'], ['steel', '강철', 'steelSword'], ['deep', '깊은돌', 'deepSword'], ['mithril', '미스릴', 'mithrilSword']];
for (const wt of WEAPON_TYPES.slice(1)) {
  WEAPON_TIERS.forEach(([key, pre, baseId], i) => {
    const b = weapons.find(w => w.id === baseId);
    const [lo, hi] = wt.die ?? [1, 1];
    weapons.push({
      id: `${key}${wt.key}`, name: `${pre} ${wt.noun}`, kind: 'weapon', type: wt.type, tier: i + 1,
      min: Math.max(1, Math.floor(b.min * lo)), max: Math.ceil(b.max * hi),
      ...(wt.dmgPct ? { dmgPct: wt.dmgPct } : {}), ...(wt.speedPct ? { speedPct: wt.speedPct } : {}),
      ...(wt.crit ? { crit: wt.crit } : {}), ...(wt.hit ? { hit: wt.hit } : {}),
      price: b.price, shop: b.shop, sellRate: 0.25,
    });
  });
}
const armors = [
  { id: 'clothArmor', name: '천옷', kind: 'armor', def: 1, price: 40, shop: true, sellRate: 0.25 },
  { id: 'leatherArmor', name: '가죽갑옷', kind: 'armor', def: 3, price: 250, shop: true, sellRate: 0.25, tier: 1 },
  { id: 'chainArmor', name: '사슬갑옷', kind: 'armor', def: 6, price: 1200, shop: true, sellRate: 0.25, tier: 2 },
  { id: 'plateArmor', name: '판금갑옷', kind: 'armor', def: 9, price: 4800, shop: false, sellRate: 0.25, tier: 3 },
  { id: 'mithrilArmor', name: '미스릴갑옷', kind: 'armor', def: 11, price: 50000, shop: true, sellRate: 0.25, tier: 4 },
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
  // 10차 쓰는 아이템: 버프(bal.buffs, 게임 시계로 남은 시간 저장) · 사냥터 이동 주문서
  { id: 'powerPotion', name: '힘의 물약', kind: 'consumable', price: 150, buff: 'power', shop: true, sellRate: 0.25 },
  { id: 'hastePotion', name: '날쌘 물약', kind: 'consumable', price: 150, buff: 'haste', shop: true, sellRate: 0.25 },
  { id: 'guardPotion', name: '수호 물약', kind: 'consumable', price: 150, buff: 'guard', shop: true, sellRate: 0.25 },
  { id: 'expScroll', name: '경험치 두루마리', kind: 'consumable', price: 800, buff: 'exp', shop: true, sellRate: 0.25 },
  { id: 'huntScroll', name: '사냥터 이동 주문서', kind: 'consumable', price: 30, shop: true, sellRate: 0.25 },
  // 11차: 고급 강화(+1~3 무작위, bal.blessed)·강화 하락(−1, 안 사라짐)·변신(bal.morphs)
  { id: 'weaponScrollB', name: '고급 무기 강화 주문서', kind: 'consumable', price: 900, shop: true, sellRate: 0.25 },
  { id: 'armorScrollB', name: '고급 방어 강화 주문서', kind: 'consumable', price: 600, shop: true, sellRate: 0.25 },
  { id: 'downScroll', name: '강화 하락 주문서', kind: 'consumable', price: 60, shop: true, sellRate: 0.25 },
  { id: 'morphScroll', name: '변신 주문서', kind: 'consumable', price: 300, shop: true, sellRate: 0.25 },
];
// 10차 희귀 장비: 등급(1~4) 있는 무기·큰 갑옷·부위의 '빛나는' 판(별도 id `<원래>_r`, 상점 없음, 값 2배 — ⑤ #20 판매 돈이 너무 크지 않게).
// 무기 최소·최대 ×1.25 올림, 방어구는 0 아닌 수치 ×1.5 올림 + 최대 체력 +5×등급. 강화 규칙·부위·세트 등급은 원래와 같다
const RARE_FIELDS = ['def', 'hit', 'dmg', 'regen'];
const rareOf = d => (d.kind === 'weapon'
  ? { ...d, id: `${d.id}_r`, name: `빛나는 ${d.name}`, rare: true, base: d.id, shop: false, price: d.price * 2, min: Math.ceil(d.min * 1.25), max: Math.ceil(d.max * 1.25) }
  : { ...d, id: `${d.id}_r`, name: `빛나는 ${d.name}`, rare: true, base: d.id, shop: false, price: d.price * 2,
    ...Object.fromEntries(RARE_FIELDS.filter(f => d[f]).map(f => [f, Math.ceil(d[f] * 1.5)])), hp: Math.ceil((d.hp ?? 0) * 1.5) + 5 * d.tier });
const rareWeapons = weapons.filter(d => d.tier).map(rareOf);
const rareArmors = armors.filter(d => d.tier).map(rareOf);
weapons.push(...rareWeapons);
armors.push(...rareArmors);
export const RARE_POOLS = [1, 2, 3, 4].map(t => [...rareWeapons, ...rareArmors].filter(d => d.tier === t).map(d => d.id));
// 새 무기 계열(검·희귀 제외) 등급별 목록 — 일반 몬스터 드랍
const TYPE_POOLS = [1, 2, 3, 4].map(t => weapons.filter(d => d.tier === t && d.type !== 'sword' && !d.rare).map(d => d.id));
// 일반 몬스터 드랍(지역 단계별). 4차부터 몬스터마다 드랍을 명시한다(순번으로 정하지 않음)
// 8차: 물약 종류(지역별)·부위 장비(그 지역 등급, 부위마다 partChance)
// 10차: pool 드랍 = 한 번 굴려 맞으면 목록 중 하나(다음 난수로 고름). 새 무기 계열(typeChance)·희귀(전체 0.002)
const normalDrops = (scroll, scrollA, weapon, armor, gearChance, potions, tier, partChance, typeChance) => [
  ...potions.map(([id, chance]) => ({ id, count: 1, chance })),
  ...partIds(tier).map(id => ({ id, count: 1, chance: partChance })),
  { id: 'weaponScroll', count: 1, chance: scroll },
  { id: 'armorScroll', count: 1, chance: scrollA },
  { id: weapon, count: 1, chance: gearChance },
  { id: armor, count: 1, chance: gearChance },
  { pool: TYPE_POOLS[tier - 1], count: 1, chance: typeChance },
  { pool: RARE_POOLS[tier - 1], count: 1, chance: 0.002 },
  // 11차: 고급 강화 주문서(폐광·성터만)
  ...(tier >= 3 ? [{ id: 'weaponScrollB', count: 1, chance: 0.002 }, { id: 'armorScrollB', count: 1, chance: 0.002 }] : []),
];
const FIELD_DROPS = normalDrops(0.01, 0.015, 'ironSword', 'leatherArmor', 0.005, [['potion', 0.06]], 1, 0.0015, 0.005);
const FOREST_DROPS = normalDrops(0.02, 0.025, 'steelSword', 'chainArmor', 0.01, [['potion', 0.04], ['potionMid', 0.02]], 2, 0.002, 0.008);
const MINE_DROPS = normalDrops(0.03, 0.04, 'steelSword', 'chainArmor', 0.01, [['potionMid', 0.04], ['potionHigh', 0.01]], 3, 0.002, 0.01);
const RUIN_DROPS = normalDrops(0.03, 0.04, 'mithrilSword', 'mithrilArmor', 0.01, [['potionMid', 0.03], ['potionHigh', 0.03]], 4, 0.002, 0.006);
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
  // 9차: 스킬(성검·강타·막기·회복·반격)을 쓰면 보스가 쉬워져 큰울림 5600/74→6500/84, 기사왕 9000/96→10500/110
  //      (스킬을 써도 큰울림은 초급만이면 위험·중급이면 안전, 기사왕은 고급이면 물약 절반)
  ['boss', '폐광의 큰울림', 28, 6500, 84, 32, 9000, 1500, 'mine', true, [
    { id: 'weaponScroll', count: 2, guaranteed: true },
    { id: 'armorScroll', count: 2, guaranteed: true },
    { id: 'deepSword', count: 1, chance: 0.15 },
    { id: 'plateArmor', count: 1, chance: 0.15 },
    { pool: RARE_POOLS[2], count: 1, chance: 0.3 },
    { id: 'weaponScrollB', count: 1, chance: 0.2 },
    { id: 'armorScrollB', count: 1, chance: 0.2 },
  ]],
  // 4차: 망자의 성터(권장 31~40). 10차: 미스릴 세트·희귀·새 무기로 30→40이 빨라져 경험치 ×0.93(1102·1598·2344·3380 → 아래 값)
  ['wisp', '떠도는 넋', 30, 940, 48, 40, 1025, 120, 'ruin', false, RUIN_DROPS],
  ['skull', '불꽃해골', 33, 1120, 64, 52, 1486, 140, 'ruin', false, RUIN_DROPS],
  ['warden', '성터 파수꾼', 36, 1400, 68, 64, 2180, 165, 'ruin', false, RUIN_DROPS],
  ['eye', '저주의 눈', 39, 1640, 70, 76, 3143, 190, 'ruin', false, RUIN_DROPS],
  ['lich', '망령 기사왕', 42, 10500, 110, 50, 30000, 3000, 'ruin', true, [
    { id: 'weaponScroll', count: 3, guaranteed: true },
    { id: 'armorScroll', count: 3, guaranteed: true },
    { id: 'wraithSword', count: 1, chance: 0.1 },
    { id: 'wraithArmor', count: 1, chance: 0.1 },
    { pool: RARE_POOLS[3], count: 1, chance: 0.3 },
    { id: 'weaponScrollB', count: 1, chance: 0.2 },
    { id: 'armorScrollB', count: 1, chance: 0.2 },
  ]],
];
// 5차(대표님 의견 '돈이 너무 없다'): 일반 몬스터 돈 평균 × 2.5(반올림). 보스는 그대로
const NORMAL_GOLD_MULT = 2.5;
const monsters = rows.map(([id, name, level, hp, atk, def, exp, base, mapId, isBoss, drops]) => ({ id, name, level, hp, atk, def, exp, mapId, isBoss, drops, average: isBoss ? base : Math.round(base * NORMAL_GOLD_MULT) }))
  .map(({ id, name, level, hp, atk, def, exp, average, mapId, isBoss, drops }) => ({
  id, name, level, hp, atk, def, exp, mapId, isBoss,
  gold: { min: Math.ceil(average * 0.8), max: 2 * average - Math.ceil(average * 0.8) },
  drops: drops.map(drop => (drop.pool ? { ...drop, pool: [...drop.pool] } : { ...drop })),
}));

export default {
  version: 1,
  // 5차(스킬·돈 ×2.5): a=155, 성터 경험치 ×1.08 → 시뮬레이터 3회 1→30 10.12h, 30→40 9.85h, 합 19.97h(게임 시계).
  // 계수는 올리기만 한다(v3 기록의 exp가 새 필요치보다 작아야 검사 통과). v2 이하 기록은 save.js의 고정 공식으로 검사·비율 변환
  progression: { coefficient: 176, exponent: 2.15, early: { untilLevel: 22, startFactor: 0.04, power: 2.5 }, maxLevel: 40, deathLoss: 0.05, lowLevelGap: 5, lowLevelRate: 0.3 }, // 9차: 155→175. 10차: 새 무기 계열·세트·장비 판매로 빨라진 만큼 175→176 + 성터 경험치 ×0.93(6회: 0.92=20.56h·0.95=19.65h, 1→30 10.4h). v5 기록은 save.js V5_PROGRESSION(175)으로 검사 후 비율 변환
  knight: { baseHp: 80, hpPerLevel: 16, atkDivisor: 2, defDivisor: 4, attackMs: 750, regenBase: 2, regenDivisor: 4, regenMs: 3000 },
  combat: { playerHit: 0.8, monsterHit: 0.7, levelHit: 0.03, minHit: 0.3, maxHit: 0.95, minDamage: 1, weaponEnchantDamage: 2, monsterDefDivisor: 2, monsterAttackMs: 1200, bareMin: 1, bareMax: 1, critMult: 1.5, maxReduce: 0.6 },
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
  autohunt: { radiusTiles: 8, stuckSec: 3, potionHp: 0.5, returnHp: 0.2, pickupNearTiles: 1.5, guardHp: 0.7, stunHpRatio: 0.4, healHp: 0.45, blockHp: 0.8, ultHits: 3, ultStrongRatio: 0.5 },
  // 5차 스킬(마나 없음, 레벨이 되면 배움, 쿨타임은 게임 시계·저장 안 함). 9차: 10개 + 패시브 5개.
  // kind: attack(공격 차례를 씀·대상 필요) / defense(대상 없이·공격 차례 안 씀) / ult(필살기, 둘레·공격 차례 씀)
  // needsTarget·usesAttack은 자동 사냥·실행부가 이름 대신 이 값으로 판단한다(⑤ #10)
  skills: [
    { id: 'bash', name: '강타', short: '강타', kind: 'attack', level: 5, cooldownMs: 6000, needsTarget: true, usesAttack: true, mult: 2, desc: '한 번에 두 배 피해' },
    { id: 'block', name: '방패 막기', short: '막기', kind: 'defense', level: 8, cooldownMs: 25000, needsTarget: false, usesAttack: false, blockPct: 40, durationMs: 8000, desc: '8초 동안 공격을 40% 확률로 막음' },
    { id: 'dash', name: '돌진 베기', short: '돌진', kind: 'attack', level: 10, cooldownMs: 10000, needsTarget: true, usesAttack: true, mult: 1.6, rangeTiles: 4, minTiles: 2, desc: '4칸 안 적에게 뛰어들어 1.6배 피해' },
    { id: 'stun', name: '쇼크 스턴', short: '스턴', kind: 'attack', level: 15, cooldownMs: 12000, needsTarget: true, usesAttack: true, mult: 1.2, stunMs: 2000, desc: '1.2배 피해 + 2초 기절(보스 제외)' },
    { id: 'quake', name: '대지 가르기', short: '대지', kind: 'attack', level: 20, cooldownMs: 14000, needsTarget: true, usesAttack: true, mult: 1.5, radiusTiles: 3, arcDeg: 90, slowMs: 1500, slowFactor: 1.5, desc: '앞쪽 부채꼴 1.5배 피해 + 1.5초 느려짐' },
    { id: 'heal', name: '굳센 의지', short: '회복', kind: 'defense', level: 22, cooldownMs: 40000, needsTarget: false, usesAttack: false, healPct: 25, desc: '최대 체력의 25% 즉시 회복' },
    { id: 'whirl', name: '회오리 베기', short: '회오리', kind: 'attack', level: 25, cooldownMs: 15000, needsTarget: true, usesAttack: true, mult: 1, radiusTiles: 2.5, desc: '둘레 2.5칸 모든 적 베기' },
    { id: 'ult', name: '성검 강림', short: '성검', kind: 'ult', level: 30, cooldownMs: 120000, needsTarget: false, usesAttack: true, mult: 4, radiusTiles: 3.5, stunMs: 1000, castMs: 650, desc: '필살기: 둘레 3.5칸 4배 피해 + 1초 기절' },
    { id: 'guard', name: '리덕션 아머', short: '아머', kind: 'defense', level: 32, cooldownMs: 60000, needsTarget: false, usesAttack: false, reduce: 0.3, durationMs: 20000, desc: '20초 동안 받는 피해 30% 감소' },
    { id: 'counter', name: '반격의 기운', short: '반격', kind: 'defense', level: 36, cooldownMs: 45000, needsTarget: false, usesAttack: false, counterPct: 50, durationMs: 10000, desc: '10초 동안 받은 피해의 절반을 되돌려줌' },
  ],
  // 9차 패시브: 레벨이 되면 항상 켜짐(능력치 계산 playerStats에 반영)
  passives: [
    { id: 'p_crit', name: '검술 숙련', level: 3, critPct: 5, desc: '치명타 5% (피해 1.5배)' },
    { id: 'p_body', name: '단련된 몸', level: 12, hpPct: 8, desc: '최대 체력 +8%' },
    { id: 'p_skin', name: '철갑 피부', level: 18, def: 2, desc: '방어 +2' },
    { id: 'p_focus', name: '전투 집중', level: 27, atkPct: 5, desc: '공격 간격 -5%' },
    { id: 'p_will', name: '불굴', level: 38, lowHpReduce: 0.2, lowHpRatio: 0.25, desc: '체력 25% 미만일 때 받는 피해 -20%' },
  ],
  // 9차 단축 칸에 넣을 수 있는 물건
  hotbarItems: ['potion', 'potionMid', 'potionHigh', 'returnScroll', 'powerPotion', 'hastePotion', 'guardPotion', 'expScroll', 'huntScroll', 'morphScroll'],
  // 10차 버프(쓰는 아이템). 남은 시간은 저장(save.buffs, 게임 시계 ms). 또 쓰면 남은 시간에 더함, 상한 = 시간 × buffStackMax
  buffs: [
    { id: 'power', item: 'powerPotion', name: '힘', durationMs: 600000, dmgPct: 15, desc: '10분 동안 주는 피해 +15%' },
    { id: 'haste', item: 'hastePotion', name: '날쌤', durationMs: 600000, speedPct: -15, desc: '10분 동안 공격 간격 −15%' },
    { id: 'guard', item: 'guardPotion', name: '수호', durationMs: 600000, defBase: 3, defPerLevels: 5, desc: '10분 동안 방어 +(3 + 레벨/5)' },
    { id: 'exp', item: 'expScroll', name: '경험치', durationMs: 1800000, expPct: 50, desc: '30분 동안 처치 경험치 +50%' },
  ],
  buffStackMax: 3,
  // 11차 변신(변신 주문서 → 목록에서 고름). attackPct = 공격 간격 %(−는 빠름), movePct = 이동 속도 %, dmgPct·critPct는 더함.
  // 변신할 때 무작위 능력치 1개(morphRolls 네 가지 중 하나를 같은 확률로, 값도 범위 안 같은 확률). 겉모습은 색(tint)·빛·이름표
  morphDurationMs: 1200000,
  morphRolls: { str: [2, 6], dex: [2, 6], crit: [2, 5], hit: [3, 8] },
  morphs: [
    { id: 'skeleton', name: '해골 전사', level: 1, attackPct: -5, movePct: 5, tint: 0xe8e4d8, glow: 0xd8d4c0, desc: '공격 간격 −5% · 이동 +5%' },
    { id: 'werewolf', name: '늑대인간', level: 10, attackPct: -5, movePct: 25, tint: 0xc8a070, glow: 0xe0b060, desc: '이동 +25% · 공격 간격 −5%' },
    { id: 'orc', name: '오크 투사', level: 15, attackPct: -10, movePct: 5, dmgPct: 5, tint: 0x90c070, glow: 0x80d060, desc: '공격 간격 −10% · 이동 +5% · 피해 +5%' },
    { id: 'darkelf', name: '다크엘프', level: 22, attackPct: -12, movePct: 10, critPct: 3, tint: 0xb090e0, glow: 0xa070ff, desc: '공격 간격 −12% · 이동 +10% · 치명 +3%' },
    { id: 'deathknight', name: '데스나이트', level: 30, attackPct: -15, movePct: 10, dmgPct: 8, tint: 0xff8080, glow: 0xff4040, desc: '공격 간격 −15% · 이동 +10% · 피해 +8%' },
    { id: 'wraithking', name: '망령 기사왕', level: 38, attackPct: -18, movePct: 15, dmgPct: 10, tint: 0x9fd8ff, glow: 0x60b0ff, desc: '공격 간격 −18% · 이동 +15% · 피해 +10%' },
  ],
  // 11차 고급 강화: k단계 확률(1·2·3), 도착 단계가 안전을 넘으면 그 단계의 일반 확률로 성공/파괴
  blessed: { weights: [50, 30, 20], weaponScroll: 'weaponScrollB', armorScroll: 'armorScrollB' },
  // 10차 세트 효과: 7부위(큰 갑옷 제외) 중 같은 등급(희귀 포함) 장착 수 3·5·7에 단계별로 누적
  sets: [
    { tier: 1, name: '모험가', stages: [[3, { hp: 10 }], [5, { def: 1 }], [7, { dmg: 1, crit: 2 }]] },
    { tier: 2, name: '숲지기', stages: [[3, { hp: 20 }], [5, { def: 2 }], [7, { dmg: 2, crit: 3 }]] },
    { tier: 3, name: '광부', stages: [[3, { hp: 30 }], [5, { def: 3 }], [7, { dmg: 3, crit: 4 }]] },
    { tier: 4, name: '미스릴 기사', stages: [[3, { hp: 45 }], [5, { def: 4 }], [7, { dmg: 4, crit: 5 }]] },
  ],
  // walkSpeed: 기사 걸음(px/초, World SPEED) — 시뮬레이터 돌진이 줄이는 걷기 시간 계산용
  simulation: { walkSpeed: 70, walkSec: 3.5, serviceSec: 60, potionStock: 200, seed: 20261011 },
};

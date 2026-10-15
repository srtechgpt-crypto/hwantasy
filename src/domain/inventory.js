import { clone, fail, integer, itemDef, EQUIP_SLOTS, isGearDef, slotOf } from './common.js';
import { bossDef } from './boss.js';
import { addExp, bonusPoints, validBonus } from './progression.js';
import { TELEPORTS } from '../../data/maps.js';
import { validate, statsOf, settleHp } from './save.js';

function transaction(save, bal, run) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  let next;
  try { next = clone(save); }
  catch { return fail('저장 정보를 복사할 수 없습니다'); }
  const res = run(next);
  // 8차(⑤ #2): 성공한 거래는 최종 장비·능력치로 hp를 최대 체력 안으로 맞춘다
  if (res?.ok && res.save) settleHp(res.save, bal);
  return res;
}
// 8차: 장비 9칸 + 보너스 능력치로 계산한 능력치
export const equippedStats = (save, bal) => statsOf(save, bal);
export const countItem = (save, id) => save.bag.filter(item => item.id === id).reduce((sum, item) => sum + item.count, 0);

// Internal helpers mutate only the transaction's private copy.
function insert(next, key, id, count, bal, original = null) {
  const def = itemDef(id, bal);
  const capacity = key === 'bag' ? bal.inventory.bagSlots : bal.inventory.warehouseSlots;
  const stackMax = def.kind === 'consumable' ? bal.inventory.stackMax : 1;
  let left = count;
  if (stackMax > 1) for (const item of next[key]) {
    if (item.id !== id) continue;
    const moved = Math.min(left, stackMax - item.count);
    item.count += moved; left -= moved;
    if (!left) break;
  }
  while (left > 0 && next[key].length < capacity) {
    const amount = Math.min(left, stackMax);
    // Whole transferred stacks keep their uid; a split receives a new uid.
    if (!original && next.nextUid >= Number.MAX_SAFE_INTEGER) return left;
    const uid = original ? original.uid : next.nextUid++;
    const item = { uid, id, count: amount };
    if (stackMax === 1) item.enchant = original?.enchant ?? 0;
    next[key].push(item); left -= amount;
    original = null;
  }
  return left;
}
function take(next, uid, count) {
  // Numeric uid removes one stack; string id consumes across stacks in bag order.
  let left = count;
  for (const item of [...next.bag]) {
    if (typeof uid === 'string' ? item.id !== uid : item.uid !== uid) continue;
    const amount = Math.min(left, item.count);
    item.count -= amount; left -= amount;
    if (item.count === 0) {
      next.bag.splice(next.bag.indexOf(item), 1);
      for (const slot of EQUIP_SLOTS) if (next.equip[slot] === item.uid) next.equip[slot] = null;
    }
    if (!left) break;
  }
  return left;
}
export function addItem(save, id, count, bal) {
  if (!itemDef(id, bal) || !integer(count, 1)) return fail('아이템 또는 수량이 올바르지 않습니다');
  return transaction(save, bal, next => {
    const overflow = insert(next, 'bag', id, count, bal);
    return { ok: true, save: next, overflow };
  });
}
// Accept a stack uid, or an item id to consume across multiple bag stacks.
export function removeItem(save, uid, count, bal) {
  if (!integer(count, 1) || !(integer(uid, 1) || typeof uid === 'string' && itemDef(uid, bal))) return fail('아이템 또는 수량이 올바르지 않습니다');
  return transaction(save, bal, next => take(next, uid, count) ? fail('아이템 수량이 부족합니다') : { ok: true, save: next });
}
export function equip(save, uid, bal) {
  return transaction(save, bal, next => {
    const item = next.bag.find(item => item.uid === uid);
    const def = itemDef(item?.id, bal);
    if (!item || !isGearDef(def)) return fail('장착할 장비가 가방에 없습니다');
    next.equip[slotOf(def)] = item.uid;
    return { ok: true, save: next };
  });
}
// slot은 장착 칸(EQUIP_SLOTS). Equipped items already occupy their bag slot.
export function unequip(save, slot, bal) {
  if (!EQUIP_SLOTS.includes(slot)) return fail('장비 종류가 올바르지 않습니다');
  return transaction(save, bal, next => { next.equip[slot] = null; return { ok: true, save: next }; });
}
export function buy(save, id, count, bal) {
  const def = itemDef(id, bal);
  if (!def?.shop || !integer(count, 1) || !integer(def.price * count)) return fail('구매할 아이템 또는 수량이 올바르지 않습니다');
  return transaction(save, bal, next => {
    const cost = def.price * count;
    if (next.player.gold < cost) return fail('돈이 부족합니다');
    if (insert(next, 'bag', id, count, bal)) return fail('가방이 가득 찼습니다');
    next.player.gold -= cost;
    return { ok: true, save: next };
  });
}
// 개당 판매가를 먼저 버린 뒤 수량을 곱한다(화면 표시와 실제 입금이 같은 함수)
export function sellPrice(id, bal) {
  const def = itemDef(id, bal);
  return def ? Math.floor(def.price * def.sellRate) : 0;
}
export function sell(save, uid, count, bal) {
  if (!integer(uid, 1) || !integer(count, 1)) return fail('아이템 또는 수량이 올바르지 않습니다');
  return transaction(save, bal, next => {
    const item = next.bag.find(item => item.uid === uid);
    if (!item || item.count < count) return fail('아이템 수량이 부족합니다');
    if (Object.values(next.equip).includes(uid)) return fail('장착 중인 장비는 팔 수 없습니다');
    const gold = sellPrice(item.id, bal) * count;
    if (!integer(next.player.gold + gold)) return fail('돈 한도를 초과했습니다');
    take(next, uid, count); next.player.gold += gold;
    return { ok: true, save: next };
  });
}
// 안 쓰는 장비(3차 한꺼번에 팔기): 장착 안 함 + 강화 0 + 상점 판매품 + 지금 낀 같은 종류에 비해 모든 능력치가 같거나 낮음.
// 같은 종류를 끼고 있지 않으면 그 종류는 대상 없음. 강화된 것·보스 장비(shop:false)·더 좋은 것은 절대 대상이 아니다.
// 비교는 장비의 기본 수치 기준이다(강화로 오른 값은 보지 않음 — 틀려도 '안 파는' 쪽으로만 틀린다. 예: 강철검+6을 끼고 있으면 미스릴검+0은 남긴다).
// 8차: 같은 칸(부위)의 낀 장비와 비교하고, 그 부위의 모든 수치(무기 최소·최대 / 방어·체력·명중·피해·재생)가 같거나 낮을 때만
const GEAR_FIELDS = { weapon: ['min', 'max'], armor: ['def', 'hp', 'hit', 'dmg', 'regen'] };
export function isJunkGear(save, item, bal) {
  const def = itemDef(item?.id, bal);
  if (!isGearDef(def) || !def.shop || item.enchant !== 0 || item.count !== 1) return false;
  if (Object.values(save.equip).includes(item.uid)) return false;
  const worn = save.bag.find(other => other.uid === save.equip[slotOf(def)]);
  const wd = worn && itemDef(worn.id, bal);
  if (!wd || slotOf(wd) !== slotOf(def)) return false;
  return GEAR_FIELDS[def.kind].every(f => (def[f] ?? 0) <= (wd[f] ?? 0));
}
export function junkGear(save, bal) {
  return save.bag.filter(item => isJunkGear(save, item, bal)).map(item => item.uid);
}
// uids를 한 번에 판다. 최신 save에서 하나라도 안 쓰는 장비 조건을 벗어나면 전체 실패(원본 그대로)
export function sellJunk(save, uids, bal) {
  if (!Array.isArray(uids) || !uids.length || uids.some(uid => !integer(uid, 1)) || new Set(uids).size !== uids.length) return fail('팔 장비 목록이 올바르지 않습니다');
  return transaction(save, bal, next => {
    let gold = 0;
    for (const uid of uids) {
      const item = next.bag.find(it => it.uid === uid);
      if (!item || !isJunkGear(next, item, bal)) return fail('팔 수 없는 장비가 섞여 있습니다');
      gold += sellPrice(item.id, bal);
    }
    if (!integer(next.player.gold + gold)) return fail('돈 한도를 초과했습니다');
    next.bag = next.bag.filter(it => !uids.includes(it.uid));
    next.player.gold += gold;
    return { ok: true, save: next, gold, count: uids.length };
  });
}
// 지금 살 수 있는 최대 수량: 돈 한도와 가방 자리(같은 묶음의 남은 자리 + 빈 칸) 중 작은 값
export function maxBuy(save, id, bal) {
  const def = itemDef(id, bal);
  if (!def?.shop || !integer(def.price, 1)) return 0;
  const byGold = Math.floor(save.player.gold / def.price);
  const empty = Math.max(0, bal.inventory.bagSlots - save.bag.length);
  const stackMax = def.kind === 'consumable' ? bal.inventory.stackMax : 1;
  const partial = stackMax > 1 ? save.bag.filter(item => item.id === id).reduce((sum, item) => sum + stackMax - item.count, 0) : 0;
  return Math.max(0, Math.min(byGold, partial + empty * stackMax));
}
function transfer(save, uid, count, bal, from, to) {
  if (!integer(uid, 1) || !integer(count, 1)) return fail('아이템 또는 수량이 올바르지 않습니다');
  return transaction(save, bal, next => {
    const item = next[from].find(item => item.uid === uid);
    if (!item || item.count < count) return fail('아이템 수량이 부족합니다');
    if (Object.values(next.equip).includes(uid)) return fail('장착 중인 장비는 먼저 벗어야 합니다');
    let original;
    if (count === item.count) {
      next[from].splice(next[from].indexOf(item), 1);
      original = item;
    } else item.count -= count;
    if (insert(next, to, item.id, count, bal, original)) return fail(to === 'bag' ? '가방이 가득 찼습니다' : '창고가 가득 찼습니다');
    return { ok: true, save: next };
  });
}
export const toWarehouse = (save, uid, count, bal) => transfer(save, uid, count, bal, 'bag', 'warehouse');
export const toBag = (save, uid, count, bal) => transfer(save, uid, count, bal, 'warehouse', 'bag');
// 8차 물약 3종: 회복 물약 목록(회복량 오름차순)과 가진 개수 합
export const potionDefs = bal => bal.consumables.filter(def => def.heal > 0).sort((a, b) => a.heal - b.heal);
export const potionCount = (save, bal) => potionDefs(bal).reduce((sum, def) => sum + countItem(save, def.id), 0);
// 고르기 규칙(게임·자동 사냥·시뮬레이터 공용): 가진 것 중 '모자란 체력 이하로 회복하는 것' 가운데 가장 큰 것, 없으면 가장 작은 것. 없으면 null
export function pickPotion(save, missing, bal) {
  const owned = potionDefs(bal).filter(def => countItem(save, def.id) > 0);
  if (!owned.length) return null;
  const fit = owned.filter(def => def.heal <= missing);
  return (fit.length ? fit[fit.length - 1] : owned[0]).id;
}
// id를 주면 그 물약, 없으면 pickPotion으로 고른다
export function usePotion(save, bal, id = null) {
  return transaction(save, bal, next => {
    if (next.player.hp <= 0) return fail('사망 중에는 물약을 사용할 수 없습니다');
    const stats = equippedStats(next, bal);
    if (next.player.hp >= stats.maxHp) return fail('체력이 이미 가득 찼습니다');
    const pick = id ?? pickPotion(next, stats.maxHp - next.player.hp, bal);
    const def = itemDef(pick, bal);
    if (!pick || !(def?.heal > 0)) return fail('물약이 없습니다');
    if (take(next, pick, 1)) return fail('물약이 없습니다');
    const healed = Math.min(stats.maxHp - next.player.hp, def.heal);
    next.player.hp += healed;
    return { ok: true, save: next, healed, id: pick };
  });
}
// 8차 보너스 능력치: add = {str,dex,con} 0 이상 정수, 합 1 이상, 남은 점수 안. 늘리기만
export function unspentPoints(save, bal) {
  const b = save.player.bonus;
  return bonusPoints(save.player.level, bal) - b.str - b.dex - b.con;
}
export function allocateBonus(save, add, bal) {
  if (!validBonus(add) || add.str + add.dex + add.con < 1) return fail('나눌 점수가 올바르지 않습니다');
  return transaction(save, bal, next => {
    if (add.str + add.dex + add.con > unspentPoints(next, bal)) return fail('남은 점수가 부족합니다');
    for (const k of ['str', 'dex', 'con']) next.player.bonus[k] += add[k];
    return { ok: true, save: next };
  });
}
// 다시 나누기: 마을에서만, resetGoldPerLevel × 레벨, 나눈 점수가 있을 때만
export const resetCost = (save, bal) => bal.stats.resetGoldPerLevel * save.player.level;
export function resetBonus(save, bal) {
  return transaction(save, bal, next => {
    const b = next.player.bonus;
    if (b.str + b.dex + b.con === 0) return fail('나눈 점수가 없습니다');
    if (next.player.map !== bal.town.id) return fail('마을에서만 다시 나눌 수 있습니다');
    const cost = resetCost(next, bal);
    if (next.player.gold < cost) return fail('돈이 부족합니다');
    next.player.gold -= cost;
    next.player.bonus = { str: 0, dex: 0, con: 0 };
    return { ok: true, save: next };
  });
}
// 8차 레벨 보상(⑤ #3): 최신 save에서 대상·도달·미수령을 확인하고, 같은 후보에서 전부 지급 + 받음 표시. 하나라도 안 되면 전체 취소
export const rewardDef = (level, bal) => (bal.levelRewards ?? []).find(r => r.level === level) ?? null;
export function rewardState(save, level, bal) {
  if (!rewardDef(level, bal)) return 'none';
  if (save.player.rewards.includes(level)) return 'claimed';
  return save.player.level >= level ? 'ready' : 'locked';
}
export const readyRewards = (save, bal) => (bal.levelRewards ?? []).filter(r => rewardState(save, r.level, bal) === 'ready').map(r => r.level);
export function claimReward(save, level, bal) {
  const def = rewardDef(level, bal);
  if (!def) return fail('없는 보상입니다');
  return transaction(save, bal, next => {
    if (next.player.rewards.includes(level)) return fail('이미 받은 보상입니다');
    if (next.player.level < level) return fail(`${level}레벨이 되면 받을 수 있습니다`);
    if (!integer(next.player.gold + def.gold)) return fail('돈 한도를 초과했습니다');
    for (const { id, count } of def.items) {
      if (insert(next, 'bag', id, count, bal)) return fail(`가방 칸이 부족합니다. ${needSlots(save, def, bal)}칸을 비워 주세요`);
    }
    next.player.gold += def.gold;
    next.player.rewards = [...next.player.rewards, level].sort((a, b) => a - b);
    return { ok: true, save: next, items: def.items, gold: def.gold };
  });
}
// 보상에 필요한 새 칸 수(지금 가방 기준, 쌓이는 물건은 기존 칸에 먼저)
export function needSlots(save, def, bal) {
  let free = bal.inventory.bagSlots - save.bag.length, need = 0;
  for (const { id, count } of def.items) {
    const d = itemDef(id, bal);
    if (d.kind !== 'consumable') { need++; continue; }
    const room = save.bag.filter(it => it.id === id).reduce((sum, it) => sum + bal.inventory.stackMax - it.count, 0);
    need += Math.ceil(Math.max(0, count - room) / bal.inventory.stackMax);
  }
  return Math.max(1, need - free);
}
export function useReturnScroll(save, bal) {
  return transaction(save, bal, next => {
    if (next.player.hp <= 0) return fail('사망 중에는 귀환할 수 없습니다');
    if (take(next, 'returnScroll', 1)) return fail('귀환 주문서가 없습니다');
    Object.assign(next.player, { map: bal.town.id, x: bal.town.x, y: bal.town.y });
    return { ok: true, save: next };
  });
}
// 마을 순간이동: 마을·생존·돈을 확인하고 돈 차감과 위치 변경을 한 거래로
export function teleport(save, destId, bal) {
  const dest = bal.teleport?.find(item => item.id === destId);
  const point = TELEPORTS.find(item => item.id === destId);
  if (!dest || !point || !integer(dest.price)) return fail('갈 수 없는 곳입니다');
  return transaction(save, bal, next => {
    if (next.player.map !== bal.town.id) return fail('마을에서만 순간이동할 수 있습니다');
    if (next.player.hp <= 0) return fail('쓰러진 상태에서는 이동할 수 없습니다');
    if (next.player.gold < dest.price) return fail('돈이 부족합니다');
    next.player.gold -= dest.price;
    Object.assign(next.player, { map: destId, x: point.x, y: point.y });
    return { ok: true, save: next };
  });
}
// 보스 처치: 경험치·돈·드랍 전부·처치 시각을 한 후보에 담는다. 가방에 넘치면 창고로, 창고도 넘치면 ground로 돌려준다
export function bossKill(save, bossId, reward, now, bal) {
  if (!bossDef(bossId, bal) || !Object.hasOwn(save?.bosses ?? {}, bossId)) return fail('알 수 없는 보스입니다');
  if (!integer(now, 1) || !reward || !integer(reward.exp) || !integer(reward.gold) || !Array.isArray(reward.drops)) return fail('보상 정보가 올바르지 않습니다');
  return transaction(save, bal, next => {
    const before = next.player.level;
    const prog = addExp({ level: next.player.level, exp: next.player.exp }, reward.exp, bal);
    next.player.level = prog.level; next.player.exp = prog.exp;
    if (!integer(next.player.gold + reward.gold)) return fail('돈 한도를 초과했습니다');
    next.player.gold += reward.gold;
    const toBag = [], toWarehouse = [], ground = [];
    for (const drop of reward.drops) {
      if (!itemDef(drop.id, bal) || !integer(drop.count, 1)) return fail('보상 아이템이 올바르지 않습니다');
      const leftBag = insert(next, 'bag', drop.id, drop.count, bal);
      if (drop.count - leftBag) toBag.push({ id: drop.id, count: drop.count - leftBag });
      if (!leftBag) continue;
      const leftWh = insert(next, 'warehouse', drop.id, leftBag, bal);
      if (leftBag - leftWh) toWarehouse.push({ id: drop.id, count: leftBag - leftWh });
      if (leftWh) ground.push({ id: drop.id, count: leftWh });
    }
    next.bosses[bossId] = now;
    return { ok: true, save: next, levelsGained: prog.level - before, toBag, toWarehouse, ground };
  });
}

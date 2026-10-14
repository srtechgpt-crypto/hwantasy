import { clone, fail, integer, itemDef } from './common.js';
import { addExp, playerStats } from './progression.js';
import { TELEPORTS } from '../../data/maps.js';
import { validate } from './save.js';

function transaction(save, bal, run) {
  if (!validate(save, bal).ok) return fail('저장 정보가 올바르지 않습니다');
  let next;
  try { next = clone(save); }
  catch { return fail('저장 정보를 복사할 수 없습니다'); }
  return run(next);
}
export function equippedStats(save, bal) {
  return playerStats(save.player.level, {
    weapon: save.bag.find(item => item.uid === save.equip.weapon) ?? null,
    armor: save.bag.find(item => item.uid === save.equip.armor) ?? null,
  }, bal);
}
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
      for (const kind of ['weapon', 'armor']) if (next.equip[kind] === item.uid) next.equip[kind] = null;
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
    if (!item || !['weapon', 'armor'].includes(def?.kind)) return fail('장착할 장비가 가방에 없습니다');
    next.equip[def.kind] = item.uid;
    return { ok: true, save: next };
  });
}
// kind is 'weapon' or 'armor'. Equipped items already occupy their bag slot.
export function unequip(save, kind, bal) {
  if (!['weapon', 'armor'].includes(kind)) return fail('장비 종류가 올바르지 않습니다');
  return transaction(save, bal, next => { next.equip[kind] = null; return { ok: true, save: next }; });
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
export function isJunkGear(save, item, bal) {
  const def = itemDef(item?.id, bal);
  if (!def || !['weapon', 'armor'].includes(def.kind) || !def.shop || item.enchant !== 0 || item.count !== 1) return false;
  if (Object.values(save.equip).includes(item.uid)) return false;
  const worn = save.bag.find(other => other.uid === save.equip[def.kind]);
  const wd = worn && itemDef(worn.id, bal);
  if (!wd) return false;
  return def.kind === 'weapon' ? def.min <= wd.min && def.max <= wd.max : def.def <= wd.def;
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
export function usePotion(save, bal) {
  return transaction(save, bal, next => {
    if (next.player.hp <= 0) return fail('사망 중에는 물약을 사용할 수 없습니다');
    const stats = equippedStats(next, bal);
    if (next.player.hp >= stats.maxHp) return fail('체력이 이미 가득 찼습니다');
    if (take(next, 'potion', 1)) return fail('물약이 없습니다');
    const healed = Math.min(stats.maxHp - next.player.hp, itemDef('potion', bal).heal);
    next.player.hp += healed;
    return { ok: true, save: next, healed };
  });
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
export function bossKill(save, reward, now, bal) {
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
    next.boss.defeatedAt = now;
    return { ok: true, save: next, levelsGained: prog.level - before, toBag, toWarehouse, ground };
  });
}

import { clone, fail, integer, itemDef, EQUIP_SLOTS, isGearDef, slotOf, isLocked } from './common.js';
import { bossDef } from './boss.js';
import { addExp, bonusPoints, validBonus, needExp } from './progression.js';
import { TELEPORTS } from '../../data/maps.js';
import { validate, statsOf, settleHp, loadoutNameOk } from './save.js';
import { applyBuffItem } from './buffs.js';
import { morphInto } from './morph.js';
import { codexSet, codexPlan, codexReserved, titleDef, titleEarned, killsMax, doneSets } from './collect.js';
import { skillDef, skillLevel, skillUpCost, cardIdOf } from './skills.js';
import { random } from './common.js';
import { elixirOf, dollDef, recoverCost } from './growth.js';

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
    if (stackMax === 1) {
      item.enchant = original?.enchant ?? 0;
      if (original?.lock === true) item.lock = true; // 13차: 맡기기·찾기에도 잠금 유지
    }
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
  // 13차(⑤ #3): 잠긴 장비는 지우지 못한다. 장비는 uid로만(이름으로 지우면 어느 것이 빠질지 모름)
  if (typeof uid === 'string' && isGearDef(itemDef(uid, bal))) return fail('장비는 uid로만 지울 수 있습니다');
  if (isLocked(save?.bag?.find?.(it => it.uid === uid))) return fail('잠긴 장비는 지울 수 없습니다');
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
// 11차 장바구니: 여러 줄을 한 거래로 산다(같은 id는 합침). 하나라도 안 되면 아무것도 사지 않는다(전부 아니면 아무것도)
export function buyMany(save, lines, bal) {
  if (!Array.isArray(lines) || !lines.length) return fail('장바구니가 비어 있습니다');
  const want = new Map();
  for (const line of lines) {
    const def = itemDef(line?.id, bal);
    if (!def?.shop || !integer(line.count, 1)) return fail('장바구니에 살 수 없는 줄이 있습니다');
    want.set(line.id, (want.get(line.id) ?? 0) + line.count);
  }
  let cost = 0;
  for (const [id, count] of want) cost += itemDef(id, bal).price * count;
  if (!integer(cost)) return fail('금액이 너무 큽니다');
  return transaction(save, bal, next => {
    if (next.player.gold < cost) return fail(`돈이 부족합니다(필요 ${cost.toLocaleString('ko-KR')}원)`);
    for (const [id, count] of want) if (insert(next, 'bag', id, count, bal)) return fail(`가방이 가득 차서 ${itemDef(id, bal).name}을(를) 다 넣을 수 없습니다`);
    next.player.gold -= cost;
    return { ok: true, save: next, cost, kinds: want.size };
  });
}
// 11차 여러 개 팔기: [{uid, count}] 한 거래. uid 중복·장착 중·수량 초과면 아무것도 팔지 않는다
export function sellMany(save, lines, bal) {
  if (!Array.isArray(lines) || !lines.length) return fail('고른 물건이 없습니다');
  if (lines.some(l => !integer(l?.uid, 1) || !integer(l?.count, 1)) || new Set(lines.map(l => l.uid)).size !== lines.length) return fail('고른 목록이 올바르지 않습니다');
  return transaction(save, bal, next => {
    let gold = 0;
    for (const { uid, count } of lines) {
      const item = next.bag.find(it => it.uid === uid);
      if (!item || item.count < count) return fail('고른 물건 수량이 바뀌었습니다. 다시 골라 주세요');
      if (Object.values(next.equip).includes(uid)) return fail('장착 중인 장비는 팔 수 없습니다');
      if (isLocked(item)) return fail(LOCKED_SELL);
      gold += sellPrice(item.id, bal) * count;
    }
    if (!integer(next.player.gold + gold)) return fail('돈 한도를 초과했습니다');
    for (const { uid, count } of lines) take(next, uid, count);
    next.player.gold += gold;
    return { ok: true, save: next, gold, count: lines.length };
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
    if (isLocked(item)) return fail(LOCKED_SELL);
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
const GEAR_FIELDS = { weapon: ['min', 'max', 'dmgPct', 'crit', 'hit'], armor: ['def', 'hp', 'hit', 'dmg', 'regen'] };
export function isJunkGear(save, item, bal) {
  const def = itemDef(item?.id, bal);
  if (!isGearDef(def) || !def.shop || item.enchant !== 0 || item.count !== 1 || isLocked(item)) return false;
  if (Object.values(save.equip).includes(item.uid)) return false;
  // 12차(⑤ #18): 비어 있는 도감 칸을 채울 장비(칸마다 하나)는 팔지 않는다
  if (codexReserved(save, bal).has(item.uid)) return false;
  const worn = save.bag.find(other => other.uid === save.equip[slotOf(def)]);
  const wd = worn && itemDef(worn.id, bal);
  if (!wd || slotOf(wd) !== slotOf(def)) return false;
  // 10차: 무기는 같은 계열끼리만 비교, 공격 간격(speedPct)은 같거나 느릴 때만(+가 느림)
  if (def.kind === 'weapon' && ((def.type ?? 'sword') !== (wd.type ?? 'sword') || (def.speedPct ?? 0) < (wd.speedPct ?? 0))) return false;
  // 10차(⑤ #15): 부위 장비는 같은 등급 부위를 다른 칸에 하나라도 끼고 있으면 세트 후보라 팔지 않는다
  const partTier = d => (d?.kind === 'armor' && d.slot && d.slot !== 'armor' && !d.acc ? d.tier : null); // 18차: 장신구는 세트 후보 아님
  if (partTier(def) && EQUIP_SLOTS.some(sl => sl !== slotOf(def) && partTier(itemDef(save.bag.find(o => o.uid === save.equip[sl])?.id, bal)) === def.tier)) return false;
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
// 10차 버프 아이템(힘·날쌘·수호 물약, 경험치 두루마리): 1개 쓰고 남은 시간에 더함(상한)
export function useBuff(save, itemId, bal) {
  return transaction(save, bal, next => applyBuffItem(next, itemId, bal, take));
}
// 11차 변신: 주문서 1장 + 무작위 능력치를 한 거래로(난수 오류·레벨 부족이면 아무것도 안 바뀜)
export function useMorph(save, id, rng, bal) {
  return transaction(save, bal, next => morphInto(next, id, rng, bal, take));
}
// 10차 사냥터 이동 주문서: 어디서든(보스 방·시전 중 여부는 화면이 먼저 막음) 고른 사냥터 입구로, 주문서 1장(돈 없음)
export function useHuntScroll(save, destId, bal) {
  const dest = bal.teleport?.find(item => item.id === destId);
  const point = TELEPORTS.find(item => item.id === destId);
  if (!dest || !point) return fail('갈 수 없는 곳입니다');
  return transaction(save, bal, next => {
    if (next.player.hp <= 0) return fail('쓰러진 상태에서는 이동할 수 없습니다');
    if (take(next, 'huntScroll', 1)) return fail('사냥터 이동 주문서가 없습니다');
    Object.assign(next.player, { map: destId, x: point.x, y: point.y });
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
    // 12차(⑤ #9): 보스 처치 수도 같은 거래 안에서(저장 실패면 함께 취소)
    if (next.kills) next.kills[bossId] = Math.min(killsMax(bal), (next.kills[bossId] ?? 0) + 1);
    return { ok: true, save: next, levelsGained: prog.level - before, toBag, toWarehouse, ground };
  });
}
// 12차 도감 등록(⑤ #15·#17): uids = 화면이 확인 상자에 보여 준 codexPlan의 uid 목록. 최신 save의 계획과 하나라도 다르면
// 아무것도 쓰지 않고 실패(다시 보여 줌). 성공하면 그 장비가 가방에서 사라지고 save.codex[setId]에 아이템 id가 세트 순서대로 들어간다
export function registerCodex(save, setId, uids, bal) {
  const set = codexSet(setId, bal);
  if (!set) return fail('알 수 없는 도감입니다');
  if (!Array.isArray(uids) || !uids.length || uids.some(uid => !integer(uid, 1))) return fail('넣을 장비가 올바르지 않습니다');
  return transaction(save, bal, next => {
    const plan = codexPlan(next, setId, bal);
    if (!plan.length) return fail('넣을 수 있는 장비가 없습니다(+0 · 끼지 않은 것만)');
    if (plan.length !== uids.length || plan.some((p, i) => p.uid !== uids[i])) return fail('가방이 바뀌었습니다. 다시 확인해 주세요');
    const before = doneSets(next.codex, bal).length;
    for (const p of plan) if (take(next, p.uid, 1)) return fail('장비를 찾지 못했습니다');
    const have = new Set([...(next.codex[setId] ?? []), ...plan.map(p => p.id)]);
    next.codex[setId] = set.items.filter(id => have.has(id));
    const complete = next.codex[setId].length === set.items.length;
    return { ok: true, save: next, added: plan.map(p => p.id), complete, doneCount: doneSets(next.codex, bal).length, newlyDone: doneSets(next.codex, bal).length > before };
  });
}
// 12차 칭호 쓰기/빼기(id = null이면 뺌). 체력은 넘친 만큼만 자른다(transaction의 settleHp, 회복 없음 — ⑤ #11)
export function setTitle(save, id, bal) {
  if (id !== null && !titleDef(id, bal)) return fail('알 수 없는 칭호입니다');
  return transaction(save, bal, next => {
    if (id !== null && !titleEarned(titleDef(id, bal), next, bal)) return fail('아직 얻지 못한 칭호입니다');
    if (next.title === id) return fail(id === null ? '쓰는 칭호가 없습니다' : '이미 쓰는 칭호입니다');
    next.title = id;
    return { ok: true, save: next };
  });
}

// ---------- 13차 「편하게」 ----------
const LOCKED_SELL = '잠긴 장비는 팔 수 없습니다. 가방에서 잠금을 풀어 주세요';
// 장비 잠금: 가방·창고 어디 있든 켜고 끈다(끄면 필드를 지움). 팔기·도감·강화는 각 함수가 막는다
export function setLock(save, uid, on, bal) {
  if (!integer(uid, 1) || typeof on !== 'boolean') return fail('아이템이 올바르지 않습니다');
  return transaction(save, bal, next => {
    const item = [...next.bag, ...next.warehouse].find(it => it.uid === uid);
    if (!item || !isGearDef(itemDef(item.id, bal))) return fail('잠글 수 있는 것은 장비뿐입니다');
    if (isLocked(item) === on) return fail(on ? '이미 잠겨 있습니다' : '잠겨 있지 않습니다');
    if (on) item.lock = true; else delete item.lock;
    return { ok: true, save: next };
  });
}
// 자동 보충 목표: 0이면 키를 지우고, 비면 필드째 지운다(검사 규칙과 같은 모양)
export function setRestock(save, id, target, bal) {
  if (!(bal.restockItems ?? []).includes(id) || !(bal.restockSteps ?? []).includes(target)) return fail('고를 수 없는 목표입니다');
  return transaction(save, bal, next => {
    const map = { ...(next.restock ?? {}) };
    if (target) map[id] = target; else delete map[id];
    if (Object.keys(map).length) next.restock = map; else delete next.restock;
    return { ok: true, save: next };
  });
}
// 지금 사면 무엇을 얼마나: 목록 순서대로, 앞 줄을 산 뒤의 돈·가방 자리로 계산(창고는 세지 않음). 원본은 바꾸지 않는다
export function restockPlan(save, bal) {
  const lines = [];
  let gold = save.player.gold, cost = 0, short = false;
  const bag = save.bag.map(it => ({ id: it.id, count: it.count }));
  let empty = Math.max(0, bal.inventory.bagSlots - bag.length);
  for (const id of bal.restockItems ?? []) {
    const target = save.restock?.[id] ?? 0;
    if (!target) continue;
    const def = itemDef(id, bal);
    if (!def?.shop || !integer(def.price, 1)) continue;
    const have = bag.filter(it => it.id === id).reduce((sum, it) => sum + it.count, 0);
    const need = Math.max(0, target - have);
    if (!need) continue;
    const stackMax = bal.inventory.stackMax;
    const room = bag.filter(it => it.id === id).reduce((sum, it) => sum + stackMax - it.count, 0) + empty * stackMax;
    const count = Math.min(need, Math.floor(gold / def.price), room);
    const why = count < need ? (Math.floor(gold / def.price) < Math.min(need, room) ? 'gold' : 'bag') : null;
    if (why) short = true;
    lines.push({ id, need, count, short: why });
    if (!count) continue;
    gold -= def.price * count; cost += def.price * count;
    // 묶음을 채우고 남으면 새 칸(insert와 같은 규칙)
    let left = count;
    for (const it of bag) { if (it.id !== id) continue; const m = Math.min(left, stackMax - it.count); it.count += m; left -= m; }
    while (left > 0) { const m = Math.min(left, stackMax); bag.push({ id, count: m }); empty -= 1; left -= m; }
  }
  const bought = lines.filter(l => l.count > 0);
  const reason = bought.length ? null : !lines.length ? 'nothing' : lines.some(l => l.short === 'gold') ? 'gold' : 'bag';
  return { lines, bought, cost, short, reason };
}
// 자동 보충 한 거래: 살 게 하나도 없으면 실패(reason 'nothing'|'gold'|'bag'). 일부만 샀으면 short
export function restock(save, bal) {
  return transaction(save, bal, next => {
    const plan = restockPlan(next, bal);
    if (!plan.bought.length) return { ...fail(plan.reason === 'nothing' ? '채울 것이 없습니다' : plan.reason === 'gold' ? '돈이 모자라 살 수 없습니다' : '가방에 자리가 없습니다'), why: plan.reason };
    for (const l of plan.bought) if (insert(next, 'bag', l.id, l.count, bal)) return fail('가방에 자리가 없습니다');
    if (next.player.gold < plan.cost) return fail('돈이 부족합니다');
    next.player.gold -= plan.cost;
    return { ok: true, save: next, lines: plan.bought, cost: plan.cost, short: plan.short };
  });
}
// 가방·창고 정리: 무기 → 방어구(칸 순서, 좋은 등급·높은 강화 먼저) → 회복 물약 → 버프 → 주문서·기타(정의 순서) → uid. 순서만 바뀐다
const kindRank = def => (def.kind === 'weapon' ? 0 : def.kind === 'armor' ? 1 : def.heal ? 2 : def.buff ? 3 : 4);
export function sortItems(save, where, bal) {
  if (where !== 'bag' && where !== 'warehouse') return fail('정리할 곳이 올바르지 않습니다');
  const order = new Map(bal.consumables.map((d, i) => [d.id, i]));
  const key = it => {
    const d = itemDef(it.id, bal);
    const gear = isGearDef(d);
    return [kindRank(d), gear ? EQUIP_SLOTS.indexOf(slotOf(d)) : 0, gear ? -(d.tier ?? 0) : 0, gear ? -d.price : order.get(d.id) ?? 0, gear ? -(it.enchant ?? 0) : 0, it.uid];
  };
  const cmp = (a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0; };
  return transaction(save, bal, next => {
    const sorted = [...next[where]].sort(cmp);
    if (sorted.every((it, i) => it === next[where][i])) return fail('이미 정리되어 있습니다');
    next[where] = sorted;
    return { ok: true, save: next };
  });
}

// ---------- 14차 스킬 성장 ----------
// 스킬 레벨 올리기: 배운 스킬, 최대 아님, 그 스킬 카드 cards장 + 돈 gold. 한 거래(카드·돈·레벨 함께)
export function levelUpSkill(save, id, bal) {
  let def;
  try { def = skillDef(id, bal); } catch { return fail('알 수 없는 스킬입니다'); }
  return transaction(save, bal, next => {
    if (next.player.level < def.level) return fail(`${def.name}은(는) Lv ${def.level}에 배웁니다`);
    const lv = skillLevel(next, id), cost = skillUpCost(lv, bal);
    if (!cost) return fail('이미 최고 레벨입니다');
    const card = cardIdOf(id);
    if (countItem(next, card) < cost.cards) return fail(`${itemDef(card, bal).name}가 ${cost.cards}장 필요합니다`);
    if (next.player.gold < cost.gold) return fail(`돈이 ${cost.gold.toLocaleString('ko-KR')}원 필요합니다`);
    if (take(next, card, cost.cards)) return fail('카드를 찾지 못했습니다');
    next.player.gold -= cost.gold;
    next.skillLv = { ...(next.skillLv ?? {}), [id]: lv + 1 };
    return { ok: true, save: next, from: lv, to: lv + 1, cost };
  });
}
// 카드 합성: 같은 카드 cardFuse장 → 다음 등급 카드 1장(그 등급 안에서 균등, 난수 1개). 영웅은 합성 불가
export function fuseCards(save, skillId, rng, bal) {
  const grade = bal.skillGrades?.[skillId], order = bal.gradeOrder ?? [];
  if (!grade) return fail('알 수 없는 카드입니다');
  const gi = order.indexOf(grade);
  if (gi < 0 || gi >= order.length - 1) return fail('가장 높은 등급 카드는 합성할 수 없습니다');
  const pool = Object.keys(bal.skillGrades).filter(s => bal.skillGrades[s] === order[gi + 1]);
  return transaction(save, bal, next => {
    const card = cardIdOf(skillId), n = bal.cardFuse;
    if (countItem(next, card) < n) return fail(`같은 카드가 ${n}장 있어야 합니다`);
    if (take(next, card, n)) return fail('카드를 찾지 못했습니다');
    // ⑤ #1: 어떤 카드가 나와도 들어갈 자리가 있어야 한다(가방을 채워 결과를 고르는 것을 막음)
    const fits = id => (next.bag.length < bal.inventory.bagSlots && next.nextUid < Number.MAX_SAFE_INTEGER) || next.bag.some(it => it.id === cardIdOf(id) && it.count < bal.inventory.stackMax); // ⑦ #1: 새 uid도
    if (!pool.every(fits)) return fail('가방에 빈 칸이 1칸 있어야 합니다');
    // ⑤ #2: 모든 검사를 통과한 뒤에만 난수 1개
    let pick;
    try { pick = pool[Math.floor(random(rng) * pool.length)]; } catch { return fail('난수 함수가 올바르지 않습니다'); }
    if (insert(next, 'bag', cardIdOf(pick), 1, bal)) return fail('가방에 자리가 없습니다');
    return { ok: true, save: next, got: pick, gotId: cardIdOf(pick) };
  });
}

// ---------- 15차 캐릭터 성장 ----------
// 엘릭서 마시기: 그 능력치 +1(최대 elixirMax). 다 찼으면 아이템을 쓰지 않는다
export function drinkElixir(save, itemId, bal) {
  const def = itemDef(itemId, bal);
  if (!def?.elixir) return fail('엘릭서가 아닙니다');
  return transaction(save, bal, next => {
    const e = { str: 0, dex: 0, con: 0, ...(elixirOf(next) ?? {}) };
    if (e[def.elixir] >= bal.elixirMax) return fail(`이미 ${bal.elixirMax}개를 마셨습니다`);
    if (take(next, itemId, 1)) return fail(`${def.name}이(가) 없습니다`);
    e[def.elixir] += 1;
    next.player.elixir = e;
    return { ok: true, save: next, stat: def.elixir, count: e[def.elixir] };
  });
}
// ⑤ #1·⑦ #1: 실제로 되찾을 양(최대 레벨에 닿으면 거기까지)과 돈 — 거래와 화면이 같은 함수
export function recoverQuote(save, bal) {
  const lost = save.recover?.exp ?? 0, max = bal.progression.maxLevel;
  if (!lost) return { lost: 0, used: 0, cost: 0, max: false };
  if (save.player.level >= max) return { lost, used: 0, cost: 0, max: true };
  let room = needExp(save.player.level, bal) - save.player.exp;
  for (let lv = save.player.level + 1; lv < max && room < lost; lv++) room += needExp(lv, bal);
  const used = Math.min(lost, room);
  return { lost, used, cost: recoverCost(used, bal), max: false };
}
// 경험치 복구: 마을에서, 잃은 경험치 전부를 돈으로(레벨이 오를 수 있음). 되찾으면 기록을 지운다
export function recoverExp(save, bal) {
  return transaction(save, bal, next => {
    const q = recoverQuote(next, bal);
    if (!q.lost) return fail('되찾을 경험치가 없습니다');
    if (q.max) return fail('최대 레벨이라 되찾을 경험치가 없습니다');
    const { used, cost } = q;
    if (next.player.gold < cost) return fail(`돈이 ${cost.toLocaleString('ko-KR')}원 필요합니다`);
    const before = next.player.level;
    const prog = addExp({ level: next.player.level, exp: next.player.exp }, used, bal);
    next.player.level = prog.level; next.player.exp = prog.exp;
    next.player.gold -= cost;
    delete next.recover;
    return { ok: true, save: next, exp: used, cost, levelsGained: prog.level - before };
  });
}
// 마법인형 상자 열기: 4종 중 하나(난수 1개, 모든 검사 뒤). 이미 가진 인형이면 dollRefund원을 돌려받는다
export function openDollBox(save, rng, bal) {
  const list = bal.dolls ?? [];
  if (!list.length) return fail('마법인형이 없습니다');
  return transaction(save, bal, next => {
    if (countItem(next, 'dollBox') < 1) return fail('마법인형 상자가 없습니다');
    if (!integer(next.player.gold + bal.dollRefund)) return fail('돈 한도를 초과했습니다'); // ⑤ #2: 난수 전에
    if (take(next, 'dollBox', 1)) return fail('마법인형 상자가 없습니다');
    let pick;
    try { pick = list[Math.floor(random(rng) * list.length)].id; } catch { return fail('난수 함수가 올바르지 않습니다'); }
    const owned = next.dolls?.owned ?? [];
    if (owned.includes(pick)) {
      next.player.gold += bal.dollRefund;
      return { ok: true, save: next, doll: pick, dup: true };
    }
    next.dolls = { owned: [...owned, pick], cur: next.dolls ? next.dolls.cur : pick }; // 처음 얻은 인형만 바로 데리고 다님(⑦ #2: 두고 다니기는 그대로)
    return { ok: true, save: next, doll: pick, dup: false };
  });
}
// 데리고 다닐 인형 바꾸기(null = 두고 다님)
export function setDoll(save, id, bal) {
  if (id !== null && !dollDef(id, bal)) return fail('알 수 없는 인형입니다');
  return transaction(save, bal, next => {
    if (!next.dolls) return fail('가진 인형이 없습니다');
    if (id !== null && !next.dolls.owned.includes(id)) return fail('가지지 않은 인형입니다');
    if (next.dolls.cur === id) return fail('이미 그렇게 되어 있습니다');
    next.dolls = { ...next.dolls, cur: id };
    return { ok: true, save: next };
  });
}

// ---------- 16차 지도에서 바로 순간이동 ----------
// 마을에서는 마법사와 같은 값, 마을 밖에서는 2배(최소 mapTeleportMin원). 보스 방·시전 중은 화면이 먼저 막는다(사냥터 주문서와 같은 검사)
export function mapTeleportCost(save, destId, bal) {
  const dest = bal.teleport?.find(item => item.id === destId);
  if (!dest || !integer(dest.price)) return null;
  return save.player.map === bal.town.id ? dest.price : Math.max(bal.mapTeleportMin ?? 40, dest.price * 2);
}
export function mapTeleport(save, destId, bal) {
  const point = TELEPORTS.find(item => item.id === destId);
  const cost = mapTeleportCost(save, destId, bal);
  if (!point || cost === null) return fail('갈 수 없는 곳입니다');
  return transaction(save, bal, next => {
    if (next.player.hp <= 0) return fail('쓰러진 상태에서는 이동할 수 없습니다');
    if (next.player.gold < cost) return fail(`돈이 부족합니다(${cost.toLocaleString('ko-KR')}원)`);
    next.player.gold -= cost;
    Object.assign(next.player, { map: destId, x: point.x, y: point.y });
    return { ok: true, save: next, cost };
  });
}

// ---------- 19차 보스 코인 교환 ----------
// 교환표(bal.coinShop)의 물건을 코인으로. 한 거래(코인 빼기·넣기), 가방이 모자라면 아무것도 안 바뀜
export function coinBuy(save, id, count, bal) {
  const line = (bal.coinShop ?? []).find(l => l.id === id);
  if (!line || !itemDef(id, bal) || !integer(count, 1, 999)) return fail('바꿀 수 없는 물건입니다');
  const need = line.coins * count;
  return transaction(save, bal, next => {
    if (countItem(next, 'bossCoin') < need) return fail(`보스 코인이 ${need}개 필요합니다`);
    if (take(next, 'bossCoin', need)) return fail('보스 코인이 모자랍니다');
    if (insert(next, 'bag', id, count, bal)) return fail('가방에 자리가 없습니다');
    return { ok: true, save: next, coins: need };
  });
}

// ---------- 20차 장비 세트(사냥용·보스용 등 3칸) ----------
// 지금 낀 장비를 칸 i에 저장(이름 1~8자)
export function saveLoadout(save, i, name, bal) {
  if (!integer(i, 0, 2) || typeof name !== 'string' || !loadoutNameOk(name.trim())) return fail('세트 이름은 1~8글자입니다');
  return transaction(save, bal, next => {
    const list = next.loadouts ? [...next.loadouts] : [null, null, null];
    list[i] = { name: name.trim(), equip: Object.fromEntries(EQUIP_SLOTS.map(sl => [sl, next.equip[sl] ?? null])) };
    next.loadouts = list;
    return { ok: true, save: next };
  });
}
export function clearLoadout(save, i, bal) {
  if (!integer(i, 0, 2)) return fail('세트 칸이 올바르지 않습니다');
  return transaction(save, bal, next => {
    if (!next.loadouts?.[i]) return fail('빈 세트입니다');
    const list = [...next.loadouts]; list[i] = null;
    if (list.every(l => l === null)) delete next.loadouts; else next.loadouts = list;
    return { ok: true, save: next };
  });
}
// 세트로 바꿔 끼기: 세트에 적힌 장비 중 **가방에 아직 있고 그 칸에 맞는 것**만 끼고, 없어진 것(팔림·사라짐·창고)은 그 칸을 비우지 않고 지금 것 그대로.
// 반환 missing = 못 낀 칸 수(알림용). 한 거래(체력은 transaction이 정리)
export function applyLoadout(save, i, bal) {
  if (!integer(i, 0, 2)) return fail('세트 칸이 올바르지 않습니다');
  return transaction(save, bal, next => {
    const l = next.loadouts?.[i];
    if (!l) return fail('빈 세트입니다');
    let missing = 0, changed = 0;
    for (const sl of EQUIP_SLOTS) {
      const uid = l.equip[sl];
      if (uid === null) { if (next.equip[sl] !== null) { next.equip[sl] = null; changed++; } continue; }
      const it = next.bag.find(x => x.uid === uid);
      if (!it || slotOf(itemDef(it.id, bal)) !== sl) { missing++; continue; }
      if (next.equip[sl] !== uid) { next.equip[sl] = uid; changed++; }
    }
    // ⑤ #4: 바뀐 것이 없으면 저장하지 않고 이유(이미 같음 / 없어진 장비 N칸)를 알림
    if (!changed) return { ...fail(missing ? `바꿀 것이 없습니다 — 세트의 장비 ${missing}칸이 가방에 없어 지금 것 그대로입니다` : '이미 이 세트를 끼고 있습니다'), missing };
    return { ok: true, save: next, missing, changed };
  });
}

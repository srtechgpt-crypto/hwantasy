import { finite, integer, isRecord } from './common.js';

export function decideAuto(ctx, bal) {
  if (!isRecord(ctx) || !isRecord(ctx.player) || !isRecord(ctx.center) ||
      ![ctx.player.x, ctx.player.y, ctx.player.hp, ctx.player.maxHp, ctx.center.x, ctx.center.y, ctx.tile, ctx.attackRange, ctx.stuckSec].every(v => finite(v)) ||
      ctx.tile === 0 || ctx.player.maxHp === 0 || ctx.player.hp > ctx.player.maxHp ||
      !integer(ctx.potions) || !integer(ctx.returnScrolls) || !Array.isArray(ctx.monsters) ||
      !['bagFull', 'potionReady', 'attackReady'].every(key => typeof ctx[key] === 'boolean') ||
      ctx.monsters.some(mon => !isRecord(mon) || !(typeof mon.id === 'string' || integer(mon.id)) || !finite(mon.x) || !finite(mon.y) || typeof mon.alive !== 'boolean' || typeof mon.isBoss !== 'boolean') ||
      (ctx.items !== undefined && (!Array.isArray(ctx.items) || ctx.items.some(it => !isRecord(it) || !integer(it.id) || !finite(it.x) || !finite(it.y))))) {
    return { action: 'stop', reason: '자동 사냥 정보가 올바르지 않습니다' };
  }
  const p = ctx.player, rule = bal.autohunt;
  if (p.hp === 0) return { action: 'stop', reason: '사망했습니다' };
  // 가방이 가득 차도 귀환하지 않는다(3차): 들어가지 않는 물건은 땅에 두고 계속 사냥. ctx.bagFull은 입력 호환용으로만 받는다
  if (ctx.potions === 0 || p.hp <= p.maxHp * rule.returnHp) {
    if (!ctx.returnScrolls) return { action: 'stop', reason: ctx.potions === 0 ? '물약·귀환 주문서가 없습니다' : '귀환 주문서가 없습니다' };
    return { action: 'return', reason: ctx.potions === 0 ? '물약이 없습니다' : '체력이 20% 이하입니다' };
  }
  if (p.hp <= p.maxHp * rule.potionHp && ctx.potionReady) return { action: 'potion' };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const candidates = ctx.monsters.filter(mon => mon.alive && !mon.isBoss && distance(mon, ctx.center) <= rule.radiusTiles * ctx.tile &&
    !(ctx.stuckSec >= rule.stuckSec && mon.id === ctx.targetId));
  candidates.sort((a, b) => distance(a, p) - distance(b, p));
  const target = candidates.find(mon => mon.id === ctx.targetId) ?? candidates[0];
  // 땅에 떨어진 돈·아이템(줍기 가능한 것만 들어옴): 자동 사냥 반경 안, 지금 줍던 것을 유지하고 없으면 가장 가까운 것
  const items = (ctx.items ?? []).filter(it => distance(it, ctx.center) <= rule.radiusTiles * ctx.tile);
  items.sort((a, b) => distance(a, p) - distance(b, p));
  const item = items.find(it => it.id === ctx.itemId) ?? items[0];
  const pick = it => ({ action: 'move', itemId: it.id, x: it.x, y: it.y });
  // 이미 싸우던 대상(targetId)이 붙어 있으면 계속 싸운다. 새로 고른 몬스터라면 떨어진 것부터 줍는다
  const fighting = target && target.id === ctx.targetId;
  if (target && distance(p, target) <= ctx.attackRange && (fighting || !item)) {
    if (ctx.attackReady) return { action: 'attack', targetId: target.id };
    // 공격 대기 중에는 바로 옆(1.5칸)에 떨어진 것을 먼저 줍는다(계속 싸워도 줍기 기회가 생기게)
    if (item && distance(p, item) <= rule.pickupNearTiles * ctx.tile) return pick(item);
    return { action: 'idle', targetId: target.id };
  }
  // 곁에서 싸우는 대상이 없으면 다음 몬스터보다 먼저 줍는다
  if (item) return pick(item);
  if (!target) return distance(p, ctx.center) > 0 ? { action: 'move', x: ctx.center.x, y: ctx.center.y } : { action: 'idle' };
  return { action: 'move', targetId: target.id, x: target.x, y: target.y };
}

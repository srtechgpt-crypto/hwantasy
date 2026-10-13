import { finite, integer, isRecord } from './common.js';

export function decideAuto(ctx, bal) {
  if (!isRecord(ctx) || !isRecord(ctx.player) || !isRecord(ctx.center) ||
      ![ctx.player.x, ctx.player.y, ctx.player.hp, ctx.player.maxHp, ctx.center.x, ctx.center.y, ctx.tile, ctx.attackRange, ctx.stuckSec].every(v => finite(v)) ||
      ctx.tile === 0 || ctx.player.maxHp === 0 || ctx.player.hp > ctx.player.maxHp ||
      !integer(ctx.potions) || !integer(ctx.returnScrolls) || !Array.isArray(ctx.monsters) ||
      !['bagFull', 'potionReady', 'attackReady'].every(key => typeof ctx[key] === 'boolean') ||
      ctx.monsters.some(mon => !isRecord(mon) || !(typeof mon.id === 'string' || integer(mon.id)) || !finite(mon.x) || !finite(mon.y) || typeof mon.alive !== 'boolean' || typeof mon.isBoss !== 'boolean')) {
    return { action: 'stop', reason: '자동 사냥 정보가 올바르지 않습니다' };
  }
  const p = ctx.player, rule = bal.autohunt;
  if (p.hp === 0) return { action: 'stop', reason: '사망했습니다' };
  if (ctx.potions === 0 || p.hp <= p.maxHp * rule.returnHp || ctx.bagFull) {
    if (!ctx.returnScrolls) return { action: 'stop', reason: ctx.potions === 0 ? '물약·귀환 주문서가 없습니다' : '귀환 주문서가 없습니다' };
    return { action: 'return', reason: ctx.potions === 0 ? '물약이 없습니다' : ctx.bagFull ? '가방이 가득 찼습니다' : '체력이 20% 이하입니다' };
  }
  if (p.hp <= p.maxHp * rule.potionHp && ctx.potionReady) return { action: 'potion' };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const candidates = ctx.monsters.filter(mon => mon.alive && !mon.isBoss && distance(mon, ctx.center) <= rule.radiusTiles * ctx.tile &&
    !(ctx.stuckSec >= rule.stuckSec && mon.id === ctx.targetId));
  candidates.sort((a, b) => distance(a, p) - distance(b, p));
  const target = candidates.find(mon => mon.id === ctx.targetId) ?? candidates[0];
  if (!target) return distance(p, ctx.center) > 0 ? { action: 'move', x: ctx.center.x, y: ctx.center.y } : { action: 'idle' };
  if (distance(p, target) <= ctx.attackRange) return ctx.attackReady ? { action: 'attack', targetId: target.id } : { action: 'idle', targetId: target.id };
  return { action: 'move', targetId: target.id, x: target.x, y: target.y };
}

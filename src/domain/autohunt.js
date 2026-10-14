import { finite, integer, isRecord } from './common.js';

export function decideAuto(ctx, bal) {
  if (!isRecord(ctx) || !isRecord(ctx.player) || !isRecord(ctx.center) ||
      ![ctx.player.x, ctx.player.y, ctx.player.hp, ctx.player.maxHp, ctx.center.x, ctx.center.y, ctx.tile, ctx.attackRange, ctx.stuckSec].every(v => finite(v)) ||
      ctx.tile === 0 || ctx.player.maxHp === 0 || ctx.player.hp > ctx.player.maxHp ||
      !integer(ctx.potions) || !integer(ctx.returnScrolls) || !Array.isArray(ctx.monsters) ||
      !['bagFull', 'potionReady', 'attackReady'].every(key => typeof ctx[key] === 'boolean') ||
      ctx.monsters.some(mon => !isRecord(mon) || !(typeof mon.id === 'string' || integer(mon.id)) || !finite(mon.x) || !finite(mon.y) || typeof mon.alive !== 'boolean' || typeof mon.isBoss !== 'boolean') ||
      (ctx.items !== undefined && (!Array.isArray(ctx.items) || ctx.items.some(it => !isRecord(it) || !integer(it.id) || !finite(it.x) || !finite(it.y)))) ||
      (ctx.skills !== undefined && (!Array.isArray(ctx.skills) || ctx.skills.some(sk => !isRecord(sk) || typeof sk.id !== 'string' || typeof sk.ready !== 'boolean'))) ||
      (ctx.skipIds !== undefined && !Array.isArray(ctx.skipIds)) ||
      (ctx.nearCount !== undefined && !integer(ctx.nearCount))) {
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
  const skipNear = new Set(ctx.skipIds ?? []);
  const candidates = ctx.monsters.filter(mon => mon.alive && !mon.isBoss && distance(mon, ctx.center) <= rule.radiusTiles * ctx.tile &&
    (ctx.huntArea === undefined || mon.area === ctx.huntArea) && !skipNear.has(mon.id) &&
    !(ctx.stuckSec >= rule.stuckSec && mon.id === ctx.targetId));
  candidates.sort((a, b) => distance(a, p) - distance(b, p));
  let target = candidates.find(mon => mon.id === ctx.targetId) ?? candidates[0];
  // 땅에 떨어진 돈·아이템(줍기 가능한 것만 들어옴): 자동 사냥 반경 안, 지금 줍던 것을 유지하고 없으면 가장 가까운 것
  const items = (ctx.items ?? []).filter(it => distance(it, ctx.center) <= rule.radiusTiles * ctx.tile);
  items.sort((a, b) => distance(a, p) - distance(b, p));
  const item = items.find(it => it.id === ctx.itemId) ?? items[0];
  const pick = it => ({ action: 'move', itemId: it.id, x: it.x, y: it.y });
  // 5차: 둘레(시작 자리 8칸)에 몬스터도 주울 것도 없으면 같은 지역의 가장 가까운 몬스터(못 가는 것·막힌 대상 제외)를 대상으로.
  // 찾아가서 붙으면 아래 공격 판단을 그대로 쓴다(멀리 있던 대상도 바로 공격)
  let far = false;
  if (!target && !item && ctx.huntArea !== undefined) {
    const list = ctx.monsters.filter(mon => mon.alive && !mon.isBoss && mon.area === ctx.huntArea && !skipNear.has(mon.id) &&
      !(ctx.stuckSec >= rule.stuckSec && mon.id === ctx.targetId));
    list.sort((a, b) => distance(a, p) - distance(b, p));
    target = list.find(mon => mon.id === ctx.targetId) ?? list[0];
    far = !!target;
  }
  // 이미 싸우던 대상(targetId)이 붙어 있으면 계속 싸운다. 새로 고른 몬스터라면 떨어진 것부터 줍는다
  const fighting = target && target.id === ctx.targetId;
  if (target && distance(p, target) <= ctx.attackRange && (fighting || !item)) {
    // 5차 스킬: 준비된 것만. 리덕션 아머는 공격 차례와 상관없이, 나머지는 공격 한 번을 대신한다
    const ready = new Set((ctx.skills ?? []).filter(sk => sk.ready).map(sk => sk.id));
    const crowd = (ctx.nearCount ?? 1) >= 2;
    if (ready.has('guard') && (p.hp <= p.maxHp * rule.guardHp || crowd)) return { action: 'skill', skillId: 'guard', targetId: target.id };
    if (ctx.attackReady) {
      if (ready.has('whirl') && crowd) return { action: 'skill', skillId: 'whirl', targetId: target.id };
      if (ready.has('stun') && (target.hpRatio ?? 1) >= rule.stunHpRatio) return { action: 'skill', skillId: 'stun', targetId: target.id };
      if (ready.has('bash')) return { action: 'skill', skillId: 'bash', targetId: target.id };
      return { action: 'attack', targetId: target.id };
    }
    // 공격 대기 중에는 바로 옆(1.5칸)에 떨어진 것을 먼저 줍는다(계속 싸워도 줍기 기회가 생기게)
    if (item && distance(p, item) <= rule.pickupNearTiles * ctx.tile) return pick(item);
    return { action: 'idle', targetId: target.id };
  }
  // 곁에서 싸우는 대상이 없으면 다음 몬스터보다 먼저 줍는다
  if (item) return pick(item);
  // 5차: 같은 지역에도 없으면 돌아다닌다(지역 정보가 없는 옛 호출은 예전처럼 중심으로)
  if (!target) {
    if (ctx.huntArea !== undefined) return { action: 'roam' };
    return distance(p, ctx.center) > 0 ? { action: 'move', x: ctx.center.x, y: ctx.center.y } : { action: 'idle' };
  }
  return far ? { action: 'move', targetId: target.id, x: target.x, y: target.y, far: true } : { action: 'move', targetId: target.id, x: target.x, y: target.y };
}

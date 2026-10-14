import { integer } from './common.js';

// 보스 재등장까지 남은 시간(실제 시각). 처치 기록이 없으면 0.
// 폰 시각이 처치 시각보다 앞(과거)이면 10분을 다시 센다 — 화면은 normalizeBossTime으로 기록을 지금으로 고친다.
export function bossRemainMs(defeatedAt, now, bal) {
  const wait = bal.boss.respawnMs;
  if (defeatedAt === null || defeatedAt === undefined) return 0;
  if (!integer(defeatedAt) || !integer(now)) return 0;
  if (defeatedAt > now) return wait;
  return Math.max(0, defeatedAt + wait - now);
}
export const bossReady = (defeatedAt, now, bal) => bossRemainMs(defeatedAt, now, bal) === 0;
// 처치 시각이 미래인 보스가 있으면 지금으로 고친 새 save(아니면 그대로 같은 객체). 4차: 모든 보스(bosses 맵)
export function normalizeBossTime(save, now) {
  const b = save?.bosses;
  if (!b || typeof b !== 'object' || !integer(now)) return save;
  const late = Object.keys(b).filter(id => integer(b[id]) && b[id] > now);
  if (!late.length) return save;
  const bosses = { ...b };
  for (const id of late) bosses[id] = now;
  return { ...save, bosses };
}
// 보스 몬스터 정의(알 수 없는 id·보스 아님이면 null). 자기 소유 키만 본다(toString·__proto__ 등 거부)
export function bossDef(id, bal) {
  if (typeof id !== 'string') return null;
  return bal.monsters.find(mon => mon.isBoss && mon.id === id) ?? null;
}

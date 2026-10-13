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
// 처치 시각이 미래면 지금으로 고친 새 save(아니면 그대로 같은 객체)
export function normalizeBossTime(save, now) {
  const at = save?.boss?.defeatedAt;
  if (!integer(at) || !integer(now) || at <= now) return save;
  return { ...save, boss: { ...save.boss, defeatedAt: now } };
}

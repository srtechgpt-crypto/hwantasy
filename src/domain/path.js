// 길찾기(5차): 타일 칸 격자 A*. 8방향, 대각선은 양 옆 두 칸이 모두 뚫려 있을 때만(모서리 끼기 금지).
// blocked(tx, ty) → true면 못 지나감(지도 밖도 호출하는 쪽이 true로). 찾으면 시작 칸을 뺀 칸 목록, 못 찾으면 null.
// 탐색 칸 수가 maxNodes를 넘으면 포기(null) — 폰 부담 제한.
import { integer } from './common.js';

const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

export function findPath(blocked, sx, sy, gx, gy, { maxNodes = 4000 } = {}) {
  if (typeof blocked !== 'function' || ![sx, sy, gx, gy].every(v => Number.isSafeInteger(v)) || !integer(maxNodes, 1)) throw new TypeError('길찾기 입력이 올바르지 않습니다');
  if (sx === gx && sy === gy) return [];
  if (blocked(gx, gy)) return null;
  const key = (x, y) => `${x},${y}`;
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
  const g = new Map([[key(sx, sy), 0]]);
  const from = new Map();
  const closed = new Set();
  const heap = [];
  const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l].f < heap[m].f) m = l; if (r < heap.length && heap[r].f < heap[m].f) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; }
    }
    return top;
  };
  push({ x: sx, y: sy, f: h(sx, sy) });
  let seen = 0;
  while (heap.length) {
    const cur = pop(), ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    if (cur.x === gx && cur.y === gy) {
      const out = [];
      let k = ck;
      while (from.has(k)) { const [x, y] = k.split(',').map(Number); out.push({ x, y }); k = from.get(k); }
      return out.reverse();
    }
    closed.add(ck);
    if (++seen > maxNodes) return null;
    for (const [dx, dy, cost] of STEPS) {
      const nx = cur.x + dx, ny = cur.y + dy, nk = key(nx, ny);
      if (closed.has(nk) || blocked(nx, ny)) continue;
      if (dx && dy && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
      const ng = g.get(ck) + cost;
      if (ng >= (g.get(nk) ?? Infinity)) continue;
      g.set(nk, ng); from.set(nk, ck);
      push({ x: nx, y: ny, f: ng + h(nx, ny) });
    }
  }
  return null;
}

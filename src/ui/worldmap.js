// 6차 큰 지도: [전체](마을~성터 한 장) 또는 지역 하나를 캔버스에 그린다(보기 전용).
// 바닥(땅·벽·출구)은 지역·칸 크기마다 한 번 그려 캐시하고, 글자·표시는 매번 위에 그린다.
import bal from '../../data/balance.js';
import { REGIONS, ZONES, NPCS, BOSS_ROOMS, TELEPORTS, TILE } from '../../data/maps.js';

const GROUND = { town: '#b89a6a', field: '#4f8a3e', forest: '#2e5e36', mine: '#6a5d55', ruin: '#5e5068' };
const WALL = 'rgba(12,14,22,0.85)';
const FONT = "bold %dpx system-ui, 'Malgun Gothic', sans-serif";
// 지도(wmap)는 buildWorld()가 매번 같은 모양으로 만들고 게임 장면도 하나라 지역·칸 크기만 키로 캐시한다
const cache = new Map();

const monName = (id) => bal.monsters.find((m) => m.id === id)?.name ?? id;
const monLevel = (id) => bal.monsters.find((m) => m.id === id)?.level ?? 0;
const recLevel = (id) => bal.maps.find((m) => m.id === id)?.recommendedLevel ?? null;
export const MAP_VIEWS = ['all', ...REGIONS.map((r) => r.id)];
// [전체] 그림에서 누른 가로 위치(0~1) → 지역 id
export function regionAtRatio(ratio, wmap) {
  const tx = ratio * wmap.solid[0].length;
  return REGIONS.find((r) => tx >= r.x0 && tx < r.x1)?.id ?? null;
}

function baseFor(wmap, x0, x1, px) {
  const key = `${x0}:${x1}:${px}`;
  if (cache.has(key)) return cache.get(key);
  const H = wmap.solid.length, c = document.createElement('canvas');
  c.width = (x1 - x0) * px; c.height = H * px;
  const g = c.getContext('2d');
  for (const r of REGIONS) {
    if (r.x1 <= x0 || r.x0 >= x1) continue;
    g.fillStyle = GROUND[r.id] ?? '#555';
    g.fillRect((Math.max(r.x0, x0) - x0) * px, 0, (Math.min(r.x1, x1) - Math.max(r.x0, x0)) * px, c.height);
  }
  g.fillStyle = WALL;
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (wmap.solid[y][x]) g.fillRect((x - x0) * px, y * px, px, px);
  cache.set(key, c);
  return c;
}

function label(g, text, x, y, size, color = '#fff', align = 'center') {
  g.font = FONT.replace('%d', size);
  g.textAlign = align; g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size / 4); g.strokeStyle = 'rgba(0,0,0,.85)';
  g.strokeText(text, x, y);
  g.fillStyle = color; g.fillText(text, x, y);
}

function meMarker(g, x, y, r) {
  g.beginPath(); g.arc(x, y, r + 2, 0, Math.PI * 2); g.fillStyle = '#000'; g.fill();
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#ffe08a'; g.fill();
}

// view: 'all' 또는 지역 id. knight: {x,y}(픽셀). bossState(id) → {alive, remainMs}
export function drawWorldMap(canvas, { view, wmap, knight, bossState }) {
  const H = wmap.solid.length, W = wmap.solid[0].length;
  const g = canvas.getContext('2d');
  if (view === 'all') {
    const px = 4;
    canvas.width = W * px; canvas.height = H * px;
    g.drawImage(baseFor(wmap, 0, W, px), 0, 0);
    for (const r of REGIONS) {
      const cx = ((r.x0 + r.x1) / 2) * px;
      if (r.x0 > 0) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(r.x0 * px, 0, 1, canvas.height); }
      const lv = recLevel(r.id);
      label(g, r.name, cx, canvas.height / 2 - 12, 18, '#ffffff');
      label(g, lv ? `권장 Lv ${lv.min}~${lv.max}` : '마을', cx, canvas.height / 2 + 12, 13, '#ffe7a8');
    }
    for (const R of BOSS_ROOMS) { g.strokeStyle = '#ff8a3d'; g.lineWidth = 2; g.strokeRect(R.x0 * px, R.y0 * px, (R.x1 - R.x0) * px, (R.y1 - R.y0) * px); }
    if (knight) meMarker(g, (knight.x / TILE) * px, (knight.y / TILE) * px, 5);
    return;
  }
  const r = REGIONS.find((x) => x.id === view);
  if (!r) return;
  const px = 12;
  canvas.width = (r.x1 - r.x0) * px; canvas.height = H * px;
  g.drawImage(baseFor(wmap, r.x0, r.x1, px), 0, 0);
  const X = (tx) => (tx - r.x0) * px, Y = (ty) => ty * px;
  // 다른 지역으로 가는 길(가장자리의 걸을 수 있는 칸) — 노랑 + 옆 지역 이름
  g.fillStyle = '#f2c94c';
  const ends = [];
  for (let y = 0; y < H; y++) {
    if (r.x0 > 0 && !wmap.solid[y][r.x0]) { g.fillRect(0, Y(y), px / 2, px); ends.push(['L', y]); }
    if (r.x1 < W && !wmap.solid[y][r.x1 - 1]) { g.fillRect(canvas.width - px / 2, Y(y), px / 2, px); ends.push(['R', y]); }
  }
  for (const side of ['L', 'R']) {
    const ys = ends.filter((e) => e[0] === side).map((e) => e[1]);
    if (!ys.length) continue;
    const next = REGIONS[REGIONS.indexOf(r) + (side === 'L' ? -1 : 1)];
    if (next) label(g, side === 'L' ? `◀ ${next.name}` : `${next.name} ▶`, side === 'L' ? 8 : canvas.width - 8, Y(ys[0]) - 10, 14, '#f2c94c', side === 'L' ? 'left' : 'right');
  }
  // 사냥 구역: 점선 테두리 + 몬스터 이름·레벨
  for (const z of ZONES.filter((z) => z.mapId === r.id)) {
    g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
    g.strokeRect(X(z.x0), Y(z.y0), (z.x1 - z.x0) * px, (z.y1 - z.y0) * px);
    g.setLineDash([]);
    const cx = X((z.x0 + z.x1) / 2);
    // 지도가 위아래로 길어 스크롤하므로 구역 위쪽과 가운데 두 곳에 적는다
    for (const top of [Y(z.y0) + 26, Y((z.y0 + z.y1) / 2) - 10]) {
      z.monsters.forEach((id, i) => label(g, `${monName(id)} Lv${monLevel(id)}`, cx, top + i * 22, 16, '#ff9a9a'));
    }
  }
  // 보스 방
  for (const R of BOSS_ROOMS.filter((R) => R.x0 >= r.x0 && R.x1 <= r.x1)) {
    g.strokeStyle = '#ff8a3d'; g.lineWidth = 3;
    g.strokeRect(X(R.x0), Y(R.y0), (R.x1 - R.x0) * px, (R.y1 - R.y0) * px);
    const st = bossState?.(R.id);
    const cx = X((R.x0 + R.x1) / 2), cy = Y((R.y0 + R.y1) / 2);
    label(g, `${monName(R.id)} Lv${monLevel(R.id)}`, cx, cy - 12, 16, '#ffb070');
    label(g, st?.alive ? '깨어 있음' : st?.remainMs > 0 ? `${Math.ceil(st.remainMs / 60000)}분 뒤 깨어남` : '', cx, cy + 12, 13, '#ffe7a8');
  }
  // 순간이동 입구
  for (const t of TELEPORTS) {
    const tx = t.x / TILE, ty = t.y / TILE;
    if (tx < r.x0 || tx >= r.x1) continue;
    label(g, '★', X(tx), Y(ty), 20, '#9fd8ff');
    label(g, '순간이동 도착', X(tx), Y(ty) + 18, 12, '#9fd8ff');
  }
  // 마을 사람
  if (r.id === 'town') for (const n of NPCS) {
    g.fillStyle = '#6fc3ff'; g.fillRect(X(n.x) + px / 2 - 5, Y(n.y) + px / 2 - 5, 10, 10);
    label(g, n.name, X(n.x) + px / 2, Y(n.y) - 8, 14, '#9fd8ff');
  }
  label(g, r.name, 10, 16, 18, '#ffffff', 'left');
  if (knight && knight.x / TILE >= r.x0 && knight.x / TILE < r.x1) {
    meMarker(g, X(knight.x / TILE), Y(knight.y / TILE), 7);
    label(g, '나', X(knight.x / TILE), Y(knight.y / TILE) - 18, 14, '#ffe08a');
  }
}

// 「환타지」 지도: 바람 마을 | 이슬 들판 | 그늘 숲 | 잿돌 폐광(맨 오른쪽 보스 방)이 이어진 한 장.
// 마을·들판 좌표는 1차와 같다(1차 저장 위치가 그대로 맞음). 타일 번호 = 행 × 28 + 열 (assets/tiles.png, 16×16).
const COLS = 28;
const t = (c, r) => r * COLS + c;

export const TILE = 16;
export const W = 204;
export const H = 44;
export const TOWN_W = 24; // x < TOWN_W 는 마을

// 지역(칸 단위, x0 이상 x1 미만)
export const REGIONS = [
  { id: 'town', name: '바람 마을', x0: 0, x1: 24 },
  { id: 'field', name: '이슬 들판', x0: 24, x1: 84 },
  { id: 'forest', name: '그늘 숲', x0: 84, x1: 140 },
  { id: 'mine', name: '잿돌 폐광', x0: 140, x1: W },
];
// 보스 방 안쪽(칸). 입구는 왼쪽 벽(x=188~189)의 y 20~23
export const BOSS_ROOM = { x0: 190, x1: 202, y0: 14, y1: 30 };
const PATH_Y0 = 19, PATH_Y1 = 25; // 지역 사이 길(y 19~24)

// 순간이동 목적지(픽셀, 각 지역 입구)
export const TELEPORTS = [
  { id: 'field', x: 27 * TILE + 8, y: 22 * TILE + 8 },
  { id: 'forest', x: 87 * TILE + 8, y: 22 * TILE + 8 },
  { id: 'mine', x: 143 * TILE + 8, y: 22 * TILE + 8 },
];

// 마을 NPC(칸). kind는 창 종류
export const NPCS = [
  { id: 'shop', name: '잡화상 노인', kind: 'shop', x: 8, y: 17 },
  { id: 'smith', name: '대장장이', kind: 'smith', x: 16, y: 17 },
  { id: 'bank', name: '창고지기', kind: 'bank', x: 8, y: 25 },
  { id: 'tele', name: '순간이동 마법사', kind: 'tele', x: 16, y: 25 },
];

const GRASS = [t(14, 16), t(14, 16), t(14, 16), t(14, 16), t(22, 11)];
const GRASS_DECO = [t(13, 16), t(15, 16)];
const STONE = t(18, 11);
const PLAZA = t(26, 11);
const SAND = t(18, 11);
const WATER = t(23, 6);
const CAVE_FLOOR = [t(16, 31), t(16, 32), t(16, 31), t(16, 32), t(15, 32)];

// 여러 칸짜리 물건: 위쪽 줄은 캐릭터 위로(over), 아래쪽 줄은 막힘(solid)
const OBJECTS = {
  roundTree: { c: 0, r: 10, w: 2, h: 2, solidRows: 1 },
  pine: { c: 6, r: 10, w: 2, h: 2, solidRows: 1 },
  rock: { c: 12, r: 10, w: 2, h: 2, solidRows: 1 },
  wallRock: { c: 12, r: 10, w: 2, h: 2, solidRows: 2 },
  stone: { c: 17, r: 9, w: 1, h: 1, solidRows: 1 },
  bush: { c: 0, r: 6, w: 1, h: 1, solidRows: 1 },
  deadTree: { c: 0, r: 28, w: 2, h: 2, solidRows: 1 },
  cave: { c: 8, r: 21, w: 3, h: 3, solidRows: 3 },
  crystal: { c: 8, r: 12, w: 1, h: 1, solidRows: 1 },
  crystalP: { c: 8, r: 13, w: 1, h: 1, solidRows: 1 },
  houseA: { c: 0, r: 0, w: 4, h: 3, solidRows: 3 },
  houseB: { c: 4, r: 0, w: 4, h: 3, solidRows: 3 },
  houseC: { c: 12, r: 0, w: 4, h: 3, solidRows: 3 },
  well: { c: 4, r: 7, w: 1, h: 1, solidRows: 1 },
  pot: { c: 1, r: 6, w: 1, h: 1, solidRows: 1 },
  barrel: { c: 2, r: 6, w: 1, h: 1, solidRows: 1 },
  sign: { c: 14, r: 8, w: 1, h: 1, solidRows: 1 },
};
const FLOWERS = [t(1, 8), t(2, 8), t(14, 9)];

// 지역별 색 입히기(숲은 어둡고 푸르게, 폐광은 어둡고 차갑게)
export const TINTS = {
  forest: { ground: 0x6f9a72, deco: 0x8fb08c },
  mine: { ground: 0x8a7f92, deco: 0x9d93a6 },
};

// 사냥 구역(칸). 보스 방은 따로
export const ZONES = [
  { id: 'fieldNear', mapId: 'field', x0: 28, x1: 52, y0: 3, y1: 40, monsters: ['jelly', 'mouse'], count: 21 },
  { id: 'fieldFar', mapId: 'field', x0: 52, x1: 80, y0: 3, y1: 40, monsters: ['hopfrog', 'goblin'], count: 18 },
  { id: 'forestNear', mapId: 'forest', x0: 88, x1: 110, y0: 3, y1: 40, monsters: ['raccoon', 'vine'], count: 18 },
  { id: 'forestFar', mapId: 'forest', x0: 113, x1: 136, y0: 3, y1: 40, monsters: ['nightwing', 'vine'], count: 15 },
  { id: 'mineNear', mapId: 'mine', x0: 144, x1: 166, y0: 3, y1: 40, monsters: ['crab', 'ember'], count: 18 },
  { id: 'mineFar', mapId: 'mine', x0: 166, x1: 186, y0: 3, y1: 40, monsters: ['ember', 'stalker'], count: 15 },
];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function regionAtTile(tx) { return REGIONS.find((r) => tx >= r.x0 && tx < r.x1) ?? (tx < 0 ? REGIONS[0] : REGIONS[REGIONS.length - 1]); }
export function mapIdAt(px) { return regionAtTile(Math.floor(px / TILE)).id; }
export function regionName(id) { return REGIONS.find((r) => r.id === id)?.name ?? id; }
export function inBossRoom(px, py) {
  const tx = px / TILE, ty = py / TILE;
  return tx >= BOSS_ROOM.x0 && tx < BOSS_ROOM.x1 && ty >= BOSS_ROOM.y0 && ty < BOSS_ROOM.y1;
}

export function buildWorld() {
  const r = rng(20261011);
  const ground = [], deco = [], over = [], solid = [];
  for (let y = 0; y < H; y++) {
    ground.push(new Array(W).fill(0)); deco.push(new Array(W).fill(-1));
    over.push(new Array(W).fill(-1)); solid.push(new Array(W).fill(false));
  }
  const free = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (i < 1 || j < 1 || i >= W - 1 || j >= H - 1 || solid[j][i] || deco[j][i] !== -1 || over[j][i] !== -1) return false;
    }
    return true;
  };
  const place = (name, x, y) => {
    const o = OBJECTS[name];
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      if (y + j < 0 || y + j >= H || x + i < 0 || x + i >= W) continue;
      const idx = t(o.c + i, o.r + j);
      const isSolidRow = j >= o.h - o.solidRows;
      if (isSolidRow) { deco[y + j][x + i] = idx; solid[y + j][x + i] = true; }
      else over[y + j][x + i] = idx;
    }
  };
  const onPath = (y, h) => y + h > PATH_Y0 - 1 && y < PATH_Y1 + 1;

  // ---------- 마을 + 들판 (1차와 같은 순서·같은 난수 → 같은 모양) ----------
  const FIELD_END = 84;
  // 1차 지도 폭(84)만큼은 1차와 같은 난수 순서로, 그 오른쪽은 다른 난수로
  const gr = rng(20261014);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = x < FIELD_END ? r : gr;
    ground[y][x] = g() < 0.03 ? GRASS_DECO[Math.floor(g() * 2)] : GRASS[Math.floor(g() * GRASS.length)];
  }
  for (let y = 10; y < 13; y++) for (let x = 3; x < TOWN_W - 2; x++) ground[y][x] = STONE;
  for (let y = 26; y < 29; y++) for (let x = 3; x < TOWN_W - 2; x++) ground[y][x] = STONE;
  for (let y = 10; y < 29; y++) for (let x = 11; x < 13; x++) ground[y][x] = STONE;
  for (let y = 18; y < 26; y++) for (let x = 8; x < 16; x++) ground[y][x] = PLAZA;
  for (let y = 20; y < 24; y++) for (let x = TOWN_W - 2; x < TOWN_W + 8; x++) ground[y][x] = SAND;

  // 바깥 테두리: 들판까지는 소나무, 숲은 소나무, 폐광은 바위
  for (let x = 0; x < 140; x += 2) { place('pine', x, 0); place('pine', x, H - 2); }
  for (let y = 2; y < H - 2; y += 2) place('pine', 0, y);

  place('houseA', 4, 7); place('houseC', 10, 7); place('houseB', 16, 7);
  place('houseB', 4, 30); place('houseA', 16, 30);
  place('well', 12, 15); place('pot', 9, 12); place('barrel', 10, 12); place('barrel', 15, 12);
  place('sign', TOWN_W - 3, 19);
  for (let i = 0; i < 6; i++) { place('bush', 3 + i * 3, 5); }
  for (let y = 2; y < H - 2; y++) {
    if (y >= 19 && y <= 24) continue;
    if (free(TOWN_W, y, 1, 1)) place('bush', TOWN_W, y);
  }

  // 들판 오른쪽 끝(숲과의 경계): 소나무 벽, 가운데 길만 열림 — 들판 물건보다 먼저 세운다
  for (let y = 2; y < H - 2; y += 2) if (!onPath(y, 2)) place('pine', FIELD_END - 2, y);

  for (let y = 30; y < 36; y++) for (let x = 56; x < 64; x++) { ground[y][x] = WATER; solid[y][x] = true; }
  for (let y = 8; y < 12; y++) for (let x = 66; x < 71; x++) { ground[y][x] = WATER; solid[y][x] = true; }
  const fieldObjs = ['roundTree', 'roundTree', 'pine', 'rock', 'stone', 'bush'];
  for (let n = 0; n < 70; n++) {
    const name = fieldObjs[Math.floor(r() * fieldObjs.length)];
    const o = OBJECTS[name];
    const x = TOWN_W + 3 + Math.floor(r() * (FIELD_END - TOWN_W - 6)), y = 3 + Math.floor(r() * (H - 7));
    if (y + o.h >= 18 && y <= 25 && x < TOWN_W + 12) continue; // 입구 길 비움
    if (x + o.w > FIELD_END - 3) continue;
    if (free(x - 1, y - 1, o.w + 2, o.h + 2)) place(name, x, y);
  }
  for (let n = 0; n < 60; n++) {
    const x = TOWN_W + 2 + Math.floor(r() * (FIELD_END - TOWN_W - 4)), y = 2 + Math.floor(r() * (H - 4));
    if (!solid[y][x] && deco[y][x] === -1 && over[y][x] === -1) deco[y][x] = FLOWERS[Math.floor(r() * FLOWERS.length)];
  }

  // ---------- 그늘 숲 ----------
  const fr = rng(20261012);
  for (let y = PATH_Y0 + 1; y < PATH_Y1 - 1; y++) for (let x = 82; x < 140; x++) ground[y][x] = SAND; // 숲길
  // 개울(다리 = 숲길)
  for (let y = 2; y < H - 2; y++) {
    if (y >= PATH_Y0 && y < PATH_Y1) continue;
    for (let x = 110; x < 112; x++) { ground[y][x] = WATER; solid[y][x] = true; }
  }
  // 숲과 폐광 경계: 바위 벽(길만 열림)
  for (let y = 2; y < H - 2; y += 2) if (!onPath(y, 2)) place('wallRock', 138, y);
  const forestObjs = ['pine', 'pine', 'pine', 'roundTree', 'deadTree', 'bush', 'rock'];
  for (let n = 0; n < 700; n++) {
    const name = forestObjs[Math.floor(fr() * forestObjs.length)];
    const o = OBJECTS[name];
    const x = 86 + Math.floor(fr() * 50), y = 3 + Math.floor(fr() * (H - 7));
    if (onPath(y, o.h)) continue;
    if (free(x, y - 1, o.w + 1, o.h + 1)) place(name, x, y);
  }

  // ---------- 잿돌 폐광 ----------
  const mr = rng(20261013);
  for (let y = 0; y < H; y++) for (let x = 140; x < W; x++) ground[y][x] = CAVE_FLOOR[Math.floor(mr() * CAVE_FLOOR.length)];
  for (let x = 140; x < W; x += 2) { place('wallRock', x, 0); place('wallRock', x, H - 2); }
  for (let y = 2; y < H - 2; y += 2) place('wallRock', W - 2, y);
  // 동굴 입구 장식(길 양옆)
  place('cave', 140, PATH_Y0 - 3); place('cave', 140, PATH_Y1);
  // 보스 방: 왼쪽 벽(입구 y 20~23), 위·아래 벽
  const R = BOSS_ROOM;
  for (let y = R.y0 - 2; y < R.y1 + 2; y += 2) if (y + 2 <= 20 || y >= 24) place('wallRock', R.x0 - 2, y);
  for (let x = R.x0 - 2; x < W - 2; x += 2) { place('wallRock', x, R.y0 - 2); place('wallRock', x, R.y1); }
  // 보스 방 바깥(위·아래 남는 곳)은 막힌 바위
  for (let y = 2; y < R.y0 - 2; y += 2) for (let x = R.x0 - 2; x < W - 2; x += 2) if (free(x, y, 2, 2)) place('wallRock', x, y);
  for (let y = R.y1 + 2; y < H - 2; y += 2) for (let x = R.x0 - 2; x < W - 2; x += 2) if (free(x, y, 2, 2)) place('wallRock', x, y);
  place('sign', R.x0 - 4, 19);
  const mineObjs = ['rock', 'rock', 'stone', 'crystal', 'crystalP', 'stone'];
  for (let n = 0; n < 400; n++) {
    const name = mineObjs[Math.floor(mr() * mineObjs.length)];
    const o = OBJECTS[name];
    const x = 144 + Math.floor(mr() * 42), y = 3 + Math.floor(mr() * (H - 7));
    if (onPath(y, o.h) && x < 150) continue;
    if (free(x - 1, y - 1, o.w + 2, o.h + 2)) place(name, x, y);
  }

  // NPC 자리는 막힘(그림은 장면이 그림)
  for (const n of NPCS) solid[n.y][n.x] = true;

  return {
    ground, deco, over, solid, zones: ZONES,
    spawn: { x: 12 * TILE + 8, y: 22 * TILE + 8 },
    labels: [
      { x: 12 * TILE, y: 4 * TILE + 6, text: '바람 마을' },
      { x: (TOWN_W + 4) * TILE, y: 18 * TILE, text: '이슬 들판 →' },
      { x: 87 * TILE, y: 18 * TILE, text: '그늘 숲 →' },
      { x: 145 * TILE, y: 18 * TILE, text: '잿돌 폐광 →' },
      { x: (R.x0 - 4) * TILE + 8, y: 17 * TILE + 8, text: '큰울림의 방' },
    ],
  };
}

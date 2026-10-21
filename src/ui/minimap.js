// 미니맵: 지금 있는 지역(REGIONS 한 칸)만 칸당 2px로 그린다.
// 바닥(벽·땅·출구·보스 방)은 지역이 바뀔 때 따로 만든 그림에 한 번 그리고,
// 점(나·몬스터·마을 사람)은 그 바닥 그림을 복사한 위에 다시 그린다(잔상 없음).
const PX = 2;
const GROUND = { town: '#b89a6a', field: '#4f8a3e', forest: '#2e5e36', mine: '#6a5d55', ruin: '#5e5068', frost: '#cfe3f0' }; // 21차 서리 봉우리
const WALL = 'rgba(12,14,22,0.85)';

// 7차: 누르면 큰 지도(onTap). 숨기기·보이기는 큰 지도 창의 버튼이 setOpen으로 한다(숨기면 상자 전체가 사라짐)
export function createMinimap({ root, wmap, regions, npcs, bossRooms = [], tile, onTap }) {
  const box = document.createElement('div');
  box.className = 'minimap';
  box.setAttribute('role', 'button');
  box.setAttribute('aria-label', '지도 열기');
  const canvas = document.createElement('canvas');
  box.append(canvas);
  root.append(box);
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  const bctx = base.getContext('2d');
  let region = null, open = true, blink = 0;

  // 게임 조작(조이스틱)으로 번지지 않게 누르는 순간을 막고, 손을 뗄 때(같은 상자 안) 한 번만 지도를 연다
  // 손가락 하나만 따라가고(다른 손가락은 무시), 상자 안에서 뗐을 때만 연다
  let downId = null;
  const inside = (e) => { const r = box.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  box.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (downId === null) downId = e.pointerId; });
  box.addEventListener('pointerup', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (downId !== e.pointerId) return;
    downId = null;
    if (inside(e)) onTap?.();
  });
  for (const t of ['pointercancel', 'pointerleave']) box.addEventListener(t, (e) => { if (e.pointerId === downId) downId = null; });
  // 키보드(Enter·Space)로도 연다
  box.tabIndex = 0;
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(); } });

  function setOpen(v) {
    open = v;
    box.classList.toggle('closed', !open);
  }

  function setRegion(id) {
    const r = regions.find((x) => x.id === id);
    if (!r || region === r) return;
    region = r;
    const w = (r.x1 - r.x0) * PX, h = wmap.solid.length * PX;
    base.width = canvas.width = w; base.height = canvas.height = h;
    resize();
    bctx.fillStyle = GROUND[r.id] ?? '#555';
    bctx.fillRect(0, 0, w, h);
    bctx.fillStyle = WALL;
    for (let y = 0; y < wmap.solid.length; y++) {
      for (let x = r.x0; x < r.x1; x++) if (wmap.solid[y][x]) bctx.fillRect((x - r.x0) * PX, y * PX, PX, PX);
    }
    // 다른 지역으로 나가는 길(지역 가장자리의 걸을 수 있는 칸) — 노란색
    bctx.fillStyle = '#f2c94c';
    for (let y = 0; y < wmap.solid.length; y++) {
      if (r.x0 > 0 && !wmap.solid[y][r.x0]) bctx.fillRect(0, y * PX, PX, PX);
      if (r.x1 < wmap.solid[0].length && !wmap.solid[y][r.x1 - 1]) bctx.fillRect(w - PX, y * PX, PX, PX);
    }
    // 이 지역 안의 보스 방(4차: 방이 여러 개) — 주황 테두리
    for (const R of bossRooms) {
      if (R.x0 < r.x0 || R.x1 > r.x1) continue;
      bctx.strokeStyle = '#ff8a3d'; bctx.lineWidth = 1;
      bctx.strokeRect((R.x0 - r.x0) * PX + 0.5, R.y0 * PX + 0.5, (R.x1 - R.x0) * PX - 1, (R.y1 - R.y0) * PX - 1);
    }
  }

  // 큰 화면(폴드 펼침 등)에서는 1.5배로 크게 보여 준다. 화면 크기가 바뀔 때도 부른다
  function resize() {
    const k = Math.min(innerWidth, innerHeight) >= 600 ? 1.5 : 1;
    canvas.style.width = canvas.width * k + 'px'; canvas.style.height = canvas.height * k + 'px';
  }

  // knight: {x,y}(픽셀), monsters: 게임 몬스터 목록({alive, sprite:{x,y}, def:{isBoss}}) — 쉬는 몬스터도 위치만 읽는다
  function draw(knight, monsters) {
    if (!open || !region) return;
    ctx.drawImage(base, 0, 0);
    const dot = (px, py, color, size = 3) => {
      const tx = px / tile - region.x0, ty = py / tile;
      if (tx < 0 || tx >= region.x1 - region.x0) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(tx * PX - size / 2), Math.round(ty * PX - size / 2), size, size);
    };
    for (const m of monsters) if (m.alive) dot(m.sprite.x, m.sprite.y, m.def.isBoss ? '#ff8a3d' : '#ff4d4d', m.def.isBoss ? 5 : 3);
    if (region.id === 'town') for (const n of npcs) dot(n.x * tile + 8, n.y * tile + 8, '#6fc3ff', 4);
    blink = (blink + 1) % 4;
    dot(knight.x, knight.y, '#000000', 7); // 테두리
    dot(knight.x, knight.y, blink < 2 ? '#ffffff' : '#ffe08a', 5);
  }

  return { setRegion, draw, setOpen, resize, isOpen: () => open, destroy: () => box.remove() };
}

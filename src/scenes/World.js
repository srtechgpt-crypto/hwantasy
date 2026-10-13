// 게임 화면: 지도, 기사, 몬스터·보스, NPC, 전투, 자동 사냥. 숫자 계산은 모두 domain 모듈에 맡긴다.
// 시간: 전투·무적·재생성·땅 아이템·보스 방 초기화는 게임 시계(this.gt, 멈추면 안 흐름), 보스 재등장만 실제 시각(Date.now).
import bal from '../../data/balance.js';
import { buildWorld, TILE, W, H, mapIdAt, regionName, inBossRoom, BOSS_ROOM, NPCS, TINTS, REGIONS } from '../../data/maps.js';
import { makeRng } from '../domain/rng.js';
import * as prog from '../domain/progression.js';
import * as combat from '../domain/combat.js';
import * as rewards from '../domain/rewards.js';
import * as inv from '../domain/inventory.js';
import { bossRemainMs, bossReady, normalizeBossTime } from '../domain/boss.js';
import { decideAuto } from '../domain/autohunt.js';
import { createJoystick } from '../ui/joystick.js';
import { createMinimap } from '../ui/minimap.js';
import { loadPrefs, savePrefs } from '../ui/prefs.js';
import { G, hud, josa } from '../state.js';

const SPEED = 56;            // 기사 이동 속도(px/초)
const MON_SPEED = 30;
const ATTACK_RANGE = 20;
const MON_RANGE = 15;
const AGGRO = 4 * TILE;
const RESPAWN_MS = 15000;
const GROUND_ITEM_MS = 30000;
const ACTIVE_MIN = 26 * TILE; // 기사에서 이보다 먼 몬스터는 쉰다(폰 부담 줄이기). 화면이 넓으면 fitZoom이 늘린다
const BIG_SCREEN = 1100;      // 짧은 변이 이보다 크면(태블릿·PC) 기본 3배, 그 밖(폰·폴드)은 기본 2배
const AUTO_RESUME_MS = 400;   // 자동 사냥 중 조이스틱에서 손을 떼고 다시 자동으로 움직이기까지
const TALK_RANGE = 1.7 * TILE;
const DIRS = ['down', 'up', 'left', 'right'];
const MON_KEYS = {
  jelly: 'm_jelly', mouse: 'm_mouse', hopfrog: 'm_hopfrog', goblin: 'm_goblin',
  raccoon: 'm_raccoon', vine: 'm_vine', nightwing: 'm_nightwing',
  crab: 'm_crab', ember: 'm_ember', stalker: 'm_stalker', boss: 'm_boss',
};
const AGGRESSIVE = new Set(['hopfrog', 'goblin', 'raccoon', 'vine', 'nightwing', 'crab', 'ember', 'stalker']);
const ICON_IDS = ['woodSword', 'ironSword', 'steelSword', 'deepSword', 'clothArmor', 'leatherArmor', 'chainArmor', 'plateArmor', 'potion', 'returnScroll', 'weaponScroll', 'armorScroll'];
const SWORD_TINT = { woodSword: 0xd09a62, ironSword: 0xffffff, steelSword: 0xc4ecff, deepSword: 0xc89cff };
const BOSS_SCALE = 2;
const BOSS_REACH = 12; // 보스는 몸이 커서 공격이 조금 더 멀리서 닿는다

const monDef = (id) => bal.monsters.find((m) => m.id === id);
const potionDef = bal.consumables.find((c) => c.id === 'potion');
const countOf = (save, id) => save.bag.filter((i) => i.id === id).reduce((s, i) => s + (i.count ?? 1), 0);
const itemByUid = (save, uid) => (uid ? save.bag.find((i) => i.uid === uid) || null : null);
const ratesOf = (save) => save.rates;
// 기사(금발 기사, PixelLab) 그림: 40×40 칸, 한 줄이 한 방향(8방향), 13칸.
// 칸: 0 서 있기, 1~6 걷기, 7~12 칼 휘두르기. 발끝(그림 아래 끝)이 33px 줄
const HERO_FRAME = 40;
const HERO_FEET = 33;
const HERO_COLS = 13;
const HERO_IDLE = [0];
const HERO_WALK = [1, 2, 3, 4, 5, 6];
const HERO_ATK = [7, 8, 9, 10, 11, 12];
const HERO_ROW = { down: 0, downRight: 1, right: 2, upRight: 3, up: 4, upLeft: 5, left: 6, downLeft: 7 };
const DIR8 = ['right', 'downRight', 'down', 'downLeft', 'left', 'upLeft', 'up', 'upRight'];
const dir8Of = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
const fmtRemain = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`; };

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  preload() {
    this.load.image('tiles', 'assets/tiles.png');
    this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.image('sword', 'assets/sword.png');
    this.load.spritesheet('fx_return', 'assets/fx_return.png', { frameWidth: 32, frameHeight: 32 });
    for (const key of Object.values(MON_KEYS)) this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: 16, frameHeight: 16 });
    for (const n of NPCS) this.load.spritesheet(`npc_${n.id}`, `assets/npc_${n.id}.png`, { frameWidth: 16, frameHeight: 16 });
    for (const id of ICON_IDS) this.load.image(`ic_${id}`, `assets/icons/${id}.png`);
    this.load.spritesheet('fx_slash', 'assets/fx_slash.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fx_smoke', 'assets/fx_smoke.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fx_levelup', 'assets/fx_levelup.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    G.scene = this;
    this.rng = makeRng(Date.now() % 2147483647);
    this.gt = 0; // 게임 시계(ms)
    this.wmap = buildWorld();
    this.buildMap();
    this.makeAnims();

    // 기사 위치(this.knight)는 발 기준. 그림(this.hero)과 칼(this.sword)은 매 프레임 따라 붙는다.
    this.knight = { x: this.wmap.spawn.x, y: this.wmap.spawn.y };
    // 발끝이 그림 칸의 HERO_FEET 줄에 있다
    this.hero = this.add.sprite(this.knight.x, this.knight.y, 'hero', 0).setOrigin(0.5, HERO_FEET / HERO_FRAME).setDepth(10);
    this.dir8 = 'down';
    this.hero.play('hero_idle_down');
    // 칼은 기사 그림에 들어 있어 따로 그리지 않는다(예전 칼 그림은 숨김)
    this.sword = this.add.image(0, 0, 'sword').setVisible(false);
    this.swinging = false;
    this.lunge = { x: 0, y: 0 };
    this.face = 'down';
    this.facingLeft = false;
    this.cameraTarget = this.add.zone(this.knight.x, this.knight.y - 8, 1, 1);
    this.cameras.main.setBounds(0, 0, W * TILE, H * TILE);
    this.cameras.main.startFollow(this.cameraTarget, true, 1, 1);
    this.smoothCamera();
    this.prefs = loadPrefs();
    this.fitZoom();
    this.scale.on('resize', () => { this.fitZoom(); this.joy?.reset(); });

    this.makeDarkness();
    this.makeNpcs();

    this.monsters = [];
    this.groundItems = [];
    this.boss = null;
    this.bossAway = 0;
    this.slam = null;
    this.bossTick = 0;
    this.attackCd = 0;
    this.potionCd = 0;
    this.regenT = 0;
    this.autoSaveT = 0;
    this.invulnUntil = 0;
    this.autoResumeAt = 0;
    this.autoCenter = null;
    this.autoTarget = null;
    this.stuck = { id: null, best: Infinity, sec: 0 };
    this.attackHeld = false;
    this.talkNpc = null;
    this.playing = false;
    this.region = 'town';

    this.joy = createJoystick({
      zone: document.getElementById('game'),
      onRelease: () => { this.autoResumeAt = this.gt + AUTO_RESUME_MS; this.autoCenter = { x: this.knight.x, y: this.knight.y }; },
    });
    this.bindButtons();
    this.minimap = createMinimap({
      root: document.getElementById('hud'), wmap: this.wmap, regions: REGIONS, npcs: NPCS, bossRoom: BOSS_ROOM, tile: TILE,
      onToggle: (open) => { this.prefs.mini = open; savePrefs(this.prefs); },
    });
    this.minimap.setOpen(this.prefs.mini);
    this.miniT = 0;
    this.refreshZoomButtons();
    G.onSceneReady?.();
  }

  // ---------- 지도 ----------
  buildMap() {
    const map = this.make.tilemap({ width: W, height: H, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    const ground = map.createBlankLayer('ground', ts).setDepth(0);
    const deco = map.createBlankLayer('deco', ts).setDepth(1);
    const over = map.createBlankLayer('over', ts).setDepth(1000);
    const world = this.wmap;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tint = TINTS[mapIdAt(x * TILE)];
      const g = ground.putTileAt(world.ground[y][x], x, y);
      if (tint) g.tint = tint.ground;
      if (world.deco[y][x] >= 0) { const d = deco.putTileAt(world.deco[y][x], x, y); if (tint) d.tint = tint.deco; }
      if (world.over[y][x] >= 0) { const o = over.putTileAt(world.over[y][x], x, y); if (tint) o.tint = tint.deco; }
    }
    for (const l of world.labels) {
      this.add.text(l.x, l.y, l.text, { fontFamily: 'Batang, serif', fontSize: '9px', color: '#efe4c8', stroke: '#14161f', strokeThickness: 3, resolution: 4 })
        .setOrigin(0.5).setDepth(5);
    }
    // 보스 방 표지판 글씨(1초마다 갱신)
    this.bossSign = this.add.text((BOSS_ROOM.x0 - 4) * TILE + 8, 18 * TILE + 10, '', { fontFamily: 'system-ui, sans-serif', fontSize: '7px', color: '#ffd9a0', stroke: '#14161f', strokeThickness: 3, resolution: 4, align: 'center' })
      .setOrigin(0.5).setDepth(6);
  }

  // 폐광: 기사 둘레만 밝은 어둠 그림(기사를 따라다님 — 좌표 변환 없음)
  makeDarkness() {
    // 카메라가 지도 끝에 막혀 기사가 화면 가장자리에 있어도 덮이게 보이는 넓이의 2배 + 여유
    const z = this.zoomZ || 1;
    const w = Math.ceil(2 * this.scale.width / z) + 64, h = Math.ceil(2 * this.scale.height / z) + 64;
    // 크기가 같으면 다시 만들지 않는다. 다시 만들면 진행 중인 페이드를 끊고 지금 지역에 맞는 밝기로 바로 맞춘다
    if (this.dark && this.darkSize === `${w}x${h}`) return;
    this.darkSize = `${w}x${h}`;
    const alpha = this.region === 'mine' ? 1 : 0;
    if (this.dark) { this.tweens.killTweensOf(this.dark); this.dark.destroy(); this.textures.remove('dark'); }
    const tex = this.textures.createCanvas('dark', w, h), c = tex.getContext();
    const g = c.createRadialGradient(w / 2, h / 2, 16, w / 2, h / 2, 118);
    g.addColorStop(0, 'rgba(6,5,12,0)');
    g.addColorStop(0.3, 'rgba(6,5,12,0.3)');
    g.addColorStop(0.65, 'rgba(6,5,12,0.66)');
    g.addColorStop(1, 'rgba(6,5,12,0.9)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    tex.refresh();
    this.dark = this.add.image(this.snap(this.knight?.x ?? 0), this.snap((this.knight?.y ?? 8) - 8), 'dark').setDepth(975).setAlpha(alpha);
  }

  makeNpcs() {
    this.npcs = NPCS.map((n) => {
      const x = n.x * TILE + 8, y = n.y * TILE + 12;
      const sprite = this.add.sprite(x, y, `npc_${n.id}`, 0).setOrigin(0.5, 0.75).setDepth(10 + y / 1000);
      this.tweens.add({ targets: sprite, y: y - 1, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(x, y - 15, n.name, { fontFamily: 'system-ui, sans-serif', fontSize: '7px', fontStyle: 'bold', color: '#9fd8ff', stroke: '#0b0d14', strokeThickness: 3, resolution: 4 })
        .setOrigin(0.5).setDepth(6);
      return { ...n, px: x, py: y, sprite };
    });
  }

  solidAt(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return this.wmap.solid[ty][tx];
  }

  blocked(x, y) { return this.solidAt(x - 4, y + 2) || this.solidAt(x + 4, y + 2) || this.solidAt(x - 4, y - 2) || this.solidAt(x + 4, y - 2); }

  moveBy(obj, dx, dy, test = (x, y) => this.blocked(x, y)) {
    const nx = obj.x + dx, ny = obj.y + dy;
    let moved = false;
    if (!test(nx, obj.y)) { obj.x = nx; moved = true; }
    if (!test(obj.x, ny)) { obj.y = ny; moved = true; }
    return moved;
  }

  // 일반 몬스터는 보스 방에 못 들어가고, 보스는 방 밖으로 못 나간다
  monsterBlocked(m, x, y) {
    if (this.blocked(x, y)) return true;
    return m.def.isBoss ? !inBossRoom(x, y) : inBossRoom(x, y);
  }

  fitZoom() {
    // 정수 배율이어야 도트가 흔들리지 않는다. '보통' = 폰·폴드 2배(폰 915×412 → 약 29×13칸, 폴드7 펼침 약 832×750 → 약 26×23칸),
    // 짧은 변 1100 이상인 큰 화면만 3배. 멀리 −1 / 가까이 +1 → 폰·폴드는 1·2·3배.
    const w = this.scale.width, h = this.scale.height;
    const base = Math.min(w, h) >= BIG_SCREEN ? 3 : 2;
    const z = Math.min(6, Math.max(1, base + (this.prefs?.zoom ?? 0)));
    this.zoomZ = z;
    this.cameras.main.setZoom(z);
    // 화면이 넓어지면 보이는 몬스터가 쉬지 않게(화면 대각선 전체 + 2칸), 폐광 어둠도 화면을 덮게 다시 만든다
    this.activeRange = Math.max(ACTIVE_MIN, Math.hypot(w / z, h / z) + 2 * TILE);
    if (this.dark) this.makeDarkness();
    this.minimap?.resize();
  }

  setZoomPref(v) {
    this.prefs.zoom = v; savePrefs(this.prefs);
    this.fitZoom(); this.refreshZoomButtons();
  }

  refreshZoomButtons() {
    for (const [id, v] of [['zoomFar', -1], ['zoomMid', 0], ['zoomNear', 1]]) document.getElementById(id)?.classList.toggle('on', this.prefs.zoom === v);
  }

  // 화면 끊김 방지: Phaser의 roundPixels는 카메라 위치를 그림 1칸(=화면 3픽셀) 단위로 내려서
  // 걸을 때 화면이 3픽셀씩 고르지 않게 튄다. 카메라는 화면 1픽셀 단위로 움직이게 하고,
  // 그릴 때만 그림 네모를 화면 픽셀에 맞춘다(첫 꼭짓점 기준 이동, 도트 선명함 유지).
  // ※ Phaser 3.90.0(vendor) 내부값 renderRoundPixels에 기대는 방식 — 엔진을 올리면 도구/끊김측정.py로 다시 확인.
  //   줌은 fitZoom(정수)에서만 바꾼다.
  smoothCamera() {
    const cam = this.cameras.main;
    cam.setRoundPixels(false);
    const pre = cam.preRender.bind(cam);
    cam.preRender = () => { pre(); cam.renderRoundPixels = Number.isInteger(cam.zoomX) && Number.isInteger(cam.zoomY); };
  }

  // 화면 1픽셀(=그림 1/배율칸) 단위로 맞춘다
  snap(v) { const z = this.zoomZ || 1; return Math.round(v * z) / z; }

  makeAnims() {
    const mk = (key, prefix) => DIRS.forEach((d, c) => {
      this.anims.create({ key: `${prefix}_walk_${d}`, frames: [0, 4, 8, 12].map((f) => ({ key, frame: f + c })), frameRate: 8, repeat: -1 });
    });
    for (const [d, row] of Object.entries(HERO_ROW)) {
      const fr = (cols) => cols.map((c) => ({ key: 'hero', frame: row * HERO_COLS + c }));
      this.anims.create({ key: `hero_idle_${d}`, frames: fr(HERO_IDLE), frameRate: 3, repeat: -1 });
      this.anims.create({ key: `hero_run_${d}`, frames: fr(HERO_WALK), frameRate: 10, repeat: -1 });
      this.anims.create({ key: `hero_atk_${d}`, frames: fr(HERO_ATK), frameRate: 22, repeat: 0 });
    }
    this.anims.create({ key: 'fx_return', frames: this.anims.generateFrameNumbers('fx_return'), frameRate: 14 });
    for (const [id, key] of Object.entries(MON_KEYS)) mk(key, id);
    this.anims.create({ key: 'fx_slash', frames: this.anims.generateFrameNumbers('fx_slash'), frameRate: 20 });
    this.anims.create({ key: 'fx_smoke', frames: this.anims.generateFrameNumbers('fx_smoke'), frameRate: 14 });
    this.anims.create({ key: 'fx_levelup', frames: this.anims.generateFrameNumbers('fx_levelup'), frameRate: 10, repeat: 1 });
  }

  // ---------- 시작·끝 ----------
  enterGame(isNew) {
    // 폰 시각이 처치 시각보다 앞으로 돌아갔으면 처치 시각을 지금으로(10분 다시 셈)
    const fixed = normalizeBossTime(G.save, Date.now());
    if (fixed !== G.save) { G.save = fixed; G.persist('bossTime'); }
    const p = G.save.player;
    const valid = Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0 && p.y > 0 &&
      p.x < W * TILE && p.y < H * TILE && mapIdAt(p.x) === p.map && !this.blocked(p.x, p.y);
    this.knight.x = valid ? p.x : this.wmap.spawn.x; this.knight.y = valid ? p.y : this.wmap.spawn.y;
    if (!valid) Object.assign(p, { map: 'town', x: this.knight.x, y: this.knight.y });
    this.drawHero();
    this.releaseInput();
    this.setAuto(false);
    this.cancelSlam();
    this.invulnUntil = this.gt + 3000;
    this.clearMonsters();
    this.spawnAll();
    this.refreshGear();
    this.playing = true;
    hud.log(isNew ? '바람 마을에 도착했습니다. 마을 사람들에게 다가가 [대화]를 눌러 보세요.' : `다시 오셨습니다. Lv ${p.level} 기사`);
    this.refreshHud(true);
  }

  leaveGame() { this.playing = false; this.setAuto(false); this.releaseInput(); }

  // 창이 열릴 때: 조이스틱과 눌린 공격 버튼을 놓는다
  releaseInput() { this.joy?.reset(); this.attackHeld = false; }

  positionOf() { return { map: mapIdAt(this.knight.x), x: Math.round(this.knight.x), y: Math.round(this.knight.y) }; }

  syncPosition() {
    if (!G.save || !this.playing) return;
    Object.assign(G.save.player, this.positionOf());
  }

  // 순간이동 저장이 성공한 뒤 불린다(G.save.player에 목적지가 이미 들어 있음)
  applyTeleport(name) {
    this.setAuto(false);
    this.releaseInput();
    this.cancelSlam();
    this.cancelSwing();
    this.returnBurst(this.knight.x, this.knight.y, false);
    this.knight.x = G.save.player.x; this.knight.y = G.save.player.y;
    this.drawHero();
    this.returnBurst(this.knight.x, this.knight.y, true);
    this.cameras.main.flash(260, 200, 230, 255);
    this.invulnUntil = this.gt + 1500;
    for (const m of this.monsters) m.aggro = false;
    hud.log(`순간이동 마법사가 ${josa(name, '으로/로')} 보내 주었습니다`);
    this.refreshHud(true);
  }

  // 장착 장비가 바뀐 뒤: 칼 색·보이기
  refreshGear() {
    const w = itemByUid(G.save, G.save.equip.weapon);
    this.sword.setVisible(false);
    if (w) this.sword.setTint(SWORD_TINT[w.id] ?? 0xffffff);
    this.refreshHud(true);
  }

  // ---------- 버튼 ----------
  bindButtons() {
    const on = (id, fn) => document.getElementById(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (this.canAct()) fn(); });
    const atk = document.getElementById('btnAttack');
    atk.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (this.canAct() && this.talkNpc) { G.ui.open(this.talkNpc.kind); return; }
      this.attackHeld = true;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => atk.addEventListener(t, () => { this.attackHeld = false; }));
    on('btnPotion', () => this.drinkPotion(true));
    // 메뉴의 화면 크기(메뉴가 열려 있어 게임은 멈춘 상태)
    for (const [id, v] of [['zoomFar', -1], ['zoomMid', 0], ['zoomNear', 1]]) {
      document.getElementById(id)?.addEventListener('click', () => this.setZoomPref(v));
    }
    on('btnReturn', () => this.useReturn('직접'));
    on('btnAuto', () => {
      if (G.auto) { this.setAuto(false); return; }
      if (mapIdAt(this.knight.x) === 'town') { hud.toast('자동 사냥은 사냥터에서 켜 주세요'); return; }
      if (inBossRoom(this.knight.x, this.knight.y)) { hud.toast('보스는 직접 싸워 주세요'); return; }
      this.setAuto(true);
    });
  }

  canAct() { return this.playing && G.pause.size === 0 && G.save && !G.pending; }

  setAuto(onOff) {
    G.auto = onOff;
    hud.setAuto(onOff);
    if (onOff) { this.autoCenter = { x: this.knight.x, y: this.knight.y }; this.autoTarget = null; this.autoResumeAt = 0; }
  }

  // ---------- 몬스터 ----------
  clearMonsters() {
    for (const m of this.monsters) { m.sprite.destroy(); m.bar.destroy(); m.label?.destroy(); }
    this.monsters = [];
    this.boss = null;
    for (const g of this.groundItems) g.sprite.destroy();
    this.groundItems = [];
  }

  spawnAll() {
    for (const z of this.wmap.zones) for (let i = 0; i < z.count; i++) {
      const m = this.makeMonster(z.monsters[i % z.monsters.length], z);
      this.respawn(m, true);
    }
    this.trySpawnBoss();
  }

  makeMonster(id, zone) {
    const def = monDef(id);
    const sprite = this.add.sprite(0, 0, MON_KEYS[id], 0).setOrigin(0.5, 0.75);
    const bar = this.add.graphics().setDepth(900);
    const m = { uid: `${id}_${this.monsters.length}`, id, def, zone, sprite, bar, hp: def.hp, alive: false, respawnAt: 0, cd: 0, wander: 0, vx: 0, vy: 0, aggro: false, dir: 'down', hurtAt: -1e9, reach: 0 };
    this.monsters.push(m);
    return m;
  }

  respawn(m, initial = false) {
    const z = m.zone;
    for (let tries = 0; tries < 60; tries++) {
      const x = (z.x0 + Math.random() * (z.x1 - z.x0)) * TILE, y = (z.y0 + Math.random() * (z.y1 - z.y0)) * TILE;
      if (this.monsterBlocked(m, x, y)) continue;
      if (Math.hypot(x - this.knight.x, y - this.knight.y) < (initial ? 5 : 6) * TILE) continue;
      m.sprite.setPosition(x, y).setVisible(true).setAlpha(1);
      m.hp = m.def.hp; m.alive = true; m.aggro = false; m.cd = 0; m.asleep = false;
      m.sprite.play(`${m.id}_walk_down`);
      return;
    }
    m.respawnAt = this.gt + 2000; // 자리 못 찾으면 잠시 뒤 다시
  }

  // 보스: 처음·재등장·다시 열기 모두 bossReady 하나로 판단(일반 재생성 없음)
  trySpawnBoss() {
    if (this.boss?.alive || !G.save) return;
    if (!bossReady(G.save.boss.defeatedAt, Date.now(), bal)) return;
    if (!this.boss) {
      const def = monDef('boss');
      const sprite = this.add.sprite(0, 0, MON_KEYS.boss, 0).setOrigin(0.5, 0.8).setScale(BOSS_SCALE);
      const bar = this.add.graphics().setDepth(900);
      const label = this.add.text(0, 0, def.name, { fontFamily: 'Batang, serif', fontSize: '8px', fontStyle: 'bold', color: '#ffb08a', stroke: '#14161f', strokeThickness: 3, resolution: 4 }).setOrigin(0.5).setDepth(901);
      this.boss = { uid: 'boss', id: 'boss', def, zone: null, sprite, bar, label, hp: def.hp, alive: false, cd: 0, aggro: false, dir: 'down', hurtAt: -1e9, reach: BOSS_REACH, attacks: 0 };
      this.monsters.push(this.boss);
    }
    const b = this.boss;
    const cx = ((BOSS_ROOM.x0 + BOSS_ROOM.x1) / 2 + 2) * TILE, cy = ((BOSS_ROOM.y0 + BOSS_ROOM.y1) / 2) * TILE;
    b.sprite.setPosition(cx, cy).setVisible(true).setAlpha(1).setTint(0xffb0a0);
    b.label.setVisible(true);
    b.sprite.play('boss_walk_down');
    b.hp = b.def.hp; b.alive = true; b.aggro = false; b.cd = 0; b.attacks = 0;
    this.bossAway = 0;
    if (Math.abs(this.knight.x - cx) < 40 * TILE) hud.log('<b style="color:#ff9a7a">폐광 깊은 곳에서 큰울림이 깨어났습니다</b>');
  }

  resetBoss() {
    const b = this.boss;
    if (!b?.alive) return;
    b.hp = b.def.hp; b.attacks = 0; b.aggro = false;
    this.cancelSlam();
  }

  // ---------- 매 프레임 ----------
  update(time, deltaMs) {
    if (!this.playing || !G.save) return;
    const paused = G.pause.size > 0 || !!G.pending;
    if (paused) { this.hero.anims.pause(); return; }
    this.hero.anims.resume();
    const dtMs = Math.min(50, deltaMs);
    this.gt += dtMs;
    const dt = dtMs / 1000;
    const now = this.gt;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);

    const v = this.joy.vector();
    let walking = false;
    if (v.active && (v.x || v.y)) {
      walking = this.moveBy(this.knight, v.x * SPEED * dt, v.y * SPEED * dt);
      this.face = dirOf(v.x, v.y); this.dir8 = dir8Of(v.x, v.y);
    } else if (G.auto && !v.active && now >= this.autoResumeAt) {
      walking = this.runAuto(dt);
    }
    if (G.auto && inBossRoom(this.knight.x, this.knight.y)) { this.setAuto(false); hud.toast('보스 방에서는 자동 사냥이 꺼집니다. 직접 싸워 주세요', 2600); }
    if (this.attackHeld) this.tryAttack();
    if (G.pending) return; // 보스 저장 실패 등: 같은 프레임에 다른 상태를 바꾸지 않는다

    if (this.swinging && this.gt >= this.swingEnd) this.swinging = false;
    if (!this.swinging) this.hero.play(`${walking ? 'hero_run' : 'hero_idle'}_${this.dir8}`, true);
    this.drawHero();

    this.updateMonsters(dt, now);
    if (G.pending) return;
    this.updateSlam(now);
    this.updateGroundItems(now);
    this.updateTalk();
    this.updateRegion();
    this.tickRegen(dt);

    this.bossTick += dt;
    if (this.bossTick >= 1) {
      this.bossTick = 0;
      const fixed = normalizeBossTime(G.save, Date.now());
      if (fixed !== G.save) { G.save = fixed; G.persist('bossTime'); }
      this.trySpawnBoss(); this.updateBossSign();
    }

    // 미니맵은 0.25초마다(접혀 있으면 그리지 않음)
    this.miniT += dtMs;
    if (this.miniT >= 250) {
      this.miniT = 0;
      this.minimap.setRegion(mapIdAt(this.knight.x));
      this.minimap.draw(this.knight, this.monsters);
    }

    this.autoSaveT += dt;
    if (this.autoSaveT >= 5) { this.autoSaveT = 0; G.persist('auto'); }
    this.refreshHud();
  }

  updateRegion() {
    const r = mapIdAt(this.knight.x);
    if (r !== this.region) {
      this.region = r;
      this.tweens.killTweensOf(this.dark);
      this.tweens.add({ targets: this.dark, alpha: r === 'mine' ? 1 : 0, duration: 700 });
      if (r !== 'town') hud.toast(regionName(r), 1400);
    }
    this.dark.setPosition(this.snap(this.knight.x), this.snap(this.knight.y - 8));
  }

  updateTalk() {
    let best = null, bd = TALK_RANGE;
    if (this.region === 'town') for (const n of this.npcs) {
      const d = Math.hypot(n.px - this.knight.x, n.py - this.knight.y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best !== this.talkNpc) { this.talkNpc = best; hud.setTalk(best?.name ?? null); }
  }

  updateBossSign() {
    const ms = bossRemainMs(G.save.boss.defeatedAt, Date.now(), bal);
    this.bossSign.setText(this.boss?.alive ? '큰울림이 깨어 있다' : ms > 0 ? `다시 깨어나기까지\n${fmtRemain(ms)}` : '');
  }

  // ---------- 기사 행동 ----------
  stats() {
    const s = G.save;
    return prog.playerStats(s.player.level, { weapon: itemByUid(s, s.equip.weapon), armor: itemByUid(s, s.equip.armor) }, bal);
  }

  dist(m) { return Math.hypot(m.sprite.x - this.knight.x, m.sprite.y - this.knight.y) - (m.reach || 0); }

  // 보스는 기사도 방 안에 있을 때만 때릴 수 있다(방 밖에서 일방적으로 치기 방지)
  canHit(m) { return m.alive && (!m.def.isBoss || inBossRoom(this.knight.x, this.knight.y)); }

  nearestMonster(range) {
    let best = null, bd = range;
    for (const m of this.monsters) {
      if (!this.canHit(m)) continue;
      const d = this.dist(m);
      if (d <= bd) { bd = d; best = m; }
    }
    return best;
  }

  tryAttack(target) {
    if (this.attackCd > 0) return false;
    const m = target && this.canHit(target) && this.dist(target) <= ATTACK_RANGE ? target : this.nearestMonster(ATTACK_RANGE);
    if (!m) return false;
    this.attackCd = bal.knight.attackMs / 1000;
    this.face = dirOf(m.sprite.x - this.knight.x, m.sprite.y - this.knight.y);
    this.swingAt(m);
    const r = combat.playerAttack(this.stats(), m.def, G.save.player.level, this.rng, bal);
    m.aggro = true;
    if (!r.hit) { this.floatText(m.sprite.x, m.sprite.y - 14, 'MISS', '#c9c2b0'); return true; }
    m.hp -= r.dmg;
    m.hurtAt = this.gt;
    if (!m.def.isBoss) this.knockback(m); else this.flashWhite(m);
    this.floatText(m.sprite.x, m.sprite.y - (m.def.isBoss ? 30 : 14), String(r.dmg), '#ffffff');
    if (m.hp <= 0) (m.def.isBoss ? this.killBoss(m) : this.killMonster(m));
    return true;
  }

  killMonster(m) {
    m.alive = false;
    m.respawnAt = this.gt + RESPAWN_MS;
    m.sprite.setVisible(false); m.bar.clear();
    this.smoke(m.sprite.x, m.sprite.y - 4, 0.6);

    const s = G.save;
    const rw = rewards.rollRewards(m.id, s.player.level, ratesOf(s), this.rng, bal);
    const before = s.player.level;
    const r = prog.addExp({ level: s.player.level, exp: s.player.exp }, rw.exp, bal);
    s.player.level = r.level; s.player.exp = r.exp;
    s.player.gold = Math.min(Number.MAX_SAFE_INTEGER, s.player.gold + rw.gold);
    const got = [];
    for (const d of rw.drops) {
      const res = inv.addItem(G.save, d.id, d.count, bal);
      if (res.ok) G.save = res.save;
      const placed = d.count - (res.ok ? res.overflow ?? 0 : d.count);
      if (placed > 0) got.push(`${nameOf(d.id)}${placed > 1 ? ` ${placed}개` : ''}`);
      const left = d.count - placed;
      if (left > 0) this.dropOnGround(d.id, left, m.sprite.x, m.sprite.y);
    }
    hud.log(`${m.def.name} 처치 · 경험치 +${rw.exp.toLocaleString('ko-KR')} · 돈 +${rw.gold.toLocaleString('ko-KR')}${got.length ? ` · ${got.join(', ')}` : ''}`);
    if (r.level > before) {
      this.levelUpFx(r.level);
      G.persist('levelup');
    } else if (got.length) G.persist('drop');
  }

  // 보스: 보상 전부 + 처치 시각을 한 후보로 만들어 한 번에 저장(성공해야 확정)
  killBoss(b) {
    b.alive = false;
    this.cancelSlam();
    b.sprite.setVisible(false); b.bar.clear(); b.label.setVisible(false);
    const x = b.sprite.x, y = b.sprite.y;
    const s = G.save;
    const rw = rewards.rollRewards('boss', s.player.level, ratesOf(s), this.rng, bal);
    const res = inv.bossKill(s, rw, Date.now(), bal);
    if (!res.ok) { hud.toast(res.reason); b.alive = true; b.hp = 1; b.sprite.setVisible(true); b.label.setVisible(true); return; }
    const done = G.commit(res.save, 'boss', {
      mustSave: true,
      after: () => {
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 140, () => this.smoke(x + (Math.random() - 0.5) * 20, y - 8 - Math.random() * 12, 1));
        this.cameras.main.shake(400, 0.006);
        this.floatText(x, y - 34, '큰울림을 쓰러뜨렸다!', '#ffd36a', 2200);
        const list = (arr) => arr.map((d) => `${nameOf(d.id)}${d.count > 1 ? ` ${d.count}개` : ''}`).join(', ');
        hud.log(`<b style="color:#ffd36a">${b.def.name} 처치!</b> 경험치 +${rw.exp.toLocaleString('ko-KR')} · 돈 +${rw.gold.toLocaleString('ko-KR')}${res.toBag.length ? ` · ${list(res.toBag)}` : ''}`);
        if (res.toWarehouse.length) hud.log(`<span style="color:#9fd8ff">가방이 가득해 ${josa(list(res.toWarehouse), '은/는')} 창고지기에게 맡겨 두었습니다</span>`);
        for (const d of res.ground) this.dropOnGround(d.id, d.count, x, y);
        if (res.levelsGained > 0) { this.levelUpFx(G.save.player.level); G.persist('levelup'); }
        this.updateBossSign();
      },
    });
    if (!done && !G.pending) { b.alive = true; b.hp = 1; b.sprite.setVisible(true); b.label.setVisible(true); }
  }

  levelUpFx(level) {
    G.save.player.hp = this.stats().maxHp;
    const fx = this.add.sprite(this.knight.x, this.knight.y - 6, 'fx_levelup').setDepth(960);
    fx.play('fx_levelup'); fx.once('animationcomplete', () => fx.destroy());
    this.floatText(this.knight.x, this.knight.y - 22, 'LEVEL UP!', '#e0a63e', 1600);
    hud.log(`<b style="color:#e0a63e">레벨이 올랐습니다! 이제 Lv ${level}</b>`);
  }

  smoke(x, y, scale) {
    const s = this.add.sprite(x, y, 'fx_smoke').setDepth(950).setScale(scale);
    s.play('fx_smoke'); s.once('animationcomplete', () => s.destroy());
  }

  dropOnGround(id, count, x, y) {
    const sprite = this.add.image(x + (Math.random() - 0.5) * 10, y, `ic_${id}`).setDepth(9).setScale(0.7);
    this.groundItems.push({ id, count, sprite, until: this.gt + GROUND_ITEM_MS });
    hud.toast('가방이 가득 찼습니다. 아이템이 땅에 30초 동안 남습니다');
  }

  updateGroundItems(now) {
    if (G.pending) return;
    for (const g of [...this.groundItems]) {
      if (now > g.until) { g.sprite.destroy(); this.groundItems.splice(this.groundItems.indexOf(g), 1); continue; }
      g.sprite.setAlpha(g.until - now < 5000 ? 0.4 + 0.4 * Math.sin(now / 120) : 1);
      if (Math.hypot(g.sprite.x - this.knight.x, g.sprite.y - this.knight.y) < 10) {
        const res = inv.addItem(G.save, g.id, g.count, bal);
        const placed = res.ok ? g.count - (res.overflow ?? 0) : 0;
        if (placed > 0) {
          G.save = res.save; g.count -= placed;
          hud.log(`${josa(nameOf(g.id), '을/를')} 주웠습니다`);
          if (g.count <= 0) { g.sprite.destroy(); this.groundItems.splice(this.groundItems.indexOf(g), 1); }
          G.persist('pickup');
        }
      }
    }
  }

  drinkPotion(manual) {
    const s = G.save, st = this.stats();
    if (this.potionCd > 0) return false;
    if (countOf(s, 'potion') <= 0) { if (manual) hud.toast('물약이 없습니다'); return false; }
    if (s.player.hp >= st.maxHp) { if (manual) hud.toast('체력이 가득 찼습니다'); return false; }
    const res = inv.usePotion(s, bal);
    if (!res.ok) { if (manual) hud.toast(res.reason); return false; }
    G.save = res.save;
    const healed = res.healed ?? 0;
    this.potionCd = potionDef.cooldownMs / 1000;
    this.floatText(this.knight.x, this.knight.y - 18, `+${Math.round(healed)}`, '#7fd36a');
    return true;
  }

  useReturn(why) {
    const res = inv.useReturnScroll(G.save, bal);
    if (!res.ok) { hud.toast(res.reason || '귀환 주문서가 없습니다'); return false; }
    G.save = res.save;
    this.teleportTown();
    hud.log(why === '직접' ? '귀환 주문서를 읽어 마을로 돌아왔습니다' : `${why} — 귀환 주문서로 마을에 돌아왔습니다`);
    G.persist('return');
    return true;
  }

  teleportTown(effect = true) {
    this.setAuto(false);
    this.cancelSwing();
    this.cancelSlam();
    if (effect) this.returnBurst(this.knight.x, this.knight.y, false);
    this.knight.x = this.wmap.spawn.x; this.knight.y = this.wmap.spawn.y;
    this.drawHero();
    if (effect) { this.returnBurst(this.knight.x, this.knight.y, true); this.cameras.main.flash(260, 255, 244, 214); }
    this.invulnUntil = this.gt + 1500;
    for (const m of this.monsters) m.aggro = false;
  }

  tickRegen(dt) {
    this.regenT += dt;
    const every = bal.knight.regenMs / 1000;
    if (this.regenT < every) return;
    this.regenT -= every;
    const st = this.stats(), p = G.save.player;
    if (p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp + bal.knight.regenBase + Math.floor(p.level / bal.knight.regenDivisor));
  }

  hurtPlayer(dmg, color = '#ff6b5e') {
    const p = G.save.player;
    p.hp -= dmg;
    this.hero.setTint(0xff7766);
    this.time.delayedCall(120, () => this.hero.clearTint());
    this.floatText(this.knight.x, this.knight.y - 16, String(dmg), color);
    if (p.hp <= 0) this.die();
  }

  die() {
    const p = G.save.player;
    const before = { level: p.level, exp: p.exp };
    const after = prog.applyDeathPenalty(before, bal);
    p.level = after.level; p.exp = after.exp;
    p.hp = this.stats().maxHp;
    const lost = before.exp - after.exp;
    this.teleportTown(false);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    hud.toast(`쓰러졌습니다. 경험치를 ${lost.toLocaleString("ko-KR")} 잃고 마을에서 깨어났습니다`, 3200);
    hud.log(`쓰러졌습니다 · 경험치 -${lost.toLocaleString('ko-KR')}`);
    G.persist('death');
  }

  // ---------- 자동 사냥 ----------
  runAuto(dt) {
    const s = G.save, st = this.stats();
    const bagFull = s.bag.length >= bal.inventory.bagSlots;
    const ctx = {
      player: { x: this.knight.x, y: this.knight.y, hp: s.player.hp, maxHp: st.maxHp },
      center: this.autoCenter || { x: this.knight.x, y: this.knight.y },
      tile: TILE,
      potions: countOf(s, 'potion'),
      returnScrolls: countOf(s, 'returnScroll'),
      bagFull,
      potionReady: this.potionCd <= 0,
      attackReady: this.attackCd <= 0,
      attackRange: ATTACK_RANGE,
      monsters: this.monsters.map((m) => ({ id: m.uid, x: m.sprite.x, y: m.sprite.y, alive: m.alive, isBoss: !!m.def.isBoss })),
      targetId: this.autoTarget,
      stuckSec: this.stuck.id === this.autoTarget ? this.stuck.sec : 0,
    };
    const a = decideAuto(ctx, bal);
    const tgt = a.targetId ? this.monsters.find((m) => m.uid === a.targetId) : null;
    this.autoTarget = a.targetId ?? (a.action === 'move' && a.x !== undefined ? null : this.autoTarget);

    switch (a.action) {
      case 'potion': this.drinkPotion(false); return false;
      case 'return': if (!this.useReturn(`자동 사냥(${a.reason})`)) this.stopAuto(a.reason); return false;
      case 'stop': this.stopAuto(a.reason); return false;
      case 'attack':
        if (tgt) { this.trackStuck(tgt, dt); if (!this.tryAttack(tgt)) return this.walkTo(tgt.sprite.x, tgt.sprite.y, dt, ATTACK_RANGE - 4); }
        return false;
      case 'move': {
        const x = tgt ? tgt.sprite.x : a.x, y = tgt ? tgt.sprite.y : a.y;
        if (tgt) this.trackStuck(tgt, dt);
        if (x === undefined) return false;
        return this.walkTo(x, y, dt, tgt ? ATTACK_RANGE - 4 : 2);
      }
      default: return false;
    }
  }

  stopAuto(reason) {
    this.setAuto(false);
    if (reason) hud.toast(reason, 2600);
    return false;
  }

  trackStuck(m, dt) {
    const d = Math.hypot(m.sprite.x - this.knight.x, m.sprite.y - this.knight.y);
    if (this.stuck.id !== m.uid) this.stuck = { id: m.uid, best: d, sec: 0 };
    else if (d < this.stuck.best - 1) { this.stuck.best = d; this.stuck.sec = 0; }
    else this.stuck.sec += dt;
  }

  walkTo(x, y, dt, stopDist) {
    const dx = x - this.knight.x, dy = y - this.knight.y, d = Math.hypot(dx, dy);
    if (d <= stopDist) return false;
    this.face = dirOf(dx, dy); this.dir8 = dir8Of(dx, dy);
    return this.moveBy(this.knight, (dx / d) * SPEED * dt, (dy / d) * SPEED * dt);
  }

  // ---------- 몬스터 움직임 ----------
  updateMonsters(dt, now) {
    const inTown = mapIdAt(this.knight.x) === 'town';
    const playerInRoom = inBossRoom(this.knight.x, this.knight.y);
    const st = this.stats();
    for (const m of this.monsters) {
      if (!m.alive) { if (!m.def.isBoss && now >= m.respawnAt) this.respawn(m); continue; }
      const dx = this.knight.x - m.sprite.x, dy = this.knight.y - m.sprite.y, d = Math.hypot(dx, dy);
      if (!m.def.isBoss && d > this.activeRange) { // 먼 몬스터는 움직임·그리기·애니메이션 모두 쉰다
        if (!m.asleep) { m.asleep = true; m.aggro = false; m.sprite.anims.pause(); m.sprite.setVisible(false); m.bar.clear(); }
        continue;
      }
      if (m.asleep) { m.asleep = false; m.sprite.setVisible(true); m.sprite.anims.resume(); }
      m.cd = Math.max(0, m.cd - dt);
      const test = (x, y) => this.monsterBlocked(m, x, y);
      let moving = false;
      if (m.def.isBoss) {
        // 보스: 기사가 방 안에 있을 때만 싸운다. 방 밖에 30초(게임 시계) 있으면 체력·공격 횟수 초기화
        if (playerInRoom) { this.bossAway = 0; m.aggro = true; }
        else {
          m.aggro = false;
          this.bossAway += dt * 1000;
          if (this.bossAway >= bal.boss.roomResetMs && (m.hp < m.def.hp || m.attacks)) this.resetBoss();
        }
      } else {
        if (!m.aggro && AGGRESSIVE.has(m.id) && d < AGGRO && !inTown && !playerInRoom) m.aggro = true;
        if (m.aggro && (inTown || playerInRoom || d > AGGRO * 2.5)) m.aggro = false;
      }
      const range = MON_RANGE + (m.reach || 0);
      if (m.aggro) {
        const sp = m.def.isBoss ? MON_SPEED : MON_SPEED * 1.4;
        if (d > range) { moving = this.moveBy(m.sprite, (dx / d) * sp * dt, (dy / d) * sp * dt, test); m.dir = dirOf(dx, dy); }
        else if (m.cd <= 0 && !(m.def.isBoss && this.slam)) {
          m.cd = bal.combat.monsterAttackMs / 1000;
          m.dir = dirOf(dx, dy);
          if (m.def.isBoss && ++m.attacks % bal.boss.slamEvery === 0) { this.startSlam(m); m.cd += bal.boss.slamWarnMs / 1000; }
          else if (now >= this.invulnUntil) {
            const r = combat.monsterAttack(m.def, st, G.save.player.level, this.rng, bal);
            if (r.hit) this.hurtPlayer(r.dmg); else this.floatText(this.knight.x, this.knight.y - 16, 'MISS', '#c9c2b0');
            if (!G.save || G.save.player.hp <= 0) return;
          }
        }
      } else if (!m.def.isBoss) {
        m.wander -= dt;
        if (m.wander <= 0) {
          m.wander = 1.5 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2, go = Math.random() < 0.55;
          m.vx = go ? Math.cos(a) : 0; m.vy = go ? Math.sin(a) : 0;
        }
        if (m.vx || m.vy) {
          const nx = m.sprite.x + m.vx * MON_SPEED * dt;
          if (nx < m.zone.x0 * TILE || nx > m.zone.x1 * TILE) m.vx = -m.vx;
          moving = this.moveBy(m.sprite, m.vx * MON_SPEED * dt, m.vy * MON_SPEED * dt, test);
          if (!moving) m.wander = 0;
          m.dir = dirOf(m.vx, m.vy);
        }
      }
      if (moving) m.sprite.play(`${m.id}_walk_${m.dir}`, true);
      else { m.sprite.anims.stop(); m.sprite.setFrame(DIRS.indexOf(m.dir)); }
      m.sprite.setDepth(10 + m.sprite.y / 1000);
      if (now - m.hurtAt >= 100) m.sprite.setTint(m.def.isBoss ? 0xffb0a0 : 0xffffff);
      else m.sprite.setTint(0xffaaaa);
      this.drawBar(m);
    }
  }

  drawBar(m) {
    m.bar.clear();
    if (m.def.isBoss) {
      const w = 30, x = m.sprite.x - w / 2, y = m.sprite.y - 30;
      m.label.setPosition(m.sprite.x, y - 6);
      m.bar.fillStyle(0x000000, 0.75).fillRect(x - 1, y - 1, w + 2, 4);
      m.bar.fillStyle(0xd8402f, 1).fillRect(x, y, w * Math.max(0, m.hp / m.def.hp), 2);
      return;
    }
    if (m.hp < m.def.hp) {
      m.bar.fillStyle(0x000000, 0.7).fillRect(m.sprite.x - 7, m.sprite.y - 15, 14, 2);
      m.bar.fillStyle(0xc8423a, 1).fillRect(m.sprite.x - 7, m.sprite.y - 15, 14 * Math.max(0, m.hp / m.def.hp), 2);
    }
  }

  // ---------- 보스 땅 울림: 1초 경고 → 원 안이면 보통 피해 × 1.5(명중 판정 없음, 버림) ----------
  startSlam(b) {
    const x = this.knight.x, y = this.knight.y, r = bal.boss.slamRadiusTiles * TILE;
    const g = this.add.graphics().setDepth(8);
    this.slam = { b, x, y, r, at: this.gt + bal.boss.slamWarnMs, g };
    this.floatText(b.sprite.x, b.sprite.y - 40, '쿠웅…!', '#ff9a7a', 900);
  }

  updateSlam(now) {
    const s = this.slam;
    if (!s) return;
    const left = Math.max(0, s.at - now), k = 1 - left / bal.boss.slamWarnMs;
    s.g.clear();
    s.g.fillStyle(0xd8402f, 0.18 + 0.25 * k).fillCircle(s.x, s.y, s.r);
    s.g.lineStyle(1, 0xff7a5a, 0.9).strokeCircle(s.x, s.y, s.r * k);
    s.g.lineStyle(1, 0xff7a5a, 0.6).strokeCircle(s.x, s.y, s.r);
    if (left > 0) return;
    this.cancelSlam();
    this.cameras.main.shake(220, 0.008);
    this.smoke(s.x, s.y - 4, 1.2);
    if (Math.hypot(this.knight.x - s.x, this.knight.y - s.y) > s.r) { this.floatText(this.knight.x, this.knight.y - 18, '피했다!', '#9fe08a'); return; }
    if (now < this.invulnUntil) return;
    const base = combat.monsterAttack(s.b.def, this.stats(), G.save.player.level, () => 0, bal).dmg;
    this.hurtPlayer(Math.max(1, Math.floor(base * bal.boss.slamMult)), '#ff3b2f');
  }

  cancelSlam() { if (this.slam) { this.slam.g.destroy(); this.slam = null; } }

  // ---------- 기사 그림·칼질·효과 ----------
  drawHero() {
    const k = this.knight;
    if (this.face === 'left') this.facingLeft = true;
    else if (this.face === 'right') this.facingLeft = false;
    const x = this.snap(k.x + this.lunge.x), y = this.snap(k.y + 2 + this.lunge.y);
    this.hero.setPosition(x, y).setDepth(10 + k.y / 1000);
    this.cameraTarget.setPosition(this.snap(k.x), this.snap(k.y - 8));
  }

  swingAt(m) {
    const dx = m.sprite.x - this.knight.x, dy = m.sprite.y - this.knight.y, d = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) > 1) this.facingLeft = dx < 0;
    // 칼: 대상 쪽(8방향)을 보고 기사 그림의 베기 동작을 한 번
    this.dir8 = dir8Of(dx, dy);
    // 끝나는 시각은 게임 시계로 판단(다른 동작이 끼어들어도 굳지 않게)
    this.swinging = true;
    const key = `hero_atk_${this.dir8}`;
    this.swingEnd = this.gt + 600; // 보조 장치: 끝 알림을 못 받아도 굳지 않게
    this.hero.off('animationcomplete', this.onSwingDone, this);
    this.hero.play(key);
    this.hero.once('animationcomplete', this.onSwingDone, this);
    // 몸: 대상 쪽으로 반 발짝 내딛었다 돌아옴
    this.tweens.killTweensOf(this.lunge);
    this.lunge.x = 0; this.lunge.y = 0;
    this.tweens.add({ targets: this.lunge, x: (dx / d) * 3, y: (dy / d) * 2, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    // 베기 효과: 대상 위에 크게
    const fx = this.add.sprite(m.sprite.x, m.sprite.y - (m.def.isBoss ? 14 : 6), 'fx_slash').setDepth(950).setFlipX(this.facingLeft).setScale(m.def.isBoss ? 1.5 : 1);
    fx.play('fx_slash'); fx.once('animationcomplete', () => fx.destroy());
  }

  onSwingDone(anim) { if (anim?.key?.startsWith('hero_atk_')) this.swinging = false; }

  // 귀환·죽음·순간이동 때 칼질 중이던 동작을 정리한다
  cancelSwing() {
    this.swinging = false;
    this.hero.off('animationcomplete', this.onSwingDone, this);
    this.tweens.killTweensOf(this.lunge);
    this.lunge.x = 0; this.lunge.y = 0;
    this.hero.play(`hero_idle_${this.dir8}`, true);
  }

  knockback(m) {
    const dx = m.sprite.x - this.knight.x, dy = m.sprite.y - this.knight.y, d = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < 4; i++) this.moveBy(m.sprite, (dx / d) * 1.5, (dy / d) * 1.5, (x, y) => this.monsterBlocked(m, x, y));
    this.flashWhite(m);
  }

  flashWhite(m) {
    m.sprite.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { m.sprite.clearTint(); if (m.def.isBoss) m.sprite.setTint(0xffb0a0); });
  }

  returnBurst(x, y, arrive) {
    // 머리 위 빛 고리 + 발밑에서 솟는 빛기둥 + 올라가는 빛 알갱이
    const ring = this.add.sprite(x, y - 30, 'fx_return').setDepth(970).setScale(arrive ? 1.2 : 1);
    ring.play('fx_return'); ring.once('animationcomplete', () => ring.destroy());
    const beam = this.add.rectangle(x, y, 14, 40, 0xfff2c8, 0.75).setOrigin(0.5, 1).setDepth(965).setBlendMode(Phaser.BlendModes.ADD);
    beam.scaleX = arrive ? 1.4 : 0.6;
    this.tweens.add({ targets: beam, scaleX: arrive ? 0.2 : 1.6, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => beam.destroy() });
    for (let i = 0; i < 8; i++) {
      const p = this.add.rectangle(x + (Math.random() - 0.5) * 14, y - Math.random() * 6, 2, 2, 0xffe08a).setDepth(968);
      this.tweens.add({ targets: p, y: p.y - 26 - Math.random() * 14, alpha: 0, duration: 500 + Math.random() * 300, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  // ---------- 화면 표시 ----------
  floatText(x, y, text, color, ms = 900) {
    const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '8px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 2, resolution: 4 })
      .setOrigin(0.5).setDepth(980);
    this.tweens.add({ targets: t, y: y - 12, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  refreshHud(force) {
    const now = performance.now();
    if (!force && now - (this.hudAt || 0) < 100) return;
    this.hudAt = now;
    const s = G.save, st = this.stats(), lv = s.player.level;
    const maxLevel = lv >= bal.progression.maxLevel;
    const need = maxLevel ? 1 : prog.needExp(lv, bal);
    hud.update({
      level: lv, hp: s.player.hp, maxHp: st.maxHp, expPct: maxLevel ? 100 : (100 * s.player.exp) / need, maxLevel,
      gold: s.player.gold, potions: countOf(s, 'potion'), scrolls: countOf(s, 'returnScroll'),
      place: inBossRoom(this.knight.x, this.knight.y) ? '큰울림의 방' : regionName(mapIdAt(this.knight.x)),
    });
  }
}

function nameOf(id) {
  const all = [...bal.weapons, ...bal.armors, ...bal.consumables];
  return all.find((i) => i.id === id)?.name ?? id;
}

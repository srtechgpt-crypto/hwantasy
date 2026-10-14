// 게임 화면: 지도, 기사, 몬스터·보스, NPC, 전투, 자동 사냥. 숫자 계산은 모두 domain 모듈에 맡긴다.
// 시간: 전투·무적·재생성·땅 아이템·보스 방 초기화는 게임 시계(this.gt, 멈추면 안 흐름), 보스 재등장만 실제 시각(Date.now).
import bal from '../../data/balance.js';
import { buildWorld, TILE, W, H, mapIdAt, regionName, inBossRoom, BOSS_ROOMS, bossRoomOf, NPCS, TINTS, REGIONS } from '../../data/maps.js';
import { makeRng } from '../domain/rng.js';
import * as prog from '../domain/progression.js';
import * as combat from '../domain/combat.js';
import * as rewards from '../domain/rewards.js';
import * as inv from '../domain/inventory.js';
import { bossRemainMs, bossReady, normalizeBossTime } from '../domain/boss.js';
import { decideAuto } from '../domain/autohunt.js';
import { findPath } from '../domain/path.js';
import { learnedSkills, skillDef } from '../domain/skills.js';
import { compareGear } from '../domain/compare.js';
import { createJoystick } from '../ui/joystick.js';
import { createMinimap } from '../ui/minimap.js';
import { loadPrefs, savePrefs } from '../ui/prefs.js';
import { G, hud, josa } from '../state.js';

const SPEED = 70;            // 기사 이동 속도(px/초) — 2026-10-13 대표님 의견으로 56→70
const MON_SPEED = 30;
const ATTACK_RANGE = 20;
const MON_RANGE = 15;
const AGGRO = 4 * TILE;
const RESPAWN_MS = 15000;
const GROUND_ITEM_MS = 60000; // 땅에 떨어진 돈·아이템이 남는 시간(게임 시계)
const PICKUP_RANGE = 12;      // 기사 발이 이만큼 가까우면 줍는다(px)
const ITEM_SKIP_MS = 20000;   // 자동 사냥이 3초 동안 다가가지 못한 떨어진 것은 이 시간 동안 건너뜀
const ACTIVE_MIN = 26 * TILE; // 기사에서 이보다 먼 몬스터는 쉰다(폰 부담 줄이기). 화면이 넓으면 fitZoom이 늘린다
const BIG_SCREEN = 1100;      // 짧은 변이 이보다 크면(태블릿·PC) 기본 3배, 그 밖(폰·폴드)은 기본 2배
const AUTO_RESUME_MS = 400;   // 자동 사냥 중 조이스틱에서 손을 떼고 다시 자동으로 움직이기까지
const TALK_RANGE = 1.7 * TILE;
const PATH_MS = 500;          // 5차: 길을 다시 구하는 간격(목표 칸이 바뀌면 바로)
const UNREACH_MS = 20000;     // 5차: 길이 없는 몬스터는 이 시간 동안 자동 사냥에서 뺀다
const ROAM_MS = 8000;         // 5차: 돌아다니기 목표 하나에 쓰는 최대 시간
const NUDGE = 6;              // 5차: 조이스틱이 모서리에 걸리면 옆으로 이만큼(px) 안에 빈 곳을 찾아 미끄러진다
const SKILL_IDS = ['bash', 'stun', 'whirl', 'guard'];
const DIRS = ['down', 'up', 'left', 'right'];
const MON_KEYS = {
  jelly: 'm_jelly', mouse: 'm_mouse', hopfrog: 'm_hopfrog', goblin: 'm_goblin',
  raccoon: 'm_raccoon', vine: 'm_vine', nightwing: 'm_nightwing',
  crab: 'm_crab', ember: 'm_ember', stalker: 'm_stalker', boss: 'm_boss',
  wisp: 'm_wisp', skull: 'm_skull', warden: 'm_warden', eye: 'm_eye', lich: 'm_lich',
};
const MON_FRAME = { lich: 48 }; // 그림 한 칸 크기(없으면 16). 기사왕은 PixelLab 48×48 칸
// 먼저 덤비는 몬스터. 4차 성터 몬스터는 공격이 세서(한 마리씩 싸우는 시뮬레이터 기준으로 맞춤) 먼저 덤비지 않고, 때리면 반격한다
const AGGRESSIVE = new Set(['hopfrog', 'goblin', 'raccoon', 'vine', 'nightwing', 'crab', 'ember', 'stalker']);
const ICON_IDS = ['woodSword', 'ironSword', 'steelSword', 'deepSword', 'mithrilSword', 'wraithSword', 'clothArmor', 'leatherArmor', 'chainArmor', 'plateArmor', 'mithrilArmor', 'wraithArmor', 'potion', 'returnScroll', 'weaponScroll', 'armorScroll'];
const SWORD_TINT = { woodSword: 0xd09a62, ironSword: 0xffffff, steelSword: 0xc4ecff, deepSword: 0xc89cff, mithrilSword: 0xd8f4ff, wraithSword: 0xb08cff };
const BOSS_REACH = 12; // 보스는 몸이 커서 공격이 조금 더 멀리서 닿는다
// 보스별 모양·문구(id = 보스 몬스터 id = 보스 방 id)
const BOSS_LOOK = {
  boss: { scale: 2, origin: 0.8, tint: 0xffb0a0, label: '#ffb08a', wake: '폐광 깊은 곳에서 큰울림이 깨어났습니다', awake: '큰울림이 깨어 있다', killed: '큰울림을 쓰러뜨렸다!' },
  lich: { scale: 1.1, origin: 0.83, tint: 0xffffff, label: '#c9a8ff', wake: '성터 깊은 곳에서 망령 기사왕이 깨어났습니다', awake: '기사왕이 깨어 있다', killed: '망령 기사왕을 쓰러뜨렸다!' },
};

const monDef = (id) => bal.monsters.find((m) => m.id === id);
const DARK_REGIONS = new Set(['mine', 'ruin']); // 어두운 지역(기사 둘레만 밝음)
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
    this.load.image('tiles', 'assets/tiles_ex.png'); // 5차: 둘레 1px 늘린 그림(타일 틈 줄 방지, 도구/타일늘리기.py)
    this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.image('sword', 'assets/sword.png');
    this.load.image('coin', 'assets/coin.png');
    this.load.spritesheet('fx_return', 'assets/fx_return.png', { frameWidth: 32, frameHeight: 32 });
    for (const [id, key] of Object.entries(MON_KEYS)) { const f = MON_FRAME[id] ?? 16; this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: f, frameHeight: f }); }
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
    this.dropSeq = this.dropSeq ?? 0;
    this.autoItem = null;
    this.bosses = {}; // 보스 id → 보스 몬스터(방마다 하나). 방 밖에 있는 시간은 보스마다 b.away
    this.slam = null;
    this.bossRoomIn = null; // 지금 들어가 있는 보스 방 id(들어갈 때 한 번만 알림)
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
    // 5차: 스킬 다시 쓸 시각(게임 시계), 아머 끝 시각, 예약된 스킬, 자동 사냥 지역·길·돌아다니기·못 가는 몬스터
    this.skillAt = {};
    this.guardUntil = 0;
    this.queuedSkill = null;
    this.autoArea = null;
    this.route = null;
    this.roamGoal = null;
    this.unreach = new Map();
    this.attackHeld = false;
    this.talkNpc = null;
    this.playing = false;
    this.region = 'town';

    this.joy = createJoystick({
      zone: document.getElementById('game'),
      onRelease: () => {
        this.autoResumeAt = this.gt + AUTO_RESUME_MS; this.autoCenter = { x: this.knight.x, y: this.knight.y };
        // 5차: 직접 옮긴 지역에서 다시 사냥(마을이면 그대로 두고 돌아가지 않음)
        const area = mapIdAt(this.knight.x);
        if (area !== 'town') this.autoArea = area;
        this.route = null; this.roamGoal = null;
      },
    });
    this.bindButtons();
    this.minimap = createMinimap({
      root: document.getElementById('hud'), wmap: this.wmap, regions: REGIONS, npcs: NPCS, bossRooms: BOSS_ROOMS, tile: TILE,
      onTap: () => { if (this.canAct()) G.ui.open('map'); }, // 위쪽 [지도] 버튼과 같은 창
    });
    this.minimap.setOpen(this.prefs.mini);
    this.miniT = 0;
    this.refreshZoomButtons();
    G.onSceneReady?.();
  }

  // ---------- 지도 ----------
  buildMap() {
    const map = this.make.tilemap({ width: W, height: H, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 1, 2);
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
    // 보스 방 표지판 글씨(방마다, 1초마다 갱신)
    this.bossSigns = {};
    for (const R of BOSS_ROOMS) {
      this.bossSigns[R.id] = this.add.text((R.x0 - 4) * TILE + 8, 18 * TILE + 10, '', { fontFamily: 'system-ui, sans-serif', fontSize: '7px', color: '#ffd9a0', stroke: '#14161f', strokeThickness: 3, resolution: 4, align: 'center' })
        .setOrigin(0.5).setDepth(6);
    }
  }

  // 폐광: 기사 둘레만 밝은 어둠 그림(기사를 따라다님 — 좌표 변환 없음)
  makeDarkness() {
    // 카메라가 지도 끝에 막혀 기사가 화면 가장자리에 있어도 덮이게 보이는 넓이의 2배 + 여유
    const z = this.zoomZ || 1;
    const w = Math.ceil(2 * this.scale.width / z) + 64, h = Math.ceil(2 * this.scale.height / z) + 64;
    // 크기가 같으면 다시 만들지 않는다. 다시 만들면 진행 중인 페이드를 끊고 지금 지역에 맞는 밝기로 바로 맞춘다
    if (this.dark && this.darkSize === `${w}x${h}`) return;
    this.darkSize = `${w}x${h}`;
    const alpha = DARK_REGIONS.has(this.region) ? 1 : 0;
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

  // 일반 몬스터는 어느 보스 방에도 못 들어가고, 보스는 자기 방 밖으로 못 나간다
  monsterBlocked(m, x, y) {
    if (this.blocked(x, y)) return true;
    const room = inBossRoom(x, y);
    return m.def.isBoss ? room?.id !== m.id : !!room;
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
    // 5차: 다른 기록으로 들어오면 앞 캐릭터의 쿨타임·아머·못 가는 목록을 물려받지 않게
    this.skillAt = {}; this.guardUntil = 0; this.guardRing?.destroy(); this.guardRing = null; this.unreach.clear();
    this.invulnUntil = this.gt + 3000;
    this.clearMonsters();
    this.spawnAll();
    this.refreshGear();
    this.playing = true;
    hud.log(isNew ? '바람 마을에 도착했습니다. 마을 사람들에게 다가가 [대화]를 눌러 보세요.' : `다시 오셨습니다. Lv ${p.level} 기사`);
    this.refreshHud(true);
    this.refreshSkills(true);
  }

  leaveGame() { this.playing = false; this.setAuto(false); this.releaseInput(); }

  // 창이 열릴 때: 조이스틱과 눌린 공격 버튼을 놓는다
  releaseInput() { this.joy?.reset(); this.attackHeld = false; this.queuedSkill = null; }

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
    for (const g of this.groundItems) this.refreshDropMark(g);
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
    // 5차 스킬 버튼
    for (const id of SKILL_IDS) on(`btnSkill_${id}`, () => this.useSkill(id, null, true));
    on('btnAuto', () => {
      if (G.auto) { this.setAuto(false); return; }
      if (mapIdAt(this.knight.x) === 'town') { hud.toast('자동 사냥은 사냥터에서 켜 주세요'); return; }
      if (inBossRoom(this.knight.x, this.knight.y)) { hud.toast('보스는 직접 싸워 주세요'); return; }
      // 6차: 켜자마자 귀환(주문서 낭비)하지 않게 — 물약이 없거나 체력이 귀환 기준 이하면 켜지 않고 안내만
      if (countOf(G.save, 'potion') <= 0) { hud.toast('물약이 없어 자동 사냥을 켜지 않았습니다. 잡화상에서 물약을 사 주세요', 3200); return; }
      if (G.save.player.hp <= this.stats().maxHp * bal.autohunt.returnHp) {
        hud.toast(`체력이 ${Math.round(bal.autohunt.returnHp * 100)}% 이하라 자동 사냥을 켜지 않았습니다. 물약을 마시거나 회복한 뒤 켜 주세요`, 3200); return;
      }
      this.setAuto(true);
    });
  }

  canAct() { return this.playing && G.pause.size === 0 && G.save && !G.pending; }

  setAuto(onOff) {
    G.auto = onOff;
    hud.setAuto(onOff);
    if (onOff) {
      this.autoCenter = { x: this.knight.x, y: this.knight.y }; this.autoTarget = null; this.autoItem = null; this.autoResumeAt = 0;
      this.autoArea = mapIdAt(this.knight.x); this.unreach.clear();
    }
    this.route = null; this.roamGoal = null;
  }

  // ---------- 몬스터 ----------
  clearMonsters() {
    for (const m of this.monsters) { m.sprite.destroy(); m.bar.destroy(); m.label?.destroy(); m.stunText?.destroy(); }
    this.monsters = [];
    this.bosses = {};
    this.cancelSlam();
    for (const g of this.groundItems) { this.tweens.killTweensOf(g.sprite); g.sprite.destroy(); if (g.mark) { this.tweens.killTweensOf(g.mark); g.mark.destroy(); } }
    this.groundItems = [];
    this.autoItem = null;
  }

  spawnAll() {
    for (const z of this.wmap.zones) for (let i = 0; i < z.count; i++) {
      const m = this.makeMonster(z.monsters[i % z.monsters.length], z);
      this.respawn(m, true);
    }
    for (const R of BOSS_ROOMS) this.trySpawnBoss(R.id);
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

  // 보스: 처음·재등장·다시 열기 모두 bossReady 하나로 판단(일반 재생성 없음). id = 보스 몬스터 id = 방 id
  trySpawnBoss(id) {
    const R = bossRoomOf(id), def = monDef(id), look = BOSS_LOOK[id];
    if (!R || !def?.isBoss || !look || this.bosses[id]?.alive || !G.save) return;
    if (!bossReady(G.save.bosses[id], Date.now(), bal)) return;
    if (!this.bosses[id]) {
      const sprite = this.add.sprite(0, 0, MON_KEYS[id], 0).setOrigin(0.5, look.origin).setScale(look.scale);
      const bar = this.add.graphics().setDepth(900);
      const label = this.add.text(0, 0, def.name, { fontFamily: 'Batang, serif', fontSize: '8px', fontStyle: 'bold', color: look.label, stroke: '#14161f', strokeThickness: 3, resolution: 4 }).setOrigin(0.5).setDepth(901);
      this.bosses[id] = { uid: id, id, def, look, room: R, zone: null, sprite, bar, label, hp: def.hp, alive: false, cd: 0, aggro: false, dir: 'down', hurtAt: -1e9, reach: BOSS_REACH, attacks: 0, away: 0 };
      this.monsters.push(this.bosses[id]);
    }
    const b = this.bosses[id];
    const cx = ((R.x0 + R.x1) / 2 + 2) * TILE, cy = ((R.y0 + R.y1) / 2) * TILE;
    b.sprite.setPosition(cx, cy).setVisible(true).setAlpha(1).setTint(look.tint);
    b.label.setVisible(true);
    b.sprite.play(`${id}_walk_down`);
    b.hp = b.def.hp; b.alive = true; b.aggro = false; b.cd = 0; b.attacks = 0; b.away = 0;
    if (Math.abs(this.knight.x - cx) < 40 * TILE) hud.log(`<b style="color:#ff9a7a">${look.wake}</b>`);
  }

  resetBoss(b) {
    if (!b?.alive) return;
    b.hp = b.def.hp; b.attacks = 0; b.aggro = false;
    this.cancelSlam(b);
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

    // 5차: 공격 대기 중 눌러 둔 스킬은 자동 사냥보다 먼저 쓴다(자동 공격이 차례를 계속 가져가지 않게)
    if (this.queuedSkill && this.attackCd <= 0) { const id = this.queuedSkill; this.queuedSkill = null; this.useSkill(id, null, true); }
    const v = this.joy.vector();
    let walking = false;
    if (v.active && (v.x || v.y)) {
      walking = this.moveJoy(v.x * SPEED * dt, v.y * SPEED * dt);
      this.face = dirOf(v.x, v.y); this.dir8 = dir8Of(v.x, v.y);
    } else if (G.auto && !v.active && now >= this.autoResumeAt) {
      walking = this.runAuto(dt);
    }
    const room = inBossRoom(this.knight.x, this.knight.y);
    if (G.auto && room) { this.setAuto(false); hud.toast('보스 방에서는 자동 사냥이 꺼집니다. 직접 싸워 주세요', 2600); }
    if ((room?.id ?? null) !== this.bossRoomIn) {
      this.bossRoomIn = room?.id ?? null;
      // 보상이 땅에 떨어질 만큼 가방·창고가 모두 찼으면 들어갈 때 미리 알린다(땅의 것은 60초 뒤 사라짐)
      if (room && this.bagAndWarehouseFull()) hud.toast('가방과 창고가 모두 가득 찼습니다. 보스 보상이 땅에 떨어지면 60초 뒤 사라집니다', 3200);
    }
    if (this.attackHeld) this.tryAttack();
    if (G.pending) return; // 보스 저장 실패 등: 같은 프레임에 다른 상태를 바꾸지 않는다

    if (this.swinging && this.gt >= this.swingEnd) this.swinging = false;
    if (!this.swinging) this.hero.play(`${walking ? 'hero_run' : 'hero_idle'}_${this.dir8}`, true);
    this.drawHero();

    this.updateMonsters(dt, now);
    if (G.pending) return;
    this.updateSlam(now);
    this.updateSkillFx(now);
    this.updateGroundItems(now);
    this.updateTalk();
    this.updateRegion();
    this.tickRegen(dt);

    this.bossTick += dt;
    if (this.bossTick >= 1) {
      this.bossTick = 0;
      const fixed = normalizeBossTime(G.save, Date.now());
      if (fixed !== G.save) { G.save = fixed; G.persist('bossTime'); }
      for (const R of BOSS_ROOMS) this.trySpawnBoss(R.id);
      this.updateBossSign();
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
    this.refreshSkills();
  }

  updateRegion() {
    const r = mapIdAt(this.knight.x);
    if (r !== this.region) {
      this.region = r;
      this.tweens.killTweensOf(this.dark);
      this.tweens.add({ targets: this.dark, alpha: DARK_REGIONS.has(r) ? 1 : 0, duration: 700 });
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
    for (const R of BOSS_ROOMS) {
      const ms = bossRemainMs(G.save.bosses[R.id], Date.now(), bal);
      this.bossSigns[R.id].setText(this.bosses[R.id]?.alive ? BOSS_LOOK[R.id].awake : ms > 0 ? `다시 깨어나기까지\n${fmtRemain(ms)}` : '');
    }
  }

  // 가방·창고 모두 빈칸이 없음(보스 보상이 땅으로 갈 수 있는 상태) — 들어갈 때 알림용 대략 판단
  bagAndWarehouseFull() {
    const s = G.save;
    return s.bag.length >= bal.inventory.bagSlots && s.warehouse.length >= bal.inventory.warehouseSlots;
  }

  // ---------- 기사 행동 ----------
  stats() {
    const s = G.save;
    return prog.playerStats(s.player.level, { weapon: itemByUid(s, s.equip.weapon), armor: itemByUid(s, s.equip.armor) }, bal);
  }

  dist(m) { return Math.hypot(m.sprite.x - this.knight.x, m.sprite.y - this.knight.y) - (m.reach || 0); }

  // 보스는 기사도 방 안에 있을 때만 때릴 수 있다(방 밖에서 일방적으로 치기 방지)
  canHit(m) { return m.alive && (!m.def.isBoss || inBossRoom(this.knight.x, this.knight.y)?.id === m.id); }

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
    this.swingAt(m);
    this.strike(m);
    return true;
  }

  // 한 번 때리기(일반 공격·스킬 공통). mult = 스킬 피해 배수. 결과 {hit, dmg}
  // fixed: 회오리처럼 여러 마리를 칠 때 쓰는 순간의 능력치·레벨({stats, level})로 고정(중간 레벨업 영향 없음)
  strike(m, mult = 1, color = '#ffffff', fixed = null) {
    this.face = dirOf(m.sprite.x - this.knight.x, m.sprite.y - this.knight.y);
    const r = combat.playerAttack(fixed?.stats ?? this.stats(), m.def, fixed?.level ?? G.save.player.level, this.rng, bal, { mult });
    m.aggro = true;
    if (!r.hit) { this.floatText(m.sprite.x, m.sprite.y - 14, 'MISS', '#c9c2b0'); return r; }
    m.hp -= r.dmg;
    m.hurtAt = this.gt;
    if (!m.def.isBoss) this.knockback(m); else this.flashWhite(m);
    this.floatText(m.sprite.x, m.sprite.y - (m.def.isBoss ? 30 : 14), String(r.dmg), color);
    if (m.hp <= 0) (m.def.isBoss ? this.killBoss(m) : this.killMonster(m));
    return r;
  }

  // ---------- 5차 스킬 ----------
  // 남은 쿨타임(ms, 0이면 준비됨)
  skillLeft(id) { return Math.max(0, (this.skillAt[id] ?? 0) - this.gt); }

  // manual: 버튼으로 눌렀을 때만 안내 문구. 공격 스킬은 일반 공격 한 번을 대신한다(공격 대기 중이면 버튼은 예약)
  useSkill(id, target, manual) {
    if (!this.canAct()) return false;
    const def = skillDef(id, bal), lv = G.save.player.level;
    if (lv < def.level) { if (manual) hud.toast(`${def.name}은(는) Lv ${def.level}에 배웁니다`); return false; }
    if (this.skillLeft(id) > 0) { if (manual) hud.toast(`${def.name} 준비 중 (${Math.ceil(this.skillLeft(id) / 1000)}초)`); return false; }
    if (id === 'guard') {
      this.skillAt.guard = this.gt + def.cooldownMs;
      this.guardUntil = this.gt + def.durationMs;
      this.guardFx();
      this.floatText(this.knight.x, this.knight.y - 24, def.name, '#9fd8ff', 1100);
      this.refreshSkills(true);
      return true;
    }
    if (this.attackCd > 0) { if (manual) this.queuedSkill = id; return false; }
    if (id === 'whirl') {
      const r = def.radiusTiles * TILE;
      // 직접 누르면 둘레 모두, 자동 사냥은 이미 덤비는 몬스터(+지금 대상)만 — 가만히 있는 몬스터를 깨우지 않는다
      const list = this.monsters.filter((m) => this.canHit(m) && this.dist(m) <= r && (manual || m.aggro || m === target));
      if (!list.length) { if (manual) hud.toast('가까운 몬스터가 없습니다'); return false; }
      this.skillAt.whirl = this.gt + def.cooldownMs;
      this.attackCd = bal.knight.attackMs / 1000;
      this.swingAt(list[0]);
      this.whirlFx(r);
      const fixed = { stats: this.stats(), level: G.save.player.level };
      for (const m of list) if (this.canHit(m)) this.strike(m, def.mult, '#9ff0ff', fixed);
      this.refreshSkills(true);
      return true;
    }
    const m = target && this.canHit(target) && this.dist(target) <= ATTACK_RANGE ? target : this.nearestMonster(ATTACK_RANGE);
    if (!m) { if (manual) hud.toast('가까운 몬스터가 없습니다'); return false; }
    this.skillAt[id] = this.gt + def.cooldownMs;
    this.attackCd = bal.knight.attackMs / 1000;
    this.swingAt(m, id === 'bash' ? 0xffa040 : 0xffe060);
    this.floatText(this.knight.x, this.knight.y - 24, def.name, id === 'bash' ? '#ffb070' : '#ffe680', 900);
    const r = this.strike(m, def.mult, id === 'bash' ? '#ffb070' : '#ffe680');
    // 쇼크 스턴: 맞으면 기절(보스는 피해만)
    if (id === 'stun' && r.hit && m.alive && !m.def.isBoss) { m.stunUntil = this.gt + def.stunMs; this.stunFx(m); }
    this.refreshSkills(true);
    return true;
  }

  guardFx() {
    this.guardRing?.destroy();
    this.guardRing = this.add.graphics().setDepth(11);
  }

  whirlFx(r) {
    const x = this.knight.x, y = this.knight.y;
    const g = this.add.graphics().setDepth(949);
    const o = { k: 0 };
    this.tweens.add({ targets: o, k: 1, duration: 320, ease: 'Cubic.easeOut',
      onUpdate: () => { g.clear(); g.lineStyle(3, 0x9ff0ff, 0.9 * (1 - o.k)).strokeCircle(x, y - 4, r * (0.4 + 0.6 * o.k)); g.lineStyle(1, 0xffffff, 0.8 * (1 - o.k)).strokeCircle(x, y - 4, r * (0.3 + 0.6 * o.k)); },
      onComplete: () => g.destroy() });
  }

  stunFx(m) {
    const t = this.add.text(m.sprite.x, m.sprite.y - 20, '★기절', { fontFamily: 'system-ui, sans-serif', fontSize: '7px', fontStyle: 'bold', color: '#ffe680', stroke: '#000', strokeThickness: 2, resolution: 4 }).setOrigin(0.5).setDepth(981);
    m.stunText?.destroy(); m.stunText = t;
  }

  // 매 프레임: 아머 테두리·기절 글자 따라 붙이기
  updateSkillFx(now) {
    if (this.guardRing) {
      if (now >= this.guardUntil) { this.guardRing.destroy(); this.guardRing = null; }
      else {
        const left = this.guardUntil - now, blink = left < 3000 && Math.floor(now / 150) % 2;
        this.guardRing.clear().lineStyle(1, 0x7fc8ff, blink ? 0.3 : 0.85).strokeEllipse(this.snap(this.knight.x), this.snap(this.knight.y - 1), 22, 9)
          .lineStyle(1, 0xcfeaff, blink ? 0.15 : 0.5).strokeEllipse(this.snap(this.knight.x), this.snap(this.knight.y - 12), 26, 30);
      }
    }
  }

  refreshSkills(force) {
    const now = performance.now();
    if (!force && now - (this.skillHudAt || 0) < 100) return;
    this.skillHudAt = now;
    const lv = G.save.player.level;
    hud.setSkills(SKILL_IDS.map((id) => {
      const d = skillDef(id, bal);
      return { id, name: d.name, level: d.level, learned: lv >= d.level, left: this.skillLeft(id), total: d.cooldownMs, active: id === 'guard' && this.gt < this.guardUntil };
    }));
  }

  killMonster(m) {
    if (!m.alive) return; // 같은 처치로 보상이 두 번 나오지 않게
    m.alive = false;
    m.respawnAt = this.gt + RESPAWN_MS;
    m.sprite.setVisible(false); m.bar.clear();
    m.stunText?.destroy(); m.stunText = null; m.stunUntil = 0;
    this.smoke(m.sprite.x, m.sprite.y - 4, 0.6);

    const s = G.save;
    const rw = rewards.rollRewards(m.id, s.player.level, ratesOf(s), this.rng, bal);
    const before = s.player.level;
    const r = prog.addExp({ level: s.player.level, exp: s.player.exp }, rw.exp, bal);
    s.player.level = r.level; s.player.exp = r.exp;
    // 돈·아이템은 리니지처럼 그 자리에 떨어뜨린다(지나가면 줍고, 저장에 성공해야 확정)
    const mx = m.sprite.x, my = m.sprite.y;
    if (rw.gold > 0) this.dropOnGround('gold', 'gold', rw.gold, mx, my);
    for (const d of rw.drops) this.dropOnGround('item', d.id, d.count, mx, my);
    hud.log(`${m.def.name} 처치 · 경험치 +${rw.exp.toLocaleString('ko-KR')}${rw.drops.length ? ` · <span style="color:#ffe08a">${rw.drops.map((d) => nameOf(d.id)).join(', ')}이(가) 떨어졌습니다</span>` : ''}`);
    if (r.level > before) {
      this.levelUpFx(r.level);
      G.persist('levelup');
    }
  }

  // 보스: 보상 전부 + 처치 시각을 한 후보로 만들어 한 번에 저장(성공해야 확정)
  killBoss(b) {
    b.alive = false;
    this.cancelSlam(b);
    b.sprite.setVisible(false); b.bar.clear(); b.label.setVisible(false);
    const x = b.sprite.x, y = b.sprite.y;
    const s = G.save;
    // 처치한 보스의 id 하나로 보상 추첨·저장·후처리를 모두 한다
    const rw = rewards.rollRewards(b.id, s.player.level, ratesOf(s), this.rng, bal);
    const res = inv.bossKill(s, b.id, rw, Date.now(), bal);
    if (!res.ok) { hud.toast(res.reason); b.alive = true; b.hp = 1; b.sprite.setVisible(true); b.label.setVisible(true); return; }
    const done = G.commit(res.save, 'boss', {
      mustSave: true,
      after: () => {
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 140, () => this.smoke(x + (Math.random() - 0.5) * 20, y - 8 - Math.random() * 12, 1));
        this.cameras.main.shake(400, 0.006);
        this.floatText(x, y - 34, b.look.killed, '#ffd36a', 2200);
        const list = (arr) => arr.map((d) => `${nameOf(d.id)}${d.count > 1 ? ` ${d.count}개` : ''}`).join(', ');
        hud.log(`<b style="color:#ffd36a">${b.def.name} 처치!</b> 경험치 +${rw.exp.toLocaleString('ko-KR')} · 돈 +${rw.gold.toLocaleString('ko-KR')}${res.toBag.length ? ` · ${list(res.toBag)}` : ''}`);
        if (res.toWarehouse.length) hud.log(`<span style="color:#9fd8ff">가방이 가득해 ${josa(list(res.toWarehouse), '은/는')} 창고지기에게 맡겨 두었습니다</span>`);
        for (const d of res.ground) this.dropOnGround('item', d.id, d.count, x, y);
        if (res.ground.length) hud.toast('가방과 창고가 가득 찼습니다. 남은 것은 땅에 60초 동안 남습니다');
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

  // kind: 'gold'(id 'gold', count=금액) 또는 'item'. 몬스터 둘레에 톡 튀어 떨어진다
  dropOnGround(kind, id, count, x, y) {
    const ang = Math.random() * Math.PI * 2, r = 4 + Math.random() * 8;
    let tx = x + Math.cos(ang) * r, ty = y + Math.sin(ang) * r * 0.7;
    if (this.blocked(tx, ty)) { tx = x; ty = y; }
    const sprite = kind === 'gold'
      ? this.add.image(x, y, 'coin').setScale(count >= 100 ? 2.4 : 1.9)
      : this.add.image(x, y, `ic_${id}`).setScale(0.75);
    sprite.setDepth(9);
    this.tweens.add({ targets: sprite, x: tx, duration: 260, ease: 'Linear' });
    this.tweens.add({ targets: sprite, y: { from: y - 2, to: ty }, duration: 260, ease: 'Bounce.easeOut' });
    const g = { uid: ++this.dropSeq, kind, id, count, sprite, x: tx, y: ty, until: this.gt + GROUND_ITEM_MS, skipUntil: 0, mark: null };
    this.groundItems.push(g);
    // 6차: 장비면 지금 낀 것과 비교해 ▲(초록)/▼(빨강)을 아이콘 오른쪽 위에
    if (kind === 'item') {
      g.mark = this.add.text(tx + 5, ty - 6, '', { fontFamily: 'system-ui, sans-serif', fontSize: '7px', fontStyle: 'bold', stroke: '#000', strokeThickness: 2, resolution: 4 })
        .setOrigin(0.5).setDepth(9.5).setAlpha(0);
      this.tweens.add({ targets: g.mark, alpha: 1, delay: 270, duration: 120 }); // 아이콘이 튀어 떨어진(0.26초) 뒤에 나타남
      this.refreshDropMark(g);
    }
  }

  // 땅 장비의 ▲/▼(장착이 바뀌면 다시 계산)
  refreshDropMark(g) {
    if (!g.mark) return;
    const c = compareGear(G.save, g.id, 0, bal);
    g.mark.setText(c === 'up' ? '▲' : c === 'down' ? '▼' : '').setColor(c === 'up' ? '#5fe07a' : '#ff6b5e');
  }

  // 가방에 들어갈 수 있는지(돈은 항상). G.save가 바뀔 때만 다시 계산
  canAccept(g) {
    if (g.kind === 'gold') return G.save.player.gold < Number.MAX_SAFE_INTEGER;
    if (this.acceptCache?.save !== G.save) this.acceptCache = { save: G.save, map: new Map() };
    const c = this.acceptCache.map;
    if (!c.has(g.id)) { const r = inv.addItem(G.save, g.id, 1, bal); c.set(g.id, !!r.ok && !(r.overflow > 0)); }
    return c.get(g.id);
  }

  // 지나가면 줍기: 이번 프레임에 닿은 것을 한 번에 저장 후보로 만들고, 저장에 성공해야 땅에서 없앤다
  updateGroundItems(now) {
    if (G.pending) return;
    for (const g of [...this.groundItems]) {
      if (now > g.until) { this.removeDrop(g); continue; }
      g.sprite.setAlpha(g.until - now < 5000 ? 0.4 + 0.4 * Math.sin(now / 120) : 1);
    }
    const touching = this.groundItems.filter((g) => Math.hypot(g.x - this.knight.x, g.y - this.knight.y) < PICKUP_RANGE);
    if (!touching.length) return;
    // 지금 기록으로 들어갈 수 없는 것(가득 찬 가방의 장비 등)은 매 프레임 다시 시도하지 않는다(G.save가 바뀌면 다시 계산)
    const near = touching.filter((g) => this.canAccept(g));
    if (!near.length) {
      if (!this.bagFullToastAt || now - this.bagFullToastAt > 8000) { this.bagFullToastAt = now; hud.toast('가방이 가득 차서 주울 수 없습니다'); }
      return;
    }
    let cand = G.save;
    const took = [];
    for (const g of near) {
      if (g.kind === 'gold') {
        // 돈 상한(MAX_SAFE_INTEGER)까지만 받고 나머지는 땅에 남긴다
        const n = Math.min(g.count, Number.MAX_SAFE_INTEGER - cand.player.gold);
        if (n > 0) { cand = { ...cand, player: { ...cand.player, gold: cand.player.gold + n } }; took.push({ g, n }); }
      } else {
        const res = inv.addItem(cand, g.id, g.count, bal);
        const placed = res.ok ? g.count - (res.overflow ?? 0) : 0;
        if (placed > 0) { cand = res.save; took.push({ g, n: placed }); }
      }
    }
    if (!took.length) {
      if (!this.bagFullToastAt || now - this.bagFullToastAt > 8000) { this.bagFullToastAt = now; hud.toast('가방이 가득 차서 주울 수 없습니다'); }
      return;
    }
    G.commit(cand, 'pickup', {
      after: () => {
        for (const { g, n } of took) {
          g.count -= n;
          if (g.kind === 'gold') this.floatText(this.knight.x, this.knight.y - 20, `+${n.toLocaleString('ko-KR')}원`, '#ffd36a', 900);
          else { this.floatText(this.knight.x, this.knight.y - 26, nameOf(g.id), '#ffffff', 1100); hud.log(`${josa(nameOf(g.id), '을/를')} 주웠습니다`); }
          if (g.count <= 0) this.removeDrop(g);
        }
        this.refreshHud(true);
      },
    });
  }

  removeDrop(g) {
    const i = this.groundItems.indexOf(g);
    if (i >= 0) this.groundItems.splice(i, 1);
    this.tweens.killTweensOf(g.sprite); g.sprite.destroy();
    if (g.mark) { this.tweens.killTweensOf(g.mark); g.mark.destroy(); }
    if (this.autoItem === g.uid) this.autoItem = null;
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
    // 6차: 자동 귀환은 이유를 화면 가운데에도(귀환에 성공했을 때만 여기까지 옴)
    if (why !== '직접') hud.toast(`${why.replace(/^자동 사냥\((.*)\)$/, '$1')} — 마을로 귀환했습니다`, 3000);
    G.persist('return');
    return true;
  }

  teleportTown(effect = true) {
    this.setAuto(false);
    this.queuedSkill = null;
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

  guardReduce(now) { return now < this.guardUntil ? skillDef('guard', bal).reduce : 0; }

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
    // 3차: 가방이 차도 귀환하지 않고 계속 사냥 → 처음 찰 때 한 번 알림
    if (bagFull && !this.bagFullNoted) { this.bagFullNoted = true; hud.log('<span style="color:#9fd8ff">가방이 가득 찼습니다 — 들어가지 않는 물건은 두고 계속 사냥합니다</span>'); }
    else if (!bagFull) this.bagFullNoted = false;
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
      monsters: this.monsters.map((m) => ({ id: m.uid, x: m.sprite.x, y: m.sprite.y, alive: m.alive, isBoss: !!m.def.isBoss, area: mapIdAt(m.sprite.x), hpRatio: Math.max(0, m.hp / m.def.hp) })),
      targetId: this.autoTarget,
      // 5차: 같은 지역에서 찾아가기·스킬
      huntArea: this.autoArea ?? mapIdAt(this.knight.x),
      skipIds: [...this.unreach].filter(([, until]) => until > this.gt).map(([id]) => id),
      skills: learnedSkills(s.player.level, bal).map((id) => ({ id, ready: this.skillLeft(id) <= 0 })),
      // 회오리·아머 판단용: 이미 나에게 덤비는(aggro) 몬스터만 센다 — 가만히 있는 몬스터(성터 등)를 회오리로 끌어들이지 않게
      nearCount: this.monsters.filter((m) => m.aggro && this.canHit(m) && this.dist(m) <= skillDef('whirl', bal).radiusTiles * TILE).length,
      stuckSec: this.stuck.id === this.autoTarget ? this.stuck.sec : 0,
      items: this.groundItems.filter((g) => g.skipUntil <= this.gt && this.canAccept(g) && mapIdAt(g.x) === (this.autoArea ?? mapIdAt(this.knight.x)) && !inBossRoom(g.x, g.y))
        .map((g) => ({ id: g.uid, x: g.x, y: g.y })),
      itemId: this.autoItem,
    };
    const a = decideAuto(ctx, bal);
    const tgt = a.targetId ? this.monsters.find((m) => m.uid === a.targetId) : null;
    if (a.action !== 'roam') this.roamGoal = null;
    this.autoTarget = a.targetId ?? (a.action === 'move' && a.x !== undefined ? null : this.autoTarget);
    this.autoItem = a.itemId ?? null;
    if (a.itemId) {
      // 떨어진 것 주우러 가기: 3초 동안 다가가지 못하면(벽 너머 등) 잠시 건너뜀
      const g = this.groundItems.find((it) => it.uid === a.itemId);
      if (!g) return false;
      const d = Math.hypot(g.x - this.knight.x, g.y - this.knight.y);
      if (this.itemStuck?.id !== g.uid) this.itemStuck = { id: g.uid, best: d, sec: 0, kx: this.knight.x, ky: this.knight.y };
      else if (d < this.itemStuck.best - 1) { this.itemStuck.best = d; this.itemStuck.sec = 0; }
      else if (this.route && Math.hypot(this.knight.x - this.itemStuck.kx, this.knight.y - this.itemStuck.ky) > 4) { this.itemStuck.sec = 0; this.itemStuck.kx = this.knight.x; this.itemStuck.ky = this.knight.y; }
      else this.itemStuck.sec += dt;
      if (this.itemStuck.sec >= bal.autohunt.stuckSec) { g.skipUntil = this.gt + ITEM_SKIP_MS; this.autoItem = null; this.itemStuck = null; return false; }
      const w = this.walkTo(g.x, g.y, dt, 2);
      if (w === null) { g.skipUntil = this.gt + ITEM_SKIP_MS; this.autoItem = null; this.itemStuck = null; return false; }
      return w;
    }

    switch (a.action) {
      case 'potion': this.drinkPotion(false); return false;
      case 'return': if (!this.useReturn(`자동 사냥(${a.reason})`)) this.stopAuto(a.reason); return false;
      case 'stop': this.stopAuto(a.reason); return false;
      case 'attack':
        if (tgt) {
          this.autoCenter = { x: this.knight.x, y: this.knight.y };
          if (this.tryAttack(tgt)) { this.stuck = { id: tgt.uid, best: Infinity, sec: 0 }; return false; } // 때렸으면 막힘이 아님
          this.trackStuck(tgt, dt);
          return this.chase(tgt, dt);
        }
        return false;
      case 'skill':
        // 아머는 공격과 따로, 공격 스킬은 일반 공격 한 번을 대신(못 쓰면 일반 공격)
        if (tgt) {
          this.autoCenter = { x: this.knight.x, y: this.knight.y };
          const used = this.useSkill(a.skillId, tgt, false) || (a.skillId !== 'guard' && this.tryAttack(tgt));
          if (used) { if (a.skillId !== 'guard') this.stuck = { id: tgt.uid, best: Infinity, sec: 0 }; return false; }
          if (a.skillId !== 'guard') { this.trackStuck(tgt, dt); return this.chase(tgt, dt); }
        }
        return false;
      case 'roam': return this.roam(dt);
      case 'move': {
        const x = tgt ? tgt.sprite.x : a.x, y = tgt ? tgt.sprite.y : a.y;
        if (tgt) { this.trackStuck(tgt, dt); return this.chase(tgt, dt); }
        if (x === undefined) return false;
        return this.walkTo(x, y, dt, 2) ?? false;
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
    // 5차: 길을 따라 돌아가는 동안에는 거리가 잠시 늘 수 있다 → 길이 있고 기준점에서 4px 넘게 움직였으면 진전(프레임률과 무관한 누적 이동)
    if (this.stuck.id !== m.uid) this.stuck = { id: m.uid, best: d, sec: 0, kx: this.knight.x, ky: this.knight.y };
    else if (d < this.stuck.best - 1) { this.stuck.best = d; this.stuck.sec = 0; }
    else if (this.route && Math.hypot(this.knight.x - this.stuck.kx, this.knight.y - this.stuck.ky) > 4) { this.stuck.sec = 0; this.stuck.kx = this.knight.x; this.stuck.ky = this.knight.y; }
    else this.stuck.sec += dt;
    // 5차(⑤ #7): 막힌 대상은 uid별로 잠시 뺀다(둘 이상을 번갈아 쫓지 않게)
    if (this.stuck.sec >= bal.autohunt.stuckSec) { this.unreach.set(m.uid, this.gt + UNREACH_MS); this.stuck = { id: null, best: Infinity, sec: 0 }; this.autoTarget = null; this.route = null; }
  }

  // 몬스터 쫓기: 길이 없으면 잠시 자동 사냥에서 뺀다
  chase(m, dt) {
    const w = this.walkTo(m.sprite.x, m.sprite.y, dt, ATTACK_RANGE - 4);
    if (w === null) { this.unreach.set(m.uid, this.gt + UNREACH_MS); this.autoTarget = null; return false; }
    return w;
  }

  // 5차 돌아다니기: 지금 지역 사냥 구역 안 빈 칸 하나로 걸어가고, 닿거나 8초 지나면 다시 판단
  roam(dt) {
    const area = this.autoArea ?? mapIdAt(this.knight.x);
    if (this.gt < (this.roamWait ?? 0)) return false; // 길 없음·막힘 뒤 잠시 쉬고 다시(A* 연속 실행 방지)
    if (!this.roamGoal || this.gt >= this.roamGoal.until) {
      const zones = this.wmap.zones.filter((z) => z.mapId === area);
      if (!zones.length) return false;
      this.roamGoal = null;
      for (let i = 0; i < 30 && !this.roamGoal; i++) {
        const z = zones[Math.floor(Math.random() * zones.length)];
        const tx = z.x0 + Math.floor(Math.random() * (z.x1 - z.x0)), ty = z.y0 + Math.floor(Math.random() * (z.y1 - z.y0));
        if (!this.autoTileBlocked(tx, ty, area)) this.roamGoal = { x: tx * TILE + 8, y: ty * TILE + 8, until: this.gt + ROAM_MS };
      }
      if (!this.roamGoal) return false;
    }
    const w = this.walkTo(this.roamGoal.x, this.roamGoal.y, dt, 4);
    if (w === null) { this.roamGoal = null; this.roamWait = this.gt + PATH_MS; return false; } // 길 없음 → 0.5초 뒤 새 목표
    if (w === false) {
      // 닿았으면 바로 다음 목표, 못 움직였으면(몸이 걸림) 0.5초 쉬고 새 목표
      const arrived = Math.hypot(this.roamGoal.x - this.knight.x, this.roamGoal.y - this.knight.y) <= 4;
      this.roamGoal = null;
      if (!arrived) this.roamWait = this.gt + PATH_MS;
    }
    return !!w;
  }

  // 자동 이동이 지나갈 수 없는 칸: 막힌 칸, 보스 방, 자동 사냥 지역 밖
  autoTileBlocked(tx, ty, area) {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H || this.wmap.solid[ty][tx]) return true;
    const cx = tx * TILE + 8, cy = ty * TILE + 8;
    return !!inBossRoom(cx, cy) || (area && mapIdAt(cx) !== area);
  }

  // 일직선이 뚫려 있는지(4px 간격으로 몸 크기 검사, 보스 방·다른 지역 금지)
  lineClear(x1, y1, area) {
    const x0 = this.knight.x, y0 = this.knight.y, d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 4);
    for (let i = 1; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      if (this.blocked(x, y) || inBossRoom(x, y) || (area && mapIdAt(x) !== area)) return false;
    }
    return true;
  }

  // 목표까지 걷기. 돌아오는 값: 움직였으면 true, 이미 닿았으면 false, 길이 없으면 null.
  // 일직선이 뚫려 있으면 곧장, 아니면 타일 길찾기(0.5초마다 또는 목표 칸이 바뀌면 다시 구함)
  walkTo(x, y, dt, stopDist) {
    const dx0 = x - this.knight.x, dy0 = y - this.knight.y, d0 = Math.hypot(dx0, dy0);
    if (d0 <= stopDist) { this.route = null; return false; }
    const area = G.auto ? (this.autoArea ?? mapIdAt(this.knight.x)) : null;
    let tx = x, ty = y;
    if (!this.lineClear(x, y, area)) {
      const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
      const r = this.route;
      if (!r || r.gx !== gx || r.gy !== gy || this.gt >= r.at + PATH_MS) {
        const sx = Math.floor(this.knight.x / TILE), sy = Math.floor(this.knight.y / TILE);
        const blocked = (cx, cy) => (cx === sx && cy === sy ? false : this.autoTileBlocked(cx, cy, area));
        const cells = findPath(blocked, sx, sy, gx, gy, { maxNodes: 4000 });
        if (!cells) { this.route = null; return null; }
        this.route = { gx, gy, at: this.gt, cells };
      }
      // 다음 칸 중심에 거의 닿았으면 그다음 칸으로(마지막 칸은 실제 목표 좌표로)
      const cells = this.route.cells;
      while (cells.length > 1 && Math.hypot(cells[0].x * TILE + 8 - this.knight.x, cells[0].y * TILE + 8 - this.knight.y) < 3) cells.shift();
      if (cells.length && (cells.length > 1 || !this.lineClear(x, y, area))) { tx = cells[0].x * TILE + 8; ty = cells[0].y * TILE + 8; }
    } else this.route = null;
    const dx = tx - this.knight.x, dy = ty - this.knight.y, d = Math.hypot(dx, dy) || 1;
    this.face = dirOf(dx0, dy0); this.dir8 = dir8Of(dx, dy);
    const step = Math.min(d, SPEED * dt);
    return this.moveBy(this.knight, (dx / d) * step, (dy / d) * step);
  }

  // 조이스틱: 정면이 막히면 옆 NUDGE px 안의 빈 곳 쪽으로 미끄러진다(모서리에 걸려 서지 않게)
  moveJoy(mx, my) {
    const k = this.knight, bx = k.x, by = k.y;
    const moved = this.moveBy(k, mx, my);
    const len = Math.hypot(mx, my);
    if (!len) return moved;
    // 주로 가려는 축으로 거의 못 갔으면 옆으로 비켜 보기
    const horiz = Math.abs(mx) >= Math.abs(my);
    const progress = horiz ? Math.abs(k.x - bx) : Math.abs(k.y - by);
    if (progress >= len * 0.5) return moved;
    const fx = horiz ? Math.sign(mx) * len : 0, fy = horiz ? 0 : Math.sign(my) * len;
    for (let o = 1; o <= NUDGE; o++) for (const sgn of [1, -1]) {
      const ox = horiz ? 0 : sgn * o, oy = horiz ? sgn * o : 0;
      if (!this.blocked(bx + ox, by + oy) && !this.blocked(bx + ox + fx, by + oy + fy)) {
        const slide = Math.min(len, o);
        this.moveBy(k, horiz ? 0 : sgn * slide, horiz ? sgn * slide : 0);
        return true;
      }
    }
    return moved;
  }

  // ---------- 몬스터 움직임 ----------
  updateMonsters(dt, now) {
    const inTown = mapIdAt(this.knight.x) === 'town';
    const playerRoom = inBossRoom(this.knight.x, this.knight.y); // 기사가 있는 보스 방(없으면 null)
    const playerInRoom = !!playerRoom;
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
      if (m.stunText) {
        if (now >= (m.stunUntil ?? 0)) { m.stunText.destroy(); m.stunText = null; }
        else {
          m.stunText.setPosition(m.sprite.x, m.sprite.y - 20);
          m.sprite.anims.stop(); m.sprite.setTint(0x9a9aa8);
          this.drawBar(m);
          continue;
        }
      }
      const test = (x, y) => this.monsterBlocked(m, x, y);
      let moving = false;
      if (m.def.isBoss) {
        // 보스: 기사가 그 보스의 방 안에 있을 때만 싸운다. 방 밖에 30초(게임 시계) 있으면 체력·공격 횟수 초기화
        if (playerRoom?.id === m.id) { m.away = 0; m.aggro = true; }
        else {
          m.aggro = false;
          m.away += dt * 1000;
          if (m.away >= bal.boss.roomResetMs && (m.hp < m.def.hp || m.attacks)) this.resetBoss(m);
        }
      } else {
        if (!m.aggro && AGGRESSIVE.has(m.id) && d < AGGRO && !inTown && !playerInRoom) m.aggro = true;
        if (m.aggro && (inTown || playerInRoom || d > AGGRO * 2.5)) m.aggro = false;
      }
      const range = MON_RANGE + (m.reach || 0);
      if (m.aggro) {
        const sp = m.def.isBoss ? MON_SPEED : MON_SPEED * 1.4;
        if (d > range) { moving = this.moveBy(m.sprite, (dx / d) * sp * dt, (dy / d) * sp * dt, test); m.dir = dirOf(dx, dy); }
        else if (m.cd <= 0 && !(m.def.isBoss && this.slam?.b === m)) {
          m.cd = bal.combat.monsterAttackMs / 1000;
          m.dir = dirOf(dx, dy);
          if (m.def.isBoss && ++m.attacks % bal.boss.slamEvery === 0) { this.startSlam(m); m.cd += bal.boss.slamWarnMs / 1000; }
          else if (now >= this.invulnUntil) {
            const r = combat.monsterAttack(m.def, st, G.save.player.level, this.rng, bal, { reduce: this.guardReduce(now) });
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
      if (now - m.hurtAt >= 100) m.sprite.setTint(m.def.isBoss ? m.look.tint : 0xffffff);
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
    const base = combat.monsterAttack(s.b.def, this.stats(), G.save.player.level, () => 0, bal, { reduce: this.guardReduce(now) }).dmg;
    this.hurtPlayer(Math.max(1, Math.floor(base * bal.boss.slamMult)), '#ff3b2f');
  }

  // owner를 주면 그 보스의 울림만 취소(다른 보스의 초기화·처치가 진행 중인 울림을 지우지 않게)
  cancelSlam(owner) {
    if (!this.slam || (owner && this.slam.b !== owner)) return;
    this.slam.g.destroy(); this.slam = null;
  }

  // ---------- 기사 그림·칼질·효과 ----------
  drawHero() {
    const k = this.knight;
    if (this.face === 'left') this.facingLeft = true;
    else if (this.face === 'right') this.facingLeft = false;
    const x = this.snap(k.x + this.lunge.x), y = this.snap(k.y + 2 + this.lunge.y);
    this.hero.setPosition(x, y).setDepth(10 + k.y / 1000);
    this.cameraTarget.setPosition(this.snap(k.x), this.snap(k.y - 8));
  }

  swingAt(m, fxTint) {
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
    const fx = this.add.sprite(m.sprite.x, m.sprite.y - (m.def.isBoss ? 14 : 6), 'fx_slash').setDepth(950).setFlipX(this.facingLeft).setScale((m.def.isBoss ? 1.5 : 1) * (fxTint ? 1.5 : 1));
    if (fxTint) fx.setTint(fxTint);
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
    this.time.delayedCall(70, () => { m.sprite.clearTint(); if (m.def.isBoss) m.sprite.setTint(m.look.tint); });
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
      place: inBossRoom(this.knight.x, this.knight.y)?.name ?? regionName(mapIdAt(this.knight.x)),
    });
  }
}

function nameOf(id) {
  const all = [...bal.weapons, ...bal.armors, ...bal.consumables];
  return all.find((i) => i.id === id)?.name ?? id;
}

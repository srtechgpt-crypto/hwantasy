// 창: 가방·상점(잡화상/대장장이)·창고·강화·순간이동. 열려 있으면 게임이 멈춘다(멈춤 사유 'window').
// 모든 거래는 domain 함수로 새 save 후보를 만들고 G.commit으로 "저장에 성공했을 때만" 확정한다.
import bal, { WEAPON_TYPES } from '../../data/balance.js';
import * as inv from '../domain/inventory.js';
import { enchantInfo, tryEnchant, enchantPlan, enchantTo, blessedPlan, tryBlessed, lowerEnchant, blessedScrollOf, sameGearCandidates, enchantManyPlan, enchantMany } from '../domain/enchant.js';
import { morphDef, unmorph, rollText } from '../domain/morph.js';
import { itemDef, isGearDef, slotOf, EQUIP_SLOTS, enchantRule } from '../domain/common.js';
import { compareGear, compareDetail, loadoutStats } from '../domain/compare.js';
import { validate, statsOf } from '../domain/save.js';
import { activeSets, needExp } from '../domain/progression.js';
import { buffDef } from '../domain/buffs.js';
import estimate from '../../data/estimate.js';
import { drawWorldMap, regionAtRatio } from './worldmap.js';
import { REGIONS, mapIdAt } from '../../data/maps.js';
import { bossRemainMs } from '../domain/boss.js';
import { G, hud, josa } from '../state.js';
import { savePrefs } from './prefs.js';
import { assignSlot, setAutoUse, autoUse, PAGE_SIZE, HOTBAR_SLOTS } from '../domain/hotbar.js';
import { learnedSkills, skillAt, skillLevel, skillUpCost, cardIdOf } from '../domain/skills.js';
import * as col from '../domain/collect.js';
import { elixirOf, dollDef, recoverCost } from '../domain/growth.js';
import { loadEnchantLog, pushEnchantLog, agoText } from './format.js';

const $ = (id) => document.getElementById(id);
const won = (n) => n.toLocaleString('ko-KR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isGear = (id) => isGearDef(itemDef(id, bal));
// 8차: 장착 칸 이름(장비 9칸)
const SLOT_NAMES = { weapon: '무기', armor: '갑옷', helm: '투구', shirt: '티셔츠', cloak: '망토', gloves: '장갑', belt: '벨트', pants: '바지', boots: '부츠', neck: '목걸이', ring: '반지', ear: '귀걸이', wrist: '팔찌' };
// 인형 배치(3×3): 망토 투구 장갑 / 무기 갑옷 티셔츠 / 벨트 바지 부츠
// 18차: 맨 아래 줄에 장신구(목걸이·반지). 23차: 장신구 4칸(귀걸이·팔찌 더함)은 작은 칸 한 줄(.accrow)
const DOLL = ['cloak', 'helm', 'gloves', 'weapon', 'armor', 'shirt', 'belt', 'pants', 'boots', 'neck', 'ring', 'ear', 'wrist'];
// 빈 칸에 흐리게 보여 줄 그림
const GHOST = { weapon: 'woodSword', armor: 'clothArmor', helm: 'helm1', shirt: 'shirt1', cloak: 'cloak1', gloves: 'gloves1', belt: 'belt1', pants: 'pants1', boots: 'boots1', neck: 'neck1', ring: 'ring1', ear: 'ear1', wrist: 'wrist1' };
const icon = (id, cls = '') => `<img class="ic ${cls}" src="assets/icons/${id}.png" alt="">`;
const itemName = (it) => `${it.enchant ? `+${it.enchant} ` : ''}${itemDef(it.id, bal)?.name ?? it.id}`;
// 10차: 희귀 장비(금빛 테두리·이름), 무기 계열 이름
const isRare = (id) => !!itemDef(id, bal)?.rare;
// 23차: 영웅(보라)·전설(주황)은 rank로 — 희귀와 같은 자리에 색만 다르게
const rankOf = (id) => itemDef(id, bal)?.rank ?? null;
const RANK_NAME = { hero: '영웅', legend: '전설' };
const rareCls = (id) => (rankOf(id) ?? (isRare(id) ? 'rare' : ''));
const nameHtml = (it) => (rankOf(it.id) ? `<span class="${rankOf(it.id)}-t">${esc(itemName(it))}</span>` : isRare(it.id) ? `<span class="rare-t">${esc(itemName(it))}</span>` : esc(itemName(it)));
const gradeTag = (d) => (d.rank ? `<b class="${d.rank}-t">${RANK_NAME[d.rank]}</b> · ` : d.rare ? '<b class="rare-t">희귀</b> · ' : '');
// 23차 영웅·전설 특수 효과 한 줄(대검·도끼의 치명은 기존 '치명 +%'에 합쳐 보임)
const rankFx = (d) => [d.stealPct ? `흡혈 ${d.stealPct}%(때린 피해만큼 체력 회복)` : '', d.atkPct ? `공격 간격 −${d.atkPct}%` : '', d.hpPct ? `최대 체력 +${d.hpPct}%` : ''].filter(Boolean);
const TYPE_OF = Object.fromEntries(WEAPON_TYPES.map((t) => [t.type, t]));
const equipped = (s, uid) => Object.values(s.equip).includes(uid);
// 6차: 지금 낀 같은 종류 장비보다 좋으면 초록 ▲, 나쁘면 빨강 ▼(같거나 장비가 아니면 없음)
// 상세 칸 한 줄: "지금 장비보다 평균 공격 +2.5 ▲"
const cmpLine = (s, id, enchant = 0) => {
  const c = compareDetail(s, id, enchant, bal);
  if (!c) return '';
  const what = `${c.what}(약)`; // 10차: 끼었을 때 실제 능력치로 낸 근사치(무기 = 초당 피해, 방어구 = 전투력)
  const n = Math.round(Math.abs(c.diff) * 10) / 10;
  if (!c.worn) return `<p class="cmpline up">▲ 지금 ${josa(SLOT_NAMES[c.slot], '을/를')} 안 끼고 있음</p>`;
  return c.dir === 'same' ? `<p class="cmpline">지금 장비와 ${what} 같음</p>`
    : `<p class="cmpline ${c.dir}">${c.dir === 'up' ? '▲' : '▼'} 지금 장비보다 ${what} ${c.dir === 'up' ? '+' : '−'}${n}</p>`;
};
const cmpMark = (s, id, enchant = 0) => {
  const c = compareGear(s, id, enchant, bal);
  return c === 'up' ? '<span class="cmp up" title="지금 장비보다 좋음">▲</span>' : c === 'down' ? '<span class="cmp down" title="지금 장비보다 낮음">▼</span>' : '';
};

const SHOP_GOODS = {
  shop: bal.consumables.filter((c) => c.shop).map((c) => c.id),
  smith: [...bal.weapons, ...bal.armors].filter((g) => g.shop).map((g) => g.id),
};
const TITLES = {
  bag: ['가방', 'weaponScroll'], shop: ['잡화상 노인', 'potion'], smith: ['대장장이', 'ironSword'],
  bank: ['창고지기', 'armorScroll'], tele: ['순간이동 마법사', 'returnScroll'], rates: ['배율', 'rates'], map: ['지도', 'map'],
  me: ['내 정보', 'helm3'], morph: ['변신', 'morphScroll'],
};
const TABS = {
  bag: [['items', '가방'], ['enchant', '강화']],
  morph: [['morph', '변신 목록']],
  shop: [['buy', '사기'], ['sell', '팔기'], ['restock', '자동 보충'], ['coin', '보스 코인']],
  smith: [['buy', '사기'], ['sell', '팔기'], ['enchant', '강화']],
  bank: [['bank', '맡기기·찾기']],
  tele: [['tele', '목적지'], ['recover', '경험치 복구']],
  rates: [['rates', '배율 고르기']],
  // 8차 내 정보: 장비 9칸 · 능력치(보너스 점수) · 레벨 보상
  // 12차: 도감(장비 모으기)·칭호
  me: [['gear', '장비'], ['stats', '능력치'], ['skill', '스킬'], ['reward', '보상'], ['codex', '도감'], ['title', '칭호'], ['doll', '인형']],
  // 6차 큰 지도: [전체] + 지역마다 한 탭(지역 이름은 짧게)
  map: [['all', '전체'], ...REGIONS.map((r) => [r.id, r.name.split(' ').pop()])],
};
// 배율(3차): 묶음 버튼과 줄 이름. 값은 bal.rates 목록 안에서만 고른다
const PRESETS = [
  { id: 'base', name: '기본', tag: '×1', rates: { exp: 1, drop: 1, gold: 1, enchant: 1 } },
  { id: 'fast', name: '빠름', tag: '×5', rates: { exp: 5, drop: 5, gold: 5, enchant: 1.5 } },
  { id: 'rush', name: '쾌속', tag: '×20', rates: { exp: 20, drop: 20, gold: 20, enchant: 2 } },
];
const RATE_ROWS = [
  ['exp', '경험치', '몬스터를 잡으면 받는 경험치'],
  ['drop', '드랍', '물약·주문서·장비가 떨어질 확률'],
  ['gold', '돈', '몬스터가 떨어뜨리는 돈'],
  ['enchant', '강화', '위험 단계(무기 +7부터) 성공률'],
];
const sameRates = (a, b) => Object.keys(bal.rates).every((k) => a[k] === b[k]);
const rateText = (r) => `경험치 ×${r.exp} · 드랍 ×${r.drop} · 돈 ×${r.gold} · 강화 ×${r.enchant}`;
// 예상 시간: data/estimate.js(새 기사 기준, 처음부터 최대 레벨). 없으면 null
function estSeconds(r) {
  const v = estimate?.seconds?.[`${r.exp}|${r.drop}|${r.gold}`];
  return Number.isFinite(v) && v > 0 ? v : null;
}
function hm(sec) {
  if (sec === null) return '계산 전';
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `약 ${m}분`;
  const h = Math.floor(m / 60), mm = m % 60;
  return `약 ${h}시간${mm ? ` ${mm}분` : ''}`;
}

export function initWindows() {
  let cur = null; // { kind, tab, sel:{where,uid}|null, buyId, qty, confirm, busy, fx }

  function open(kind, opts = {}) {
    if (!G.save || G.pending) return;
    // 지도는 지금 있는 지역 탭으로 연다
    if (kind === 'map' && !opts.tab && G.scene?.knight) opts = { ...opts, tab: mapIdAt(G.scene.knight.x) };
    cur = { kind, scroll: !!opts.scroll, tab: opts.tab ?? TABS[kind][0][0], pick: null, hbSel: null, sel: null, buyId: null, qty: 1, qtyFresh: true, confirm: null, busy: false, fx: null, junk: null, slot: null, draft: null, confirmReset: false };
    if (kind === 'rates') { cur.orig = { ...G.save.rates }; cur.draft = { ...G.save.rates }; }
    // 13차: 가방은 화면 오른쪽 반쪽에 열고 게임을 멈추지 않는다(자동 사냥 계속). 다른 창은 지금처럼 멈춤
    cur.half = kind === 'bag';
    if (cur.half) G.pause.delete('window');
    else { G.pause.add('window'); G.scene?.releaseInput(); }
    $('win').classList.toggle('half', cur.half);
    $('win').hidden = false;
    msg(''); // 15차: 앞 창의 알림 글이 남지 않게
    render();
    clearInterval(halfTimer); halfTimer = 0;
    if (cur.half) { lastSig = sigOf(G.save); halfTimer = setInterval(halfTick, 1000); }
  }
  // 13차 반쪽 가방: 1초마다 가방·돈·장착이 바뀌었으면 다시 그린다(처리 중·확인 상자 중이면 기다림, 스크롤 유지)
  let halfTimer = 0, lastSig = '';
  const sigOf = (s) => (s ? `${s.player.gold}|${Object.values(s.equip).join(',')}|${s.bag.map((i) => `${i.uid}:${i.id}:${i.count}:${i.enchant ?? ''}:${i.lock ? 1 : 0}`).join(',')}` : '');
  // 반쪽 가방에서 다른 창(순간이동·변신)으로 넘어가면 보통 창처럼 게임을 멈춘다
  function unhalf() {
    if (!cur?.half) return;
    cur.half = false;
    clearInterval(halfTimer); halfTimer = 0;
    $('win').classList.remove('half');
    G.pause.add('window'); G.scene?.releaseInput();
  }
  function halfTick() {
    if (!cur?.half) { clearInterval(halfTimer); halfTimer = 0; return; }
    const sig = sigOf(G.save);
    if (sig === lastSig || cur.busy || cur.confirm || cur.bconfirm || cur.bless || cur.mconfirm || G.pending) return;
    lastSig = sig;
    render();
  }
  function close() {
    if (!cur) return;
    if (cur.busy) return;
    clearInterval(mapTimer); mapTimer = 0;
    clearInterval(halfTimer); halfTimer = 0;
    cur = null;
    $('win').hidden = true;
    $('win').classList.remove('half');
    G.pause.delete('window');
  }
  function msg(text, bad = false) {
    const el = $('winMsg');
    el.textContent = text || '';
    el.classList.toggle('bad', bad);
  }

  // 거래 한 건: res(domain 결과) → 저장 성공 시 확정
  function deal(res, why, { okText = '', keepPosition = false, mustSave = false, after = null } = {}) {
    if (!res.ok) { msg(res.reason || '할 수 없습니다', true); return false; }
    const done = G.commit(res.save, why, {
      keepPosition, mustSave,
      after: () => { G.scene?.refreshGear(); after?.(); if (cur) { msg(okText); render(); } },
    });
    return done;
  }

  // ---------- 그리기 ----------
  function render() {
    if (!cur) return;
    const s = G.save;
    const [title, ic] = cur.scroll ? ['사냥터 이동 주문서', 'huntScroll'] : TITLES[cur.kind];
    $('winTitle').textContent = title;
    $('winIcon').src = `assets/icons/${ic}.png`;
    const tabList = cur.scroll ? TABS[cur.kind].slice(0, 1) : TABS[cur.kind]; // 15차: 주문서 순간이동 창에는 복구 탭 없음(복구는 마을 마법사만)
    $('winTabs').innerHTML = tabList.length > 1
      ? tabList.map(([id, label]) => `<button type="button" class="tab ${cur.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${label}</button>`).join('')
      : '';
    $('winGold').textContent = won(s.player.gold);
    const body = cur.kind === 'map' ? viewMap : { items: viewItems, enchant: viewEnchant, buy: viewBuy, sell: viewSell, bank: viewBank, tele: viewTele, rates: viewRates, restock: viewRestock, coin: viewCoin, gear: viewGear, stats: viewStats, skill: viewSkill, reward: viewReward, morph: viewMorph, codex: viewCodex, title: viewTitle, recover: viewRecover, doll: viewDoll }[cur.tab];
    // 탭 이름 옆 ! (남은 보너스 점수·받을 보상)
    if (cur.kind === 'me') {
      for (const [id, on] of [['stats', inv.unspentPoints(s, bal) > 0], ['reward', inv.readyRewards(s, bal).length > 0], ['codex', col.codexReady(s, bal)], ['title', (G.scene?.newTitles?.size ?? 0) > 0]]) {
        $('winTabs').querySelector(`[data-tab="${id}"]`)?.classList.toggle('notice', on);
      }
    }
    // 13차: 다시 그려도 스크롤 위치를 지킨다(반쪽 가방은 1초마다 다시 그림)
    const keep = [...$('winBody').querySelectorAll('[data-keep]')].map((el) => [el.dataset.keep, el.scrollTop]);
    const top = $('winBody').scrollTop;
    $('winBody').innerHTML = body(s);
    $('winBody').scrollTop = top;
    for (const [k, y] of keep) { const el = $('winBody').querySelector(`[data-keep="${k}"]`); if (el) el.scrollTop = y; }
    if (cur.half) lastSig = sigOf(s);
    $('winBody').dataset.view = cur.kind === 'map' ? 'map' : cur.tab;
    if (cur.kind === 'map') paintMap();
  }

  // ---------- 6차 큰 지도 ----------
  let mapTimer = 0; // 열려 있는 동안 1초마다 다시 그림(보스 남은 시간). 스크롤 위치는 그대로
  function viewMap() {
    const all = cur.tab === 'all';
    const tele = all ? '' : mapTeleBtn();
    return `${tele ? `<div class="mapbar maptop">${tele}</div>` : ''}<div class="worldmap ${all ? 'all' : 'region'}"><canvas id="worldCanvas"></canvas></div>
      <p class="maphint">${all ? '지역을 누르면 크게 봅니다' : '손가락으로 밀어 지도를 움직입니다 · ★ 순간이동 도착 · 노란 줄 다른 지역 가는 길 · 주황 네모 보스 방'}</p>
      <div class="mapbar"><button type="button" class="act" data-act="minitoggle" id="btnMiniToggle">${miniLabel()}</button></div>`;
  }
  // 16차: 지역 탭이면 [이 지역 입구로 순간이동 · N원]
  function mapTeleBtn() {
    const t = bal.teleport.find((x) => x.id === cur.tab);
    if (!t) return '';
    const s = G.save, here = { ...s, player: { ...s.player, map: G.scene?.knight ? mapIdAt(G.scene.knight.x) : s.player.map } };
    const cost = inv.mapTeleportCost(here, t.id, bal);
    const fav = G.scene?.prefs?.fav === t.id;
    return `<button type="button" class="act primary" data-act="maptele" data-id="${t.id}" ${s.player.gold >= cost && !cur.busy ? '' : 'disabled'}>${esc(t.name)}로 순간이동 · ${won(cost)}원</button>
      <button type="button" class="act favbtn ${fav ? 'on' : ''}" data-act="fav" data-id="${t.id}" aria-pressed="${fav}">${fav ? '★ 즐겨찾기' : '☆ 즐겨찾기'}</button>`;
  }
  // 7차: 미니맵 보이기/숨기기(기기 설정 hwantasy.ui). 글자만 바꿔 지도 스크롤은 그대로
  function miniLabel() { return G.scene?.prefs?.mini === false ? '미니맵 보이기' : '미니맵 숨기기'; }
  function toggleMini() {
    const sc = G.scene;
    if (!sc?.prefs) return;
    sc.prefs.mini = !sc.prefs.mini;
    sc.minimap?.setOpen(sc.prefs.mini);
    savePrefs(sc.prefs); // 저장을 못 하면 이번 실행에만 적용
    const b = $('btnMiniToggle');
    if (b) b.textContent = miniLabel();
  }
  function paintMap() {
    clearInterval(mapTimer);
    mapTimer = setInterval(() => { if (cur?.kind === 'map' && $('worldCanvas')) drawMapOnly(); else { clearInterval(mapTimer); mapTimer = 0; } }, 1000);
    drawMapOnly();
    placeMap();
  }
  function drawMapOnly() {
    const canvas = $('worldCanvas'), sc = G.scene;
    if (!canvas || !sc?.wmap) return;
    drawWorldMap(canvas, {
      view: cur.tab, wmap: sc.wmap, knight: sc.knight,
      bossState: (id) => ({ alive: !!sc.bosses?.[id]?.alive, remainMs: bossRemainMs(G.save.bosses?.[id] ?? null, Date.now(), bal) }),
    });
  }
  // 처음 그릴 때만: 누르기·크기·내 위치로 스크롤
  function placeMap() {
    const canvas = $('worldCanvas'), sc = G.scene;
    if (!canvas || !sc?.wmap) return;
    if (cur.tab === 'all') {
      canvas.onclick = (e) => {
        const r = canvas.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
        if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
        const id = regionAtRatio(fx, sc.wmap);
        if (id) { cur.tab = id; render(); }
      };
    } else {
      // 지역 지도는 크게(그림 칸 0.75배 이상, 창 너비는 다 채움) 보여 주고 내 위치가 가운데 오게 스크롤
      const box = canvas.parentElement, me = sc.knight;
      const k = Math.min(1.25, Math.max(0.75, box.clientWidth / canvas.width)); // 마을처럼 좁은 지역은 너무 커지지 않게
      canvas.style.width = `${Math.round(canvas.width * k)}px`;
      const reg = REGIONS.find((x) => x.id === cur.tab);
      if (reg && me && mapIdAt(me.x) === reg.id) {
        box.scrollLeft = ((me.x / 16 - reg.x0) * 12 * k) - box.clientWidth / 2;
        box.scrollTop = ((me.y / 16) * 12 * k) - box.clientHeight / 2;
      }
    }
  }

  function grid(list, where, cap, s, { dimEquipped = false } = {}) {
    const cells = [];
    if (cap === null) cap = list.length; // 13차: 종류 칩으로 거른 목록은 빈 칸 없이
    for (let i = 0; i < cap; i++) {
      const it = list[i];
      if (!it) { cells.push('<div class="cell empty"></div>'); continue; }
      const on = cur.sel && cur.sel.where === where && cur.sel.uid === it.uid;
      const eq = where === 'bag' && equipped(s, it.uid);
      cells.push(`<button type="button" class="cell ${on ? 'on' : ''} ${eq ? 'eq' : ''} ${eq && dimEquipped ? 'dim' : ''} ${rareCls(it.id)}" data-act="sel" data-where="${where}" data-uid="${it.uid}">
        ${icon(it.id)}${it.count > 1 ? `<span class="n">${it.count}</span>` : ''}${it.enchant ? `<span class="e">+${it.enchant}</span>` : ''}${eq ? '<span class="eqm">E</span>' : cmpMark(s, it.id, it.enchant ?? 0)}${it.lock ? '<span class="lockm" title="잠금">🔒</span>' : ''}</button>`);
    }
    if (!cells.length) cells.push('<p class="hint">이 종류의 물건이 없습니다.</p>');
    return `<div class="grid g${where}" data-keep="grid-${where}">${cells.join('')}</div>`;
  }

  // 8차: 공격 = 무기 + 강화 + 피해 보너스(힘·장갑), 방어 = 레벨·체력 + 모든 방어구
  // 10차: 무기 계열 피해 %(대검 +40%·단검 −25%)도 반영(몬스터 방어를 빼기 전 값)
  const atkRange = (st) => {
    const add = st.weapon.enchant * bal.combat.weaponEnchantDamage + st.dmgBonus, f = (v) => Math.floor((v * (100 + (st.dmgPct ?? 0))) / 100);
    return `${f(st.weapon.min + add)}~${f(st.weapon.max + add)}`;
  };
  // ⑦ #2: 창의 공격·방어도 켜진 버프를 더한 실제 전투 값(loadoutStats = 장비 + 버프)
  function statsLine(s) {
    const st = loadoutStats(s, bal);
    return `<div class="stats"><span>공격 <b>${atkRange(st)}</b></span><span>방어 <b>${st.def}</b></span><span>체력 <b>${Math.ceil(s.player.hp)}/${st.maxHp}</b></span><span>가방 <b>${s.bag.length}/${bal.inventory.bagSlots}</b></span></div>`;
  }

  function itemInfo(it) {
    const d = itemDef(it.id, bal);
    if (d.kind === 'weapon') {
      // 10차: 계열 성격(피해 %·간격·치명·명중)
      const t = TYPE_OF[d.type ?? 'sword'], extra = [];
      if (d.dmgPct) extra.push(`피해 ${d.dmgPct > 0 ? '+' : ''}${d.dmgPct}%`);
      if (d.speedPct) extra.push(`공격 간격 ${d.speedPct > 0 ? '+' : ''}${d.speedPct}%`);
      if (d.crit) extra.push(`치명 +${d.crit}%`);
      if (d.hit) extra.push(`명중 ${d.hit > 0 ? '+' : ''}${d.hit}%`);
      extra.push(...rankFx(d));
      return `${gradeTag(d)}${t?.noun ?? '검'} · 공격 ${d.min}~${d.max}${it.enchant ? ` (+${it.enchant * bal.combat.weaponEnchantDamage})` : ''}${extra.length ? ` · ${extra.join(' · ')}` : ''}`;
    }
    if (d.kind === 'armor') {
      const parts = [];
      if (d.def || it.enchant) parts.push(`방어 ${d.def}${it.enchant ? ` (+${it.enchant})` : ''}`);
      if (d.hp) parts.push(`최대 체력 +${d.hp}`);
      if (d.hit) parts.push(`명중 +${d.hit}%`);
      if (d.dmg) parts.push(`피해 +${d.dmg}`);
      if (d.regen) parts.push(`회복 +${d.regen}`);
      parts.push(...rankFx(d));
      const setName = d.slot && d.slot !== 'armor' && !d.acc && d.tier ? bal.sets?.find((x) => x.tier === d.tier)?.name : null;
      return `${gradeTag(d)}${SLOT_NAMES[slotOf(d)]} · ${parts.join(' · ')}${setName ? ` · <small>${setName} 세트</small>` : ''}`;
    }
    if (d.elixir) return `${STAT_NAME[d.elixir]} 영구 +1 (최대 ${bal.elixirMax}개, 지금 ${(elixirOf(G.save) ?? {})[d.elixir] ?? 0}개)`;
    if (d.dollBox) return `열면 마법인형 ${bal.dolls.length}종 중 하나(이미 있으면 ${won(bal.dollRefund)}원을 돌려받음)`;
    if (d.card) return `<b class="grade g-${d.grade}">${bal.gradeNames[d.grade]}</b> 스킬 카드 — [정보]→[스킬]에서 ${esc(bal.skills.find((k) => k.id === d.card)?.name ?? '')} 레벨을 올리거나, ${bal.cardFuse}장을 합성해 다음 등급 카드로 바꿉니다`;
    if (d.heal) return `체력 +${d.heal}`;
    if (d.buff) { const b = buffDef(d.buff, bal); return `${b.desc} (또 쓰면 시간이 더해짐, 최대 ${Math.round((b.durationMs * bal.buffStackMax) / 60000)}분). 단축 칸에 두면 자동 사냥 때 효과가 끝나면 저절로 씀`; }
    if (d.id === 'huntScroll') return '어디서든 읽으면 고른 사냥터 입구로 갑니다(보스 방 제외)';
    if (d.id === 'returnScroll') return '읽으면 바람 마을로 돌아갑니다';
    if (d.id === 'weaponScroll') return '무기를 강화합니다';
    if (d.id === 'armorScroll') return '갑옷과 투구·망토 등 부위 장비를 강화합니다';
    return '';
  }

  function selected(s) {
    if (!cur.sel) return null;
    const list = cur.sel.where === 'bag' ? s.bag : s.warehouse;
    const it = list.find((i) => i.uid === cur.sel.uid);
    if (!it) cur.sel = null;
    return it ?? null;
  }

  function qtyBox(max) {
    cur.qty = Math.max(1, Math.min(cur.qty, Math.max(1, max)));
    return `<div class="qty">
      <button type="button" data-act="qty" data-d="-1">−</button><b>${won(cur.qty)}</b><button type="button" data-act="qty" data-d="1">+</button>
      <button type="button" data-act="qtyadd" data-v="10">+10</button><button type="button" data-act="qtyadd" data-v="100">+100</button>
      <button type="button" data-act="qtyset" data-v="${max}">최대</button><button type="button" data-act="qtyone">1로</button></div>
      <p class="qtyhint">[+10]·[+100]은 누를 때마다 더해집니다(처음 누르면 그 수로)</p>`;
  }


  // ---------- 2026-10-16 아이템 설명 카드(대표님 의견: 효과·기간·얼마나 오르는지) ----------
  // 숫자는 모두 domain(loadoutStats·buffDef·enchantRule·sets)에서 — 문구만 여기
  const sec = (ms) => `${(ms / 1000).toFixed(2)}초`;
  const atkText = (st) => atkRange(st);
  function guideRows(s, id, enchant = 0, uid = null) {
    const d = itemDef(id, bal);
    if (!d) return [];
    const rows = [];
    if (d.heal) {
      rows.push(['효과', `체력을 <b>${d.heal}</b> 바로 채웁니다(최대 체력까지)`]);
      rows.push(['기간', '<b>한 번</b> — 마시면 사라집니다']);
      rows.push(['쓰는 법', `[물약] 버튼은 모자란 체력에 맞는 물약을 골라 마십니다. 마신 뒤 ${d.cooldownMs / 1000}초 뒤에 다시 마실 수 있습니다`]);
      rows.push(['자동 사냥', `체력이 ${Math.round(bal.autohunt.potionHp * 100)}% 아래로 내려가면 저절로 마십니다`]);
      return rows;
    }
    if (d.buff) {
      const b = buffDef(d.buff, bal), lv = s.player.level;
      const off = loadoutStats({ ...s, buffs: {} }, bal), on = loadoutStats({ ...s, buffs: { [b.id]: 1 } }, bal);
      if (b.dmgPct) rows.push(['효과', `주는 피해 <b>+${b.dmgPct}%</b> (일반 공격·스킬·치명 모두) — 지금 공격 ${atkText(off)} → <b>${atkText(on)}</b>`]);
      if (b.speedPct) rows.push(['효과', `공격 간격 <b>${b.speedPct}%</b> (더 빨리 벰) — 지금 ${sec(off.attackMs)} → <b>${sec(on.attackMs)}</b>${on.attackMs === off.attackMs ? ' <small>(이미 가장 빠른 간격이라 더 빨라지지 않음)</small>' : ''}`]);
      if (b.defBase !== undefined) rows.push(['효과', `방어 <b>+${b.defBase + Math.floor(lv / b.defPerLevels)}</b> (3 + 레벨÷5, 지금 Lv ${lv}) — 방어 ${off.def} → <b>${on.def}</b>`]);
      if (b.expPct) rows.push(['효과', `몬스터를 잡을 때 받는 경험치 <b>+${b.expPct}%</b> (보스 포함, 배율 적용 뒤)`]);
      const capMs = b.durationMs * bal.buffStackMax, min = (ms) => `${Math.ceil(ms / 60000)}분`;
      rows.push(['기간', `<b>${b.durationMs / 60000}분</b> 동안만 (영원하지 않음 — 사냥하는 게임 시간으로 줄어듦)`]);
      rows.push(['겹쳐 쓰기', `또 쓰면 효과는 그대로이고 <b>남은 시간만</b> ${b.durationMs / 60000}분 늘어납니다(최대 ${capMs / 60000}분). 다른 버프와는 함께 켜집니다`]);
      rows.push(['멈추는 때', '창·메뉴를 열어 둔 동안, 앱을 꺼 둔 동안은 시간이 줄지 않습니다. 쓰러져도 남습니다']);
      rows.push(['쓰는 법', '가방에서 [쓰기], 또는 단축 칸에 넣고 누르기. <b>단축 칸에 두면 자동 사냥 중 효과가 끝날 때 저절로 씁니다</b>']);
      // ⑤ #2: 이미 켜져 있으면 능력치는 더 오르지 않고 시간만 — 상한이면 쓸 수 없음
      const left = s.buffs?.[b.id] ?? 0;
      if (left >= capMs) rows.push(['지금', `<b class="bad-t">이미 최대 시간(${min(capMs)})이라 지금은 더 쓸 수 없습니다</b>`]);
      else if (left > 0) rows.push(['지금', `켜져 있음 — 또 쓰면 남은 시간 ${min(left)} → <b>${min(Math.min(capMs, left + b.durationMs))}</b> (위 숫자는 효과가 없을 때와 비교)`]);
      return rows;
    }
    if (d.id === 'returnScroll') {
      return [['효과', '읽으면 바로 <b>바람 마을</b>로 돌아갑니다'], ['기간', '<b>한 번</b> — 읽으면 사라집니다'],
        ['쓰는 법', '오른쪽 아래 [귀환] 버튼 또는 단축 칸'], ['자동 사냥', `체력이 ${Math.round(bal.autohunt.returnHp * 100)}% 아래이거나 물약이 떨어지면 저절로 읽습니다`]];
    }
    if (d.id === 'huntScroll') {
      return [['효과', `어디서든 사냥터 입구(${bal.teleport.map((t) => t.name.replace(' 입구', '')).join('·')}) 중 골라 바로 갑니다`],
        ['기간', '<b>한 번</b> — 갈 곳을 고르면 1장 사라집니다(목록만 열고 닫으면 안 씀)'], ['못 쓰는 곳', '보스 방 안, 필살기 쓰는 중, 쓰러졌을 때'],
        ['쓰는 법', '가방에서 [읽기] 또는 단축 칸']];
    }
    // 11차 주문서
    if (d.id === 'weaponScrollB' || d.id === 'armorScrollB') {
      const w = bal.blessed.weights;
      return [['효과', `강화를 한 번에 <b>+1·+2·+3</b> 중 하나 올립니다(${w[0]}% · ${w[1]}% · ${w[2]}%)`],
        ['대상', d.id === 'weaponScrollB' ? '무기' : '갑옷과 투구·망토 등 부위 장비'],
        ['위험', '도착한 단계가 안전 단계 안이면 반드시 성공. 안전 단계를 넘으면 그 단계의 성공 확률로 판정하고 <b class="bad-t">실패하면 장비가 사라집니다</b>'],
        ['쓰는 법', '가방 → [강화] 탭 → [고급]을 고르면 나올 수 있는 결과와 확률 표가 보입니다']];
    }
    if (d.id === 'downScroll') return [['효과', '장비 강화를 <b>1단계 낮춥니다</b>(장비는 사라지지 않음)'], ['쓰는 때', '고급 강화가 낮게 나왔을 때 내리고 다시 노리기'], ['쓰는 법', '가방 → [강화] 탭 → [하락]']];
    if (d.id === 'morphScroll') return [['효과', '변신 목록에서 골라 <b>20분</b> 동안 변신(공격 속도·이동 속도 등 + 덤 능력치 1개 무작위)'],
      ['기간', '20분 동안만(사냥하는 게임 시간), 껐다 켜도 남음. 새로 변신하면 처음부터 20분'], ['쓰는 법', '가방에서 [쓰기] 또는 단축 칸. 단축 칸에 두면 자동 사냥 중 끝났을 때 같은 변신으로 다시']];
    if (d.id === 'weaponScroll' || d.id === 'armorScroll') {
      const kinds = d.id === 'weaponScroll' ? [['무기', bal.enchant.weapon]] : [['큰 갑옷', bal.enchant.armor], ['투구·망토 등 부위', bal.enchant.part]];
      rows.push(['효과', d.id === 'weaponScroll' ? `무기 강화 1단계마다 <b>공격 +${bal.combat.weaponEnchantDamage}</b>` : '갑옷·부위 강화 1단계마다 <b>방어 +1</b>']);
      for (const [name, r] of kinds) {
        const risky = r.riskyChances.map((c, i) => `+${r.safe + i + 1} ${Math.round(Math.min(1, c * s.rates.enchant) * 100)}%`).join(' · ');
        rows.push([name, `+${r.safe}까지 <b>반드시 성공</b>, 그 뒤 ${risky} (최대 +${r.max}) — <b class="bad-t">위험 단계에서 실패하면 장비가 사라집니다</b>`]);
      }
      rows.push(['쓰는 법', '가방 → [강화] 탭 또는 대장장이 [강화]. 한 번에 1장']);
      return rows;
    }
    if (isGearDef(d)) {
      const slot = slotOf(d), cur = loadoutStats(s, bal), wearing = uid !== null && s.equip[slot] === uid;
      // ⑤ #4: 지금 끼고 있는 그 장비면 비교 대신 '빼면'과 비교(같은 칸을 비운 상태)
      const next = wearing ? cur : loadoutStats(s, bal, slot, { id, enchant, count: 1 });
      const base = wearing ? loadoutStats(s, bal, slot, null) : cur;
      const arrow = (a, b, unit = '') => (a === b ? `${a}${unit}` : `${a}${unit} → <b class="${b > a ? 'ok-t' : 'bad-t'}">${b}${unit}</b>`);
      const arrowLow = (a, b) => (a === b ? sec(a) : `${sec(a)} → <b class="${b < a ? 'ok-t' : 'bad-t'}">${sec(b)}</b>`);
      rows.push(['기간', '<b>끼고 있는 동안 계속</b>(영구) — 벗으면 효과가 빠집니다']);
      if (d.kind === 'weapon') {
        const t = TYPE_OF[d.type ?? 'sword'];
        rows.push(['종류', `${t?.noun ?? '검'} — ${t?.desc ?? ''}${d.rare ? ' · <b class="rare-t">희귀</b>(같은 등급보다 공격 ×1.25)' : ''}${d.rank ? ` · <b class="${d.rank}-t">${RANK_NAME[d.rank]}</b>(보스 전용, 공격 ×${d.rank === 'legend' ? 1.6 : 1.35})` : ''}`]);
      }
      if (d.rank) rows.push(['특수 효과', `<b class="${d.rank}-t">${rankFx(d).concat(d.kind === 'weapon' && d.crit && ['twohand', 'axe'].includes(d.type) ? [`치명 +${d.crit}%`] : []).join(' · ')}</b>${d.stealPct ? ' — 비교 ▲▼ 점수에는 흡혈이 들어가지 않습니다' : ''}`]);
      const label = wearing ? '지금 끼고 있음' : s.bag.some((i) => i.uid === s.equip[slot]) ? '바꿔 끼면' : '끼면';
      const from = wearing ? base : cur;
      rows.push([label, `${wearing ? '(이 장비를 빼면 → 끼고 있는 지금) ' : ''}공격 ${atkText(from)} → <b>${atkText(next)}</b> · 간격 ${arrowLow(from.attackMs, next.attackMs)} · 치명 ${arrow(from.critPct, next.critPct, '%')}${from.dmgPct !== next.dmgPct ? ` · 피해 % ${arrow(from.dmgPct, next.dmgPct, '%')}` : ''}`]);
      rows.push(['', `방어 ${arrow(from.def, next.def)} · 최대 체력 ${arrow(from.maxHp, next.maxHp)} · 명중 보너스 ${arrow(from.hitBonus, next.hitBonus, '%')} · 피해 보너스 ${arrow(from.dmgBonus, next.dmgBonus)} · 회복 ${arrow(from.regenPerTick, next.regenPerTick)}`]);
      const r = enchantRule(d, bal);
      let ench = `${itemDef(r.scrollId, bal).name}로 +${r.safe}까지 반드시 성공, 그 뒤는 실패하면 사라짐, 최대 +${r.max} (1단계마다 ${d.kind === 'weapon' ? `공격 +${bal.combat.weaponEnchantDamage}` : '방어 +1'})`;
      if (enchant > 0 || uid !== null) {
        const info = enchantInfo({ id, enchant }, s.rates, bal);
        ench += info.next === null ? ' — <b>이미 최대</b>' : ` — 지금 +${info.current}, 다음 +${info.next} ${info.safe ? '반드시 성공' : `성공 ${Math.round(info.chance * 1000) / 10}%`}`;
      }
      rows.push(['강화', ench]);
      // ⑤ #6: 세트는 실제 계산(playerStats.sets)의 전후 — 부위 7칸만, 3·5·7개 단계 효과가 누적
      const set = d.slot && d.slot !== 'armor' && !d.acc && d.tier ? bal.sets?.find((x) => x.tier === d.tier) : null;
      if (set) {
        const at = (st) => st.sets.find((x) => x.tier === set.tier) ?? { count: 0, stage: 0, fx: {} };
        const a = at(from), b2 = at(next);
        const stTxt = (x) => `${x.count}개${x.stage ? ` (${x.stage}단계: ${FX_TEXT(x.fx)})` : ' (효과 없음)'}`;
        const stages = set.stages.map(([n, fx]) => `${n}개 ${FX_TEXT({ hp: 0, def: 0, dmg: 0, crit: 0, ...fx })}`).join(' / ');
        rows.push([`${set.name} 세트`, `같은 등급 부위(투구·티셔츠·망토·장갑·벨트·바지·부츠, 갑옷 칸 제외)를 모으면 단계 효과가 쌓입니다 — ${stages}`]);
        rows.push(['', `${wearing ? '빼면' : '지금'} ${stTxt(a)} → ${wearing ? '끼고 있는 지금' : '이걸 끼면'} <b>${stTxt(b2)}</b>`]);
      }
      return rows;
    }
    return rows;
  }
  function guideCard(s, id, enchant = 0, uid = null) {
    const rows = guideRows(s, id, enchant, uid);
    if (!rows.length) return '';
    return `<div class="guide"><h4>${icon(id)} ${esc(itemDef(id, bal).name)} 설명</h4>
      <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl></div>`;
  }

  // 13차 가방 종류 칩: 전체·장비·물약(회복·버프)·주문서(그 밖). 이번 실행 동안만 기억
  const BAG_KINDS = [['all', '전체', () => true], ['gear', '장비', (d) => isGearDef(d)], ['potion', '물약', (d) => !!(d.heal || d.buff)], ['scroll', '주문서', (d) => !isGearDef(d) && !d.heal && !d.buff && !d.card], ['card', '카드', (d) => !!d.card]];
  let bagKind = 'all';
  function bagFilter(s) {
    const k = BAG_KINDS.find((x) => x[0] === bagKind) ?? BAG_KINDS[0];
    const list = k[0] === 'all' ? s.bag : s.bag.filter((i) => k[2](itemDef(i.id, bal)));
    const chips = BAG_KINDS.map(([id, name, f]) => `<button type="button" class="chip ${bagKind === id ? 'on' : ''}" data-act="bagkind" data-k="${id}">${name} ${id === 'all' ? s.bag.length : s.bag.filter((i) => f(itemDef(i.id, bal))).length}</button>`).join('');
    return { list, cap: k[0] === 'all' ? bal.inventory.bagSlots : null, bar: `<div class="chips bagchips">${chips}<button type="button" class="chip sortbtn" data-act="sortbag" data-where="bag" ${cur.busy ? 'disabled' : ''}>정리</button></div>` };
  }
  const lockBtn = (it) => (isGear(it.id) ? `<button type="button" class="act lockbtn" data-act="lock" data-uid="${it.uid}" data-on="${it.lock ? '0' : '1'}">${it.lock ? '🔓 잠금 풀기' : '🔒 잠그기'}</button>` : '');
  const LOCK_HINT = '<p class="hint lockhint">🔒 잠긴 장비입니다 — 팔기·강화·도감 넣기가 안 됩니다. 가방에서 잠금을 풀 수 있습니다.</p>';

  // 가방
  function viewItems(s) {
    const it = selected(s);
    let side = '<p class="hint">칸을 누르면 설명과 버튼이 나옵니다.</p>';
    if (it) {
      const gear = isGear(it.id), eq = equipped(s, it.uid);
      side = `<div class="detail">${icon(it.id, 'big')}<h3>${nameHtml(it)}${it.count > 1 ? ` × ${won(it.count)}` : ''}</h3><p>${itemInfo(it)}</p>${equipped(s, it.uid) ? '' : cmpLine(s, it.id, it.enchant ?? 0)}
        <div class="btns">${gear ? (eq ? '<button type="button" class="act" data-act="unequip">벗기</button>' : '<button type="button" class="act primary" data-act="equip">장착</button>') : ''}
        ${gear ? '<button type="button" class="act" data-act="goEnchant">강화</button>' : ''}${gear ? lockBtn(it) : ''}
        ${it.id === 'returnScroll' ? '<p class="hint">귀환은 오른쪽 아래 [귀환] 버튼으로 읽습니다.</p>' : ''}
        ${itemDef(it.id, bal).buff ? `<button type="button" class="act primary" data-act="usebuff" data-id="${it.id}">쓰기</button>` : ''}
        ${it.id === 'huntScroll' ? '<button type="button" class="act primary" data-act="hunt">읽기</button>' : ''}
        ${it.id === 'morphScroll' ? '<button type="button" class="act primary" data-act="toMorph">쓰기</button>' : ''}
        ${itemDef(it.id, bal).elixir ? `<button type="button" class="act primary" data-act="elixir" data-id="${it.id}" ${((elixirOf(s) ?? {})[itemDef(it.id, bal).elixir] ?? 0) >= bal.elixirMax || cur.busy ? 'disabled' : ''}>마시기</button>` : ''}
        ${it.id === 'dollBox' ? `<button type="button" class="act primary" data-act="dollbox" ${cur.busy ? 'disabled' : ''}>열기</button>` : ''}
        ${itemDef(it.id, bal).heal ? `<button type="button" class="act" data-act="drink" data-id="${it.id}">마시기</button><p class="hint">[물약] 버튼은 모자란 체력에 맞는 물약을 골라 마십니다.</p>` : ''}</div></div>`;
    }
    const f = bagFilter(s);
    return `${statsLine(s)}${f.bar}<div class="split">${grid(f.list, 'bag', f.cap, s)}<div class="side" data-keep="side">${side}${it?.lock ? LOCK_HINT : ''}${it ? guideCard(s, it.id, it.enchant ?? 0, it.uid) : ''}</div></div>`;
  }

  // 강화
  function viewEnchant(s) {
    const gear = s.bag.filter((i) => isGear(i.id));
    const fxBox = cur.fx ? `<div class="fx ${cur.fx.kind}">${esc(cur.fx.text)}</div>` : '';
    if (!gear.length) return `${fxBox}<p class="hint big">가방에 강화할 장비가 없습니다.</p>`;
    if (!cur.sel || !gear.some((g) => g.uid === cur.sel.uid)) cur.sel = { where: 'bag', uid: (gear.find((g) => equipped(s, g.uid)) ?? gear[0]).uid };
    const it = selected(s);
    const info = enchantInfo(it, s.rates, bal);
    const scrollId = info.scrollId;
    const scrolls = inv.countItem(s, scrollId);
    // 11차: 주문서 고르기 [일반 · 고급 · 하락]
    const bId = blessedScrollOf(itemDef(it.id, bal), bal);
    cur.scrollKind = cur.scrollKind ?? 'normal';
    const kindChips = `<div class="chips sub">${[['normal', itemDef(scrollId, bal).name, scrolls], ['blessed', itemDef(bId, bal).name, inv.countItem(s, bId)], ['down', '강화 하락 주문서', inv.countItem(s, 'downScroll')]]
      .map(([k, n, c]) => `<button type="button" class="chip ${cur.scrollKind === k ? 'on' : ''}" data-act="skind" data-k="${k}">${esc(n.replace(' 주문서', ''))} ${won(c)}</button>`).join('')}</div>`;
    const list = gear.map((g) => `<button type="button" class="row-item ${g.uid === it.uid ? 'on' : ''}" data-act="sel" data-where="bag" data-uid="${g.uid}">${icon(g.id)}<span>${g.lock ? '🔒 ' : ''}${esc(itemName(g))}</span>${equipped(s, g.uid) ? '<em>장착</em>' : ''}</button>`).join('');
    // 13차: 잠긴 장비는 강화 버튼 대신 안내 + [잠금 풀기]
    if (it.lock) return `<div class="split ench-split"><div class="list" data-keep="elist">${list}</div><div class="side">${fxBox}<div class="ench"><div class="ench-top">${icon(it.id, 'big')}<div><h3>${esc(itemName(it))}</h3></div></div>${LOCK_HINT}<div class="btns">${lockBtn(it)}</div>${cur.scrollKind === 'normal' ? manyBox(s, it) : ''}</div></div></div>`;
    let center;
    if (info.next === null) center = `${fxBox}<p class="hint big">${esc(josa(itemName(it), '은/는'))} 최대 강화 단계입니다.</p>${manyBox(s, it)}`;
    else {
      const pct = Math.round(info.chance * 1000) / 10;
      const confirming = cur.confirm && cur.confirm.uid === it.uid && cur.confirm.level === it.enchant;
      center = `<div class="ench">
        <div class="ench-top">${icon(it.id, 'big')}<div><h3>${esc(itemDef(it.id, bal).name)} <b>+${info.current}</b> → <b class="gold-t">+${info.next}</b></h3>
          <p>${info.safe ? '<span class="ok-t">안전 단계 · 반드시 성공</span>' : `성공 <b>${pct}%</b> · <span class="bad-t">실패하면 ${esc(josa(itemDef(it.id, bal).name, '이/가'))} 사라집니다</span>`}</p>
          <p class="sub-t">${itemDef(scrollId, bal).name} ${won(scrolls)}장${s.rates.enchant !== 1 ? ` · 강화 배율 ×${s.rates.enchant} 반영` : ''}</p>${manyJump(s, it)}</div></div>
        ${fxBox}
        ${scrolls < 1 ? `<p class="hint">${josa(itemDef(scrollId, bal).name, '이/가')} 없습니다. 잡화상에서 살 수 있습니다.</p>`
          : confirming ? `<div class="warnbox"><p>정말 강화할까요? 실패하면 <b>${esc(josa(itemName(it), '이/가'))}</b> <b>사라집니다</b>.</p>
              <div class="btns"><button type="button" class="act danger" data-act="doEnchant" ${cur.busy ? 'disabled' : ''}>그래도 강화</button><button type="button" class="act" data-act="cancelConfirm">그만두기</button></div></div>`
          : `<div class="btns"><button type="button" class="act ${info.safe ? 'primary' : 'danger'}" data-act="${info.safe ? 'doEnchant' : 'askEnchant'}" ${cur.busy ? 'disabled' : ''}>강화하기</button></div>`}
        ${scrolls >= 1 && !confirming ? batchBox(s, it, info, scrolls) : ''}
        ${!confirming ? manyBox(s, it) : ''}
      </div>`;
    }
    if (cur.scrollKind === 'blessed') center = blessedBox(s, it, info, bId, fxBox);
    else if (cur.scrollKind === 'down') center = downBox(s, it, fxBox);
    return `<div class="split ench-split"><div class="list" data-keep="elist">${list}</div><div class="side">${kindChips}${center}${enchantLogBox()}</div></div>`;
  }
  // 17차 강화 기록(이 기기, 최근 20개)
  function enchantLogBox() {
    const log = loadEnchantLog();
    if (!log.length) return '';
    const rows = log.map((e) => `<li class="${e.ok ? 'ok' : 'bad'}"><span class="when">${agoText(e.t)}</span><b>${esc(e.name)}</b> <em>${esc(e.kind)}</em> +${e.from} → ${e.ok ? `<b class="ok-t">+${e.to}</b>` : `<b class="bad-t">+${e.to} 실패 · 사라짐</b>`}</li>`).join('');
    return `<details class="elog" ${cur.logOpen ? 'open' : ''}><summary>최근 강화 ${log.length}개 <small>(이 폰에만 · 참고용)</small></summary><ul>${rows}</ul></details>`;
  }
  // 고급 강화: 도착 단계별 최종 확률 표(⑤ #7) + 사라질 수 있으면 확인 상자(그 장비·단계·배율에 묶음)
  function blessedBox(s, it, info, bId, fxBox) {
    const name = itemDef(it.id, bal).name, have = inv.countItem(s, bId), pct = (x) => `${Math.round(x * 1000) / 10}%`;
    const head = `<div class="ench-top">${icon(it.id, 'big')}<div><h3>${esc(name)} <b>+${info.current}</b></h3><p class="sub-t">${itemDef(bId, bal).name} ${won(have)}장 · 한 번에 +1~3 (${bal.blessed.weights.join('% · ')}%)</p></div></div>`;
    if (info.next === null) return `${fxBox}${head}<p class="hint big">이미 최대 강화 단계입니다.</p>`;
    const plan = blessedPlan(it, s.rates, bal);
    const rows = plan.outcomes.map((o) => `<tr><td>+${o.level}</td><td>${pct(o.arrive)}</td><td>${o.chance >= 1 ? '<span class="ok-t">안전</span>' : pct(o.chance)}</td><td class="ok-t">${pct(o.success)}</td><td class="${o.destroy ? 'bad-t' : ''}">${o.destroy ? pct(o.destroy) : '—'}</td></tr>`).join('');
    const table = `<table class="btable"><tr><th>도착</th><th>나올 확률</th><th>그 단계 성공</th><th>최종 성공</th><th>사라짐</th></tr>${rows}
      <tr class="sum"><td colspan="4">사라질 확률 합계</td><td class="${plan.destroy ? 'bad-t' : ''}">${plan.destroy ? pct(plan.destroy) : '없음'}</td></tr></table>`;
    const bc = cur.bless, confirming = bc && bc.uid === it.uid && bc.level === it.enchant && bc.rate === s.rates.enchant;
    let btn;
    if (have < 1) btn = `<p class="hint">${josa(itemDef(bId, bal).name, '이/가')} 없습니다. 잡화상에서 살 수 있습니다.</p>`;
    else if (confirming) btn = `<div class="warnbox"><p>사라질 확률 <b class="bad-t">${pct(plan.destroy)}</b> — 실패하면 <b>${esc(josa(itemName(it), '이/가'))}</b> 사라집니다.</p>
      <div class="btns"><button type="button" class="act danger" data-act="blessGo" ${cur.busy ? 'disabled' : ''}>그래도 강화</button><button type="button" class="act" data-act="blessNo">그만두기</button></div></div>`;
    else btn = `<div class="btns"><button type="button" class="act ${plan.anyRisk ? 'danger' : 'primary'}" data-act="blessAsk" ${cur.busy ? 'disabled' : ''}>고급 강화하기</button></div>`;
    return `<div class="ench">${head}${fxBox}${table}${btn}</div>`;
  }
  function downBox(s, it, fxBox) {
    const name = itemDef(it.id, bal).name, have = inv.countItem(s, 'downScroll');
    return `<div class="ench"><div class="ench-top">${icon(it.id, 'big')}<div><h3>${esc(name)} <b>+${it.enchant}</b>${it.enchant > 0 ? ` → <b class="gold-t">+${it.enchant - 1}</b>` : ''}</h3>
      <p class="sub-t">강화 하락 주문서 ${won(have)}장 · 1단계 낮춤 · 장비는 사라지지 않음</p></div></div>${fxBox}
      <p class="hint">고급 강화로 원하는 단계보다 낮게 나왔을 때 한 단계 내려서 다시 노려 볼 수 있습니다.</p>
      ${have < 1 ? '<p class="hint">강화 하락 주문서가 없습니다. 잡화상에서 살 수 있습니다.</p>' : it.enchant < 1 ? '<p class="hint">이미 +0입니다.</p>'
        : `<div class="btns"><button type="button" class="act" data-act="downGo" ${cur.busy ? 'disabled' : ''}>한 단계 낮추기</button></div>`}</div>`;
  }
  function doBlessed() {
    if (cur.busy) return;
    const s = G.save, it = selected(s);
    if (!it) return;
    if (G.pending || G.lockedByOtherTab) { msg('지금은 강화할 수 없습니다', true); return; }
    if (!G.storage) { msg('이 브라우저는 저장이 막혀 있어 강화할 수 없습니다', true); return; }
    let plan;
    try { plan = blessedPlan(it, s.rates, bal); } catch (e) { msg(e.message, true); return; }
    const bc = cur.bless;
    if (plan.anyRisk && !(bc && bc.uid === it.uid && bc.level === it.enchant && bc.rate === s.rates.enchant)) { cur.bless = { uid: it.uid, level: it.enchant, rate: s.rates.enchant }; render(); return; }
    const name = itemDef(it.id, bal).name;
    const res = tryBlessed(s, it.uid, G.scene.rng, bal);
    if (!res.ok) { msg(res.reason, true); return; }
    cur.busy = true; cur.bless = null;
    const text = res.result === 'success' ? `+${res.from} → +${res.to} (+${res.k}) 성공!` : `+${res.to}에 도착했지만 실패 — ${josa(name, '이/가')} 사라졌습니다`;
    const ok = deal(res, 'enchant', { mustSave: true, after: () => {
      if (cur) { cur.busy = false; cur.fx = { kind: res.result === 'success' ? 'up' : 'broke', text }; if (res.result !== 'success') cur.sel = null; }
      hud.log(res.result === 'success' ? `<b style="color:#e0a63e">${name} 고급 강화: ${text}</b>` : `<span style="color:#ff8a7a">${name} 고급 강화: ${text}</span>`);
      pushEnchantLog({ name, from: res.from, to: res.to, kind: '고급', ok: res.result === 'success' });
    } });
    if (!ok && !G.pending && cur) cur.busy = false;
  }


  // 2026-10-16 한 번에 강화: [안전 단계까지] + 목표 고르기. 목표가 위험 단계를 포함하면 확인 상자(그 장비·단계·목표·배율에만 유효)
  function batchBox(s, it, info, scrolls) {
    const max = info.max, safeTo = info.safeMax;
    if (cur.bt === undefined || cur.bt <= info.current || cur.bt > max || cur.btFor !== it.uid) { cur.bt = Math.min(max, Math.max(info.current + 1, safeTo)); cur.btFor = it.uid; }
    const plan = enchantPlan(it, cur.bt, s.rates, bal);
    const reach = Math.min(cur.bt, info.current + scrolls); // ⑤ #5: 주문서로 갈 수 있는 끝
    const reachPlan = reach > info.current ? enchantPlan(it, reach, s.rates, bal) : null;
    const pct = (x) => `${Math.round(x * 1000) / 10}%`;
    const safeBtn = info.current < safeTo
      ? `<button type="button" class="act primary" data-act="batchSafe" ${cur.busy ? 'disabled' : ''}>안전 단계까지 한 번에 (+${info.current} → +${Math.min(safeTo, info.current + scrolls)})</button>` : '';
    const bc = cur.bconfirm, confirming = bc && bc.uid === it.uid && bc.level === it.enchant && bc.target === cur.bt && bc.rate === s.rates.enchant;
    const ex = reachPlan ?? plan; // ⑦ #1: 주문서로 실제 시도할 단계까지만
    const short = reach < cur.bt;
    const riskTxt = ex.risky.map((x) => `+${x.level} ${pct(x.chance)}`).join(' · ');
    let body;
    if (confirming) {
      body = `<div class="warnbox"><p><b>+${info.current} → +${reach}</b> 한 번에 강화합니다${short ? ` <b class="bad-t">(목표 +${cur.bt}는 주문서가 ${won(scrolls)}장뿐이라 못 갑니다)</b>` : ''}. 위험 단계 ${ex.risky.length}번(${riskTxt}).</p>
        <p>+${reach}까지 성공할 확률 <b>${pct(ex.allChance)}</b>. 주문서 최대 ${ex.scrolls}장.</p>
        <p class="bad-t"><b>위험 단계에서 한 번이라도 실패하면 ${esc(josa(itemName(it), '이/가'))} 사라지고 거기서 멈춥니다.</b></p>
        <div class="btns"><button type="button" class="act danger" data-act="batchGo" data-t="${cur.bt}" ${cur.busy ? 'disabled' : ''}>그래도 강화</button><button type="button" class="act" data-act="batchNo">그만두기</button></div></div>`;
    } else {
      body = `<div class="btrow"><span>목표</span><button type="button" class="rbtn" data-act="bt" data-d="-1" ${cur.bt <= info.current + 1 ? 'disabled' : ''}>◀</button><b class="gold-t">+${cur.bt}</b>
        <button type="button" class="rbtn" data-act="bt" data-d="1" ${cur.bt >= max ? 'disabled' : ''}>▶</button>
        <button type="button" class="act ${plan.risky.length ? 'danger' : 'primary'}" data-act="batchAsk" data-t="${cur.bt}" ${cur.busy ? 'disabled' : ''}>+${cur.bt}까지 한 번에</button></div>
        <p class="sub-t">${ex.risky.length ? `위험 ${riskTxt} · +${reach}까지 성공 ${pct(ex.allChance)} · 실패하면 사라짐` : '모두 안전 단계 · 반드시 성공'} · 주문서 ${plan.scrolls}장 필요(가진 것 ${won(scrolls)}장)${short ? ` → <b class="bad-t">+${reach}까지만 가능</b>` : ''}</p>`;
    }
    return `<div class="batch"><h4>한 번에 강화</h4>${safeBtn}${body}</div>`;
  }
  // 24차 같은 장비 함께 강화: 고른 장비와 같은 종류(같은 id)·안 낌·안 잠김 장비가 2개 이상이면 보임.
  // 칩으로 빼고 넣기(cur.many.off), 목표 ◀▶(cur.many.t). 위험 단계가 있으면 확인 — 확인은 계획 서명(종류·주문서 종류·목표·배율·쓸 수 있는 주문서 수·장비 uid:단계)에 묶음 — 자동 사냥이 주문서를 주워도 넉넉하면 그대로
  function manyState(s, it) {
    const cands = sameGearCandidates(s, it.id, bal);
    if (cands.length < 2) return null;
    if (!cur.many || cur.many.id !== it.id) cur.many = { id: it.id, off: new Set(), t: null };
    const m = cur.many, info = enchantInfo(cands[0], s.rates, bal);
    const lo = Math.min(...cands.map((c) => c.enchant)) + 1;
    if (m.t === null || m.t < lo || m.t > info.max) m.t = Math.min(info.max, Math.max(lo, info.safeMax));
    const on = cands.filter((c) => c.enchant < m.t && !m.off.has(c.uid));
    let plan = null;
    if (on.length >= 2) { try { plan = enchantManyPlan(s, on.map((c) => c.uid), m.t, bal); } catch { plan = null; } }
    const sig = plan ? `${plan.id}|${plan.scrollId}|${m.t}|${s.rates.enchant}|${Math.min(plan.have, plan.need)}|${plan.items.map((x) => `${x.uid}:${x.from}`).join(',')}` : '';
    return { cands, m, info, lo, on, plan, sig };
  }
  // 상자가 아래에 있어 눈에 안 띄므로 위에 바로가기(같은 종류 2개 이상일 때)
  function manyJump(s, it) {
    const n = sameGearCandidates(s, it.id, bal).length;
    return n >= 2 ? `<button type="button" class="chip mjump" data-act="manyJump">같은 장비 ${won(n)}개 함께 강화 ↓</button>` : '';
  }
  function manyBox(s, it) {
    const st = manyState(s, it);
    if (!st) return '';
    const { cands, m, info, lo, on, plan, sig } = st;
    const name = itemDef(it.id, bal).name, pct = (x) => `${Math.round(x * 1000) / 10}%`, loss = (x) => (Math.round(x * 10) / 10).toLocaleString('ko-KR');
    const hiddenN = s.bag.filter((i) => i.id === it.id).length - cands.length;
    const chips = cands.map((c) => {
      const below = c.enchant < m.t, picked = below && !m.off.has(c.uid);
      return `<button type="button" class="chip mchip ${picked ? 'on' : ''}" data-act="manyTog" data-uid="${c.uid}" ${below ? '' : 'disabled'} aria-pressed="${picked}">${icon(c.id)}+${c.enchant}</button>`;
    }).join('');
    const sc = itemDef(info.scrollId, bal).name;
    let foot;
    if (!plan) foot = `<p class="sub-t">2개 이상 골라 주세요${on.length === 1 ? ' (지금 1개)' : ''}.</p>`;
    else if (plan.have < 1) foot = `<p class="hint">${josa(sc, '이/가')} 없습니다. 잡화상에서 살 수 있습니다.</p>`;
    else {
      const short = plan.have < plan.need;
      if (cur.mconfirm === sig) {
        const risky = [...new Map(plan.items.flatMap((x) => x.plan.steps.slice(0, plan.have)).filter((x) => !x.safe).map((x) => [x.level, x])).values()].sort((a, b) => a.level - b.level);
        foot = `<div class="warnbox"><p><b>${esc(name)} ${won(on.length)}개</b>를 <b class="gold-t">+${m.t}</b>까지 함께 강화합니다. 주문서 최대 ${won(plan.maxUse)}장${short ? ' (모자라서 단계 높은 것부터 하고, 떨어지면 나머지는 손대지 않음)' : ''}. 실패로 일찍 끝난 장비 몫은 다음 장비가 씁니다.</p>
          <p>위험 단계 성공률: ${risky.map((x) => `+${x.level} ${pct(x.chance)}`).join(' · ')} · 예상 사라짐 약 <b class="bad-t">${loss(plan.expectLoss)}개</b></p>
          <p class="bad-t"><b>위험 단계에서 실패한 장비는 사라집니다(다른 장비는 계속 강화).</b></p>
          <div class="btns"><button type="button" class="act danger" data-act="manyGo" data-sig="${esc(sig)}" ${cur.busy ? 'disabled' : ''}>그래도 강화</button><button type="button" class="act" data-act="manyNo">그만두기</button></div></div>`;
      } else {
        const line = `${won(on.length)}개 · ${esc(sc)} ${won(plan.need)}장 필요(가진 것 ${won(plan.have)}장)${short ? ' → <b class="bad-t">모자라면 단계 높은 것부터 하고 멈춤</b>' : ''}${plan.risky ? ` · <span class="bad-t">위험 단계 포함 · 예상 사라짐 약 ${loss(plan.expectLoss)}개</span>` : ' · 모두 안전 단계 · 반드시 성공'}`;
        foot = `<p class="sub-t">${line}</p><div class="btns"><button type="button" class="act ${plan.risky ? 'danger' : 'primary'}" data-act="manyAsk" data-sig="${esc(sig)}" ${cur.busy ? 'disabled' : ''}>${won(on.length)}개 +${m.t}까지 함께 강화</button></div>`;
      }
    }
    return `<div class="batch many"><h4>같은 장비 함께 강화 <small>${esc(name)} · 끼지 않은 것만</small></h4>
      <div class="btrow"><span>목표</span><button type="button" class="rbtn" data-act="mt" data-d="-1" ${m.t <= lo ? 'disabled' : ''}>◀</button><b class="gold-t">+${m.t}</b><button type="button" class="rbtn" data-act="mt" data-d="1" ${m.t >= info.max ? 'disabled' : ''}>▶</button><small class="sub-t">눌러서 빼고 넣기</small></div>
      <div class="chips mchips">${chips}</div>${hiddenN > 0 ? `<p class="sub-t">끼고 있거나 잠긴 것·최대 단계 ${won(hiddenN)}개는 빠집니다.</p>` : ''}${foot}</div>`;
  }
  // 실행: 화면에 보인 계획(서명)과 지금 계획이 같을 때만. 막힘 검사는 굴리기 전에(한 번에 강화와 같은 순서)
  function doMany(sigShown, confirmed) {
    if (cur.busy) return;
    const s = G.save, it = selected(s);
    const st = it ? manyState(s, it) : null;
    if (!st?.plan || st.sig !== sigShown) { cur.mconfirm = null; msg('고른 장비가 바뀌었습니다. 다시 확인해 주세요', true); render(); return; }
    if (G.pending || G.lockedByOtherTab) { msg('지금은 강화할 수 없습니다', true); return; }
    if (!G.storage) { msg('이 브라우저는 저장이 막혀 있어 강화할 수 없습니다', true); return; }
    if (st.plan.risky && !(confirmed && cur.mconfirm === st.sig)) { cur.mconfirm = st.sig; render(); return; }
    const name = itemDef(st.m.id, bal).name;
    const res = enchantMany(s, st.on.map((c) => c.uid), st.m.t, G.scene.rng, bal);
    if (!res.ok) { msg(res.reason, true); return; }
    cur.busy = true; cur.mconfirm = null; cur.confirm = null; cur.bconfirm = null;
    const parts = [`+${res.target} 성공 ${res.done}`];
    if (res.lost) parts.push(`사라짐 ${res.lost}`);
    const pr = res.results.find((x) => x.stop === 'noScroll');
    if (pr) parts.push(`주문서 모자라 +${pr.to}에서 멈춤 1`);
    if (res.untouched) parts.push(`손대지 않음 ${res.untouched}`);
    const text = `함께 강화 ${res.results.length}개: ${parts.join(' · ')} (주문서 ${res.used}장)`;
    const selGone = res.results.some((x) => x.stop === 'destroyed' && x.uid === it.uid);
    const ok = deal(res, 'enchant', {
      mustSave: true,
      after: () => {
        if (cur) { cur.busy = false; cur.fx = { kind: res.lost ? 'broke' : 'up', text }; if (selGone) cur.sel = null; }
        hud.log(res.lost ? `<span style="color:#ff8a7a">${name} ${text}</span>` : `<b style="color:#e0a63e">${name} ${text}</b>`);
        for (const x of res.results) if (x.stop !== 'skipped') pushEnchantLog({ name, from: x.from, to: x.stop === 'destroyed' ? x.failAt : x.to, kind: '함께', ok: x.stop !== 'destroyed' });
      },
    });
    if (!ok && !G.pending && cur) cur.busy = false;
  }

  // 실행: 거래가 가능한지 먼저 확인하고(⑤ #3 — 굴린 뒤 거절되지 않게) 한 거래로 저장(mustSave)
  function doBatch(target, needConfirm) {
    if (cur.busy) return;
    const s = G.save, it = selected(s);
    if (!it) return;
    if (G.pending || G.lockedByOtherTab) { msg('지금은 강화할 수 없습니다', true); return; }
    if (!G.storage) { msg('이 브라우저는 저장이 막혀 있어 강화할 수 없습니다', true); return; } // ⑤ #1
    let plan;
    try {
      const info = enchantInfo(it, s.rates, bal), have = inv.countItem(s, info.scrollId);
      if (have < 1) { msg(`${itemDef(info.scrollId, bal).name}이(가) 없습니다`, true); return; }
      plan = enchantPlan(it, Math.min(target, info.current + have), s.rates, bal); // ⑦ #1: 주문서로 갈 수 있는 끝
    } catch (e) { msg(e.message, true); return; }
    if (needConfirm && plan.risky.length) {
      const bc = cur.bconfirm;
      if (!(bc && bc.uid === it.uid && bc.level === it.enchant && bc.target === target && bc.rate === s.rates.enchant)) { cur.bconfirm = { uid: it.uid, level: it.enchant, target, rate: s.rates.enchant }; render(); return; }
    }
    const name = itemDef(it.id, bal).name, from = it.enchant;
    const res = enchantTo(s, it.uid, plan.target, G.scene.rng, bal);
    if (!res.ok) { msg(res.reason, true); return; }
    cur.busy = true; cur.bconfirm = null; cur.confirm = null;
    const text = res.stop === 'destroyed'
      ? `${res.steps.length > 1 ? `+${from} → +${res.steps.at(-2).level} 성공, ` : ''}+${res.steps.at(-1).level} 실패 — ${josa(name, '이/가')} 사라졌습니다 (주문서 ${res.used}장)`
      : res.stop === 'noScroll' ? `+${from} → +${res.to} 성공 — 주문서가 모자라 멈췄습니다 (${res.used}장)` : `+${from} → +${res.to} 성공! (주문서 ${res.used}장)`;
    const ok = deal(res, 'enchant', {
      mustSave: true,
      after: () => {
        if (cur) { cur.busy = false; cur.fx = { kind: res.stop === 'destroyed' ? 'broke' : 'up', text }; if (res.stop === 'destroyed') cur.sel = null; }
        hud.log(res.stop === 'destroyed' ? `<span style="color:#ff8a7a">${name} 한 번에 강화: ${text}</span>` : `<b style="color:#e0a63e">${name} 한 번에 강화: ${text}</b>`);
        pushEnchantLog({ name, from, to: res.stop === 'destroyed' ? res.steps.at(-1).level : res.to, kind: '한 번에', ok: res.stop !== 'destroyed' });
      },
    });
    if (!ok && !G.pending && cur) cur.busy = false;
  }

  // 11차 장바구니: 이번 실행 동안만(저장 안 함). 상점마다 따로
  const carts = { shop: [], smith: [] };
  function cartBar(s) {
    const cart = carts[cur.kind];
    if (!cart?.length) return '';
    const total = cart.reduce((sum, l) => sum + itemDef(l.id, bal).price * l.count, 0);
    const rows = cart.map((l, i) => `<span class="cartline">${icon(l.id)}${esc(itemDef(l.id, bal).name)} ×${won(l.count)}<button type="button" class="x" data-act="cartDel" data-i="${i}" aria-label="빼기">✕</button></span>`).join('');
    return `<div class="cartbar"><b>장바구니</b><div class="cartlines">${rows}</div>
      <span class="carttot">합계 <b class="${total > s.player.gold ? 'bad-t' : 'gold-t'}">${won(total)}원</b></span>
      <button type="button" class="act primary" data-act="cartBuy" ${cur.busy ? 'disabled' : ''}>모두 사기</button><button type="button" class="act" data-act="cartClear">비우기</button></div>`;
  }
  // 상점 사기(8차: 대장장이는 부위 탭으로 나눠 보여 준다)
  function viewBuy(s) {
    let goods = SHOP_GOODS[cur.kind], chips = '';
    if (cur.kind === 'smith') {
      cur.slot = cur.slot ?? 'weapon';
      goods = goods.filter((id) => slotOf(itemDef(id, bal)) === cur.slot);
      chips = `<div class="chips">${EQUIP_SLOTS.map((sl) => `<button type="button" class="chip ${cur.slot === sl ? 'on' : ''}" data-act="slotf" data-slot="${sl}">${SLOT_NAMES[sl]}</button>`).join('')}</div>`;
      // 10차: 무기는 계열(검·대검·도끼·창·단검)로 한 번 더 나눈다
      if (cur.slot === 'weapon') {
        cur.wtype = cur.wtype ?? 'sword';
        goods = goods.filter((id) => (itemDef(id, bal).type ?? 'sword') === cur.wtype);
        chips += `<div class="chips sub">${WEAPON_TYPES.map((t) => `<button type="button" class="chip ${cur.wtype === t.type ? 'on' : ''}" data-act="wtype" data-type="${t.type}" title="${esc(t.desc)}">${t.noun}</button>`).join('')}<span class="typechip">${esc(TYPE_OF[cur.wtype].desc)}</span></div>`;
      }
    }
    if (!cur.buyId || !goods.includes(cur.buyId)) cur.buyId = goods[0];
    const rows = goods.map((id) => {
      const d = itemDef(id, bal);
      return `<button type="button" class="row-item ${cur.buyId === id ? 'on' : ''}" data-act="pick" data-id="${id}">${icon(id)}<span>${d.name}${cmpMark(s, id)}</span><em>${won(d.price)}원</em></button>`;
    }).join('');
    const d = itemDef(cur.buyId, bal), max = inv.maxBuy(s, cur.buyId, bal);
    const stack = d.kind === 'consumable';
    const qty = stack ? Math.min(cur.qty, Math.max(1, max)) : 1;
    const side = `<div class="detail">${icon(d.id, 'big')}<h3>${d.name}</h3><p>${itemInfo({ id: d.id, enchant: 0 })}</p>${cmpLine(s, d.id, 0)}
      ${stack ? qtyBox(Math.max(1, max)) : ''}
      <p class="sum">${won(qty)}개 · <b>${won(d.price * qty)}원</b></p>
      <div class="btns"><button type="button" class="act primary" data-act="buy" ${max < 1 ? 'disabled' : ''}>사기</button><button type="button" class="act" data-act="cartAdd">담기</button></div>
      ${max < 1 ? `<p class="hint">${s.player.gold < d.price ? '돈이 부족합니다' : '가방에 자리가 없습니다'}</p>` : ''}</div>`;
    return `${statsLine(s)}${cartBar(s)}${chips}<div class="split buysplit"><div class="list">${rows}</div><div class="side buyside">${side}${guideCard(s, d.id, 0)}</div></div>`;
  }

  // ---------- 8차 내 정보 ----------
  // 장비: 인형 모양 9칸. 칸을 누르면 오른쪽에 지금 장비와 가방 속 같은 부위 장비 목록
  function viewGear(s) {
    cur.slot = cur.slot ?? 'weapon';
    const cell = (sl) => {
      const it = s.bag.find((i) => i.uid === s.equip[sl]);
      const spare = s.bag.some((i) => !equipped(s, i.uid) && slotOf(itemDef(i.id, bal)) === sl && compareGear(s, i.id, i.enchant ?? 0, bal) === 'up');
      return `<button type="button" class="slot ${cur.slot === sl ? 'on' : ''} ${it ? rareCls(it.id) : 'none'}" data-act="slot" data-slot="${sl}">
        ${it ? icon(it.id) : icon(GHOST[sl], 'ghost')}${it?.enchant ? `<span class="e">+${it.enchant}</span>` : ''}${spare ? '<span class="cmp up">▲</span>' : ''}
        <small>${SLOT_NAMES[sl]}</small></button>`;
    };
    const cells = DOLL.slice(0, 9).map(cell).join('') + `<div class="accrow">${DOLL.slice(9).map(cell).join('')}</div>`;
    const worn = s.bag.find((i) => i.uid === s.equip[cur.slot]);
    const spares = s.bag.filter((i) => !equipped(s, i.uid) && slotOf(itemDef(i.id, bal)) === cur.slot);
    const list = spares.length ? spares.map((i) => `<div class="row-item ${rareCls(i.id)}">${icon(i.id)}<span>${nameHtml(i)}${cmpMark(s, i.id, i.enchant ?? 0)}<br><small>${itemInfo(i)}</small></span>
      <button type="button" class="act primary" data-act="equipuid" data-uid="${i.uid}">장착</button></div>`).join('')
      : `<p class="hint">가방에 다른 ${josa(SLOT_NAMES[cur.slot], '이/가')} 없습니다. 대장장이에서 살 수 있습니다.</p>`;
    const side = `<div class="detail"><h3>${SLOT_NAMES[cur.slot]}</h3>
      ${worn ? `<div class="wornrow">${icon(worn.id, 'big')}<div><b>${nameHtml(worn)}</b><p>${itemInfo(worn)}</p>
        <button type="button" class="act" data-act="unequipslot" data-slot="${cur.slot}">벗기</button></div></div>` : '<p class="hint">비어 있습니다.</p>'}
      <h4>가방 속 ${SLOT_NAMES[cur.slot]}</h4><div class="list">${list}</div></div>`;
    return `${statsLine(s)}${loadoutBar(s)}<div class="split"><div class="doll">${cells}${setBox(s)}</div><div class="side">${side}</div></div>`;
  }
  // 20차 장비 세트 3칸: [세트 이름 → 바꿔 끼기] [지금 장비 저장] [지우기]
  function loadoutBar(s) {
    const list = s.loadouts ?? [null, null, null];
    const cells = list.map((l, i) => (cur.loEdit?.i === i
      // ⑤ #1: 이름은 화면 안 입력칸으로(브라우저 입력 창에 기대지 않음)
      ? `<div class="loadout editing"><input id="loName" type="text" maxlength="16" value="${esc(cur.loEdit.value)}" aria-label="${i + 1}번 세트 이름(8글자까지)" placeholder="세트 이름">
        <button type="button" class="act primary" data-act="lookok" data-i="${i}">저장</button><button type="button" class="act" data-act="locancel">취소</button></div>`
      : `<div class="loadout ${l ? '' : 'empty'}">
      ${l ? `<button type="button" class="act primary" data-act="lowear" data-i="${i}" ${cur.busy ? 'disabled' : ''}>${esc(l.name)}</button>` : `<span class="sub-t">${i + 1}번 비어 있음</span>`}
      <button type="button" class="act" data-act="losave" data-i="${i}" ${cur.busy ? 'disabled' : ''}>${l ? '덮어쓰기' : '지금 장비 저장'}</button>
      ${l ? `<button type="button" class="act x" data-act="loclear" data-i="${i}" aria-label="${i + 1}번 세트 지우기">✕</button>` : ''}</div>`)).join('');
    return `<div class="loadouts"><b>장비 세트</b>${cells}</div>`;
  }
  // 10차 세트 효과: 7부위(갑옷 큰 칸 제외) 같은 등급 3·5·7개
  const FX_TEXT = (fx) => [fx.hp && `체력 +${fx.hp}`, fx.def && `방어 +${fx.def}`, fx.dmg && `피해 +${fx.dmg}`, fx.crit && `치명 +${fx.crit}%`].filter(Boolean).join(' · ');
  function setBox(s) {
    const defs = EQUIP_SLOTS.map((sl) => itemDef(s.bag.find((i) => i.uid === s.equip[sl])?.id, bal)).filter(Boolean);
    const sets = activeSets(defs, bal);
    const lines = sets.length ? sets.map((x) => `<p>${x.stage ? `<b>${esc(x.name)} 세트 ${x.stage}단계</b> — ${FX_TEXT(x.fx)}` : `<span class="off">${esc(x.name)} 세트</span>`}
        <small>(${x.count}/7개${x.next ? ` · ${x.next}개면 다음 단계` : ''})</small></p>`).join('')
      : '<p class="off">같은 등급 부위(투구·티셔츠·망토·장갑·벨트·바지·부츠)를 3개 끼면 세트 효과가 붙습니다.</p>';
    return `<div class="setbox">${lines}</div>`;
  }

  // 능력치: 힘·민첩·체력 + 보너스 점수 나누기(확정 전 미리 보기) + 마을에서 다시 나누기
  const STAT_NAME = { str: '힘', dex: '민첩', con: '체력' };
  const STAT_ROWS = [
    ['str', '힘', '피해가 올라 빨리 잡습니다 (추천)'],
    ['dex', '민첩', '명중과 공격 속도가 오릅니다'],
    ['con', '체력', '최대 체력·회복·방어가 올라 오래 버팁니다(사냥은 느려짐)'],
  ];
  function viewStats(s) {
    const draft = cur.draft ?? { str: 0, dex: 0, con: 0 };
    const used = draft.str + draft.dex + draft.con, left = inv.unspentPoints(s, bal) - used;
    const now = loadoutStats(s, bal);
    const prev = loadoutStats({ ...s, player: { ...s.player, bonus: { str: s.player.bonus.str + draft.str, dex: s.player.bonus.dex + draft.dex, con: s.player.bonus.con + draft.con } } }, bal);
    const arrow = (a, b, unit = '') => (a === b ? `<b>${a}${unit}</b>` : `<b>${a}${unit}</b> → <b class="gold-t">${b}${unit}</b>`);
    const rows = STAT_ROWS.map(([k, name, desc]) => `<div class="statrow"><span class="sname">${name}</span>${arrow(now[k], prev[k])}
      <small>보너스 ${s.player.bonus[k]}${draft[k] ? ` +${draft[k]}` : ''}</small>
      <button type="button" class="rbtn" data-act="bonus" data-k="${k}" ${left > 0 && !cur.busy ? '' : 'disabled'} aria-label="${name} 올리기">+</button>
      <span class="sdesc">${desc}</span></div>`).join('');
    const pv = bal.stats.pointValue;
    const here = G.scene?.region === 'town';
    const spent = s.player.bonus.str + s.player.bonus.dex + s.player.bonus.con;
    const cost = inv.resetCost(s, bal);
    const next = Math.ceil((s.player.level + 1) / bal.stats.pointEvery) * bal.stats.pointEvery;
    return `<div class="statbox"><div>
        <p class="pts">남은 점수 <b class="${left > 0 ? 'gold-t' : ''}">${left}</b>${next <= bal.progression.maxLevel ? ` · 다음 점수 Lv ${next}` : ''}</p>
        ${used ? `<div class="btns"><button type="button" class="act primary" data-act="bonusok" ${cur.busy ? 'disabled' : ''}>확정</button><button type="button" class="act" data-act="bonusundo">되돌리기</button></div>
          <p class="hint">확정하면 바꿀 수 없습니다(마을에서 돈을 내고 다시 나눌 수 있음).</p>` : ''}
        ${rows}
        <p class="sub-t fine-t">레벨이 오르면 힘·민첩·체력이 저절로 오르고, ${bal.stats.pointEvery}레벨마다 보너스 점수 1점(능력치 +${pv})을 받습니다.</p>
        <p class="elixrow">엘릭서 ${['str', 'dex', 'con'].map((k) => `${STAT_NAME[k]} <b>${(elixirOf(s) ?? {})[k] ?? 0}/${bal.elixirMax}</b>`).join(' · ')} <small>(보스·성터에서 드물게, 가방에서 [마시기])</small></p>
      </div>
      <div class="derived"><h4>지금 능력${Object.keys(s.buffs ?? {}).length ? ' <small>(버프 포함)</small>' : ''}</h4>
        <p>공격 ${arrow(atkRange(now), atkRange(prev))}</p><p>명중 보너스 ${arrow(now.hitBonus, prev.hitBonus, '%')}</p>
        <p>공격 간격 ${arrow((now.attackMs / 1000).toFixed(2), (prev.attackMs / 1000).toFixed(2), '초')}</p>
        <p>치명 ${arrow(now.critPct, prev.critPct, '%')}${now.dmgPct ? ` · 무기 피해 ${now.dmgPct > 0 ? '+' : ''}${now.dmgPct}%` : ''}</p>
        <p>방어 ${arrow(now.def, prev.def)}</p><p>최대 체력 ${arrow(now.maxHp, prev.maxHp)}</p>
        <p>회복 ${arrow(now.regenPerTick, prev.regenPerTick)} <small>/${now.regenMs / 1000}초</small></p>
        ${spent ? (cur.confirmReset
          ? `<div class="warnbox"><p><b class="gold-t">${won(cost)}원</b>을 내고 보너스 점수 ${spent}점을 모두 되돌립니다.</p>
             <div class="btns"><button type="button" class="act danger" data-act="resetok" ${cur.busy ? 'disabled' : ''}>다시 나누기</button><button type="button" class="act" data-act="resetno">그만두기</button></div></div>`
          : `<div class="btns"><button type="button" class="act" data-act="resetask" ${here && s.player.gold >= cost ? '' : 'disabled'}>다시 나누기 (${won(cost)}원)</button></div>
             ${here ? (s.player.gold < cost ? '<p class="hint">돈이 부족합니다</p>' : '') : '<p class="hint">마을에서만 다시 나눌 수 있습니다</p>'}`) : ''}
      </div></div>`;
  }

  // 레벨 보상: 레벨마다 한 줄(받음·받기·잠김)
  function viewReward(s) {
    const rows = (bal.levelRewards ?? []).map((r) => {
      const st = inv.rewardState(s, r.level, bal);
      const goods = r.items.map((g) => `<span class="rwitem">${icon(g.id)}${esc(itemDef(g.id, bal).name)}${g.count > 1 ? ` ×${g.count}` : ''}</span>`).join('')
        + (r.gold ? `<span class="rwitem"><b class="coin"></b>${won(r.gold)}원</span>` : '');
      const btn = st === 'claimed' ? '<em class="ok-t">받음</em>'
        : st === 'ready' ? `<button type="button" class="act primary" data-act="claim" data-lv="${r.level}" ${cur.busy ? 'disabled' : ''}>받기</button>`
          : `<em class="sub-t">Lv ${r.level}부터</em>`;
      return `<div class="rwrow ${st}"><b class="rwlv">Lv ${r.level}</b><div class="rwgoods">${goods}</div>${btn}</div>`;
    }).join('');
    return `<p class="sub-t">레벨을 달성하면 한 번씩 받을 수 있습니다. 가방에 자리가 있어야 합니다(지금 ${s.bag.length}/${bal.inventory.bagSlots}).</p>${rows}`;
  }

  // ---------- 12차 도감 ----------
  // 세트마다 칸 그림(넣음=밝게+✓, 가방에 넣을 수 있는 +0 장비가 있음=노란 테두리, 없음=흐리게), n/m, 효과, [넣기 N]
  // [넣기]는 확인 상자(쓰일 장비 이름 목록)를 먼저 — 확인한 uid 그대로만 등록된다(⑤ #15·#17)
  const CODEX_GROUPS = [['무기 모음', (id) => id.startsWith('wpn')], ['머리·몸 (투구·티셔츠·망토·장갑)', (id) => id.startsWith('top')],
    ['허리·다리 (벨트·바지·부츠)', (id) => id.startsWith('low')], ['빛나는 장비', (id) => id.startsWith('rare')], ['특별', (id) => ['body', 'lich', 'drake'].includes(id)]]; // 21차 ⑤ #12
  function viewCodex(s) {
    const done = col.doneSets(s.codex, bal).length, total = bal.codex.length, p = col.permOf({ ...s, title: null }, bal);
    const sum = col.fxText(p) || '아직 없음';
    const head = `<div class="cxsum"><b>도감 ${done}/${total}</b><span>완성 효과 합계: ${sum}</span></div>
      <p class="sub-t">같은 세트 장비를 모두 넣으면 효과가 영원히 붙습니다. 넣은 장비는 가방에서 사라집니다(<b>+0이고 끼지 않은 것만</b> 씁니다 — 강화한 장비·낀 장비·창고 물건은 쓰지 않음).</p>`;
    const groups = CODEX_GROUPS.map(([gname, test]) => {
      const rows = bal.codex.filter((c) => test(c.id)).map((c) => {
        const have = s.codex[c.id] ?? [], plan = col.codexPlan(s, c.id, bal), canIds = new Set(plan.map((x) => x.id));
        const complete = have.length === c.items.length;
        const slots = c.items.map((id) => {
          const st = have.includes(id) ? 'on' : canIds.has(id) ? 'can' : '';
          return `<span class="cxslot ${st}" title="${esc(itemDef(id, bal).name)}">${icon(id)}${st === 'on' ? '<i>✓</i>' : ''}</span>`;
        }).join('');
        const btn = complete ? '<em class="ok-t">완성</em>'
          : plan.length ? `<button type="button" class="act primary" data-act="cxask" data-set="${c.id}" ${cur.busy ? 'disabled' : ''}>넣기 ${plan.length}</button>` : '';
        const ask = cur.cx?.set === c.id ? `<div class="cxconfirm">
            <p><b>${esc(c.name)}</b>에 넣을 장비 — 가방에서 사라집니다</p>
            <div class="cxlist">${cur.cx.ids.map((id) => `<span class="rwitem">${icon(id)}${esc(itemDef(id, bal).name)} +0</span>`).join('')}</div>
            <div class="row"><button type="button" class="act primary" data-act="cxok" ${cur.busy ? 'disabled' : ''}>넣기</button><button type="button" class="act" data-act="cxno">취소</button></div></div>` : '';
        return `<div class="cxrow ${complete ? 'done' : ''}"><div class="cxhead"><b>${esc(c.name)}</b><em>${have.length}/${c.items.length}</em><span class="cxfx">${col.fxText(c.fx)}</span>${btn}</div>
          <div class="cxslots">${slots}</div>${ask}</div>`;
      }).join('');
      return `<h4 class="cxgroup">${gname}</h4>${rows}`;
    }).join('');
    return head + groups;
  }
  function doCodex() {
    if (cur.busy || !cur.cx) return;
    const fixed = cur.cx, before = col.earnedTitles(G.save, bal);
    const res = inv.registerCodex(G.save, fixed.set, fixed.uids, bal);
    if (!res.ok) { cur.cx = null; msg(res.reason || '넣을 수 없습니다', true); render(); return; }
    cur.busy = true;
    const set = col.codexSet(fixed.set, bal);
    const ok = deal(res, 'codex', {
      okText: res.complete ? `「${set.name}」 완성! ${col.fxText(set.fx)}` : `「${set.name}」에 ${res.added.length}개를 넣었습니다`,
      after: () => {
        if (cur) { cur.busy = false; cur.cx = null; }
        hud.log(res.complete ? `<b style="color:#e0a63e">도감 「${esc(set.name)}」 완성</b> · ${col.fxText(set.fx)}` : `도감 「${esc(set.name)}」 ${res.added.map((id) => itemDef(id, bal).name).join(', ')} 넣음`);
        G.scene?.checkNewTitles(before); // 수집가 칭호
        G.scene?.refreshHud(true);
      },
    });
    if (!ok && !G.pending && cur) { cur.busy = false; render(); }
  }

  // ---------- 12차 칭호 ----------
  // 맨 위: 쓰는 칭호 + [빼기]. 아래: 일반 몬스터마다 I·II·III 칩(얻음=[쓰기], 아직=진행 n/m), 보스·수집가
  function viewTitle(s) {
    const curT = s.title ? col.titleDef(s.title, bal) : null;
    const head = `<div class="cxsum"><b>쓰는 칭호</b><span>${curT ? `《${esc(curT.name)}》 · ${col.fxText(curT.fx)}` : '없음'}</span>
      ${curT ? `<button type="button" class="act" data-act="titleoff" ${cur.busy ? 'disabled' : ''}>빼기</button>` : ''}</div>
      <p class="sub-t">칭호는 하나만 쓸 수 있고, 기사 머리 위에 보입니다. 몬스터를 잡은 수는 이번 업데이트 뒤부터 셉니다.</p>`;
    const fresh = G.scene?.newTitles ?? new Set();
    const chip = (t) => {
      const got = col.titleEarned(t, s, bal), using = s.title === t.id, pr = col.titleProgress(t, s, bal);
      const act = using ? '<em class="ok-t">쓰는 중</em>' : got ? `<button type="button" class="act primary" data-act="titleuse" data-id="${t.id}" ${cur.busy ? 'disabled' : ''}>쓰기</button>`
        : `<em class="sub-t">${won(Math.min(pr.have, pr.need))}/${won(pr.need)}</em>`;
      return `<div class="ttchip ${got ? 'got' : ''} ${using ? 'using' : ''} ${fresh.has(t.id) ? 'fresh' : ''}"><b>${esc(t.name.split(' ').pop())}</b><small>${col.fxText(t.fx)}</small>${act}</div>`;
    };
    const mons = col.normalMonsters(bal).map((m) => {
      const ts = bal.titles.filter((t) => t.kind === 'kills' && t.mon === m.id);
      return `<div class="ttrow"><div class="tthead"><b>${esc(m.name)} 사냥꾼</b><em>${won(s.kills[m.id] ?? 0)}마리</em></div><div class="ttchips">${ts.map(chip).join('')}</div></div>`;
    }).join('');
    const special = bal.titles.filter((t) => t.kind === 'codex' || bal.monsters.find((m) => m.id === t.mon)?.isBoss);
    const sp = `<div class="ttrow"><div class="tthead"><b>보스·수집가</b><em>도감 ${col.doneSets(s.codex, bal).length}세트</em></div><div class="ttchips ttwide">${special.map((t) => chip(t).replace(`<b>${esc(t.name.split(' ').pop())}</b>`, `<b>${esc(t.name)}</b>`)).join('')}</div></div>`;
    // 얻은 칭호는 맨 위에 한 줄로(아래 목록까지 내려가지 않아도 바로 쓰게)
    const full = (t) => chip(t).replace(`<b>${esc(t.name.split(' ').pop())}</b>`, `<b>${esc(t.name)}</b>`);
    const gotList = bal.titles.filter((t) => col.titleEarned(t, s, bal));
    const got = gotList.length ? `<div class="ttrow"><div class="tthead"><b>얻은 칭호</b><em>${gotList.length}개</em></div><div class="ttchips ttwide">${gotList.map(full).join('')}</div></div>` : '';
    return head + got + sp + mons;
  }

  // ---------- 9차 스킬·단축 칸 ----------
  // 위: 단축 칸 12칸(1쪽·2쪽). 아래 고른 것을 [칸에 넣기] → 칸을 누르면 들어감. 칸만 누르면 [비우기]
  // 가운데: 액티브 스킬 카드(배운 것·못 배운 것, 자동 사용 켜기/끄기), 물건 줄, 패시브
  const KIND_NAME = { attack: '공격', defense: '방어', ult: '필살기' };
  const ITEM_SHORT = { potion: '초급 물약', potionMid: '중급 물약', potionHigh: '고급 물약', returnScroll: '귀환 주문서',
    powerPotion: '힘의 물약', hastePotion: '날쌘 물약', guardPotion: '수호 물약', expScroll: '경험치 두루마리', huntScroll: '사냥터 이동', morphScroll: '변신 주문서' };
  const slotIcon = (e) => (e.t === 'skill' ? `sk_${e.id}` : e.id);
  // 14차: 다음 레벨에서 바뀌는 값(지금 → 다음)
  function skillNextText(a, b) {
    const sec = (ms) => `${(ms / 1000).toFixed(1).replace(/\.0$/, '')}초`, parts = [];
    if (a.mult !== b.mult) parts.push(`피해 ×${a.mult} → <b class="gold-t">×${b.mult}</b>`);
    if (a.blockPct !== b.blockPct) parts.push(`막기 ${a.blockPct}% → <b class="gold-t">${b.blockPct}%</b>`);
    if (a.healPct !== b.healPct) parts.push(`회복 ${a.healPct}% → <b class="gold-t">${b.healPct}%</b>`);
    if (a.reduce !== b.reduce) parts.push(`감소 ${Math.round(a.reduce * 100)}% → <b class="gold-t">${Math.round(b.reduce * 100)}%</b>`);
    if (a.counterPct !== b.counterPct) parts.push(`되돌림 ${a.counterPct}% → <b class="gold-t">${b.counterPct}%</b>`);
    parts.push(`쿨 ${sec(a.cooldownMs)} → <b class="gold-t">${sec(b.cooldownMs)}</b>`);
    return `다음 레벨: ${parts.join(' · ')}`;
  }
  const slotName = (e) => (e.t === 'skill' ? bal.skills.find((k) => k.id === e.id)?.name : ITEM_SHORT[e.id]) ?? e.id;
  function viewSkill(s) {
    const h = s.hotbar, lv = s.player.level, learned = new Set(learnedSkills(lv, bal));
    const pickOn = (t, id) => cur.pick && cur.pick.t === t && cur.pick.id === id;
    const slots = [0, 1].map((page) => {
      const cells = Array.from({ length: PAGE_SIZE }, (_, j) => {
        const i = page * PAGE_SIZE + j, e = h.slots[i];
        const cls = ['hbcell', e ? '' : 'empty', cur.hbSel === i ? 'on' : '', cur.pick ? 'target' : ''].join(' ');
        return `<button type="button" class="${cls}" data-act="hbslot" data-i="${i}" aria-label="${page + 1}쪽 ${j + 1}번 칸${e ? ` ${esc(slotName(e))}` : ' 비어 있음'}">
          ${e ? icon(slotIcon(e)) : '<span class="plus">+</span>'}<u>${j + 1}</u></button>`;
      }).join('');
      return `<div class="hbrow"><b>${page + 1}쪽</b>${cells}</div>`;
    }).join('');
    const sel = cur.hbSel !== null ? h.slots[cur.hbSel] : null;
    const help = cur.pick ? `<b>${esc(slotName(cur.pick))}</b>을(를) 넣을 칸을 누르세요 <button type="button" class="act" data-act="hbcancel">그만두기</button>`
      : sel ? `${Math.floor(cur.hbSel / PAGE_SIZE) + 1}쪽 ${cur.hbSel % PAGE_SIZE + 1}번: <b>${esc(slotName(sel))}</b> <button type="button" class="act" data-act="hbclear">비우기</button>`
        : '아래에서 [칸에 넣기]를 누른 뒤 칸을 고르세요. 게임 화면의 [1/2]로 쪽을 넘깁니다(PC: 1~6, Tab).';
    // 14차: 등급 칩·스킬 레벨(별)·[Lv 올리기]·다음 레벨 효과
    const grade = (id) => bal.skillGrades[id];
    const card = (k) => {
      const has = learned.has(k.id), auto = autoUse(h, k.id), slv = skillLevel(s, k.id), now = skillAt(k.id, slv, bal);
      const cost = skillUpCost(slv, bal), next = cost ? skillAt(k.id, slv + 1, bal) : null, cid = cardIdOf(k.id), haveC = inv.countItem(s, cid);
      const stars = `<span class="skstars" aria-label="스킬 레벨 ${slv}">${'★'.repeat(slv)}${'☆'.repeat(bal.skillUp.maxLv - slv)}</span>`;
      const fx = next ? skillNextText(now, next) : '최고 레벨';
      const canUp = has && cost && haveC >= cost.cards && s.player.gold >= cost.gold && !cur.busy;
      const up = has ? (cost ? `<button type="button" class="act skup ${canUp ? 'primary' : ''}" data-act="skup" data-id="${k.id}" ${canUp ? '' : 'disabled'}>Lv ${slv + 1}로 · 카드 ${haveC}/${cost.cards} · ${won(cost.gold)}원</button>` : '<em class="ok-t">최고 레벨</em>') : '';
      return `<div class="skcard ${has ? '' : 'locked'} ${k.kind} g-${grade(k.id)} ${pickOn('skill', k.id) ? 'picked' : ''}">
        <img class="ic" src="assets/icons/sk_${k.id}.png" alt="">
        <div class="sktext"><b>${esc(k.name)}</b> <span class="grade g-${grade(k.id)}">${bal.gradeNames[grade(k.id)]}</span> ${stars} <em>${KIND_NAME[k.kind]} · Lv ${k.level} · ${(now.cooldownMs / 1000).toFixed(1).replace(/\.0$/, '')}초</em><p>${esc(k.desc)}</p>
          <p class="sknext">${has ? fx : ''}</p></div>
        ${has ? `<div class="skbtns"><button type="button" class="act primary" data-act="hbpick" data-t="skill" data-id="${k.id}">칸에 넣기</button>
          <button type="button" class="act tog ${auto ? 'on' : ''}" data-act="hbauto" data-id="${k.id}" aria-pressed="${auto}">자동 ${auto ? '켜짐' : '꺼짐'}</button>${up}</div>`
          : `<em class="sub-t">Lv ${k.level}에 배움</em>`}
      </div>`;
    };
    cur.skGrade = cur.skGrade ?? 'all';
    const gchips = `<div class="chips skchips">${[['all', '전체'], ...bal.gradeOrder.map((g) => [g, bal.gradeNames[g]])].map(([g, n]) => `<button type="button" class="chip ${cur.skGrade === g ? 'on' : ''} ${g === 'all' ? '' : `g-${g}`}" data-act="skgrade" data-g="${g}">${n}</button>`).join('')}</div>`;
    const skills = [...bal.skills].filter((k) => cur.skGrade === 'all' || grade(k.id) === cur.skGrade).sort((a, b) => a.level - b.level).map(card).join('');
    // 카드 합성: 가진 카드마다 [N장 합성 → 다음 등급]
    const owned = bal.skills.map((k) => ({ k, n: inv.countItem(s, cardIdOf(k.id)) })).filter((x) => x.n > 0);
    const gi = (id) => bal.gradeOrder.indexOf(grade(id));
    const fuse = owned.length ? owned.map(({ k, n }) => {
      const top = gi(k.id) >= bal.gradeOrder.length - 1, nextG = top ? null : bal.gradeOrder[gi(k.id) + 1];
      return `<div class="fuserow">${icon(cardIdOf(k.id))}<span>${esc(itemDef(cardIdOf(k.id), bal).name)} <b>×${won(n)}</b></span>
        ${top ? '<em class="sub-t">가장 높은 등급</em>' : `<button type="button" class="act" data-act="fuse" data-id="${k.id}" ${n >= bal.cardFuse && !cur.busy ? '' : 'disabled'}>${bal.cardFuse}장 → <span class="grade g-${nextG}">${bal.gradeNames[nextG]}</span> 1장</button>`}</div>`;
    }).join('') : '<p class="hint">아직 스킬 카드가 없습니다. 몬스터가 가끔 떨어뜨립니다(깊은 사냥터일수록 높은 등급, 보스는 희귀·영웅).</p>';
    const items = (bal.hotbarItems ?? []).map((id) => `<button type="button" class="act itempick ${pickOn('item', id) ? 'picked' : ''}" data-act="hbpick" data-t="item" data-id="${id}">${icon(id)}${ITEM_SHORT[id]}</button>`).join('');
    const passives = (bal.passives ?? []).map((p) => `<div class="pscard ${lv >= p.level ? 'on' : 'locked'}"><img class="ic" src="assets/icons/sk_${p.id}.png" alt=""><div><b>${esc(p.name)}</b> <em>${lv >= p.level ? '켜짐' : `Lv ${p.level}`}</em><p>${esc(p.desc)}</p></div></div>`).join('');
    return `<div class="hbbox">${slots}<p class="hbhelp">${help}</p></div>
      <h4 class="skh">액티브 스킬 <small>자동 사냥은 '자동 켜짐'인 스킬만 씁니다(단축 칸에 없어도) · 스킬 카드와 돈으로 Lv 5까지</small></h4>${gchips}<div class="skgrid">${skills}</div>
      <h4 class="skh">카드 합성 <small>같은 카드 ${bal.cardFuse}장 → 한 등급 위 카드 1장(그 등급 중 무작위)</small></h4><div class="fusebox">${fuse}</div>
      <h4 class="skh">물약·주문서 <small>버프 물약·두루마리를 칸에 두면 자동 사냥 때 효과가 끝나면 저절로 씁니다</small></h4><div class="itemrow">${items}</div>
      <h4 class="skh">패시브 <small>배우면 항상 켜짐</small></h4><div class="psgrid">${passives}</div>`;
  }
  // 단축 칸 바꾸기: 저장에 성공해야 확정(G.commit), 게임 화면 칸도 다시 그림
  function saveHotbar(next, okText) {
    return deal({ ok: true, save: { ...G.save, hotbar: next } }, 'hotbar', { okText, after: () => { G.scene?.refreshSkills(true); } });
  }

  // 상점 팔기
  // 11차 여러 개 고르기: 고를 때의 uid·수량을 그대로 고정(그보다 많이 팔지 않음, ⑤ #6). 팔 때 최신 기록으로 다시 검사
  function multiBar(s) {
    if (!cur.multi) return `<div class="junkbar"><button type="button" class="act" data-act="multiOn">여러 개 골라 팔기</button></div>`;
    const lines = [...cur.multi.entries()].map(([uid, count]) => ({ uid, count })).filter((l) => s.bag.some((i) => i.uid === l.uid));
    const gold = lines.reduce((sum, l) => sum + inv.sellPrice(s.bag.find((i) => i.uid === l.uid).id, bal) * l.count, 0);
    return `<div class="junkbar multibar"><span>칸을 눌러 고르세요(묶음은 그 수량 전부) — <b>${lines.length}개</b> · <b class="gold-t">+${won(gold)}원</b></span>
      <button type="button" class="act primary" data-act="multiSell" ${lines.length && !cur.busy ? '' : 'disabled'}>선택한 것 팔기</button><button type="button" class="act" data-act="multiOff">그만두기</button></div>`;
  }
  function viewSell(s) {
    if (cur.multi) {
      const cells = grid(s.bag, 'bag', bal.inventory.bagSlots, s, { dimEquipped: true }).replace(/data-act="sel" data-where="bag" data-uid="(\d+)"/g, (m0, u) => `data-act="msel" data-uid="${u}"`);
      const marked = cells.replace(/(<button type="button" class="cell )([^"]*)(" data-act="msel" data-uid="(\d+)")/g, (m0, a, cls, rest, u) => `${a}${cls} ${cur.multi.has(Number(u)) ? 'picked' : ''}${rest}`);
      return `${multiBar(s)}<div class="split">${marked}<div class="side"><p class="hint">끼고 있는 장비(E)는 고를 수 없습니다.</p></div></div>`;
    }
    const it = selected(s);
    let side = '<p class="hint">팔 물건을 고르세요. 장착 중인 장비(E)는 팔 수 없습니다.</p>';
    if (it && cur.sel.where === 'bag') {
      const each = inv.sellPrice(it.id, bal), eq = equipped(s, it.uid);
      const qty = Math.min(cur.qty, it.count);
      side = `<div class="detail">${icon(it.id, 'big')}<h3>${esc(itemName(it))}</h3><p>한 개 ${won(each)}원</p>
        ${it.count > 1 ? qtyBox(it.count) : ''}
        <p class="sum">${won(qty)}개 · <b>${won(each * qty)}원</b></p>
        <div class="btns"><button type="button" class="act primary" data-act="sell" ${eq || it.lock ? 'disabled' : ''}>팔기</button></div>
        ${eq ? '<p class="hint">먼저 가방에서 벗어 주세요.</p>' : ''}${it.lock ? LOCK_HINT : ''}</div>`;
    }
    return `${junkBar(s)}${multiBar(s)}<div class="split">${grid(s.bag, 'bag', bal.inventory.bagSlots, s, { dimEquipped: true })}<div class="side">${side}</div></div>`;
  }

  // 안 쓰는 장비 모두 팔기(3차): 확인할 때 목록·금액을 고정하고, 팔 때 최신 기록으로 다시 확인한다
  function junkInfo(s, uids) {
    const items = uids.map((uid) => s.bag.find((i) => i.uid === uid)).filter(Boolean);
    const gold = items.reduce((sum, it) => sum + inv.sellPrice(it.id, bal), 0);
    const names = new Map();
    for (const it of items) names.set(itemName(it), (names.get(itemName(it)) ?? 0) + 1);
    return { uids, gold, text: [...names].map(([n, c]) => `${n} ${c}`).join(', ') };
  }
  function junkBar(s) {
    if (cur.junk) {
      return `<div class="warnbox junkbox"><p><b>${esc(cur.junk.text)}</b> — 모두 <b class="gold-t">${won(cur.junk.gold)}원</b>에 팝니다. 강화한 장비·보스 장비·지금 것보다 좋은 장비는 팔지 않습니다.</p>
        <div class="btns"><button type="button" class="act primary" data-act="doJunk" ${cur.busy ? 'disabled' : ''}>모두 팔기</button><button type="button" class="act" data-act="cancelJunk">그만두기</button></div></div>`;
    }
    const uids = inv.junkGear(s, bal);
    if (!uids.length) return '';
    const j = junkInfo(s, uids);
    return `<div class="junkbar"><button type="button" class="act" data-act="askJunk">안 쓰는 장비 모두 팔기</button><span>${uids.length}개 · <b class="gold-t">+${won(j.gold)}원</b></span></div>`;
  }

  // 배율(3차): 위 묶음 버튼, 가운데 네 줄(◀ 값 ▶), 오른쪽 예상 시간과 [적용]
  function viewRates(s) {
    const d = cur.draft;
    const presets = PRESETS.map((p) => `<button type="button" class="preset ${sameRates(d, p.rates) ? 'on' : ''}" data-act="preset" data-id="${p.id}"><b>${p.name}</b><span>${p.tag}</span></button>`).join('');
    const rows = RATE_ROWS.map(([key, name, desc]) => {
      const list = bal.rates[key], i = list.indexOf(d[key]);
      const changed = d[key] !== cur.orig[key];
      return `<div class="rrow ${changed ? 'changed' : ''}"><span class="rname">${name}</span>
        <button type="button" class="rbtn" data-act="rstep" data-key="${key}" data-d="-1" ${i <= 0 ? 'disabled' : ''} aria-label="${name} 낮추기">◀</button>
        <b class="rval">×${d[key]}</b>
        <button type="button" class="rbtn" data-act="rstep" data-key="${key}" data-d="1" ${i >= list.length - 1 ? 'disabled' : ''} aria-label="${name} 높이기">▶</button>
        <span class="rdesc">${desc}</span></div>`;
    }).join('');
    // 강화 예: 무기 첫 위험 단계(+7) 성공률, 지금 → 고른 값
    const w = bal.enchant.weapon, first = w.riskyChances[0];
    const pct = (r) => `${Math.round(Math.min(1, first * r) * 100)}%`;
    const now = estSeconds(cur.orig), next = estSeconds(d);
    const dirty = !sameRates(d, cur.orig);
    return `<div class="rates"><div><div class="presets">${presets}</div>${rows}</div>
      <div class="restim">
        <p class="sub-t">새 기사가 처음부터 레벨 ${bal.progression.maxLevel}까지 자동 사냥하면</p>
        <p class="big-t">${hm(next)}</p>
        <p class="sub-t">${dirty ? `지금 배율로는 ${hm(now)}` : '지금 쓰는 배율입니다'}</p>
        <p class="sub-t fine-t">100마리마다 마을에서 물약·장비를 사고 안전 강화하는 모의 사냥 기준(장신구·마법인형·스킬 카드·엘릭서 없이)</p>
        <p class="sub-t">무기 +${w.safe + 1} 강화 성공 ${pct(cur.orig.enchant)}${d.enchant !== cur.orig.enchant ? ` → <b class="gold-t">${pct(d.enchant)}</b>` : ''}</p>
        <div class="btns"><button type="button" class="act primary" data-act="rapply" ${dirty && !cur.busy ? '' : 'disabled'}>적용</button>
          <button type="button" class="act" data-act="rreset" ${dirty ? '' : 'disabled'}>되돌리기</button></div>
        <p class="sub-t">언제든 다시 바꿀 수 있습니다. 바꾸면 다음 사냥부터 바로 적용됩니다.</p>
      </div></div>`;
  }

  // ---------- 19차 보스 코인 교환(잡화상) ----------
  function viewCoin(s) {
    const have = inv.countItem(s, 'bossCoin');
    const rows = (bal.coinShop ?? []).map((l) => {
      const d = itemDef(l.id, bal), can = have >= l.coins && !cur.busy;
      return `<div class="row-item coinrow">${icon(l.id)}<span>${esc(d.name)}${d.grade ? ` <span class="grade g-${d.grade}">${bal.gradeNames[d.grade]}</span>` : ''}<br><small>${esc(itemInfo({ id: l.id, enchant: 0 }).replace(/<[^>]+>/g, ''))}</small></span>
        <em>${icon('bossCoin', 'mini')} ${l.coins}</em><button type="button" class="act ${can ? 'primary' : ''}" data-act="coinbuy" data-id="${l.id}" ${can ? '' : 'disabled'}>바꾸기</button></div>`;
    }).join('');
    return `<div class="coinhead">${icon('bossCoin')}<b>보스 코인 ${won(have)}개</b><span class="sub-t">폐광의 큰울림 2개 · 망령 기사왕 4개를 반드시 떨어뜨립니다</span></div><div class="list coinlist" data-keep="coin">${rows}</div>`;
  }

  // ---------- 13차 자동 보충(잡화상) ----------
  // 줄마다 목표 개수(◀ ▶, bal.restockSteps). 바꾸면 바로 저장. 아래: 지금 마을에 오면 살 것·합계 + [지금 채우기]
  function viewRestock(s) {
    const steps = bal.restockSteps, map = s.restock ?? {};
    const rows = bal.restockItems.map((id) => {
      const d = itemDef(id, bal), t = map[id] ?? 0, have = inv.countItem(s, id);
      return `<div class="rsrow ${t ? 'on' : ''}">${icon(id)}<span class="rsname">${esc(d.name)}<small>가방 ${won(have)}개 · ${won(d.price)}원</small></span>
        <button type="button" class="rbtn" data-act="rsstep" data-id="${id}" data-d="-1" ${t <= 0 || cur.busy ? 'disabled' : ''} aria-label="${esc(d.name)} 목표 줄이기">◀</button>
        <b class="rsval">${t ? `${won(t)}개` : '안 삼'}</b>
        <button type="button" class="rbtn" data-act="rsstep" data-id="${id}" data-d="1" ${t >= steps.at(-1) || cur.busy ? 'disabled' : ''} aria-label="${esc(d.name)} 목표 늘리기">▶</button></div>`;
    }).join('');
    const plan = inv.restockPlan(s, bal);
    const buy = plan.bought.map((l) => `<span class="rwitem">${icon(l.id)}${esc(itemDef(l.id, bal).name)} ×${won(l.count)}</span>`).join('');
    const shortTxt = plan.lines.filter((l) => l.short).map((l) => `${itemDef(l.id, bal).name}(${l.short === 'gold' ? '돈' : '가방'} 모자람)`).join(', ');
    const preview = !Object.keys(map).length ? '<p class="hint">목표를 정한 물건이 없습니다. ▶를 눌러 목표 개수를 정하세요.</p>'
      : plan.bought.length ? `<div class="rsbuy">${buy}</div><p class="sum">합계 <b class="gold-t">${won(plan.cost)}원</b>${shortTxt ? ` · <span class="bad-t">${esc(shortTxt)}</span>` : ''}</p>`
        : `<p class="hint">${plan.reason === 'nothing' ? '모두 목표만큼 있습니다.' : plan.reason === 'gold' ? '돈이 모자라 살 수 없습니다.' : '가방에 자리가 없습니다.'}</p>`;
    return `<p class="sub-t">목표 개수를 정해 두면 <b>마을에 들어올 때마다</b>(귀환·쓰러짐·걸어서) 모자란 만큼 저절로 삽니다. 돈이 모자라면 위에 있는 것부터 삽니다. 창고에 있는 것은 세지 않습니다.</p>
      <div class="rsgrid" data-keep="rs">${rows}</div>
      <div class="rsnow"><h4>지금 채우면</h4>${preview}
        <div class="btns"><button type="button" class="act primary" data-act="rsnow" ${plan.bought.length && !cur.busy ? '' : 'disabled'}>지금 채우기</button></div></div>`;
  }

  // 창고
  function viewBank(s) {
    const it = selected(s);
    let ctl = '<p class="hint">맡길 물건은 왼쪽(가방), 찾을 물건은 오른쪽(창고)에서 고르세요.</p>';
    if (it) {
      const fromBag = cur.sel.where === 'bag', eq = fromBag && equipped(s, it.uid);
      ctl = `<div class="bankctl">${icon(it.id)}<b>${esc(itemName(it))}</b>${it.count > 1 ? qtyBox(it.count) : ''}
        <button type="button" class="act primary" data-act="${fromBag ? 'deposit' : 'withdraw'}" ${eq ? 'disabled' : ''}>${fromBag ? '맡기기 →' : '← 찾기'}</button>
        ${eq ? '<span class="hint">장착 중인 장비는 먼저 벗어 주세요</span>' : ''}</div>`;
    }
    const sortBtn = (w) => `<button type="button" class="chip sortbtn" data-act="sortbag" data-where="${w}" ${cur.busy ? 'disabled' : ''}>정리</button>`;
    return `<div class="bank"><div><h4>가방 ${s.bag.length}/${bal.inventory.bagSlots} ${sortBtn('bag')}</h4>${grid(s.bag, 'bag', bal.inventory.bagSlots, s, { dimEquipped: true })}</div>
      <div><h4>창고 ${s.warehouse.length}/${bal.inventory.warehouseSlots} ${sortBtn('warehouse')}</h4>${grid(s.warehouse, 'warehouse', bal.inventory.warehouseSlots, s)}</div></div>${ctl}`;
  }

  // 11차 변신 목록: 레벨 잠금, 지금 변신·남은 시간·덤 능력치, [변신](주문서 1장) / [변신 풀기]
  function viewMorph(s) {
    const have = inv.countItem(s, 'morphScroll'), c = s.morph?.cur, lv = s.player.level;
    const now = c ? `<div class="setbox"><b>지금 ${esc(morphDef(c.id, bal).name)}</b> — 남은 ${Math.ceil(c.ms / 60000)}분 · 덤 ${rollText(c.roll)}
      <button type="button" class="act" data-act="unmorph" ${cur.busy ? 'disabled' : ''}>변신 풀기</button></div>` : '<p class="hint">변신하지 않은 상태입니다.</p>';
    const rows = (bal.morphs ?? []).map((m) => {
      const open = lv >= m.level;
      return `<div class="row-item morphrow ${open ? '' : 'locked'}"><span class="mdot" style="background:#${m.tint.toString(16).padStart(6, '0')}"></span>
        <span><b>${esc(m.name)}</b> <em>Lv ${m.level}</em><br><small>${esc(m.desc)}</small></span>
        <button type="button" class="act primary" data-act="morphGo" data-id="${m.id}" ${open && have > 0 && !cur.busy ? '' : 'disabled'}>${open ? '변신' : `Lv ${m.level}`}</button></div>`;
    }).join('');
    const r = bal.morphRolls;
    return `<p class="sub-t">변신 주문서 ${won(have)}장 · 한 번 변신하면 20분(사냥하는 게임 시간) · 덤으로 힘 +${r.str.join('~')} / 민첩 +${r.dex.join('~')} / 치명 +${r.crit.join('~')}% / 명중 +${r.hit.join('~')}% 중 하나가 무작위로 붙습니다.
      변신 주문서를 단축 칸에 두면 자동 사냥 중 시간이 끝났을 때 같은 변신으로 다시 변신합니다(직접 풀면 안 함).</p>${now}<div class="list morphlist">${rows}</div>
      ${have < 1 ? '<p class="hint">변신 주문서가 없습니다. 잡화상에서 살 수 있습니다.</p>' : ''}`;
  }
  function doMorph(id) {
    if (cur.busy) return;
    if (G.pending || G.lockedByOtherTab) { msg('지금은 변신할 수 없습니다', true); return; }
    const res = inv.useMorph(G.save, id, G.scene.rng, bal);
    if (!res.ok) { msg(res.reason, true); return; }
    cur.busy = true;
    // ⑦ #5: 무작위 결과는 저장 실패 때도 같은 결과로만 다시 시도(mustSave)
    const ok = deal(res, 'morph', { mustSave: true, after: () => { if (cur) cur.busy = false; close(); G.scene.morphFx(res.roll); } });
    if (!ok && !G.pending && cur) cur.busy = false;
  }

  // ---------- 15차 경험치 복구(순간이동 마법사) ----------
  function viewRecover(s) {
    const q = inv.recoverQuote(s, bal), lost = q.used;
    if (q.max) return '<p class="hint big">최대 레벨이라 되찾을 경험치가 없습니다.</p>';
    if (!lost) return '<p class="hint big">되찾을 경험치가 없습니다.</p><p class="hint" style="text-align:center">쓰러지면 잃은 경험치를 여기서 돈을 내고 되찾을 수 있습니다(가장 최근 한 번).</p>';
    const cost = q.cost, need = s.player.level < bal.progression.maxLevel ? needExp(s.player.level, bal) : 0;
    return `<div class="recover"><p>"쓰러졌을 때 흩어진 경험을 모아 드리지요."</p>
      <p>되찾을 경험치 <b class="gold-t">${won(lost)}</b>${q.used < q.lost ? ` <small>(잃은 ${won(q.lost)} 중 최대 레벨까지)</small>` : ''}${need ? ` <small>(지금 레벨의 ${((100 * lost) / need).toFixed(2)}%)</small>` : ''}</p>
      <p>비용 <b class="${s.player.gold >= cost ? 'gold-t' : 'bad-t'}">${won(cost)}원</b></p>
      <div class="btns"><button type="button" class="act primary" data-act="recover" ${s.player.gold >= cost && !cur.busy ? '' : 'disabled'}>경험치 되찾기</button></div>
      ${s.player.gold < cost ? '<p class="hint">돈이 부족합니다.</p>' : ''}<p class="sub-t">다시 쓰러지면 그때 잃은 양으로 바뀝니다.</p></div>`;
  }
  // ---------- 15차 마법인형 ----------
  function viewDoll(s) {
    const owned = s.dolls?.owned ?? [], curD = s.dolls?.cur ?? null, boxes = inv.countItem(s, 'dollBox');
    const rows = bal.dolls.map((d) => {
      const has = owned.includes(d.id), on = curD === d.id;
      return `<div class="dollrow ${has ? '' : 'locked'} ${on ? 'on' : ''}"><span class="dolldot" style="background:#${d.color.toString(16).padStart(6, '0')}"></span>
        <span><b>${esc(d.name)}</b><br><small>${esc(d.desc)}</small></span>
        ${has ? (on ? `<button type="button" class="act" data-act="dollset" data-id="" ${cur.busy ? 'disabled' : ''}>두고 다니기</button>` : `<button type="button" class="act primary" data-act="dollset" data-id="${d.id}" ${cur.busy ? 'disabled' : ''}>데리고 다니기</button>`) : '<em class="sub-t">아직 없음</em>'}</div>`;
    }).join('');
    return `<p class="sub-t">마법인형은 하나만 데리고 다니며, 기사 옆을 빛 정령으로 따라다닙니다. 잡화상 「마법인형 상자」(${won(itemDef('dollBox', bal).price)}원)나 보스에게서 얻습니다.</p>
      <div class="dollgrid">${rows}</div>
      ${boxes ? `<div class="btns"><button type="button" class="act primary" data-act="dollbox" ${cur.busy ? 'disabled' : ''}>상자 열기 (${won(boxes)}개)</button></div>` : ''}`;
  }

  // 순간이동
  function viewTele(s) {
    const rows = bal.teleport.map((t) => {
      const m = bal.maps.find((x) => x.id === t.id);
      const can = cur.scroll ? inv.countItem(s, 'huntScroll') > 0 : s.player.gold >= t.price;
      return `<div class="tele"><div><h3>${t.name}</h3><p>권장 레벨 ${m.recommendedLevel.min}~${m.recommendedLevel.max}</p></div>
        <em>${cur.scroll ? '주문서 1장' : t.price ? `${won(t.price)}원` : '무료'}</em><button type="button" class="act primary" data-act="tele" data-id="${t.id}" ${can ? '' : 'disabled'}>이동</button></div>`;
    }).join('');
    if (cur.scroll) return `<p class="hint">갈 곳을 고르면 주문서 1장을 씁니다(지금 ${won(inv.countItem(s, 'huntScroll'))}장). 창을 닫으면 쓰지 않습니다.</p>${rows}`;
    return `<p class="hint">"어디로 보내 드릴까요? 돌아올 땐 귀환 주문서를 읽으시게."</p>${rows}`;
  }

  // ---------- 누르기 ----------
  $('winBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !cur || b.disabled) return;
    act(b.dataset.act, b.dataset);
  });
  $('winTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="tab"]');
    if (!b || !cur || cur.busy) return;
    if (cur.tab === 'title') G.scene?.newTitles?.clear(); // 12차: 칭호 탭을 보고 나가면 '새' 표시를 지움
    cur.tab = b.dataset.tab; cur.cx = null; cur.pick = null; cur.hbSel = null; cur.sel = null; cur.qty = 1; cur.qtyFresh = true; cur.confirm = null; cur.fx = null; cur.draft = null; cur.confirmReset = false; msg('');
    render();
  });
  $('winClose').addEventListener('click', close);
  // 20차 ⑦ #1: 세트 이름 입력 중 다시 그려도 쓰던 글자를 지킴
  $('winBody').addEventListener('input', (e) => { if (cur?.loEdit && e.target.id === 'loName') cur.loEdit.value = e.target.value; });
  // 17차: 강화 기록 펼침 상태를 다시 그려도 지킴
  $('winBody').addEventListener('toggle', (e) => { if (cur && e.target.classList?.contains('elog')) cur.logOpen = e.target.open; }, true);
  // 창 위의 손가락이 게임(조이스틱)으로 새지 않게
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove']) $('win').addEventListener(t, (e) => e.stopPropagation());

  const NEEDS_SEL = new Set(['equip', 'unequip', 'sell', 'deposit', 'withdraw', 'askEnchant', 'downGo', 'batchSafe', 'batchAsk', 'batchGo', 'doEnchant', 'blessAsk', 'blessGo']);
  function act(a, d) {
    const s = G.save;
    if (NEEDS_SEL.has(a) && !selected(s)) { cur.confirm = null; cur.bconfirm = null; cur.bless = null; msg('고른 물건이 바뀌었습니다. 다시 골라 주세요', true); render(); return; }
    switch (a) {
      case 'sel':
        cur.sel = { where: d.where, uid: Number(d.uid) }; cur.qty = 1; cur.qtyFresh = true; cur.confirm = null; cur.fx = null; msg(''); break;
      case 'pick': cur.buyId = d.id; cur.qty = 1; cur.qtyFresh = true; msg(''); break;
      case 'qty': cur.qty = Math.max(1, cur.qty + Number(d.d)); cur.qtyFresh = false; break;
      case 'qtyset': cur.qty = Math.max(1, Number(d.v)); cur.qtyFresh = false; break;
      // 6차: [+10]·[+100] — 고른 직후(1개 상태)에는 그 수로, 그 뒤로는 누를 때마다 더한다(10 세 번 = 30). 화면에서 최대까지로 자름
      case 'qtyadd': cur.qty = Math.max(1, (cur.qtyFresh ? 0 : cur.qty) + Number(d.v)); cur.qtyFresh = false; break;
      case 'qtyone': cur.qty = 1; cur.qtyFresh = true; break;
      case 'minitoggle': toggleMini(); return; // 다시 그리지 않음(스크롤 유지)
      case 'fav': {
        const sc = G.scene;
        if (!sc?.prefs) return;
        sc.prefs.fav = sc.prefs.fav === d.id ? null : d.id;
        savePrefs(sc.prefs);
        msg(sc.prefs.fav ? '즐겨찾기로 정했습니다 — 메뉴에서 바로 갈 수 있습니다' : '즐겨찾기를 지웠습니다');
        break;
      }
      case 'maptele': {
        if (cur.busy) return;
        const why = G.scene?.huntScrollBlock({ ignorePause: true, noScroll: true });
        if (why) { msg(why, true); return; }
        const t = bal.teleport.find((x) => x.id === d.id);
        const here = { ...s, player: { ...s.player, ...G.scene.positionOf() } };
        const res = inv.mapTeleport(here, d.id, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        cur.busy = true;
        const ok = deal(res, 'teleport', { keepPosition: true, after: () => { if (cur) cur.busy = false; close(); G.scene.applyTeleport(t.name); hud.toast(`${t.name}로 순간이동 (−${won(res.cost)}원)`, 2200); } });
        if (!ok && cur) cur.busy = false;
        return;
      }
      case 'equip': deal(inv.equip(s, cur.sel.uid, bal), 'equip', { okText: '장착했습니다' }); return;
      case 'unequip': deal(inv.unequip(s, slotOf(itemDef(selected(s).id, bal)), bal), 'unequip', { okText: '벗었습니다' }); return;
      // 8차
      case 'slotf': cur.slot = d.slot; cur.buyId = null; cur.qty = 1; cur.qtyFresh = true; msg(''); break;
      case 'slot': cur.slot = d.slot; msg(''); break;
      case 'equipuid': deal(inv.equip(s, Number(d.uid), bal), 'equip', { okText: '장착했습니다' }); return;
      // 20차 장비 세트
      case 'losave': { const i = Number(d.i); cur.loEdit = { i, value: s.loadouts?.[i]?.name ?? ['사냥', '보스', '세트3'][i] }; msg(''); break; }
      case 'locancel': cur.loEdit = null; msg(''); break;
      case 'lookok': {
        const i = Number(d.i), raw = $('loName')?.value ?? '', name = raw.trim();
        if (!name || [...name].length > 8) { cur.loEdit = { i, value: raw }; render(); msg('세트 이름은 1~8글자로 적어 주세요', true); return; } // ⑤ #3: 자르지 않고 알림
        cur.loEdit = null;
        deal(inv.saveLoadout(s, i, name, bal), 'loadout', { okText: `「${name}」 세트에 지금 장비를 저장했습니다` });
        return;
      }
      case 'lowear': {
        const i = Number(d.i), name = s.loadouts?.[i]?.name ?? '';
        const res = inv.applyLoadout(s, i, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        deal(res, 'loadout', { okText: `「${name}」 세트로 바꿔 꼈습니다${res.missing ? ` (없어진 장비 ${res.missing}칸은 그대로)` : ''}` });
        return;
      }
      case 'loclear': deal(inv.clearLoadout(s, Number(d.i), bal), 'loadout', { okText: '세트를 지웠습니다' }); return;
      case 'unequipslot': deal(inv.unequip(s, d.slot, bal), 'unequip', { okText: '벗었습니다' }); return;
      // ⑦: [물약] 버튼과 같은 대기시간(창이 열려 게임 시계가 멈춰 있어도 연달아 못 마심)
      case 'wtype': cur.wtype = d.type; cur.buyId = null; msg(''); break;
      case 'usebuff': {
        const d2 = itemDef(d.id, bal);
        deal(inv.useBuff(s, d.id, bal), 'buff', { okText: `${d2.name}을(를) 썼습니다` });
        return;
      }
      case 'hunt': {
        const why = G.scene?.huntScrollBlock({ ignorePause: true });
        if (why) { msg(why, true); return; }
        cur = { ...cur, kind: 'tele', tab: 'tele', scroll: true, sel: null }; unhalf(); msg(''); break;
      }
      case 'drink': {
        if ((G.scene?.potionCd ?? 0) > 0) { msg('물약을 마신 지 얼마 안 됐습니다. 창을 닫고 잠시 뒤에 다시 마셔 주세요', true); return; }
        const pd = itemDef(d.id, bal);
        deal(inv.usePotion(s, bal, d.id), 'potion', { okText: `${pd.name}을 마셨습니다`, after: () => { if (G.scene) G.scene.potionCd = pd.cooldownMs / 1000; } });
        return;
      }
      case 'bonus': {
        const draft = cur.draft ?? { str: 0, dex: 0, con: 0 };
        if (draft.str + draft.dex + draft.con < inv.unspentPoints(s, bal)) cur.draft = { ...draft, [d.k]: draft[d.k] + 1 };
        msg(''); break;
      }
      case 'bonusundo': cur.draft = null; msg(''); break;
      case 'bonusok': {
        if (cur.busy || !cur.draft) return;
        cur.busy = true;
        const ok = deal(inv.allocateBonus(s, cur.draft, bal), 'bonus', { okText: '보너스 점수를 나눴습니다', after: () => { if (cur) { cur.busy = false; cur.draft = null; } G.scene?.refreshHud(true); } });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      case 'resetask': cur.confirmReset = true; msg(''); break;
      case 'resetno': cur.confirmReset = false; break;
      case 'resetok': {
        if (cur.busy) return;
        cur.busy = true;
        const here = { ...s, player: { ...s.player, ...G.scene.positionOf() } };
        const ok = deal(inv.resetBonus(here, bal), 'bonusReset', { keepPosition: true, okText: '보너스 점수를 되돌렸습니다. 다시 나눠 주세요', after: () => { if (cur) { cur.busy = false; cur.confirmReset = false; cur.draft = null; } G.scene?.refreshHud(true); } });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      // 12차 도감·칭호
      case 'cxask': {
        const plan = col.codexPlan(s, d.set, bal);
        if (!plan.length) { msg('넣을 수 있는 장비가 없습니다', true); break; }
        cur.cx = { set: d.set, uids: plan.map((x) => x.uid), ids: plan.map((x) => x.id) }; msg(''); break;
      }
      case 'cxno': cur.cx = null; msg(''); break;
      case 'cxok': doCodex(); return;
      case 'titleuse': case 'titleoff': {
        if (cur.busy) return;
        const id = d.act === 'titleuse' ? d.id : null;
        cur.busy = true;
        const ok = deal(inv.setTitle(s, id, bal), 'title', {
          okText: id ? `칭호 《${col.titleDef(id, bal).name}》을(를) 씁니다` : '칭호를 뺐습니다',
          after: () => { if (cur) cur.busy = false; G.scene?.titleLook(); G.scene?.refreshHud(true); },
        });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      case 'claim': {
        if (cur.busy) return;
        const lv = Number(d.lv), r = inv.rewardDef(lv, bal);
        cur.busy = true;
        const ok = deal(inv.claimReward(s, lv, bal), 'reward', {
          okText: `${lv}레벨 보상을 받았습니다`,
          after: () => { if (cur) cur.busy = false; hud.log(`<b style="color:#e0a63e">${lv}레벨 보상</b> · ${r.items.map((g) => `${itemDef(g.id, bal).name}${g.count > 1 ? ` ${g.count}개` : ''}`).join(', ')}${r.gold ? ` · ${won(r.gold)}원` : ''}`); G.scene?.refreshHud(true); },
        });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      // 9차 단축 칸
      case 'hbpick': cur.pick = { t: d.t, id: d.id }; cur.hbSel = null; msg(''); break;
      case 'hbcancel': cur.pick = null; msg(''); break;
      // 15차 캐릭터 성장
      case 'elixir': {
        if (cur.busy) return;
        const def = itemDef(d.id, bal);
        deal(inv.drinkElixir(s, d.id, bal), 'elixir', { okText: `${def.name}을 마셨습니다 — ${STAT_NAME[def.elixir]} 영구 +1`, after: () => { G.scene?.refreshHud(true); hud.log(`<b style="color:#e0a63e">${def.name}</b> · ${STAT_NAME[def.elixir]} 영구 +1`); } });
        return;
      }
      case 'dollbox': {
        if (cur.busy) return;
        if (G.pending || G.lockedByOtherTab) { msg('지금은 열 수 없습니다', true); return; }
        const res = inv.openDollBox(s, G.scene.rng, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        cur.busy = true;
        const dd = dollDef(res.doll, bal);
        const text = res.dup ? `${dd.name} — 이미 있어 ${won(bal.dollRefund)}원을 돌려받았습니다` : `${dd.name}을(를) 얻었습니다! (${dd.desc})`;
        const ok = deal(res, 'dollBox', { mustSave: true, okText: text, after: () => { if (cur) cur.busy = false; hud.log(`마법인형 상자 · ${esc(text)}`); G.scene?.refreshHud(true); } });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      case 'dollset': {
        if (cur.busy) return;
        const id = d.id || null;
        deal(inv.setDoll(s, id, bal), 'doll', { okText: id ? `${dollDef(id, bal).name}을(를) 데리고 다닙니다` : '인형을 두고 다닙니다', after: () => G.scene?.refreshHud(true) });
        return;
      }
      case 'recover': {
        if (cur.busy) return;
        const res = inv.recoverExp(s, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        cur.busy = true;
        const ok = deal(res, 'recover', { okText: `경험치 ${won(res.exp)}을 되찾았습니다 (−${won(res.cost)}원)`, after: () => {
          if (cur) cur.busy = false;
          hud.log(`경험치 복구 · +${won(res.exp)} (−${won(res.cost)}원)`);
          if (res.levelsGained > 0) { G.scene?.levelUpFx(G.save.player.level); G.persist('levelup'); }
          G.scene?.refreshHud(true);
        } });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      // 14차 스킬 성장
      case 'skgrade': cur.skGrade = d.g; msg(''); break;
      case 'skup': {
        if (cur.busy) return;
        const name = bal.skills.find((k) => k.id === d.id)?.name ?? d.id;
        const res = inv.levelUpSkill(s, d.id, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        cur.busy = true;
        const ok = deal(res, 'skillUp', { okText: `${name} Lv ${res.to}!`, after: () => { if (cur) cur.busy = false; hud.log(`<b style="color:#e0a63e">${esc(name)} Lv ${res.to}</b> — 카드 ${res.cost.cards}장 · ${won(res.cost.gold)}원`); G.scene?.refreshSkills(true); } });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      case 'fuse': {
        if (cur.busy) return;
        if (G.pending || G.lockedByOtherTab) { msg('지금은 합성할 수 없습니다', true); return; }
        const from = itemDef(cardIdOf(d.id), bal).name;
        const res = inv.fuseCards(s, d.id, G.scene.rng, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        cur.busy = true;
        const got = itemDef(res.gotId, bal);
        // 무작위 결과는 저장 실패 때도 같은 결과로만 다시 시도(mustSave)
        const ok = deal(res, 'fuse', { mustSave: true, okText: `${from} ${bal.cardFuse}장 → ${got.name}!`, after: () => { if (cur) cur.busy = false; hud.log(`카드 합성 · ${esc(from)} ${bal.cardFuse}장 → <b class="grade g-${got.grade}">${esc(got.name)}</b>`); } });
        if (!ok && !G.pending && cur) { cur.busy = false; render(); }
        return;
      }
      case 'hbslot': {
        const i = Number(d.i);
        if (!(i >= 0 && i < HOTBAR_SLOTS)) return;
        if (!cur.pick) { cur.hbSel = cur.hbSel === i || !s.hotbar.slots[i] ? null : i; msg(''); break; }
        let next;
        try { next = assignSlot(s.hotbar, i, cur.pick, s.player.level, bal); } catch (err) { msg(err.message, true); return; }
        const name = slotName(cur.pick);
        cur.pick = null; cur.hbSel = null;
        saveHotbar(next, `${name}을(를) ${Math.floor(i / PAGE_SIZE) + 1}쪽 ${i % PAGE_SIZE + 1}번 칸에 넣었습니다`);
        return;
      }
      case 'hbclear': {
        if (cur.hbSel === null) return;
        const i = cur.hbSel;
        cur.hbSel = null;
        saveHotbar(assignSlot(s.hotbar, i, null, s.player.level, bal), '칸을 비웠습니다');
        return;
      }
      case 'hbauto': {
        const on = !autoUse(s.hotbar, d.id);
        const name = bal.skills.find((k) => k.id === d.id)?.name ?? d.id;
        saveHotbar(setAutoUse(s.hotbar, d.id, on, bal), `자동 사냥에서 ${name}을(를) ${on ? '씁니다' : '쓰지 않습니다'}`);
        return;
      }
      case 'goEnchant': cur.tab = 'enchant'; cur.confirm = null; cur.fx = null; break;
      // 13차
      case 'bagkind': bagKind = d.k; msg(''); break;
      case 'sortbag': {
        if (cur.busy) return;
        const res = inv.sortItems(s, d.where, bal);
        if (!res.ok) { msg(res.reason); return; }
        deal(res, 'sort', { okText: d.where === 'bag' ? '가방을 정리했습니다' : '창고를 정리했습니다' });
        return;
      }
      case 'lock': {
        const on = d.on === '1';
        deal(inv.setLock(s, Number(d.uid), on, bal), 'lock', { okText: on ? '잠갔습니다 — 팔기·강화·도감 넣기가 안 됩니다' : '잠금을 풀었습니다' });
        return;
      }
      case 'rsstep': {
        if (cur.busy) return;
        // ⑦ #1: 단계 밖 값(가져온 기록 등)이면 바로 아래·위 단계로
        const steps = bal.restockSteps, t = s.restock?.[d.id] ?? 0;
        const nextT = Number(d.d) > 0 ? steps.find((v) => v > t) : [...steps].reverse().find((v) => v < t);
        if (nextT === undefined) return;
        deal(inv.setRestock(s, d.id, nextT, bal), 'restockSet', { okText: '' });
        return;
      }
      case 'coinbuy': {
        if (cur.busy) return;
        const name = itemDef(d.id, bal).name;
        deal(inv.coinBuy(s, d.id, 1, bal), 'coinBuy', { okText: `${name}(으)로 바꿨습니다`, after: () => { hud.log(`보스 코인 교환 · ${esc(name)}`); G.scene?.refreshHud(true); } });
        return;
      }
      case 'rsnow': { if (cur.busy) return; G.scene?.tryRestock(true); return; }
      case 'buy': {
        const id = cur.buyId, d2 = itemDef(id, bal);
        const n = d2.kind === 'consumable' ? Math.min(cur.qty, inv.maxBuy(s, id, bal)) : 1;
        deal(inv.buy(s, id, n, bal), 'buy', { okText: `${d2.name} ${won(n)}개를 샀습니다 (−${won(d2.price * n)}원)`, after: () => { if (cur) { cur.qty = 1; cur.qtyFresh = true; } } });
        return;
      }
      case 'sell': {
        const it = selected(s); if (!it) return;
        const n = Math.min(cur.qty, it.count), gold = inv.sellPrice(it.id, bal) * n, name = itemName(it);
        deal(inv.sell(s, it.uid, n, bal), 'sell', { okText: `${name} ${won(n)}개를 팔았습니다 (+${won(gold)}원)`, after: () => { if (cur) { cur.sel = null; cur.qty = 1; cur.qtyFresh = true; } } });
        return;
      }
      case 'deposit': case 'withdraw': {
        const it = selected(s); if (!it) return;
        const n = Math.min(cur.qty, it.count), name = itemName(it);
        const fn = a === 'deposit' ? inv.toWarehouse : inv.toBag;
        deal(fn(s, it.uid, n, bal), a, { okText: `${name} ${won(n)}개를 ${a === 'deposit' ? '맡겼습니다' : '찾았습니다'}`, after: () => { if (cur) { cur.sel = null; cur.qty = 1; cur.qtyFresh = true; } } });
        return;
      }
      case 'askEnchant': {
        const it = selected(s); if (!it) return;
        cur.confirm = { uid: it.uid, level: it.enchant }; cur.fx = null; break;
      }
      case 'cancelConfirm': cur.confirm = null; break;
      case 'skind': cur.scrollKind = d.k; cur.confirm = null; cur.bconfirm = null; cur.bless = null; cur.fx = null; msg(''); break;
      case 'blessAsk': cur.fx = null; doBlessed(); return;
      case 'blessGo': doBlessed(); return;
      case 'blessNo': cur.bless = null; break;
      case 'downGo': {
        const it = selected(s); if (!it || cur.busy) return;
        const res = lowerEnchant(s, it.uid, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        const name = itemDef(it.id, bal).name;
        deal(res, 'enchant', { okText: `${name} +${res.from} → +${res.to}`, after: () => { pushEnchantLog({ name, from: res.from, to: res.to, kind: '하락', ok: true }); if (cur) cur.fx = { kind: 'up', text: `+${res.from} → +${res.to} 낮췄습니다` }; } });
        return;
      }
      case 'morphGo': doMorph(d.id); return;
      case 'toMorph': cur = { ...cur, kind: 'morph', tab: 'morph', sel: null }; unhalf(); msg(''); break;
      case 'unmorph': {
        if (cur.busy) return;
        deal({ ok: true, save: unmorph(s) }, 'morph', { okText: '변신을 풀었습니다', after: () => { if (G.scene) G.scene.morphLook(true); } });
        return;
      }
      case 'cartAdd': {
        const id = cur.buyId, d2 = itemDef(id, bal), cart = carts[cur.kind];
        const n = d2.kind === 'consumable' ? Math.max(1, cur.qty) : 1;
        const same = cart.find((l) => l.id === id);
        if (same) same.count += n; else cart.push({ id, count: n });
        cur.qty = 1; cur.qtyFresh = true; msg(`${d2.name} ${won(n)}개를 장바구니에 담았습니다`); break;
      }
      case 'cartDel': carts[cur.kind].splice(Number(d.i), 1); msg(''); break;
      case 'cartClear': carts[cur.kind].length = 0; msg(''); break;
      case 'cartBuy': {
        if (cur.busy) return;
        const cart = carts[cur.kind];
        const res = inv.buyMany(s, cart.map((l) => ({ ...l })), bal);
        if (!res.ok) { msg(res.reason, true); return; }
        deal(res, 'buy', { okText: `장바구니 ${res.kinds}가지를 샀습니다 (−${won(res.cost)}원)`, after: () => { cart.length = 0; } });
        return;
      }
      case 'multiOn': cur.multi = new Map(); cur.sel = null; msg(''); break;
      case 'multiOff': cur.multi = null; msg(''); break;
      case 'msel': {
        const uid = Number(d.uid), it = s.bag.find((i) => i.uid === uid);
        if (!it) return;
        if (equipped(s, uid)) { msg('끼고 있는 장비는 팔 수 없습니다', true); return; }
        if (it.lock) { msg('잠긴 장비는 팔 수 없습니다', true); return; }
        if (cur.multi.has(uid)) cur.multi.delete(uid); else cur.multi.set(uid, it.count);
        msg(''); break;
      }
      case 'multiSell': {
        if (cur.busy || !cur.multi) return;
        const lines = [...cur.multi.entries()].map(([uid, count]) => ({ uid, count }));
        const res = inv.sellMany(s, lines, bal);
        if (!res.ok) { msg(res.reason, true); return; }
        deal(res, 'sell', { okText: `${res.count}가지를 팔았습니다 (+${won(res.gold)}원)`, after: () => { if (cur) cur.multi = null; } });
        return;
      }
      case 'bt': cur.bt += Number(d.d); cur.bconfirm = null; msg(''); break;
      case 'batchSafe': { const it = selected(s); if (!it) return; const info = enchantInfo(it, s.rates, bal); doBatch(Math.min(info.safeMax, info.current + inv.countItem(s, info.scrollId)), false); return; }
      case 'batchAsk': cur.fx = null; cur.bt = Number(d.t); doBatch(cur.bt, true); return; // 화면에 보인 목표 그대로
      case 'batchGo': cur.bt = Number(d.t); doBatch(cur.bt, true); return;
      case 'batchNo': cur.bconfirm = null; break;
      // 24차 같은 장비 함께 강화
      case 'manyTog': { if (!cur.many) return; const u = Number(d.uid); if (cur.many.off.has(u)) cur.many.off.delete(u); else cur.many.off.add(u); cur.mconfirm = null; msg(''); break; }
      case 'mt': if (!cur.many) return; cur.many.t += Number(d.d); cur.mconfirm = null; msg(''); break;
      case 'manyAsk': cur.fx = null; doMany(d.sig, false); return;
      case 'manyGo': doMany(d.sig, true); return;
      case 'manyNo': cur.mconfirm = null; break;
      case 'manyJump': document.querySelector('#win .batch.many')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return;
      case 'doEnchant': doEnchant(); return;
      case 'tele': doTeleport(d.id); return;
      case 'askJunk': cur.junk = junkInfo(s, inv.junkGear(s, bal)); cur.sel = null; msg(''); break;
      case 'cancelJunk': cur.junk = null; break;
      case 'doJunk': doJunk(); return;
      case 'preset': { const p = PRESETS.find((x) => x.id === d.id); if (p) cur.draft = { ...p.rates }; msg(''); break; }
      case 'rstep': {
        const list = bal.rates[d.key], i = list.indexOf(cur.draft[d.key]) + Number(d.d);
        if (i >= 0 && i < list.length) cur.draft = { ...cur.draft, [d.key]: list[i] };
        msg(''); break;
      }
      case 'rreset': cur.draft = { ...cur.orig }; msg(''); break;
      case 'rapply': doRates(); return;
      default: return;
    }
    render();
  }

  function doEnchant() {
    if (cur.busy) return;
    const s = G.save, it = selected(s);
    if (!it) return;
    let info;
    try { info = enchantInfo(it, s.rates, bal); } catch { msg('강화할 수 없습니다', true); return; }
    // 위험 단계는 지금 이 장비·이 단계에 대한 확인이 있어야 한다(연타·단계가 바뀐 뒤 실행 방지)
    if (!info.safe && !(cur.confirm && cur.confirm.uid === it.uid && cur.confirm.level === it.enchant)) { cur.confirm = { uid: it.uid, level: it.enchant }; render(); return; }
    if (G.pending || G.lockedByOtherTab) { msg('지금은 강화할 수 없습니다', true); return; }
    if (!G.storage) { msg('이 브라우저는 저장이 막혀 있어 강화할 수 없습니다', true); return; }
    const name = itemDef(it.id, bal).name, from = it.enchant;
    const res = tryEnchant(s, it.uid, G.scene.rng, bal);
    if (!res.ok) { msg(res.reason, true); return; }
    cur.busy = true; cur.confirm = null;
    const ok = deal(res, 'enchant', {
      mustSave: true,
      after: () => {
        cur && (cur.busy = false);
        pushEnchantLog({ name, from, to: from + 1, kind: '일반', ok: res.result === 'success' });
        if (res.result === 'success') { if (cur) cur.fx = { kind: 'up', text: `+${from + 1} 성공!` }; hud.log(`<b style="color:#e0a63e">${name} +${from + 1} 강화 성공</b>`); }
        else { if (cur) { cur.fx = { kind: 'broke', text: `${josa(name, '이/가')} 사라졌습니다` }; cur.sel = null; } hud.log(`<span style="color:#ff8a7a">${name} +${from} 강화 실패 — 장비가 사라졌습니다</span>`); }
      },
    });
    if (!ok && !G.pending) cur.busy = false;
  }

  function doJunk() {
    if (cur.busy || !cur.junk) return;
    const fixed = cur.junk;
    const res = inv.sellJunk(G.save, fixed.uids, bal);
    // 확인한 뒤 기록이 바뀌어 목록·금액이 달라졌으면 팔지 않고 다시 확인받는다
    if (!res.ok) { cur.junk = null; msg(res.reason || '팔 수 없습니다', true); render(); return; }
    if (res.gold !== fixed.gold) { cur.junk = null; msg('팔 목록이 바뀌었습니다. 다시 확인해 주세요', true); render(); return; }
    cur.busy = true;
    const ok = deal(res, 'sellJunk', {
      okText: `안 쓰는 장비 ${won(res.count)}개를 팔았습니다 (+${won(res.gold)}원)${col.codexReserved(G.save, bal).size ? ` · 도감에 넣을 장비 ${won(col.codexReserved(G.save, bal).size)}개는 남겼습니다([정보]→[도감])` : ''}`,
      after: () => { if (cur) { cur.busy = false; cur.junk = null; cur.sel = null; } hud.log(`안 쓰는 장비 ${won(res.count)}개 판매 · +${won(res.gold)}원`); },
    });
    if (!ok && !G.pending) { cur.busy = false; render(); }
  }

  function doRates() {
    if (cur.busy) return;
    const next = { ...cur.draft };
    const cand = { ...G.save, rates: next };
    // 잘못된 값이면 저장 재시도 상태로 보내지 않고 바로 알린다
    if (!validate(cand, bal).ok) { msg('고를 수 없는 배율입니다', true); return; }
    cur.busy = true;
    const ok = deal({ ok: true, save: cand }, 'rates', {
      okText: '배율을 바꿨습니다',
      after: () => {
        if (cur && cur.kind === 'rates') { cur.busy = false; cur.orig = { ...G.save.rates }; cur.draft = { ...G.save.rates }; }
        hud.toast(`배율을 바꿨습니다 · ${rateText(G.save.rates)}`, 2400);
        hud.log(`배율 변경 · ${rateText(G.save.rates)}`);
        hud.rates(G.save.rates);
      },
    });
    if (!ok && !G.pending) { cur.busy = false; render(); }
  }

  function doTeleport(id) {
    if (cur.busy) return;
    const s = G.save;
    const here = { ...s, player: { ...s.player, ...G.scene.positionOf() } };
    const t = bal.teleport.find((x) => x.id === id);
    const scroll = cur.scroll;
    // 10차(⑤ #26): 주문서는 고르는 순간 다시 검사(보스 방·시전·쓰러짐 — 창이 열려 멈춘 상태라 canAct 대신 같은 조건을 직접)
    if (scroll) {
      const why = G.scene.huntScrollBlock({ ignorePause: true });
      if (why) { msg(why, true); return; }
    }
    cur.busy = true;
    const ok = deal(scroll ? inv.useHuntScroll(here, id, bal) : inv.teleport(here, id, bal), 'teleport', {
      keepPosition: true,
      after: () => { cur && (cur.busy = false); close(); G.scene.applyTeleport(t.name, scroll); },
    });
    if (!ok && cur) { cur.busy = false; }
  }

  // 저장 실패 → [그만두기]로 거래를 취소하면 창의 '처리 중'을 풀고 다시 그린다(취소 뒤 저장이 또 실패해도 창이 잠기지 않게)
  function unbusy() { if (!cur) return; cur.busy = false; cur.junk = null; cur.confirmReset = false; render(); }

  // 17차: 메뉴 [★ 즐겨찾기로] — 지도 그 지역 탭을 열고 순간이동 버튼과 같은 거래
  function goFav(id) { open('map', { tab: id }); act('maptele', { id }); }
  // 22차: 목표판 누름 — 목표 몬스터 사냥터로 즐겨찾기와 같은 거래. 이미 그 지역이면 돈 안 씀
  function goQuest() {
    const id = col.questMapId(G.save, bal), t = id && bal.teleport.find((x) => x.id === id);
    if (!t) return;
    if (cur?.half) close();
    if (G.scene?.knight && mapIdAt(G.scene.knight.x) === id) { hud.toast(`이미 ${REGIONS.find((r) => r.id === id)?.name ?? t.name}에 있습니다`, 1800); return; }
    goFav(id);
  }
  // ⑤ #3: 메뉴 버튼에 미리 값 표시(지금 위치 기준)
  function favCost(id) {
    const s = G.save, here = { ...s, player: { ...s.player, map: G.scene?.knight ? mapIdAt(G.scene.knight.x) : s.player.map } };
    return inv.mapTeleportCost(here, id, bal);
  }
  return { open, close, unbusy, refresh: render, goFav, goQuest, favCost, get isOpen() { return !!cur; } };
}

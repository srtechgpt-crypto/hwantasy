// 창: 가방·상점(잡화상/대장장이)·창고·강화·순간이동. 열려 있으면 게임이 멈춘다(멈춤 사유 'window').
// 모든 거래는 domain 함수로 새 save 후보를 만들고 G.commit으로 "저장에 성공했을 때만" 확정한다.
import bal from '../../data/balance.js';
import * as inv from '../domain/inventory.js';
import { enchantInfo, tryEnchant } from '../domain/enchant.js';
import { itemDef, isGearDef, slotOf, EQUIP_SLOTS } from '../domain/common.js';
import { compareGear, compareDetail } from '../domain/compare.js';
import { validate, statsOf } from '../domain/save.js';
import estimate from '../../data/estimate.js';
import { drawWorldMap, regionAtRatio } from './worldmap.js';
import { REGIONS, mapIdAt } from '../../data/maps.js';
import { bossRemainMs } from '../domain/boss.js';
import { G, hud, josa } from '../state.js';
import { savePrefs } from './prefs.js';
import { assignSlot, setAutoUse, autoUse, PAGE_SIZE, HOTBAR_SLOTS } from '../domain/hotbar.js';
import { learnedSkills } from '../domain/skills.js';

const $ = (id) => document.getElementById(id);
const won = (n) => n.toLocaleString('ko-KR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isGear = (id) => isGearDef(itemDef(id, bal));
// 8차: 장착 칸 이름(장비 9칸)
const SLOT_NAMES = { weapon: '무기', armor: '갑옷', helm: '투구', shirt: '티셔츠', cloak: '망토', gloves: '장갑', belt: '벨트', pants: '바지', boots: '부츠' };
// 인형 배치(3×3): 망토 투구 장갑 / 무기 갑옷 티셔츠 / 벨트 바지 부츠
const DOLL = ['cloak', 'helm', 'gloves', 'weapon', 'armor', 'shirt', 'belt', 'pants', 'boots'];
// 빈 칸에 흐리게 보여 줄 그림
const GHOST = { weapon: 'woodSword', armor: 'clothArmor', helm: 'helm1', shirt: 'shirt1', cloak: 'cloak1', gloves: 'gloves1', belt: 'belt1', pants: 'pants1', boots: 'boots1' };
const icon = (id, cls = '') => `<img class="ic ${cls}" src="assets/icons/${id}.png" alt="">`;
const itemName = (it) => `${it.enchant ? `+${it.enchant} ` : ''}${itemDef(it.id, bal)?.name ?? it.id}`;
const equipped = (s, uid) => Object.values(s.equip).includes(uid);
// 6차: 지금 낀 같은 종류 장비보다 좋으면 초록 ▲, 나쁘면 빨강 ▼(같거나 장비가 아니면 없음)
// 상세 칸 한 줄: "지금 장비보다 평균 공격 +2.5 ▲"
const cmpLine = (s, id, enchant = 0) => {
  const c = compareDetail(s, id, enchant, bal);
  if (!c) return '';
  const what = c.kind === 'weapon' ? '평균 공격' : c.slot === 'armor' ? '방어' : '장비 점수';
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
  me: ['내 정보', 'helm3'],
};
const TABS = {
  bag: [['items', '가방'], ['enchant', '강화']],
  shop: [['buy', '사기'], ['sell', '팔기']],
  smith: [['buy', '사기'], ['sell', '팔기'], ['enchant', '강화']],
  bank: [['bank', '맡기기·찾기']],
  tele: [['tele', '목적지']],
  rates: [['rates', '배율 고르기']],
  // 8차 내 정보: 장비 9칸 · 능력치(보너스 점수) · 레벨 보상
  me: [['gear', '장비'], ['stats', '능력치'], ['skill', '스킬'], ['reward', '보상']],
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
    cur = { kind, tab: opts.tab ?? TABS[kind][0][0], pick: null, hbSel: null, sel: null, buyId: null, qty: 1, qtyFresh: true, confirm: null, busy: false, fx: null, junk: null, slot: null, draft: null, confirmReset: false };
    if (kind === 'rates') { cur.orig = { ...G.save.rates }; cur.draft = { ...G.save.rates }; }
    G.pause.add('window');
    G.scene?.releaseInput();
    $('win').hidden = false;
    render();
  }
  function close() {
    if (!cur) return;
    if (cur.busy) return;
    clearInterval(mapTimer); mapTimer = 0;
    cur = null;
    $('win').hidden = true;
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
    const [title, ic] = TITLES[cur.kind];
    $('winTitle').textContent = title;
    $('winIcon').src = `assets/icons/${ic}.png`;
    $('winTabs').innerHTML = TABS[cur.kind].length > 1
      ? TABS[cur.kind].map(([id, label]) => `<button type="button" class="tab ${cur.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${label}</button>`).join('')
      : '';
    $('winGold').textContent = won(s.player.gold);
    const body = cur.kind === 'map' ? viewMap : { items: viewItems, enchant: viewEnchant, buy: viewBuy, sell: viewSell, bank: viewBank, tele: viewTele, rates: viewRates, gear: viewGear, stats: viewStats, skill: viewSkill, reward: viewReward }[cur.tab];
    // 탭 이름 옆 ! (남은 보너스 점수·받을 보상)
    if (cur.kind === 'me') {
      for (const [id, on] of [['stats', inv.unspentPoints(s, bal) > 0], ['reward', inv.readyRewards(s, bal).length > 0]]) {
        $('winTabs').querySelector(`[data-tab="${id}"]`)?.classList.toggle('notice', on);
      }
    }
    $('winBody').innerHTML = body(s);
    $('winBody').dataset.view = cur.kind === 'map' ? 'map' : cur.tab;
    if (cur.kind === 'map') paintMap();
  }

  // ---------- 6차 큰 지도 ----------
  let mapTimer = 0; // 열려 있는 동안 1초마다 다시 그림(보스 남은 시간). 스크롤 위치는 그대로
  function viewMap() {
    const all = cur.tab === 'all';
    return `<div class="worldmap ${all ? 'all' : 'region'}"><canvas id="worldCanvas"></canvas></div>
      <p class="maphint">${all ? '지역을 누르면 크게 봅니다' : '손가락으로 밀어 지도를 움직입니다 · ★ 순간이동 도착 · 노란 줄 다른 지역 가는 길 · 주황 네모 보스 방'}</p>
      <div class="mapbar"><button type="button" class="act" data-act="minitoggle" id="btnMiniToggle">${miniLabel()}</button></div>`;
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
    for (let i = 0; i < cap; i++) {
      const it = list[i];
      if (!it) { cells.push('<div class="cell empty"></div>'); continue; }
      const on = cur.sel && cur.sel.where === where && cur.sel.uid === it.uid;
      const eq = where === 'bag' && equipped(s, it.uid);
      cells.push(`<button type="button" class="cell ${on ? 'on' : ''} ${eq ? 'eq' : ''} ${eq && dimEquipped ? 'dim' : ''}" data-act="sel" data-where="${where}" data-uid="${it.uid}">
        ${icon(it.id)}${it.count > 1 ? `<span class="n">${it.count}</span>` : ''}${it.enchant ? `<span class="e">+${it.enchant}</span>` : ''}${eq ? '<span class="eqm">E</span>' : cmpMark(s, it.id, it.enchant ?? 0)}</button>`);
    }
    return `<div class="grid g${where}">${cells.join('')}</div>`;
  }

  // 8차: 공격 = 무기 + 강화 + 피해 보너스(힘·장갑), 방어 = 레벨·체력 + 모든 방어구
  const atkRange = (st) => { const add = st.weapon.enchant * bal.combat.weaponEnchantDamage + st.dmgBonus; return `${st.weapon.min + add}~${st.weapon.max + add}`; };
  function statsLine(s) {
    const st = statsOf(s, bal);
    return `<div class="stats"><span>공격 <b>${atkRange(st)}</b></span><span>방어 <b>${st.def}</b></span><span>체력 <b>${Math.ceil(s.player.hp)}/${st.maxHp}</b></span><span>가방 <b>${s.bag.length}/${bal.inventory.bagSlots}</b></span></div>`;
  }

  function itemInfo(it) {
    const d = itemDef(it.id, bal);
    if (d.kind === 'weapon') return `공격 ${d.min}~${d.max}${it.enchant ? ` (+${it.enchant * bal.combat.weaponEnchantDamage})` : ''}`;
    if (d.kind === 'armor') {
      const parts = [];
      if (d.def || it.enchant) parts.push(`방어 ${d.def}${it.enchant ? ` (+${it.enchant})` : ''}`);
      if (d.hp) parts.push(`최대 체력 +${d.hp}`);
      if (d.hit) parts.push(`명중 +${d.hit}%`);
      if (d.dmg) parts.push(`피해 +${d.dmg}`);
      if (d.regen) parts.push(`회복 +${d.regen}`);
      return `${SLOT_NAMES[slotOf(d)]} · ${parts.join(' · ')}`;
    }
    if (d.heal) return `체력 +${d.heal}`;
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

  // 가방
  function viewItems(s) {
    const it = selected(s);
    let side = '<p class="hint">칸을 누르면 설명과 버튼이 나옵니다.</p>';
    if (it) {
      const gear = isGear(it.id), eq = equipped(s, it.uid);
      side = `<div class="detail">${icon(it.id, 'big')}<h3>${esc(itemName(it))}${it.count > 1 ? ` × ${won(it.count)}` : ''}</h3><p>${itemInfo(it)}</p>${equipped(s, it.uid) ? '' : cmpLine(s, it.id, it.enchant ?? 0)}
        <div class="btns">${gear ? (eq ? '<button type="button" class="act" data-act="unequip">벗기</button>' : '<button type="button" class="act primary" data-act="equip">장착</button>') : ''}
        ${gear ? '<button type="button" class="act" data-act="goEnchant">강화</button>' : ''}
        ${it.id === 'returnScroll' ? '<p class="hint">귀환은 오른쪽 아래 [귀환] 버튼으로 읽습니다.</p>' : ''}
        ${itemDef(it.id, bal).heal ? `<button type="button" class="act" data-act="drink" data-id="${it.id}">마시기</button><p class="hint">[물약] 버튼은 모자란 체력에 맞는 물약을 골라 마십니다.</p>` : ''}</div></div>`;
    }
    return `${statsLine(s)}<div class="split">${grid(s.bag, 'bag', bal.inventory.bagSlots, s)}<div class="side">${side}</div></div>`;
  }

  // 강화
  function viewEnchant(s) {
    const gear = s.bag.filter((i) => isGear(i.id));
    if (!gear.length) return '<p class="hint big">가방에 강화할 장비가 없습니다.</p>';
    if (!cur.sel || !gear.some((g) => g.uid === cur.sel.uid)) cur.sel = { where: 'bag', uid: (gear.find((g) => equipped(s, g.uid)) ?? gear[0]).uid };
    const it = selected(s);
    const info = enchantInfo(it, s.rates, bal);
    const scrollId = info.scrollId;
    const scrolls = inv.countItem(s, scrollId);
    const list = gear.map((g) => `<button type="button" class="row-item ${g.uid === it.uid ? 'on' : ''}" data-act="sel" data-where="bag" data-uid="${g.uid}">${icon(g.id)}<span>${esc(itemName(g))}</span>${equipped(s, g.uid) ? '<em>장착</em>' : ''}</button>`).join('');
    let center;
    if (info.next === null) center = `<p class="hint big">${esc(josa(itemName(it), '은/는'))} 최대 강화 단계입니다.</p>`;
    else {
      const pct = Math.round(info.chance * 1000) / 10;
      const confirming = cur.confirm && cur.confirm.uid === it.uid && cur.confirm.level === it.enchant;
      center = `<div class="ench">
        <div class="ench-top">${icon(it.id, 'big')}<div><h3>${esc(itemDef(it.id, bal).name)} <b>+${info.current}</b> → <b class="gold-t">+${info.next}</b></h3>
          <p>${info.safe ? '<span class="ok-t">안전 단계 · 반드시 성공</span>' : `성공 <b>${pct}%</b> · <span class="bad-t">실패하면 ${esc(josa(itemDef(it.id, bal).name, '이/가'))} 사라집니다</span>`}</p>
          <p class="sub-t">${itemDef(scrollId, bal).name} ${won(scrolls)}장${s.rates.enchant !== 1 ? ` · 강화 배율 ×${s.rates.enchant} 반영` : ''}</p></div></div>
        ${cur.fx ? `<div class="fx ${cur.fx.kind}">${esc(cur.fx.text)}</div>` : ''}
        ${scrolls < 1 ? `<p class="hint">${josa(itemDef(scrollId, bal).name, '이/가')} 없습니다. 잡화상에서 살 수 있습니다.</p>`
          : confirming ? `<div class="warnbox"><p>정말 강화할까요? 실패하면 <b>${esc(josa(itemName(it), '이/가'))}</b> <b>사라집니다</b>.</p>
              <div class="btns"><button type="button" class="act danger" data-act="doEnchant" ${cur.busy ? 'disabled' : ''}>그래도 강화</button><button type="button" class="act" data-act="cancelConfirm">그만두기</button></div></div>`
          : `<div class="btns"><button type="button" class="act ${info.safe ? 'primary' : 'danger'}" data-act="${info.safe ? 'doEnchant' : 'askEnchant'}" ${cur.busy ? 'disabled' : ''}>강화하기</button></div>`}
      </div>`;
    }
    return `<div class="split ench-split"><div class="list">${list}</div><div class="side">${center}</div></div>`;
  }

  // 상점 사기(8차: 대장장이는 부위 탭으로 나눠 보여 준다)
  function viewBuy(s) {
    let goods = SHOP_GOODS[cur.kind], chips = '';
    if (cur.kind === 'smith') {
      cur.slot = cur.slot ?? 'weapon';
      goods = goods.filter((id) => slotOf(itemDef(id, bal)) === cur.slot);
      chips = `<div class="chips">${EQUIP_SLOTS.map((sl) => `<button type="button" class="chip ${cur.slot === sl ? 'on' : ''}" data-act="slotf" data-slot="${sl}">${SLOT_NAMES[sl]}</button>`).join('')}</div>`;
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
      <div class="btns"><button type="button" class="act primary" data-act="buy" ${max < 1 ? 'disabled' : ''}>사기</button></div>
      ${max < 1 ? `<p class="hint">${s.player.gold < d.price ? '돈이 부족합니다' : '가방에 자리가 없습니다'}</p>` : ''}</div>`;
    return `${statsLine(s)}${chips}<div class="split"><div class="list">${rows}</div><div class="side">${side}</div></div>`;
  }

  // ---------- 8차 내 정보 ----------
  // 장비: 인형 모양 9칸. 칸을 누르면 오른쪽에 지금 장비와 가방 속 같은 부위 장비 목록
  function viewGear(s) {
    cur.slot = cur.slot ?? 'weapon';
    const cells = DOLL.map((sl) => {
      const it = s.bag.find((i) => i.uid === s.equip[sl]);
      const spare = s.bag.some((i) => !equipped(s, i.uid) && slotOf(itemDef(i.id, bal)) === sl && compareGear(s, i.id, i.enchant ?? 0, bal) === 'up');
      return `<button type="button" class="slot ${cur.slot === sl ? 'on' : ''} ${it ? '' : 'none'}" data-act="slot" data-slot="${sl}">
        ${it ? icon(it.id) : icon(GHOST[sl], 'ghost')}${it?.enchant ? `<span class="e">+${it.enchant}</span>` : ''}${spare ? '<span class="cmp up">▲</span>' : ''}
        <small>${SLOT_NAMES[sl]}</small></button>`;
    }).join('');
    const worn = s.bag.find((i) => i.uid === s.equip[cur.slot]);
    const spares = s.bag.filter((i) => !equipped(s, i.uid) && slotOf(itemDef(i.id, bal)) === cur.slot);
    const list = spares.length ? spares.map((i) => `<div class="row-item">${icon(i.id)}<span>${esc(itemName(i))}${cmpMark(s, i.id, i.enchant ?? 0)}<br><small>${itemInfo(i)}</small></span>
      <button type="button" class="act primary" data-act="equipuid" data-uid="${i.uid}">장착</button></div>`).join('')
      : `<p class="hint">가방에 다른 ${josa(SLOT_NAMES[cur.slot], '이/가')} 없습니다. 대장장이에서 살 수 있습니다.</p>`;
    const side = `<div class="detail"><h3>${SLOT_NAMES[cur.slot]}</h3>
      ${worn ? `<div class="wornrow">${icon(worn.id, 'big')}<div><b>${esc(itemName(worn))}</b><p>${itemInfo(worn)}</p>
        <button type="button" class="act" data-act="unequipslot" data-slot="${cur.slot}">벗기</button></div></div>` : '<p class="hint">비어 있습니다.</p>'}
      <h4>가방 속 ${SLOT_NAMES[cur.slot]}</h4><div class="list">${list}</div></div>`;
    return `${statsLine(s)}<div class="split"><div class="doll">${cells}</div><div class="side">${side}</div></div>`;
  }

  // 능력치: 힘·민첩·체력 + 보너스 점수 나누기(확정 전 미리 보기) + 마을에서 다시 나누기
  const STAT_ROWS = [
    ['str', '힘', '피해가 올라 빨리 잡습니다 (추천)'],
    ['dex', '민첩', '명중과 공격 속도가 오릅니다'],
    ['con', '체력', '최대 체력·회복·방어가 올라 오래 버팁니다(사냥은 느려짐)'],
  ];
  function viewStats(s) {
    const draft = cur.draft ?? { str: 0, dex: 0, con: 0 };
    const used = draft.str + draft.dex + draft.con, left = inv.unspentPoints(s, bal) - used;
    const now = statsOf(s, bal);
    const prev = statsOf({ ...s, player: { ...s.player, bonus: { str: s.player.bonus.str + draft.str, dex: s.player.bonus.dex + draft.dex, con: s.player.bonus.con + draft.con } } }, bal);
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
      </div>
      <div class="derived"><h4>지금 능력</h4>
        <p>공격 ${arrow(atkRange(now), atkRange(prev))}</p><p>명중 보너스 ${arrow(now.hitBonus, prev.hitBonus, '%')}</p>
        <p>공격 간격 ${arrow((now.attackMs / 1000).toFixed(2), (prev.attackMs / 1000).toFixed(2), '초')}</p>
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

  // ---------- 9차 스킬·단축 칸 ----------
  // 위: 단축 칸 12칸(1쪽·2쪽). 아래 고른 것을 [칸에 넣기] → 칸을 누르면 들어감. 칸만 누르면 [비우기]
  // 가운데: 액티브 스킬 카드(배운 것·못 배운 것, 자동 사용 켜기/끄기), 물건 줄, 패시브
  const KIND_NAME = { attack: '공격', defense: '방어', ult: '필살기' };
  const ITEM_SHORT = { potion: '초급 물약', potionMid: '중급 물약', potionHigh: '고급 물약', returnScroll: '귀환 주문서' };
  const slotIcon = (e) => (e.t === 'skill' ? `sk_${e.id}` : e.id);
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
    const card = (k) => {
      const has = learned.has(k.id), auto = autoUse(h, k.id);
      return `<div class="skcard ${has ? '' : 'locked'} ${k.kind} ${pickOn('skill', k.id) ? 'picked' : ''}">
        <img class="ic" src="assets/icons/sk_${k.id}.png" alt="">
        <div class="sktext"><b>${esc(k.name)}</b> <em>${KIND_NAME[k.kind]} · Lv ${k.level} · ${Math.round(k.cooldownMs / 1000)}초</em><p>${esc(k.desc)}</p></div>
        ${has ? `<div class="skbtns"><button type="button" class="act primary" data-act="hbpick" data-t="skill" data-id="${k.id}">칸에 넣기</button>
          <button type="button" class="act tog ${auto ? 'on' : ''}" data-act="hbauto" data-id="${k.id}" aria-pressed="${auto}">자동 ${auto ? '켜짐' : '꺼짐'}</button></div>`
          : `<em class="sub-t">Lv ${k.level}에 배움</em>`}
      </div>`;
    };
    const skills = [...bal.skills].sort((a, b) => a.level - b.level).map(card).join('');
    const items = (bal.hotbarItems ?? []).map((id) => `<button type="button" class="act itempick ${pickOn('item', id) ? 'picked' : ''}" data-act="hbpick" data-t="item" data-id="${id}">${icon(id)}${ITEM_SHORT[id]}</button>`).join('');
    const passives = (bal.passives ?? []).map((p) => `<div class="pscard ${lv >= p.level ? 'on' : 'locked'}"><img class="ic" src="assets/icons/sk_${p.id}.png" alt=""><div><b>${esc(p.name)}</b> <em>${lv >= p.level ? '켜짐' : `Lv ${p.level}`}</em><p>${esc(p.desc)}</p></div></div>`).join('');
    return `<div class="hbbox">${slots}<p class="hbhelp">${help}</p></div>
      <h4 class="skh">액티브 스킬 <small>자동 사냥은 '자동 켜짐'인 스킬만 씁니다(단축 칸에 없어도)</small></h4><div class="skgrid">${skills}</div>
      <h4 class="skh">물약·주문서</h4><div class="itemrow">${items}</div>
      <h4 class="skh">패시브 <small>배우면 항상 켜짐</small></h4><div class="psgrid">${passives}</div>`;
  }
  // 단축 칸 바꾸기: 저장에 성공해야 확정(G.commit), 게임 화면 칸도 다시 그림
  function saveHotbar(next, okText) {
    return deal({ ok: true, save: { ...G.save, hotbar: next } }, 'hotbar', { okText, after: () => { G.scene?.refreshSkills(true); } });
  }

  // 상점 팔기
  function viewSell(s) {
    const it = selected(s);
    let side = '<p class="hint">팔 물건을 고르세요. 장착 중인 장비(E)는 팔 수 없습니다.</p>';
    if (it && cur.sel.where === 'bag') {
      const each = inv.sellPrice(it.id, bal), eq = equipped(s, it.uid);
      const qty = Math.min(cur.qty, it.count);
      side = `<div class="detail">${icon(it.id, 'big')}<h3>${esc(itemName(it))}</h3><p>한 개 ${won(each)}원</p>
        ${it.count > 1 ? qtyBox(it.count) : ''}
        <p class="sum">${won(qty)}개 · <b>${won(each * qty)}원</b></p>
        <div class="btns"><button type="button" class="act primary" data-act="sell" ${eq ? 'disabled' : ''}>팔기</button></div>
        ${eq ? '<p class="hint">먼저 가방에서 벗어 주세요.</p>' : ''}</div>`;
    }
    return `${junkBar(s)}<div class="split">${grid(s.bag, 'bag', bal.inventory.bagSlots, s, { dimEquipped: true })}<div class="side">${side}</div></div>`;
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
        <p class="sub-t fine-t">100마리마다 마을에서 물약·장비를 사고 안전 강화하는 모의 사냥 기준</p>
        <p class="sub-t">무기 +${w.safe + 1} 강화 성공 ${pct(cur.orig.enchant)}${d.enchant !== cur.orig.enchant ? ` → <b class="gold-t">${pct(d.enchant)}</b>` : ''}</p>
        <div class="btns"><button type="button" class="act primary" data-act="rapply" ${dirty && !cur.busy ? '' : 'disabled'}>적용</button>
          <button type="button" class="act" data-act="rreset" ${dirty ? '' : 'disabled'}>되돌리기</button></div>
        <p class="sub-t">언제든 다시 바꿀 수 있습니다. 바꾸면 다음 사냥부터 바로 적용됩니다.</p>
      </div></div>`;
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
    return `<div class="bank"><div><h4>가방 ${s.bag.length}/${bal.inventory.bagSlots}</h4>${grid(s.bag, 'bag', bal.inventory.bagSlots, s, { dimEquipped: true })}</div>
      <div><h4>창고 ${s.warehouse.length}/${bal.inventory.warehouseSlots}</h4>${grid(s.warehouse, 'warehouse', bal.inventory.warehouseSlots, s)}</div></div>${ctl}`;
  }

  // 순간이동
  function viewTele(s) {
    const rows = bal.teleport.map((t) => {
      const m = bal.maps.find((x) => x.id === t.id);
      const can = s.player.gold >= t.price;
      return `<div class="tele"><div><h3>${t.name}</h3><p>권장 레벨 ${m.recommendedLevel.min}~${m.recommendedLevel.max}</p></div>
        <em>${t.price ? `${won(t.price)}원` : '무료'}</em><button type="button" class="act primary" data-act="tele" data-id="${t.id}" ${can ? '' : 'disabled'}>이동</button></div>`;
    }).join('');
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
    cur.tab = b.dataset.tab; cur.pick = null; cur.hbSel = null; cur.sel = null; cur.qty = 1; cur.qtyFresh = true; cur.confirm = null; cur.fx = null; cur.draft = null; cur.confirmReset = false; msg('');
    render();
  });
  $('winClose').addEventListener('click', close);
  // 창 위의 손가락이 게임(조이스틱)으로 새지 않게
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove']) $('win').addEventListener(t, (e) => e.stopPropagation());

  function act(a, d) {
    const s = G.save;
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
      case 'equip': deal(inv.equip(s, cur.sel.uid, bal), 'equip', { okText: '장착했습니다' }); return;
      case 'unequip': deal(inv.unequip(s, slotOf(itemDef(selected(s).id, bal)), bal), 'unequip', { okText: '벗었습니다' }); return;
      // 8차
      case 'slotf': cur.slot = d.slot; cur.buyId = null; cur.qty = 1; cur.qtyFresh = true; msg(''); break;
      case 'slot': cur.slot = d.slot; msg(''); break;
      case 'equipuid': deal(inv.equip(s, Number(d.uid), bal), 'equip', { okText: '장착했습니다' }); return;
      case 'unequipslot': deal(inv.unequip(s, d.slot, bal), 'unequip', { okText: '벗었습니다' }); return;
      // ⑦: [물약] 버튼과 같은 대기시간(창이 열려 게임 시계가 멈춰 있어도 연달아 못 마심)
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
    const name = itemDef(it.id, bal).name, from = it.enchant;
    const res = tryEnchant(s, it.uid, G.scene.rng, bal);
    if (!res.ok) { msg(res.reason, true); return; }
    cur.busy = true; cur.confirm = null;
    const ok = deal(res, 'enchant', {
      mustSave: true,
      after: () => {
        cur && (cur.busy = false);
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
      okText: `안 쓰는 장비 ${won(res.count)}개를 팔았습니다 (+${won(res.gold)}원)`,
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
    const s = G.save;
    const here = { ...s, player: { ...s.player, ...G.scene.positionOf() } };
    const t = bal.teleport.find((x) => x.id === id);
    deal(inv.teleport(here, id, bal), 'teleport', {
      keepPosition: true,
      after: () => { cur && (cur.busy = false); close(); G.scene.applyTeleport(t.name); },
    });
  }

  // 저장 실패 → [그만두기]로 거래를 취소하면 창의 '처리 중'을 풀고 다시 그린다(취소 뒤 저장이 또 실패해도 창이 잠기지 않게)
  function unbusy() { if (!cur) return; cur.busy = false; cur.junk = null; cur.confirmReset = false; render(); }

  return { open, close, unbusy, refresh: render, get isOpen() { return !!cur; } };
}

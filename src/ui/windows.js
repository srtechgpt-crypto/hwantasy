// 창: 가방·상점(잡화상/대장장이)·창고·강화·순간이동. 열려 있으면 게임이 멈춘다(멈춤 사유 'window').
// 모든 거래는 domain 함수로 새 save 후보를 만들고 G.commit으로 "저장에 성공했을 때만" 확정한다.
import bal from '../../data/balance.js';
import * as inv from '../domain/inventory.js';
import { enchantInfo, tryEnchant } from '../domain/enchant.js';
import { playerStats } from '../domain/progression.js';
import { itemDef } from '../domain/common.js';
import { G, hud, josa } from '../state.js';

const $ = (id) => document.getElementById(id);
const won = (n) => n.toLocaleString('ko-KR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isGear = (id) => ['weapon', 'armor'].includes(itemDef(id, bal)?.kind);
const icon = (id, cls = '') => `<img class="ic ${cls}" src="assets/icons/${id}.png" alt="">`;
const itemName = (it) => `${it.enchant ? `+${it.enchant} ` : ''}${itemDef(it.id, bal)?.name ?? it.id}`;
const equipped = (s, uid) => s.equip.weapon === uid || s.equip.armor === uid;

const SHOP_GOODS = {
  shop: bal.consumables.filter((c) => c.shop).map((c) => c.id),
  smith: [...bal.weapons, ...bal.armors].filter((g) => g.shop).map((g) => g.id),
};
const TITLES = {
  bag: ['가방', 'weaponScroll'], shop: ['잡화상 노인', 'potion'], smith: ['대장장이', 'ironSword'],
  bank: ['창고지기', 'armorScroll'], tele: ['순간이동 마법사', 'returnScroll'],
};
const TABS = {
  bag: [['items', '가방'], ['enchant', '강화']],
  shop: [['buy', '사기'], ['sell', '팔기']],
  smith: [['buy', '사기'], ['sell', '팔기'], ['enchant', '강화']],
  bank: [['bank', '맡기기·찾기']],
  tele: [['tele', '목적지']],
};

export function initWindows() {
  let cur = null; // { kind, tab, sel:{where,uid}|null, buyId, qty, confirm, busy, fx }

  function open(kind, opts = {}) {
    if (!G.save || G.pending) return;
    cur = { kind, tab: opts.tab ?? TABS[kind][0][0], sel: null, buyId: null, qty: 1, confirm: null, busy: false, fx: null };
    G.pause.add('window');
    G.scene?.releaseInput();
    $('win').hidden = false;
    render();
  }
  function close() {
    if (!cur) return;
    if (cur.busy) return;
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
    const body = { items: viewItems, enchant: viewEnchant, buy: viewBuy, sell: viewSell, bank: viewBank, tele: viewTele }[cur.tab];
    $('winBody').innerHTML = body(s);
    $('winBody').dataset.view = cur.tab;
  }

  function grid(list, where, cap, s, { dimEquipped = false } = {}) {
    const cells = [];
    for (let i = 0; i < cap; i++) {
      const it = list[i];
      if (!it) { cells.push('<div class="cell empty"></div>'); continue; }
      const on = cur.sel && cur.sel.where === where && cur.sel.uid === it.uid;
      const eq = where === 'bag' && equipped(s, it.uid);
      cells.push(`<button type="button" class="cell ${on ? 'on' : ''} ${eq ? 'eq' : ''} ${eq && dimEquipped ? 'dim' : ''}" data-act="sel" data-where="${where}" data-uid="${it.uid}">
        ${icon(it.id)}${it.count > 1 ? `<span class="n">${it.count}</span>` : ''}${it.enchant ? `<span class="e">+${it.enchant}</span>` : ''}${eq ? '<span class="eqm">E</span>' : ''}</button>`);
    }
    return `<div class="grid g${where}">${cells.join('')}</div>`;
  }

  function statsLine(s) {
    const w = s.bag.find((i) => i.uid === s.equip.weapon) ?? null, a = s.bag.find((i) => i.uid === s.equip.armor) ?? null;
    const st = playerStats(s.player.level, { weapon: w, armor: a }, bal);
    const add = st.weapon.enchant * bal.combat.weaponEnchantDamage + st.atkBonus;
    return `<div class="stats"><span>공격 <b>${st.weapon.min + add}~${st.weapon.max + add}</b></span><span>방어 <b>${st.armor.def + st.armor.enchant + st.def}</b></span><span>체력 <b>${Math.ceil(s.player.hp)}/${st.maxHp}</b></span><span>가방 <b>${s.bag.length}/${bal.inventory.bagSlots}</b></span></div>`;
  }

  function itemInfo(it) {
    const d = itemDef(it.id, bal);
    if (d.kind === 'weapon') return `공격 ${d.min}~${d.max}${it.enchant ? ` (+${it.enchant * bal.combat.weaponEnchantDamage})` : ''}`;
    if (d.kind === 'armor') return `방어 ${d.def}${it.enchant ? ` (+${it.enchant})` : ''}`;
    if (d.id === 'potion') return `체력 +${d.heal}`;
    if (d.id === 'returnScroll') return '읽으면 바람 마을로 돌아갑니다';
    if (d.id === 'weaponScroll') return '무기를 강화합니다';
    if (d.id === 'armorScroll') return '갑옷을 강화합니다';
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
      <button type="button" data-act="qtyset" data-v="1">1</button><button type="button" data-act="qtyset" data-v="10">10</button>
      <button type="button" data-act="qtyset" data-v="100">100</button><button type="button" data-act="qtyset" data-v="${max}">최대</button></div>`;
  }

  // 가방
  function viewItems(s) {
    const it = selected(s);
    let side = '<p class="hint">칸을 누르면 설명과 버튼이 나옵니다.</p>';
    if (it) {
      const gear = isGear(it.id), eq = equipped(s, it.uid);
      side = `<div class="detail">${icon(it.id, 'big')}<h3>${esc(itemName(it))}${it.count > 1 ? ` × ${won(it.count)}` : ''}</h3><p>${itemInfo(it)}</p>
        <div class="btns">${gear ? (eq ? '<button type="button" class="act" data-act="unequip">벗기</button>' : '<button type="button" class="act primary" data-act="equip">장착</button>') : ''}
        ${gear ? '<button type="button" class="act" data-act="goEnchant">강화</button>' : ''}
        ${it.id === 'returnScroll' ? '<p class="hint">귀환은 오른쪽 아래 [귀환] 버튼으로 읽습니다.</p>' : ''}
        ${it.id === 'potion' ? '<p class="hint">물약은 [물약] 버튼으로 마십니다.</p>' : ''}</div></div>`;
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
    const scrollId = bal.enchant[info.kind].scrollId;
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

  // 상점 사기
  function viewBuy(s) {
    const goods = SHOP_GOODS[cur.kind];
    if (!cur.buyId || !goods.includes(cur.buyId)) cur.buyId = goods[0];
    const rows = goods.map((id) => {
      const d = itemDef(id, bal);
      return `<button type="button" class="row-item ${cur.buyId === id ? 'on' : ''}" data-act="pick" data-id="${id}">${icon(id)}<span>${d.name}</span><em>${won(d.price)}원</em></button>`;
    }).join('');
    const d = itemDef(cur.buyId, bal), max = inv.maxBuy(s, cur.buyId, bal);
    const stack = d.kind === 'consumable';
    const qty = stack ? Math.min(cur.qty, Math.max(1, max)) : 1;
    const side = `<div class="detail">${icon(d.id, 'big')}<h3>${d.name}</h3><p>${itemInfo({ id: d.id, enchant: 0 })}</p>
      ${stack ? qtyBox(Math.max(1, max)) : ''}
      <p class="sum">${won(qty)}개 · <b>${won(d.price * qty)}원</b></p>
      <div class="btns"><button type="button" class="act primary" data-act="buy" ${max < 1 ? 'disabled' : ''}>사기</button></div>
      ${max < 1 ? `<p class="hint">${s.player.gold < d.price ? '돈이 부족합니다' : '가방에 자리가 없습니다'}</p>` : ''}</div>`;
    return `${statsLine(s)}<div class="split"><div class="list">${rows}</div><div class="side">${side}</div></div>`;
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
    return `<div class="split">${grid(s.bag, 'bag', bal.inventory.bagSlots, s, { dimEquipped: true })}<div class="side">${side}</div></div>`;
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
    cur.tab = b.dataset.tab; cur.sel = null; cur.qty = 1; cur.confirm = null; cur.fx = null; msg('');
    render();
  });
  $('winClose').addEventListener('click', close);
  // 창 위의 손가락이 게임(조이스틱)으로 새지 않게
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove']) $('win').addEventListener(t, (e) => e.stopPropagation());

  function act(a, d) {
    const s = G.save;
    switch (a) {
      case 'sel':
        cur.sel = { where: d.where, uid: Number(d.uid) }; cur.qty = 1; cur.confirm = null; cur.fx = null; msg(''); break;
      case 'pick': cur.buyId = d.id; cur.qty = 1; msg(''); break;
      case 'qty': cur.qty = Math.max(1, cur.qty + Number(d.d)); break;
      case 'qtyset': cur.qty = Math.max(1, Number(d.v)); break;
      case 'equip': deal(inv.equip(s, cur.sel.uid, bal), 'equip', { okText: '장착했습니다' }); return;
      case 'unequip': deal(inv.unequip(s, itemDef(selected(s).id, bal).kind, bal), 'unequip', { okText: '벗었습니다' }); return;
      case 'goEnchant': cur.tab = 'enchant'; cur.confirm = null; cur.fx = null; break;
      case 'buy': {
        const id = cur.buyId, d2 = itemDef(id, bal);
        const n = d2.kind === 'consumable' ? Math.min(cur.qty, inv.maxBuy(s, id, bal)) : 1;
        deal(inv.buy(s, id, n, bal), 'buy', { okText: `${d2.name} ${won(n)}개를 샀습니다 (−${won(d2.price * n)}원)` });
        return;
      }
      case 'sell': {
        const it = selected(s); if (!it) return;
        const n = Math.min(cur.qty, it.count), gold = inv.sellPrice(it.id, bal) * n, name = itemName(it);
        deal(inv.sell(s, it.uid, n, bal), 'sell', { okText: `${name} ${won(n)}개를 팔았습니다 (+${won(gold)}원)`, after: () => { cur.sel = null; cur.qty = 1; } });
        return;
      }
      case 'deposit': case 'withdraw': {
        const it = selected(s); if (!it) return;
        const n = Math.min(cur.qty, it.count), name = itemName(it);
        const fn = a === 'deposit' ? inv.toWarehouse : inv.toBag;
        deal(fn(s, it.uid, n, bal), a, { okText: `${name} ${won(n)}개를 ${a === 'deposit' ? '맡겼습니다' : '찾았습니다'}`, after: () => { cur.sel = null; cur.qty = 1; } });
        return;
      }
      case 'askEnchant': {
        const it = selected(s); if (!it) return;
        cur.confirm = { uid: it.uid, level: it.enchant }; cur.fx = null; break;
      }
      case 'cancelConfirm': cur.confirm = null; break;
      case 'doEnchant': doEnchant(); return;
      case 'tele': doTeleport(d.id); return;
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

  function doTeleport(id) {
    const s = G.save;
    const here = { ...s, player: { ...s.player, ...G.scene.positionOf() } };
    const t = bal.teleport.find((x) => x.id === id);
    deal(inv.teleport(here, id, bal), 'teleport', {
      keepPosition: true,
      after: () => { cur && (cur.busy = false); close(); G.scene.applyTeleport(t.name); },
    });
  }

  return { open, close, refresh: render, get isOpen() { return !!cur; } };
}

// 화면 사이에서 함께 쓰는 게임 상태와 상태줄(HUD) 갱신.
export const G = {
  save: null,          // 저장 객체(정본)
  pause: new Set(),    // 멈춤 사유: title, menu, portrait, hidden, saveFail
  started: false,
  lockedByOtherTab: false,
  auto: false,
  storage: null,
  scene: null,
  persist: () => false,
  lastSaveAt: 0,
};

const $ = (id) => document.getElementById(id);

// 한국어 조사: josa('철검', '이/가') → '철검이', josa('숲 입구', '으로/로') → '숲 입구로'
export function josa(word, pair) {
  const [a, b] = pair.split('/');
  const code = String(word).trim().slice(-1).charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return `${word}${a}(${b})`.replace(`${a}(${b})`, pair === '으로/로' ? '(으)로' : `${a}(${b})`);
  const jong = code % 28;
  if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? b : a);
  return word + (jong ? a : b);
}
const lines = [];
let toastTimer = 0;

export const hud = {
  update({ level, hp, maxHp, expPct, gold, potions, scrolls, place, maxLevel, notice = false }) {
    // 8차: 보너스 점수·레벨 보상이 남으면 [정보] 버튼에 ! 표시
    $('btnInfo').classList.toggle('notice', notice);
    $('hudLv').textContent = `Lv ${level}`;
    $('hudHp').textContent = `${Math.max(0, Math.ceil(hp))}/${maxHp}`;
    $('hudHpBar').style.width = `${Math.max(0, Math.min(100, (100 * hp) / maxHp))}%`;
    $('hudExp').textContent = maxLevel ? '최대 레벨' : `${expPct.toFixed(2)}%`;
    $('hudExpBar').style.width = `${maxLevel ? 100 : expPct}%`;
    $('hudGold').textContent = gold.toLocaleString('ko-KR');
    $('cntPotion').textContent = potions;
    $('cntReturn').textContent = scrolls;
    $('hudPlace').textContent = place;
  },
  log(text) {
    lines.unshift(text);
    lines.length = Math.min(lines.length, 5);
    $('log').innerHTML = lines.map((l, i) => `<div class="${i > 1 ? 'old' : ''}">${l}</div>`).join('');
  },
  toast(text, ms = 1800) {
    const el = $('toast');
    el.textContent = text; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  },
  // NPC 가까이면 공격 버튼이 "대화"로 바뀐다
  setTalk(name) {
    const b = $('btnAttack');
    const want = name ? '대화' : '공격';
    if (b.textContent !== want) b.textContent = want;
    b.classList.toggle('talk', !!name);
  },
  // 배율이 기본(모두 ×1)이 아니면 장소 옆에 작은 표: 경험치·드랍·돈이 같으면 "×5", 다르면 "배율"
  rates(r) {
    const el = $('hudRate');
    if (!el || !r) return;
    const base = Object.values(r).every((v) => v === 1);
    const text = base ? '' : r.exp === r.drop && r.drop === r.gold && r.exp !== 1 ? `×${r.exp}` : '배율';
    el.hidden = base;
    if (el.textContent !== text) el.textContent = text;
  },
  // 9차 단축 칸(6칸): 빈 칸=점선 +, 스킬=그림·이름·쿨타임 부채꼴·남은 초, 물약·귀환=개수(없으면 흐림), 켜진 버프=빛남
  setHotbar(list, page) {
    const no = $('hbPageNo');
    if (no && no.textContent !== String(page + 1)) no.textContent = String(page + 1);
    for (const k of list) {
      const b = $(`hb${k.i}`);
      if (!b) continue;
      const img = b.querySelector('img'), src = k.empty ? '' : `assets/icons/${k.icon}.png`;
      if (b.dataset.src !== src) { b.dataset.src = src; if (src) img.src = src; else img.removeAttribute('src'); }
      b.classList.toggle('empty', !!k.empty);
      b.classList.toggle('item', k.kind === 'item');
      b.classList.toggle('none', k.kind === 'item' && k.count <= 0);
      b.classList.toggle('ult', k.id === 'ult');
      b.classList.toggle('active', !!k.active);
      b.classList.toggle('casting', !!k.casting);
      const cd = k.left > 0 && k.total > 0 ? Math.min(1, k.left / k.total) : 0;
      b.style.setProperty('--cd', cd.toFixed(3));
      const set = (sel, text) => { const t = b.querySelector(sel); if (t.textContent !== text) t.textContent = text; };
      set('b', k.empty ? '' : k.label);
      set('small', k.left > 0 ? String(Math.ceil(k.left / 1000)) : '');
      set('i', k.kind === 'item' ? String(Math.min(999, k.count)) : '');
      b.setAttribute('aria-label', k.empty ? `빈 단축 칸 ${k.i + 1}` : `${k.name} (${k.i + 1})`);
    }
  },
  // 10차 켜진 버프: 아이콘 + 남은 시간(1분 이상 'N분', 미만 'N초'). 같은 내용이면 다시 그리지 않음
  setBuffs(list) {
    const el = $('hudBuffs');
    if (!el) return;
    const text = (ms) => (ms >= 60000 ? `${Math.floor(ms / 60000)}분` : `${Math.max(1, Math.ceil(ms / 1000))}초`);
    const html = list.map((b) => `<span class="buff ${b.ms < 60000 ? 'low' : ''}" title="${b.name}"><img src="assets/icons/${b.icon}.png" alt=""><em>${text(b.ms)}</em></span>`).join('');
    const was = el.hidden, changed = el.dataset.html !== html;
    if (changed) { el.dataset.html = html; el.innerHTML = html; }
    el.hidden = !list.length;
    if (changed || was !== el.hidden) hud.relayout?.(); // 개수·글자 폭이 바뀌면 작은 지도 아래/옆 자리 다시 판정(main.js)
  },
  setAuto(on) {
    $('btnAuto').classList.toggle('on', on);
    $('autoState').textContent = on ? '켜짐' : '꺼짐';
  },
};

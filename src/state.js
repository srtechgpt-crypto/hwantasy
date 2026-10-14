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
  update({ level, hp, maxHp, expPct, gold, potions, scrolls, place, maxLevel }) {
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
  setAuto(on) {
    $('btnAuto').classList.toggle('on', on);
    $('autoState').textContent = on ? '켜짐' : '꺼짐';
  },
};

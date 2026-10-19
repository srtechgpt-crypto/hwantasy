// 17차 화면 표기·기기 기록(저장 파일과 별개).
// 돈: 10만 이상은 '12.3만', 1억 이상은 '1.23억'(상태줄만 — 창 안은 정확한 숫자). 경험치: 25레벨부터 소수 넷째 자리.
const trim = (s) => s.replace(/\.?0+$/, '');
export function fmtGold(n) {
  if (!Number.isFinite(n)) return '0';
  if (n < 100000) return Math.floor(n).toLocaleString('ko-KR');
  if (n < 1e8) return `${trim((Math.floor(n / 1000) / 10).toFixed(1))}만`;
  return `${trim((Math.floor(n / 1e6) / 100).toFixed(2))}억`;
}
export const expDigits = (level) => (level >= 25 ? 4 : 2);

// 강화 기록: 최근 20개, 이 기기에서만(localStorage 'hwantasy.enchantLog'). 못 쓰면 이번 실행 동안만 메모리에
const LOG_KEY = 'hwantasy.enchantLog', LOG_MAX = 20, KINDS = ['일반', '한 번에', '고급', '하락'];
let memLog = null;
function storage() { try { return window.localStorage; } catch { return null; } }
export function loadEnchantLog() {
  if (memLog) return memLog;
  try {
    const raw = JSON.parse(storage()?.getItem(LOG_KEY) || '[]');
    // ⑤ #2: 손상된 줄은 버림(단계 0~20 정수, 성공 여부 참/거짓, 종류는 정해진 것만)
    const okRow = (e) => e && typeof e.name === 'string' && Number.isFinite(e.t) && KINDS.includes(e.kind) && typeof e.ok === 'boolean'
      && [e.from, e.to].every((v) => Number.isInteger(v) && v >= 0 && v <= 20);
    memLog = Array.isArray(raw) ? raw.filter(okRow).slice(0, LOG_MAX) : [];
  } catch { memLog = []; }
  return memLog;
}
// e = { name, from, to, kind: '일반'|'한 번에'|'고급'|'하락', ok: 성공/사라짐 }
export function pushEnchantLog(e) {
  const list = [{ ...e, t: Date.now() }, ...loadEnchantLog()].slice(0, LOG_MAX);
  memLog = list;
  try { storage()?.setItem(LOG_KEY, JSON.stringify(list)); } catch { /* 저장 못 해도 이번 실행엔 보임 */ }
  return list;
}
export function agoText(t, now = Date.now()) {
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

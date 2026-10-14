// 기기별 화면 설정(저장 파일과 별개): 화면 크기(멀리 -1 / 보통 0 / 가까이 +1), 미니맵 펼침.
// localStorage를 못 쓰거나 값이 이상하면 기본값으로 진행한다.
const KEY = 'hwantasy.ui';
const DEFAULTS = { zoom: 0, mini: true };

export function loadPrefs() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    return {
      zoom: [-1, 0, 1].includes(raw.zoom) ? raw.zoom : DEFAULTS.zoom,
      mini: typeof raw.mini === 'boolean' ? raw.mini : DEFAULTS.mini,
    };
  } catch { return { ...DEFAULTS }; }
}

export function savePrefs(prefs) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ zoom: prefs.zoom, mini: prefs.mini })); } catch { /* 저장 못 해도 이번 실행엔 적용 */ }
}

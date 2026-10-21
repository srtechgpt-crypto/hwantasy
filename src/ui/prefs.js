// 기기별 화면 설정(저장 파일과 별개): 화면 크기(멀리 -1 / 보통 0 / 가까이 +1), 미니맵 펼침.
// localStorage를 못 쓰거나 값이 이상하면 기본값으로 진행한다.
const KEY = 'hwantasy.ui';
// 9차: page = 단축 칸 쪽(0·1), calm = 흔들림·번쩍임 줄이기
// 16차: cycle = 자동 순환(자동 귀환 뒤 채우고 다시 사냥)
// 17차: fav = 즐겨찾기 사냥터 입구(id) 또는 null
const DEFAULTS = { zoom: 0, mini: true, page: 0, calm: false, cycle: false, fav: null };
const FAVS = ['field', 'forest', 'mine', 'ruin', 'frost']; // 21차

export function loadPrefs() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    return {
      zoom: [-1, 0, 1].includes(raw.zoom) ? raw.zoom : DEFAULTS.zoom,
      mini: typeof raw.mini === 'boolean' ? raw.mini : DEFAULTS.mini,
      page: [0, 1].includes(raw.page) ? raw.page : DEFAULTS.page,
      calm: typeof raw.calm === 'boolean' ? raw.calm : DEFAULTS.calm,
      cycle: typeof raw.cycle === 'boolean' ? raw.cycle : DEFAULTS.cycle,
      fav: FAVS.includes(raw.fav) ? raw.fav : DEFAULTS.fav,
    };
  } catch { return { ...DEFAULTS }; }
}

export function savePrefs(prefs) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ zoom: prefs.zoom, mini: prefs.mini, page: prefs.page, calm: prefs.calm, cycle: !!prefs.cycle, fav: FAVS.includes(prefs.fav) ? prefs.fav : null })); } catch { /* 저장 못 해도 이번 실행엔 적용 */ }
}

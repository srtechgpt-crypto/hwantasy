// 「환타지」 시작점: 저장 불러오기, 화면(시작·메뉴·상태줄) 연결, Phaser 게임 띄우기.
import bal from '../data/balance.js';
import * as saveMod from './domain/save.js';
import { WorldScene } from './scenes/World.js';
import { initWindows } from './ui/windows.js';
import { G, hud } from './state.js';

const $ = (id) => document.getElementById(id);
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
G.storage = storage;
window.__hw = G; // 시험·문제 확인용
G.ui = initWindows();

// ---------- 같은 기기에서 두 창 동시 실행 막기 ----------
const tabId = Math.random().toString(36).slice(2);
try {
  const ch = new BroadcastChannel('hwantasy');
  ch.onmessage = (e) => {
    if (e.data?.type === 'hello' && e.data.id !== tabId) ch.postMessage({ type: 'here', id: tabId });
    if (e.data?.type === 'here' && e.data.id !== tabId && !G.started) G.lockedByOtherTab = true;
  };
  ch.postMessage({ type: 'hello', id: tabId });
} catch { /* BroadcastChannel 없음: 넘어감 */ }

// ---------- 시작 화면 ----------
function showTitle() {
  G.pause.add('title');
  $('hud').hidden = $('pad').hidden = true;
  $('menu').hidden = true;
  $('title').hidden = false;
  $('newConfirm').hidden = true;
  $('titleButtons').hidden = false;

  const res = storage ? saveMod.loadSave(storage, bal) : { save: null, broken: [], warning: '이 브라우저는 저장을 막고 있습니다. 껐다 켜면 기록이 사라집니다.' };
  G.loaded = res;
  $('btnContinue').hidden = !res.save;
  // 더 새 버전 기록이 있으면 이 버전으로는 시작하지 않는다(저장이 계속 실패해 멈추지 않게, 그 기록을 지키게)
  if (res.future) $('titleButtons').hidden = true;
  const warns = [];
  if (G.lockedByOtherTab) warns.push('다른 창에서 이미 「환타지」가 열려 있습니다. 그 창을 닫고 다시 열어 주세요. 이 창에서는 저장하지 않습니다.');
  if (res.warning) warns.push(res.warning);
  if (!res.save && res.broken?.length) warns.push('저장 기록이 손상되어 읽을 수 없습니다. 원본은 지우지 않고 보관했습니다. 메뉴의 "저장 가져오기"로 내보낸 기록을 넣을 수 있습니다.');
  $('titleWarn').textContent = warns.join(' ');
  $('titleWarn').hidden = warns.length === 0;
}

$('btnContinue').onclick = () => startGame(G.loaded.save, false);
$('btnNew').onclick = () => {
  const has = G.loaded?.save || G.loaded?.broken?.length;
  if (!has) return startGame(saveMod.newGame(bal), true);
  $('newConfirmText').textContent = G.loaded.save
    ? `Lv ${G.loaded.save.player.level} 기사의 기록이 지워집니다. 정말 새로 할까요?`
    : '손상된 기록 대신 새로 시작합니다. 손상된 원본은 보관해 둡니다.';
  $('titleButtons').hidden = true;
  $('newConfirm').hidden = false;
};
$('btnNewNo').onclick = () => { $('newConfirm').hidden = true; $('titleButtons').hidden = false; };
$('btnNewYes').onclick = () => startGame(saveMod.newGame(bal), true);

// 2026-10-16: 상태줄이 두 줄이 되거나(버프가 아랫줄로) 화면이 바뀌면 알림은 왼쪽 묶음 아래, 작은 지도는 오른쪽 묶음 아래로
function placeUnderHud() {
  const h = $('hud');
  if (h.hidden) return;
  const L = h.querySelector('.hud-left').getBoundingClientRect(), R = h.querySelector('.hud-right').getBoundingClientRect();
  if (!L.height) return;
  const st = document.documentElement.style;
  st.setProperty('--log-top', `${Math.round(L.bottom + 6)}px`);
  st.setProperty('--map-top', `${Math.round(R.bottom + 6)}px`);
  // 버프 칸: 작은 지도가 보이면 그 아래, 숨겼으면 오른쪽 버튼 아래. 지도 크기가 바뀌면(지역·열고 닫기) 다시 부름
  const mini = h.querySelector('.minimap');
  if (mini && ro && !mini.dataset.watched) { mini.dataset.watched = '1'; ro.observe(mini); }
  const M = mini?.getBoundingClientRect();
  const B = $('hudBuffs');
  B.classList.remove('beside');
  st.setProperty('--buff-top', `${Math.round((M && M.height ? M.bottom : R.bottom) + 6)}px`);
  // 세로가 짧아 아래 단축 칸에 닿으면 작은 지도 왼쪽 옆에 세로로 놓는다
  const bar = $('hotbar')?.getBoundingClientRect();
  if (!B.hidden && M && M.height && bar && bar.height && B.getBoundingClientRect().bottom > bar.top - 4) {
    B.classList.add('beside');
    st.setProperty('--buff-top', `${Math.round(M.top)}px`);
    st.setProperty('--buff-right', `${Math.round(innerWidth - M.left + 6)}px`);
  }
}
const ro = 'ResizeObserver' in window ? new ResizeObserver(() => placeUnderHud()) : null;
if (ro) { ro.observe($('hud')); document.querySelectorAll('#hud .hud-left, #hud .hud-right').forEach((e) => ro.observe(e)); }
hud.relayout = placeUnderHud;
addEventListener('resize', placeUnderHud);
addEventListener('orientationchange', () => setTimeout(placeUnderHud, 300));

function startGame(save, isNew) {
  G.save = save;
  G.started = true;
  $('title').hidden = true;
  $('hud').hidden = $('pad').hidden = false;
  placeUnderHud();
  G.pause.delete('title');
  if (isNew) G.persist('new');
  syncUpdate(true);
  hud.rates(G.save.rates);
  G.scene?.enterGame(isNew);
}

// ---------- 메뉴 ----------
$('btnBag').onclick = () => { if (G.started && !G.pending) G.ui.open('bag'); };
// 8차 [내 정보]: 장비 9칸·능력치·레벨 보상
$('btnInfo').onclick = () => { if (G.started && !G.pending) G.ui.open('me'); };
$('btnMap').onclick = () => { if (G.started && !G.pending) G.ui.open('map'); };
$('btnMenu').onclick = () => {
  if (G.ui?.isOpen) G.ui.close(); // 13차: 반쪽 가방이 열려 있으면 닫고 메뉴
  syncUpdate(false); syncCheckBtn();
  $('menu').hidden = false; $('ioBox').hidden = true; G.pause.add('menu');
  $('menuRate').textContent = G.save ? `(경험치 ×${G.save.rates.exp} · 드랍 ×${G.save.rates.drop} · 돈 ×${G.save.rates.gold} · 강화 ×${G.save.rates.enchant})` : '';
  $('btnRates').hidden = !G.started;
  // 17차 즐겨찾기
  const fav = G.scene?.prefs?.fav, ft = fav && bal.teleport.find((t) => t.id === fav);
  $('btnFav').hidden = !G.started || !ft;
  if (ft) $('favName').textContent = `${ft.name}로 순간이동 · ${(G.ui.favCost(fav) ?? 0).toLocaleString('ko-KR')}원`;
};
// 배율 창: 메뉴를 닫고 가방·상점과 같은 창으로 연다(창이 열려 있는 동안 게임 멈춤)
const openRates = () => { if (!G.started || G.pending) return; $('menu').hidden = true; G.pause.delete('menu'); G.ui.open('rates'); };
$('btnRates').onclick = openRates;
$('btnFav').onclick = () => {
  const fav = G.scene?.prefs?.fav;
  if (!G.started || G.pending || !fav) return;
  $('menu').hidden = true; G.pause.delete('menu');
  G.ui.goFav(fav);
};
$('hudRate').onclick = openRates;
// 22차: 목표판을 누르면 목표 사냥터로 순간이동(메뉴·창이 열려 게임이 멈췄거나 저장 대기 중이면 무시. 반쪽 가방은 멈춤이 아니라 goQuest가 닫음)
$('quest').onclick = () => { if (G.started && !G.pending && G.pause.size === 0) G.ui.goQuest(); };
$('btnResume').onclick = () => { $('menu').hidden = true; G.pause.delete('menu'); };
$('btnSaveNow').onclick = () => { if (G.persist('menu')) hud.toast('저장했습니다'); };
$('btnToTitle').onclick = () => { G.ui.close(); G.persist('title'); G.scene?.leaveGame(); showTitle(); G.pause.delete('menu'); };
$('btnExport').onclick = () => {
  G.scene?.syncPosition();
  $('ioBox').hidden = false;
  $('ioHelp').textContent = '아래 글자를 통째로 복사해 메모장이나 카톡 "나에게 보내기"에 보관하세요. 나중에 "저장 가져오기"에 붙여 넣으면 이 상태로 돌아옵니다.';
  try { $('ioText').value = saveMod.exportCode(G.save); }
  catch (e) { $('ioText').value = ''; hud.toast(`내보낼 수 없습니다: ${e.message}`); }
  $('ioText').readOnly = true;
  $('ioAction').textContent = '복사';
  $('ioAction').onclick = async () => {
    try { await navigator.clipboard.writeText($('ioText').value); hud.toast('복사했습니다'); }
    catch { $('ioText').select(); hud.toast('글자를 길게 눌러 복사해 주세요'); }
  };
};
$('btnImport').onclick = () => {
  $('ioBox').hidden = false;
  $('ioHelp').textContent = '보관해 둔 저장 글자를 붙여 넣고 "불러오기"를 누르세요. 지금 기록은 붙여 넣은 기록으로 바뀝니다.';
  $('ioText').value = '';
  $('ioHelp').style.color = '';
  $('ioText').readOnly = false;
  $('ioAction').textContent = '불러오기';
  $('ioAction').onclick = () => {
    const r = saveMod.importCode($('ioText').value.trim(), bal);
    // 2026-10-16: 실패 이유는 알림(메뉴 뒤로 숨던 문제) + 상자 안 안내 글에도 빨갛게
    if (!r.ok) { const why = r.reason || '읽을 수 없는 저장 글자입니다'; hud.toast(why, 3200); $('ioHelp').textContent = `불러오지 못했습니다: ${why}`; $('ioHelp').style.color = '#ff8a7a'; return; }
    $('ioHelp').style.color = '';
    // 4차: 저장이 성공해야 확정(G.commit). 실패하면 지금 기록은 그대로, 다시 시도해도 가져온 위치를 지금 장면 위치로 덮지 않는다
    G.commit(r.save, 'import', {
      keepPosition: true,
      after: () => {
        hud.toast('불러왔습니다');
        $('menu').hidden = true; G.pause.delete('menu');
        hud.rates(G.save.rates);
        if (G.started) G.scene?.enterGame(false); else startGame(G.save, false);
      },
    });
  };
};
$('ioClose').onclick = () => { $('ioBox').hidden = true; };

// ---------- 지금 업데이트(2026-10-17 대표님) ----------
// 게시본(홈 화면 앱)의 register.js가 window.__hwUpdate {state, version, apply}를 두고 바뀔 때 'hw-update'를 보낸다.
// 게임 중 새 버전이 다 받아지면 메뉴 버튼에 '새' 표시 + 메뉴 안 [지금 업데이트]. 누르면 저장한 뒤 바꾸고 새로고침(시작 화면에서 [이어하기]).
const UPDATE_FAIL = {
  'window-count': '다른 창(탭)에도 게임이 열려 있어 지금 바꿀 수 없습니다. 다른 창을 닫고 다시 눌러 주세요',
  'no-answer': '새 버전 확인이 늦어지고 있습니다. 잠시 뒤 다시 누르거나 앱을 닫고 다시 열어 주세요',
};
function syncUpdate(announce) {
  const u = window.__hwUpdate;
  const ready = !!u && G.started && (u.state === 'ready' || u.state === 'applying');
  $('menuBadge').hidden = !ready;
  $('btnUpdate').hidden = !ready;
  if (!ready) return;
  $('updVer').textContent = `v${u.version.slice(0, 6)}`;
  const busy = u.state === 'applying' || G.updating;
  $('btnUpdate').disabled = busy;
  $('updLabel').textContent = busy ? '새 버전으로 바꾸는 중…' : '지금 업데이트';
  if (announce && u.state === 'ready' && G.updateToast !== u.version) {
    G.updateToast = u.version;
    hud.toast('새 버전이 준비됐습니다 — 메뉴 → [지금 업데이트]', 3500);
  }
}
addEventListener('hw-update', () => syncUpdate(true));
// 13차 [업데이트 확인]: 메뉴를 열 때마다 지금 버전 표시, 누르면 register.js check()로 바로 찾기
let checkingUpd = false;
function syncCheckBtn() {
  const u = window.__hwUpdate;
  $('curVer').textContent = u?.current ? `지금 v${u.current.slice(0, 6)}` : u ? '' : '홈 화면 앱에서만';
  $('btnCheckUpd').disabled = checkingUpd || !u;
  $('chkLabel').textContent = checkingUpd ? '새 버전 찾는 중…' : '업데이트 확인';
}
const CHECK_TEXT = {
  latest: '최신 버전입니다',
  offline: '인터넷이 연결되어 있지 않아 확인하지 못했습니다',
  busy: '새 버전을 받는 중입니다. 잠시 뒤 메뉴를 다시 열어 주세요',
  error: '지금은 확인하지 못했습니다. 잠시 뒤 다시 눌러 주세요',
};
$('btnCheckUpd').onclick = async () => {
  const u = window.__hwUpdate;
  if (!u?.check || checkingUpd) return;
  checkingUpd = true; syncCheckBtn();
  let r;
  try { r = await u.check(); } catch { r = { result: 'error' }; }
  checkingUpd = false; syncCheckBtn();
  if (r.result === 'ready') { syncUpdate(false); hud.toast(`새 버전 v${(r.version || '').slice(0, 6)}이 준비됐습니다 — 위의 [지금 업데이트]를 누르세요`, 3500); }
  else hud.toast(`${CHECK_TEXT[r.result] ?? CHECK_TEXT.error}${r.result === 'latest' && r.version ? ` (v${r.version.slice(0, 6)})` : ''}`, 3000);
};
$('btnUpdate').onclick = async () => {
  const u = window.__hwUpdate;
  if (!u || u.state !== 'ready' || G.updating || !G.started) return;
  if (G.pending) { hud.toast('저장이 끝나지 않은 일이 있습니다'); return; }
  if (G.lockedByOtherTab) { hud.toast(UPDATE_FAIL['window-count'], 3500); return; }
  if (!storage) { hud.toast('이 폰에서는 기록을 저장할 수 없어 업데이트하면 기록이 사라집니다. 먼저 [저장 내보내기]로 보관해 주세요', 4500); return; }
  G.updating = true; G.pause.add('update');
  syncUpdate(false);
  // 저장 실패면 저장 실패 창이 뜨고(그 멈춤은 그대로 둠) 업데이트만 멈춘다
  if (!G.persist('update')) { G.updating = false; G.pause.delete('update'); syncUpdate(false); return; }
  const r = await u.apply();
  if (r.ok) return; // 곧 새로고침
  G.updating = false; G.pause.delete('update');
  syncUpdate(false);
  hud.toast(UPDATE_FAIL[r.reason] || '지금은 바꾸지 못했습니다. 앱을 닫고 다시 열면 새 버전이 됩니다', 4000);
};

// ---------- 저장 ----------
G.persist = (why) => {
  if (!G.save) return false;
  if (G.pending) return false; // 거래 저장 대기 중에는 옛 G.save로 덮어쓰지 않는다
  if (G.lockedByOtherTab) return false;
  if (!storage) return false;
  // 새 게임·가져오기는 G.save가 이미 새 기록 → 지금 화면의 기사 위치로 덮어쓰지 않는다
  if (why !== 'import' && why !== 'new') G.scene?.syncPosition();
  const r = saveMod.writeSave(storage, G.save);
  if (r.ok) {
    if (r.save) G.save = r.save;
    G.lastSaveAt = performance.now();
    G.pause.delete('saveFail');
    $('saveFail').hidden = true;
    return true;
  }
  G.pause.add('saveFail');
  $('saveFailText').textContent = `저장하지 못했습니다(${r.reason || '알 수 없는 이유'}). 폰 저장 공간을 확인한 뒤 다시 시도해 주세요. 그동안 게임은 멈춥니다.`;
  $('saveFail').hidden = false;
  return false;
};
// ---------- 거래 저장(2차): 후보를 저장에 성공했을 때만 확정 ----------
// next: domain 함수가 돌려준 새 save. 실패하면 G.save는 그대로(거래 전)이고, 후보는 G.pending에 보관한다.
// keepPosition: 순간이동처럼 후보의 위치를 그대로 저장(지금 화면 위치로 덮어쓰지 않음)
// mustSave: 강화·보스처럼 결과를 다시 뽑으면 안 되는 거래 → [그만두기] 없이 같은 결과로만 다시 시도
G.pending = null;
G.commit = (next, why, { keepPosition = false, mustSave = false, after = null } = {}) => {
  if (G.pending) { hud.toast('저장이 끝나지 않은 일이 있습니다'); return false; }
  if (G.lockedByOtherTab) { hud.toast('다른 창에서 실행 중이라 이 창에서는 거래할 수 없습니다', 2600); return false; }
  const candidate = structuredClone(next);
  if (!keepPosition && G.scene?.playing) Object.assign(candidate.player, G.scene.positionOf());
  // 저장이 막힌 브라우저: 사냥 결과도 원래 저장되지 않음(시작 화면 경고). 거래는 하되 매번 알린다
  if (!storage) { G.save = candidate; after?.(); hud.toast('이 브라우저는 저장이 막혀 있어 껐다 켜면 사라집니다', 2400); return true; }
  return tryCommit({ candidate, why, mustSave, after });
};
function tryCommit(p) {
  if (G.lockedByOtherTab) { hud.toast('다른 창에서 실행 중이라 저장하지 않았습니다', 2600); return false; }
  const r = saveMod.writeSave(storage, p.candidate);
  if (r.ok) {
    G.save = r.save;
    G.pending = null;
    G.lastSaveAt = performance.now();
    G.pause.delete('saveFail');
    $('saveFail').hidden = true;
    p.after?.();
    return true;
  }
  G.pending = p;
  G.pause.add('saveFail');
  $('saveFailText').textContent = p.mustSave
    ? `결과를 저장하지 못했습니다(${r.reason || '알 수 없는 이유'}). 폰 저장 공간을 확인한 뒤 [다시 시도]를 눌러 주세요. 같은 결과로 저장됩니다.`
    : `저장하지 못했습니다(${r.reason || '알 수 없는 이유'}). [다시 시도]하거나 [그만두기]로 이 거래를 취소할 수 있습니다.`;
  $('btnCancelSave').hidden = p.mustSave;
  $('saveFail').hidden = false;
  return false;
}
$('btnRetrySave').onclick = () => (G.pending ? tryCommit(G.pending) : G.persist('retry'));
$('btnCancelSave').onclick = () => {
  if (!G.pending || G.pending.mustSave) return;
  G.pending = null;
  hud.toast('거래를 취소했습니다');
  // 시작 화면에서 가져오기를 취소한 경우처럼 지금 기록이 없으면 저장할 것이 없다 — 실패 화면만 닫는다
  if (!G.save) { G.pause.delete('saveFail'); $('saveFail').hidden = true; return; }
  G.ui?.unbusy();
  if (G.persist('cancel')) G.ui?.refresh();
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { G.persist('hidden'); G.pause.add('hidden'); }
  else G.pause.delete('hidden');
});
addEventListener('pagehide', () => G.persist('pagehide'));

const portrait = matchMedia('(orientation: portrait)');
const onOrient = () => { if (portrait.matches) G.pause.add('portrait'); else G.pause.delete('portrait'); };
portrait.addEventListener?.('change', onOrient); onOrient();

// ---------- Phaser ----------
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14161f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight },
  scene: [WorldScene],
  input: { activePointers: 4 },
});
G.game = game;
G.onSceneReady = () => { $('loading').hidden = true; showTitle(); };

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

function startGame(save, isNew) {
  G.save = save;
  G.started = true;
  $('title').hidden = true;
  $('hud').hidden = $('pad').hidden = false;
  G.pause.delete('title');
  if (isNew) G.persist('new');
  hud.rates(G.save.rates);
  G.scene?.enterGame(isNew);
}

// ---------- 메뉴 ----------
$('btnBag').onclick = () => { if (G.started && !G.pending) G.ui.open('bag'); };
// 8차 [내 정보]: 장비 9칸·능력치·레벨 보상
$('btnInfo').onclick = () => { if (G.started && !G.pending) G.ui.open('me'); };
$('btnMap').onclick = () => { if (G.started && !G.pending) G.ui.open('map'); };
$('btnMenu').onclick = () => {
  $('menu').hidden = false; $('ioBox').hidden = true; G.pause.add('menu');
  $('menuRate').textContent = G.save ? `(경험치 ×${G.save.rates.exp} · 드랍 ×${G.save.rates.drop} · 돈 ×${G.save.rates.gold} · 강화 ×${G.save.rates.enchant})` : '';
  $('btnRates').hidden = !G.started;
};
// 배율 창: 메뉴를 닫고 가방·상점과 같은 창으로 연다(창이 열려 있는 동안 게임 멈춤)
const openRates = () => { if (!G.started || G.pending) return; $('menu').hidden = true; G.pause.delete('menu'); G.ui.open('rates'); };
$('btnRates').onclick = openRates;
$('hudRate').onclick = openRates;
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
  $('ioText').readOnly = false;
  $('ioAction').textContent = '불러오기';
  $('ioAction').onclick = () => {
    const r = saveMod.importCode($('ioText').value.trim(), bal);
    if (!r.ok) { hud.toast(r.reason || '읽을 수 없는 저장 글자입니다'); return; }
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

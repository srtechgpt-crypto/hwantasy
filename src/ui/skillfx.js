// 9차 스킬 연출: 스킬마다 다른 효과(칼자국·잔상·번개·땅 갈라짐·칼날 고리·방패·빛기둥·오라·성검 낙하).
// 계산과 무관한 그림만 다룬다. 폰 부담을 막으려고 떠 있는 조각 수에 상한(⑤ #19)을 두고,
// '흔들림·번쩍임 줄이기'(기기 설정 calm)이면 화면 흔들림·번쩍임을 약하게 한다.
const MAX_BITS = 120;   // 동시에 떠 있는 작은 조각(불꽃·먼지·돌)
const ADD = () => Phaser.BlendModes.ADD;

export function createSkillFx(scene) {
  let bits = 0;
  const calm = () => !!scene.prefs?.calm;

  // 작은 조각 하나: 상한을 넘으면 그리지 않는다
  function bit(x, y, w, h, color, { dx = 0, dy = -10, ms = 420, depth = 958, alpha = 1, add = false, ease = 'Cubic.easeOut' } = {}) {
    if (bits >= MAX_BITS) return null;
    bits++;
    const r = scene.add.rectangle(x, y, w, h, color, alpha).setDepth(depth);
    if (add) r.setBlendMode(ADD());
    scene.tweens.add({ targets: r, x: x + dx, y: y + dy, alpha: 0, duration: ms, ease, onComplete: () => { r.destroy(); bits--; } });
    return r;
  }
  function burst(x, y, color, n, spread, up = 0, size = 2, ms = 420) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = spread * (0.5 + Math.random() * 0.6);
      bit(x, y, size, size, color, { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7 - up, ms: ms + Math.random() * 160, add: true });
    }
  }
  function shake(ms, power) { scene.cameras.main.shake(ms, calm() ? power * 0.25 : power); }
  function flash(ms, r, g, b) { if (!calm()) scene.cameras.main.flash(ms, r, g, b); }
  // 한 번 그리고 사라지는 그래픽(draw(g, k) — k는 0→1)
  function anim(depth, ms, draw, ease = 'Cubic.easeOut') {
    const g = scene.add.graphics().setDepth(depth);
    const o = { k: 0 };
    scene.tweens.add({ targets: o, k: 1, duration: ms, ease, onUpdate: () => { g.clear(); draw(g, o.k); }, onComplete: () => g.destroy() });
    return g;
  }
  // 큰 글자(스킬 이름·치명)
  function title(x, y, text, color, size = 9, ms = 900) {
    const t = scene.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#000', strokeThickness: 3, resolution: 4 })
      .setOrigin(0.5).setDepth(1010).setScale(0.6); // 지도 위층(1000)보다 위
    scene.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: t, y: y - 14, alpha: 0, delay: ms * 0.5, duration: ms * 0.5, onComplete: () => t.destroy() });
  }

  return {
    get bits() { return bits; },
    title,
    // 강타: 주황 초승달 칼자국 + 불꽃 + 약한 흔들림
    bash(x, y, left) {
      anim(951, 260, (g, k) => {
        const s = left ? -1 : 1;
        g.lineStyle(4 * (1 - k) + 1, 0xffa040, 1 - k).beginPath();
        g.arc(x, y, 12 + k * 6, s > 0 ? -2.2 : 0.9, s > 0 ? -0.9 + k : 2.2 - k, false).strokePath();
        g.lineStyle(2, 0xfff0c0, 0.9 * (1 - k)).beginPath();
        g.arc(x, y, 10 + k * 6, s > 0 ? -2.0 : 1.1, s > 0 ? -1.1 + k : 2.0 - k, false).strokePath();
      });
      burst(x, y, 0xffb050, 12, 16, 4);
      shake(90, 0.004);
    },
    // 돌진: 지나온 길에 잔상 3개 + 먼지
    dash(x0, y0, x1, y1, frame) {
      for (let i = 1; i <= 3; i++) {
        const k = i / 4, g = scene.add.sprite(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 'hero', frame).setOrigin(0.5, 33 / 40)
          .setDepth(9).setTint(0xffc070).setAlpha(0.55).setBlendMode(ADD());
        scene.tweens.add({ targets: g, alpha: 0, duration: 260 + i * 60, onComplete: () => g.destroy() });
      }
      for (let i = 0; i < 6; i++) { const k = Math.random(); bit(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + 2, 3, 2, 0xcab48a, { dy: -6, ms: 380, depth: 8 }); }
      anim(950, 180, (g, k) => { g.lineStyle(2, 0xffe0a0, 0.8 * (1 - k)).lineBetween(x0, y0 - 6, x0 + (x1 - x0) * Math.min(1, k * 2), y0 - 6 + (y1 - y0) * Math.min(1, k * 2)); });
    },
    // 쇼크 스턴: 하늘에서 번개 + 노란 고리
    stun(x, y) {
      const pts = [{ x, y: y - 70 }];
      for (let i = 1; i < 6; i++) pts.push({ x: x + (Math.random() - 0.5) * 12, y: y - 70 + i * 13 });
      pts.push({ x, y: y - 4 });
      anim(1005, 300, (g, k) => {
        const a = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
        g.lineStyle(4, 0xffe680, 0.5 * a).strokePoints(pts);
        g.lineStyle(2, 0xffffff, a).strokePoints(pts);
      });
      anim(952, 380, (g, k) => { g.lineStyle(2, 0xffe060, 1 - k).strokeEllipse(x, y - 2, 10 + 22 * k, 5 + 10 * k); });
      burst(x, y - 6, 0xfff2a0, 8, 12, 6);
      flash(80, 255, 250, 200);
    },
    // 대지 가르기: 앞쪽 부채꼴로 땅이 갈라지는 선 + 돌 조각 + 흔들림
    quake(x, y, angle, r, arcDeg) {
      const half = (arcDeg * Math.PI) / 360;
      const lines = Array.from({ length: 5 }, (_, i) => {
        const a = angle - half + (2 * half * i) / 4, pts = [{ x, y }];
        for (let j = 1; j <= 4; j++) { const d = (r * j) / 4; pts.push({ x: x + Math.cos(a) * d + (Math.random() - 0.5) * 5, y: y + Math.sin(a) * d * 0.8 + (Math.random() - 0.5) * 4 }); }
        return pts;
      });
      anim(7, 700, (g, k) => {
        const grow = Math.min(1, k * 3), fade = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
        g.fillStyle(0x6a4a2a, 0.25 * fade).slice(x, y, r, angle - half, angle + half).fillPath();
        for (const pts of lines) {
          const n = Math.max(2, Math.ceil(pts.length * grow));
          g.lineStyle(2, 0x2a1a0a, 0.9 * fade).strokePoints(pts.slice(0, n));
          g.lineStyle(1, 0xffa050, 0.7 * fade).strokePoints(pts.slice(0, n));
        }
      });
      for (let i = 0; i < 14; i++) {
        const a = angle - half + Math.random() * 2 * half, d = Math.random() * r;
        bit(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 3, 3, i % 2 ? 0x8a6a4a : 0xb08a5a, { dy: -14 - Math.random() * 10, ms: 520, ease: 'Quad.easeOut' });
      }
      shake(180, 0.007);
    },
    // 회오리: 도는 칼날 고리 3개 + 바람 조각
    whirl(x, y, r) {
      anim(949, 420, (g, k) => {
        const rot = k * Math.PI * 3, rr = r * (0.45 + 0.55 * k);
        g.lineStyle(3, 0x9ff0ff, 0.9 * (1 - k)).strokeCircle(x, y - 4, rr);
        for (let i = 0; i < 3; i++) {
          const a = rot + (i * Math.PI * 2) / 3;
          g.lineStyle(3, 0xffffff, 0.95 * (1 - k)).beginPath().arc(x, y - 4, rr, a, a + 0.9, false).strokePath();
        }
      });
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        bit(x + Math.cos(a) * r * 0.6, y - 4 + Math.sin(a) * r * 0.4, 4, 1, 0xcff8ff, { dx: Math.cos(a + 1.5) * 14, dy: Math.sin(a + 1.5) * 10, ms: 380, add: true });
      }
      shake(100, 0.004);
    },
    // 방패 막기 켬: 파란 방패 번쩍 / 막았을 때: 파란 불꽃
    blockOn(x, y) { anim(983, 360, (g, k) => { g.fillStyle(0x7fc8ff, 0.5 * (1 - k)).fillEllipse(x, y - 10, 16 + 10 * k, 22 + 10 * k); g.lineStyle(2, 0xdff4ff, 1 - k).strokeEllipse(x, y - 10, 16 + 10 * k, 22 + 10 * k); }); },
    blocked(x, y) { burst(x, y - 10, 0x9fd8ff, 8, 10, 2); title(x, y - 22, '막음', '#9fd8ff', 8, 700); },
    // 굳센 의지: 초록 빛기둥 + 올라가는 십자
    heal(x, y, amount) {
      const beam = scene.add.rectangle(x, y + 2, 18, 46, 0x6aff8a, 0.55).setOrigin(0.5, 1).setDepth(965).setBlendMode(ADD());
      scene.tweens.add({ targets: beam, scaleX: 0.2, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => beam.destroy() });
      for (let i = 0; i < 6; i++) {
        if (bits >= MAX_BITS) break;
        bits++;
        const t = scene.add.text(x + (Math.random() - 0.5) * 18, y - Math.random() * 8, '+', { fontFamily: 'system-ui', fontSize: '8px', fontStyle: 'bold', color: '#7dff9a', stroke: '#0a3a14', strokeThickness: 2, resolution: 4 }).setOrigin(0.5).setDepth(1004);
        scene.tweens.add({ targets: t, y: t.y - 26 - Math.random() * 10, alpha: 0, delay: i * 60, duration: 700, onComplete: () => { t.destroy(); bits--; } });
      }
      title(x, y - 30, `+${amount}`, '#7dff9a', 9, 1000);
    },
    // 리덕션 아머 켬: 푸른 비늘 반짝임
    guardOn(x, y) { burst(x, y - 10, 0x9fd8ff, 10, 14, 6, 2, 500); },
    // 반격의 기운 켬 / 반격이 들어갔을 때
    counterOn(x, y) { anim(983, 420, (g, k) => { g.lineStyle(3, 0xff5040, 1 - k).strokeCircle(x, y - 10, 8 + 18 * k); }); burst(x, y - 10, 0xff6a4a, 10, 14, 6); },
    countered(mx, my, dmg) {
      anim(951, 220, (g, k) => { g.lineStyle(3, 0xff5040, 1 - k).lineBetween(mx - 8 + 16 * k, my - 14, mx + 8 - 16 * k, my + 2); });
      title(mx, my - 22, `반격 ${dmg}`, '#ff7a6a', 8, 800);
    },
    // 치명타: 큰 빨간 글자 + 흰 별 조각
    crit(x, y, dmg) { title(x, y - 18, `치명! ${dmg}`, '#ff4a3a', 10, 900); burst(x, y - 8, 0xffffff, 6, 10, 2); },
    // 성검 강림: 하늘에서 큰 칼이 내려오고(castMs) → onImpact에서 충격
    ultCast(x, y, castMs) {
      // 기사 둘레가 금빛으로 모임
      anim(948, castMs, (g, k) => { g.lineStyle(2, 0xffd860, 0.9 * k).strokeCircle(x, y - 8, 30 * (1 - k) + 6); });
      const sword = scene.add.image(x, y - 150, 'ult_sword').setOrigin(0.5, 1).setDepth(1006).setAlpha(0).setScale(0.9);
      scene.tweens.add({ targets: sword, alpha: 1, duration: castMs * 0.3 });
      scene.tweens.add({ targets: sword, y: y + 6, duration: castMs, ease: 'Quad.easeIn' });
      return sword;
    },
    ultImpact(x, y, r, sword) {
      if (sword) scene.tweens.add({ targets: sword, alpha: 0, duration: 500, delay: 250, onComplete: () => sword.destroy() });
      flash(220, 255, 250, 220);
      shake(360, 0.012);
      for (const [delay, color] of [[0, 0xfff2b0], [120, 0xffd060]]) {
        scene.time.delayedCall(delay, () => anim(1003, 520, (g, k) => { g.lineStyle(4 * (1 - k) + 1, color, 1 - k).strokeEllipse(x, y, r * 2 * k, r * 1.3 * k); }));
      }
      const pillar = scene.add.rectangle(x, y + 4, 26, 120, 0xfff6d0, 0.8).setOrigin(0.5, 1).setDepth(1002).setBlendMode(ADD());
      scene.tweens.add({ targets: pillar, scaleX: 0.1, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => pillar.destroy() });
      burst(x, y - 4, 0xffe080, 24, r * 0.8, 10, 3, 600);
      title(x, y - 46, '성검 강림!', '#ffe070', 12, 1300);
    },
    // 느려짐 표시(대지 가르기 맞은 몬스터)
    slowMark(m) { burst(m.sprite.x, m.sprite.y - 6, 0x8ab0ff, 4, 6, 4); },
  };
}

// 화면 왼쪽을 누른 곳에 나타나는 조이스틱. 방향 벡터(길이 0~1)를 돌려준다.
export function createJoystick({ zone, radius = 52, onRelease } = {}) {
  const base = document.createElement('div');
  const knob = document.createElement('div');
  Object.assign(base.style, {
    position: 'fixed', width: radius * 2 + 'px', height: radius * 2 + 'px', borderRadius: '50%',
    border: '2px solid rgba(239,228,200,.45)', background: 'rgba(20,22,31,.25)', pointerEvents: 'none',
    transform: 'translate(-50%,-50%)', display: 'none', zIndex: 3,
  });
  Object.assign(knob.style, {
    position: 'fixed', width: radius + 'px', height: radius + 'px', borderRadius: '50%',
    background: 'rgba(224,166,62,.7)', pointerEvents: 'none', transform: 'translate(-50%,-50%)', display: 'none', zIndex: 3,
  });
  document.body.append(base, knob);

  const st = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false, enabled: true };
  const show = (v) => { base.style.display = knob.style.display = v ? 'block' : 'none'; };

  zone.addEventListener('pointerdown', (e) => {
    if (!st.enabled || st.id !== null || e.clientX > innerWidth * 0.55) return;
    st.id = e.pointerId; st.ox = st.x = e.clientX; st.oy = st.y = e.clientY; st.active = true;
    base.style.left = knob.style.left = st.ox + 'px'; base.style.top = knob.style.top = st.oy + 'px';
    show(true);
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId !== st.id) return;
    st.x = e.clientX; st.y = e.clientY;
    const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy), k = d > radius ? radius / d : 1;
    knob.style.left = st.ox + dx * k + 'px'; knob.style.top = st.oy + dy * k + 'px';
  });
  const end = (e) => {
    if (e.pointerId !== st.id) return;
    release();
    onRelease?.();
  };
  function release() { st.id = null; st.active = false; show(false); }
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);

  return {
    vector() {
      if (!st.active) return { x: 0, y: 0, active: false };
      const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy);
      if (d < 8) return { x: 0, y: 0, active: true };
      const m = Math.min(1, d / radius);
      return { x: (dx / d) * m, y: (dy / d) * m, active: true };
    },
    reset() { release(); },
    setEnabled(v) { st.enabled = v; if (!v) release(); },
  };
}

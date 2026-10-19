// 16차 낮·밤(보기만): 실제 시각 20분 = 하루. 낮 12분 → 저녁 2분(점점 어두워짐) → 밤 4분 → 새벽 2분(점점 밝아짐).
// 전투·경험치에는 영향 없음. dark = 0(낮)~1(한밤)
export const DAY_MS = 20 * 60 * 1000;
const SEG = [['day', 12], ['dusk', 2], ['night', 4], ['dawn', 2]].map(([phase, min]) => [phase, min * 60 * 1000]);

export function phaseAt(ms) {
  if (!Number.isFinite(ms)) throw new RangeError('시각이 올바르지 않습니다');
  let t = ((ms % DAY_MS) + DAY_MS) % DAY_MS;
  for (const [phase, len] of SEG) {
    if (t < len) {
      const f = t / len;
      const dark = phase === 'day' ? 0 : phase === 'night' ? 1 : phase === 'dusk' ? f : 1 - f;
      return { phase, dark, night: phase === 'night' || (phase === 'dusk' && f >= 0.5) || (phase === 'dawn' && f < 0.5) };
    }
    t -= len;
  }
  return { phase: 'day', dark: 0, night: false };
}

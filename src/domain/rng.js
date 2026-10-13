// Mulberry32: a seed's unsigned 32-bit representation identifies its sequence.
export function makeRng(seed) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('시드는 정수여야 합니다');
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 26차 직업: 기사·요정. 직업마다 다른 것(스킬 이름·숫자, 패시브, 기본 체력, 능력치 성장, 시작 무기, 끼지 못하는 무기 계열)은
// classBal(bal, cls) 하나가 '그 직업으로 본 밸런스'를 만들어 기존 계산 함수에 그대로 넘긴다.
// 기사는 bal 그대로(같은 객체) — 기사 계산·난수·예상 시간 표가 25차와 완전히 같다.
// 스킬 id는 직업이 달라도 같다(bash·block…): 단축 칸·스킬 레벨·카드·자동 사냥·실행부가 id로 그대로 동작한다.
import { isRecord } from './common.js';
import { SWORD_TO_BOW, BOW, SWORD_TO_STAFF, STAFF, SWORD_TO_CLAW } from '../../data/balance.js';

export const CLASS_IDS = ['knight', 'elf', 'wizard', 'darkelf']; // 27차 마법사(v19부터)·28차 다크엘프(v20부터) — save.validHero가 CLASS_SINCE로 거름
export const CLASS_SINCE = { wizard: 19, darkelf: 20 };
export const DEFAULT_CLASS = 'knight';
export const isClassId = cls => CLASS_IDS.includes(cls);
export const clsOf = save => (isRecord(save?.hero) && isClassId(save.hero.cls) ? save.hero.cls : DEFAULT_CLASS);

const cache = new WeakMap();
// 이미 직업 보기인 bal을 넘겨도 된다(base로 돌아가 다시 만든다 — 캐시로 같은 객체)
export function classBal(bal, cls = DEFAULT_CLASS) {
  const base = bal?.classBase ?? bal;
  if (!cls || cls === DEFAULT_CLASS || !base?.classes?.[cls]) return base;
  let views = cache.get(base);
  if (!views) { views = {}; cache.set(base, views); }
  return (views[cls] ??= makeView(base, cls));
}
export const balForSave = (bal, save) => classBal(bal, clsOf(save));

function makeView(base, cls) {
  const c = base.classes[cls];
  const skills = base.skills.map(s => ({ ...s, ...(c.skills?.[s.id] ?? {}), icon: `sk_${cls}_${s.id}` }));
  const names = Object.fromEntries(skills.map(s => [s.id, s.name]));
  const kname = Object.fromEntries(base.skills.map(s => [s.id, s.name]));
  // 스킬 카드(직업 공용 아이템)는 지금 직업 스킬 이름으로 보여 준다
  const consumables = base.consumables.map(d => (d.card ? { ...d, name: `${names[d.card]} 카드`, alias: `${base.classes.knight?.name ?? '기사'}: ${kname[d.card]}` }
    : d.elixir && c.statNames?.[d.elixir] ? { ...d, name: `${c.statNames[d.elixir]}의 엘릭서` } : d)); // 27차: 마법사는 '지능의 엘릭서'(같은 아이템)
  // 요정은 검 드랍이 같은 등급 활로 바뀐다(드랍 항목 수·확률은 그대로 — 굴리는 난수 수가 같다)
  // 27차: 마법사는 검 드랍이 같은 등급 지팡이로
  const table = { elf: SWORD_TO_BOW, wizard: SWORD_TO_STAFF, darkelf: SWORD_TO_CLAW }[cls] ?? null; // 28차: 다크엘프는 검 → 크로우, 단검 → 이도류
  const swap = table ? id => table[id] ?? id : id => id;
  const monsters = base.monsters.map(m => ({ ...m, drops: m.drops.map(d => (d.pool ? { ...d, pool: d.pool.map(swap) } : { ...d, id: swap(d.id) })) }));
  return {
    ...base, classBase: base, cls,
    skills, passives: c.passives ?? base.passives, consumables, monsters,
    knight: { ...base.knight, ...(c.base ?? {}) },
    stats: { ...base.stats, ...(c.stats ?? {}) },
    start: { ...base.start, ...(c.start ?? {}) },
    statNames: c.statNames ?? null,
  };
}

// 이 직업이 이 무기를 낄 수 있나(무기가 아니면 true)
export function canWield(def, cls, bal) {
  if (def?.kind !== 'weapon') return true;
  const no = (bal?.classBase ?? bal)?.classes?.[cls ?? DEFAULT_CLASS]?.noWeapon ?? [];
  return !no.includes(def.type ?? 'sword');
}
export const className = (cls, bal) => (bal?.classBase ?? bal)?.classes?.[cls]?.name ?? cls;
// 원거리 무기 사거리(px): 활 4.5칸·지팡이(27차) 5칸. 근접 무기면 null
export const RANGED = { bow: BOW, staff: STAFF };
export const bowRange = (def, tile) => (RANGED[def?.type] ? RANGED[def.type].rangeTiles * tile : null);
// 27차: 능력치 이름(마법사는 str = '지능'). 저장·계산 키는 그대로
export const STAT_NAMES = { str: '힘', dex: '민첩', con: '체력' };
export const statName = (k, bal) => bal?.statNames?.[k] ?? STAT_NAMES[k] ?? k;

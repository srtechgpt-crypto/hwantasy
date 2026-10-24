// 26차: 화면(World·창)이 쓰는 '지금 캐릭터 직업으로 본 밸런스'. 살아 있는 묶음 — useClass로 바꾸면 가져다 쓴 곳이 모두 새 값을 본다.
// 저장 검사·변환은 이 값이 아니라 원래 밸런스(base)로 한다(save.js가 직업 보기를 받아도 base로 되돌림)
import base from '../data/balance.js';
import { classBal } from './domain/classes.js';

export let bal = base;
export function useClass(cls) { bal = classBal(base, cls); }
export { base };

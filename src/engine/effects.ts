import { describePath, getPath, setPath, validateValue } from './paths';
import { ensure, type Effect, type Story, type WorldState } from './types';

export function validateEffect(story: Story, effect: Effect): void {
  const field = describePath(story, effect.path);
  if (effect.op === 'add') {
    ensure(field.kind === 'number', `${effect.path}: add는 숫자에만 허용됩니다.`);
    validateValue({ kind: 'number', integer: field.integer }, effect.value, effect.path);
  } else if (effect.op === 'addToSet' || effect.op === 'removeFromSet') {
    ensure(field.kind === 'set', `${effect.path}: 집합 연산은 배열에만 허용됩니다.`);
    validateValue(field, effect.value, effect.path);
  } else {
    ensure(effect.op === 'set' && field.kind !== 'set', '배열 전체 set 또는 미지원 효과는 허용되지 않습니다.');
    validateValue(field, effect.value, effect.path);
  }
  ensure(effect.path !== 'player.crimes' || effect.op === 'addToSet', '전과 삭제/변경은 v1에서 허용되지 않습니다.');
}
// 호출자는 반드시 복제된 작업 상태를 넘긴다. 실패한 작업 상태는 폐기한다.
export function applyEffects(story: Story, draft: WorldState, effects: Effect[] = []): void {
  for (const effect of effects) {
    validateEffect(story, effect);
    const before = getPath(story, draft, effect.path);
    if (effect.op === 'set') {
      ensure(!(effect.path.endsWith('.alive') && before === false && effect.value === true), '같은 회차의 부활은 허용되지 않습니다.');
      setPath(draft, effect.path, effect.value);
    } else if (effect.op === 'add') {
      const value = (before as number) + (effect.value as number);
      validateValue(describePath(story, effect.path), value, effect.path);
      setPath(draft, effect.path, value);
    } else if (effect.op === 'addToSet') {
      setPath(draft, effect.path, [...new Set([...(before as string[]), effect.value as string])]);
    } else {
      setPath(draft, effect.path, (before as string[]).filter(value => value !== effect.value));
    }
  }
}

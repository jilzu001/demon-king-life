import { describePath, getPath, validateValue } from './paths';
import { ensure, type Condition, type Story, type WorldState } from './types';

export function validateCondition(story: Story, condition: Condition): void {
  if ('all' in condition) { condition.all.forEach(c => validateCondition(story, c)); return; }
  if ('any' in condition) { condition.any.forEach(c => validateCondition(story, c)); return; }
  if ('not' in condition) { validateCondition(story, condition.not); return; }
  const field = describePath(story, condition.path);
  ensure(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'].includes(condition.op), '허용되지 않은 조건 연산자');
  if (condition.op === 'contains') {
    ensure(field.kind === 'set', `${condition.path}: contains는 배열에만 허용됩니다.`);
    validateValue(field, condition.value, condition.path);
  } else {
    ensure(field.kind !== 'set', `${condition.path}: 배열 비교는 contains를 사용하세요.`);
    // 비교 임계값은 상태 범위 밖일 수 있다(예: gold < -1). 타입만 검증한다.
    validateValue({ kind: field.kind }, condition.value, condition.path);
    if (!['eq', 'neq'].includes(condition.op)) ensure(field.kind === 'number', '대소 비교는 숫자에만 허용됩니다.');
  }
}
export function evaluate(story: Story, state: WorldState, condition?: Condition): boolean {
  if (!condition) return true;
  validateCondition(story, condition);
  if ('all' in condition) return condition.all.every(c => evaluate(story, state, c));
  if ('any' in condition) return condition.any.some(c => evaluate(story, state, c));
  if ('not' in condition) return !evaluate(story, state, condition.not);
  const value = getPath(story, state, condition.path);
  switch (condition.op) {
    case 'eq': return value === condition.value;
    case 'neq': return value !== condition.value;
    case 'contains': return (value as string[]).includes(condition.value as string);
    case 'gt': return (value as number) > (condition.value as number);
    case 'gte': return (value as number) >= (condition.value as number);
    case 'lt': return (value as number) < (condition.value as number);
    case 'lte': return (value as number) <= (condition.value as number);
  }
}

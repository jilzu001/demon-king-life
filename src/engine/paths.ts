import { ensure, type WorldState, type Scalar, type Story } from './types';

export type Field = { kind: 'number' | 'string' | 'boolean' | 'set'; integer?: boolean; min?: number; max?: number };
const playerFields: Record<string, Field> = {
  species: { kind: 'string' }, combat: { kind: 'number', min: 0 }, magic: { kind: 'number', min: 0 },
  gold: { kind: 'number', min: 0 }, alive: { kind: 'boolean' }, legalStatus: { kind: 'string' }, crimes: { kind: 'set' },
};
const npcFields: Record<string, Field> = {
  alive: { kind: 'boolean' }, combat: { kind: 'number', min: 0 },
  trust: { kind: 'number', integer: true, min: -100, max: 100 },
  affection: { kind: 'number', integer: true, min: -100, max: 100 }, relationship: { kind: 'string' },
};
export function describePath(story: Story, path: string): Field {
  ensure(!path.split('.').some(p => ['__proto__', 'constructor', 'prototype'].includes(p)), `금지된 경로: ${path}`);
  if (path === 'flags') return { kind: 'set' };
  const parts = path.split('.');
  if (parts.length === 2 && parts[0] === 'player' && Object.hasOwn(playerFields, parts[1]!)) return playerFields[parts[1]!]!;
  if (parts.length === 3 && parts[0] === 'npcs' && Object.hasOwn(story.characters, parts[1]!) && Object.hasOwn(npcFields, parts[2]!)) return npcFields[parts[2]!]!;
  if (parts.length === 2 && parts[0] === 'inventory' && Object.hasOwn(story.manifest.initialState.inventory, parts[1]!)) return { kind: 'number', integer: true, min: 0 };
  throw new Error(`등록되지 않은 경로: ${path}`);
}
export function getPath(story: Story, state: WorldState, path: string): Scalar | string[] {
  describePath(story, path);
  let value: unknown = state;
  for (const key of path.split('.')) {
    ensure(value !== null && typeof value === 'object' && Object.hasOwn(value, key), `상태에 경로가 없습니다: ${path}`);
    value = (value as Record<string, unknown>)[key];
  }
  return value as Scalar | string[];
}
export function setPath(state: WorldState, path: string, value: Scalar | string[]): void {
  const parts = path.split('.');
  let object = state as unknown as Record<string, unknown>;
  for (const key of parts.slice(0, -1)) object = object[key] as Record<string, unknown>;
  object[parts.at(-1)!] = value;
}
export function validateValue(field: Field, value: unknown, path: string): void {
  if (field.kind === 'set') {
    ensure(typeof value === 'string' && /^[a-z][a-z0-9_]{2,}$/.test(value), `${path}: 집합 항목은 등록 형식의 문자열이어야 합니다.`);
    return;
  }
  ensure(typeof value === field.kind, `${path}: ${field.kind} 타입이 필요합니다.`);
  if (field.kind === 'number') {
    const number = value as number;
    ensure(Number.isFinite(number), `${path}: 유한한 숫자가 필요합니다.`);
    ensure(!field.integer || Number.isSafeInteger(number), `${path}: 안전한 정수가 필요합니다.`);
    ensure(field.min === undefined || number >= field.min, `${path}: 최솟값 ${field.min} 위반`);
    ensure(field.max === undefined || number <= field.max, `${path}: 최댓값 ${field.max} 위반`);
  }
  if (field.kind === 'string') ensure((value as string).trim().length, `${path}: 빈 문자열 금지`);
}

import { parseTree, getNodeValue, printParseErrorCode, type ParseError, type Node } from 'jsonc-parser';
import { ensure } from '../engine/types';

export const MAX_JSON_BYTES = 1_000_000;
export function parseJson(text: string, label = 'JSON'): unknown {
  ensure(new TextEncoder().encode(text).length <= MAX_JSON_BYTES, `${label}: 파일 크기 제한(1MB)을 초과했습니다.`);
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  ensure(tree && !errors.length, `${label}: JSON 문법 오류 ${errors.map(e => printParseErrorCode(e.error)).join(', ')}`);
  const visit = (node: Node, depth: number) => {
    ensure(depth <= 64, `${label}: JSON 중첩 제한을 초과했습니다.`);
    if (node.type === 'object') {
      const keys = new Set<string>();
      for (const property of node.children ?? []) {
        const key = property.children?.[0]?.value as string;
        ensure(!keys.has(key), `${label}: 중복 키 ${key}`);
        ensure(!['__proto__', 'prototype', 'constructor'].includes(key), `${label}: 허용되지 않은 키 ${key}`);
        keys.add(key);
      }
    }
    for (const child of node.children ?? []) visit(child, depth + 1);
  };
  visit(tree, 0);
  return getNodeValue(tree);
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

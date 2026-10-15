import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dialogueEmotion, portraitCharacters, portraitEmotions, portraitStages } from '../../src/ui/portraits';

describe('인물 연령·감정 자산 계약', () => {
  it('5인 × 4연령 × 5감정 100종과 기본 표정 20종이 별도 파일이며 내용도 다르다', () => {
    const hashes = new Set<string>(); let bytes = 0;
    for (const person of portraitCharacters) for (const stage of portraitStages) for (const emotion of portraitEmotions) {
      const buffer = readFileSync(`public/art/portraits/${person}-${stage}-${emotion}-v2.webp`);
      expect(buffer.toString('ascii', 0, 4)).toBe('RIFF'); expect(buffer.toString('ascii', 8, 12)).toBe('WEBP');
      expect(buffer.length).toBeLessThan(30000); bytes += buffer.length; hashes.add(createHash('sha256').update(buffer).digest('hex'));
    }
    expect(hashes.size).toBe(120); expect(bytes).toBeLessThan(3_600_000);
    expect(readdirSync('public/art/portraits').filter(f => f.endsWith('.webp'))).toHaveLength(120);
  });
  it('미제공 대사와 이전 콘텐츠에는 새로운 감정을 만들지 않는다', () => {
    expect(dialogueEmotion('dk20_disarmed', 0)).toBe('angry');
    expect(dialogueEmotion('dk20_disarmed', 2)).toBe('confused');
    expect(dialogueEmotion('legacy-scene', 0)).toBe('neutral');
    expect(dialogueEmotion('dk20_disarmed', 10)).toBe('neutral');
  });
});

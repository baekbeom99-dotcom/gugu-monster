import { describe, expect, it } from 'vitest';
import { viewScale } from '../../src/field/world/fieldRenderer';

describe('필드 화면 배율', () => {
  it('지도(20×20칸)가 화면 전체를 덮도록 배율을 키운다 — 검은 띠가 생기지 않게', () => {
    // 375×812: 가로 기준이면 2배(지도 높이 640px < 812px)라 3배로 키운다
    expect(viewScale(375, 812, 20, 20)).toBe(3);
    expect(20 * 16 * viewScale(375, 812, 20, 20)).toBeGreaterThanOrEqual(812);
    // 320×640: 640/320 = 2 → 2배면 딱 맞는다
    expect(viewScale(320, 640, 20, 20)).toBe(2);
  });

  it('지도 크기를 모르면 예전처럼 가로로 8칸쯤 보이는 배율', () => {
    expect(viewScale(375)).toBe(2);
    expect(viewScale(100)).toBe(1);
  });
});

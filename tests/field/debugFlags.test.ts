import { afterEach, describe, expect, it } from 'vitest';
import { debugFlags, setDebugFlag } from '../../src/field/debugFlags';

describe('필드 디버그 스위치', () => {
  const g = globalThis as Record<string, unknown>;
  afterEach(() => {
    delete g.__GUGU_E2E_FIELD__;
    delete g.__GUGU_E2E_LEGEND__;
    delete g.__GUGU_E2E_QUESTION__;
  });

  it('기본은 모두 꺼짐', () => expect(debugFlags()).toEqual({ encounter: false, legend: false, question: null }));

  it('E2E가 쓰는 window 이름에서 읽는다', () => {
    g.__GUGU_E2E_FIELD__ = true;
    g.__GUGU_E2E_LEGEND__ = true;
    g.__GUGU_E2E_QUESTION__ = { factId: '7x8', type: 'product' };
    expect(debugFlags()).toEqual({ encounter: true, legend: true, question: { factId: '7x8', type: 'product' } });
  });

  it('개발 화면에서 켜고 끈다', () => {
    setDebugFlag('encounter', true);
    setDebugFlag('legend', true);
    expect(debugFlags()).toMatchObject({ encounter: true, legend: true });
    setDebugFlag('encounter', false);
    expect(debugFlags().encounter).toBe(false);
  });
});

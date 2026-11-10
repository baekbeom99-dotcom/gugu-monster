import { describe, expect, it } from 'vitest';
import { createAnswerTimer, elapsedMs, pauseTimer, resumeTimer, startTimer } from '../../src/domain/field/answerTimer';

describe('answerTimer: 멈춘 시간은 걸린 시간에서 뺀다', () => {
  it('멈춤 없이 흐르면 그대로', () => {
    const t = startTimer(createAnswerTimer(), 1000);
    expect(elapsedMs(t, 3500)).toBe(2500);
  });
  it('멈춘 동안(2초)은 빠진다', () => {
    let t = startTimer(createAnswerTimer(), 1000);
    t = pauseTimer(t, 1500);
    t = resumeTimer(t, 3500);
    expect(elapsedMs(t, 4000)).toBe(1000);
  });
  it('멈춘 채로 재면 멈춘 순간까지만', () => {
    let t = startTimer(createAnswerTimer(), 0);
    t = pauseTimer(t, 400);
    expect(elapsedMs(t, 9000)).toBe(400);
  });
  it('여러 번 멈춰도 합쳐서 뺀다, 겹친 멈춤·재개는 무시', () => {
    let t = startTimer(createAnswerTimer(), 0);
    t = pauseTimer(t, 100);
    t = pauseTimer(t, 200);
    t = resumeTimer(t, 1100);
    t = resumeTimer(t, 1200);
    t = pauseTimer(t, 1300);
    t = resumeTimer(t, 2300);
    expect(elapsedMs(t, 2400)).toBe(100 + 200 + 100);
  });
  it('새로 시작하면 이전 멈춤은 지워진다', () => {
    let t = startTimer(createAnswerTimer(), 0);
    t = pauseTimer(t, 100);
    t = startTimer(t, 5000);
    expect(elapsedMs(t, 5300)).toBe(300);
  });
});

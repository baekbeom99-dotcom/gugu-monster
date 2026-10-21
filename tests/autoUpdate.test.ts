/** 새 버전 자동 적용: 문제를 푸는 화면에서는 새로고침하지 않는다 (v1.31) */
import { describe, expect, it } from 'vitest';
import { isBusyRoute, UPDATE_CHECK_MS } from '../src/pwa/autoUpdate';

describe('자동 새로고침', () => {
  it('전투·셈 연습·무한의 계단·부화·처음 시작·관리자 화면은 기다린다', () => {
    for (const h of ['#/battle', '#/practice?op=add', '#/stairs', '#/hatch', '#/welcome', '#/admin']) expect(isBusyRoute(h)).toBe(true);
  });

  it('나의 펫·탐험·상점·기록·도감 화면에서는 새로고침한다', () => {
    for (const h of ['', '#/', '#/pet', '#/explore', '#/shop?tab=toy', '#/records', '#/dex']) expect(isBusyRoute(h)).toBe(false);
  });

  it('30분마다 확인한다', () => {
    expect(UPDATE_CHECK_MS).toBe(30 * 60 * 1000);
  });
});

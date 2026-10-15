/** Web Audio 합성 효과음 — 오디오 파일 없이 즉시 반응 */
import { useGameStore } from '../store/useGameStore';

export type Sfx = 'tap' | 'correct' | 'gentle' | 'star' | 'capture' | 'combo' | 'coin' | 'fanfare' | 'lullaby';

interface Note {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  /** 1 = 기본 크기 */
  gain?: number;
}

/** 도레미 음높이 (Hz) */
const N = { C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, E6: 1319, G6: 1568, A6: 1760 } as const;

const SOUNDS: Record<Sfx, Note[]> = {
  tap: [{ freq: 660, start: 0, dur: 0.05, gain: 0.6 }],
  correct: [
    { freq: N.G5, start: 0, dur: 0.09 },
    { freq: N.C6, start: 0.08, dur: 0.15 },
  ],
  // 오답: 부정적인 '삐-' 대신 부드럽게 내려가는 소리
  gentle: [
    { freq: N.C5, start: 0, dur: 0.12, type: 'sine' },
    { freq: 440, start: 0.1, dur: 0.18, type: 'sine' },
  ],
  star: [
    { freq: N.E6, start: 0, dur: 0.08 },
    { freq: N.A6, start: 0.07, dur: 0.12 },
  ],
  capture: [
    { freq: N.C5, start: 0, dur: 0.1 },
    { freq: N.E5, start: 0.1, dur: 0.1 },
    { freq: N.G5, start: 0.2, dur: 0.1 },
    { freq: N.C6, start: 0.3, dur: 0.25 },
  ],
  // 콤보: 빠르게 올라가는 아르페지오
  combo: [
    { freq: N.E5, start: 0, dur: 0.06 },
    { freq: N.G5, start: 0.05, dur: 0.06 },
    { freq: N.C6, start: 0.1, dur: 0.06 },
    { freq: N.E6, start: 0.15, dur: 0.14 },
  ],
  // 별을 쓰는 '짤랑'
  coin: [
    { freq: N.A5, start: 0, dur: 0.06, type: 'square', gain: 0.5 },
    { freq: N.E6, start: 0.06, dur: 0.18, type: 'square', gain: 0.5 },
  ],
  // 부화·진화·단 마스터
  fanfare: [
    { freq: N.C5, start: 0, dur: 0.12 },
    { freq: N.C5, start: 0.14, dur: 0.08 },
    { freq: N.G5, start: 0.24, dur: 0.12 },
    { freq: N.E5, start: 0.38, dur: 0.1 },
    { freq: N.G5, start: 0.5, dur: 0.1 },
    { freq: N.C6, start: 0.62, dur: 0.4 },
    { freq: N.G6, start: 0.62, dur: 0.4, type: 'sine', gain: 0.4 },
  ],
  // 잠재우기: 느리게 내려가는 자장가
  lullaby: [
    { freq: N.G5, start: 0, dur: 0.25, type: 'sine', gain: 0.7 },
    { freq: N.E5, start: 0.25, dur: 0.25, type: 'sine', gain: 0.6 },
    { freq: N.C5, start: 0.5, dur: 0.45, type: 'sine', gain: 0.5 },
  ],
};

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function playSfx(name: Sfx): void {
  const { sound, volume } = useGameStore.getState().settings;
  if (!sound || volume <= 0) return;
  const ac = audioContext();
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const n of SOUNDS[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    // 기본은 귀에 덜 날카로운 삼각파
    osc.type = n.type ?? 'triangle';
    osc.frequency.value = n.freq;
    const peak = 0.22 * volume * (n.gain ?? 1);
    gain.gain.setValueAtTime(0.0001, t0 + n.start);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + n.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + n.start);
    osc.stop(t0 + n.start + n.dur + 0.02);
  }
}

import { useEffect, useRef, useState } from 'react';
import type { Dir } from '../../domain/field/movement';
import { TAP_CLOSE_MS } from '../../domain/field/tuning';
import { padDirection } from './padDirection';

interface Props {
  onDir(dir: Dir | null): void;
  /** 가운데에서 안 끌고 짧게 뗀 탭 (화면 좌표) */
  onTap(clientX: number, clientY: number): void;
}

export const JOYSTICK_BASE_PX = 120; // 바닥 원 지름
export const DEAD_ZONE_RATIO = 0.18; // 바닥 원 지름 대비 가운데 안 눌리는 영역

interface Knob {
  /** 바닥 원 가운데 (부모 기준 px) */
  bx: number;
  by: number;
  /** 손잡이 오프셋 (바닥 원 반지름 안으로 제한) */
  kx: number;
  ky: number;
}

/** 화면 어디든 손가락을 대면 그 자리에 나타나는 플로팅 조이스틱. 부모를 덮는 투명 층이다. */
export function Joystick({ onDir, onTap }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const current = useRef<Dir | null>(null);
  const origin = useRef({ x: 0, y: 0, t: 0, left: false });
  const [knob, setKnob] = useState<Knob | null>(null);

  const emit = (d: Dir | null) => {
    if (current.current === d) return;
    current.current = d;
    onDir(d);
  };

  const track = (clientX: number, clientY: number) => {
    const o = origin.current;
    const dx = clientX - o.x;
    const dy = clientY - o.y;
    const dead = JOYSTICK_BASE_PX * DEAD_ZONE_RATIO;
    if (Math.hypot(dx, dy) >= dead) o.left = true;
    emit(padDirection(dx, dy, dead));
    const max = JOYSTICK_BASE_PX / 2;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, max / len);
    setKnob((prev) => (prev ? { ...prev, kx: dx * k, ky: dy * k } : prev));
  };

  // 포인터 캡처가 안 되어도 층 밖에서 뗀 손가락을 놓치지 않도록 window에서도 듣는다
  const winCleanup = useRef<(() => void) | null>(null);

  const releaseId = (pointerId: number, clientX?: number, clientY?: number, isUp = false) => {
    if (activeId.current !== pointerId) return;
    activeId.current = null;
    winCleanup.current?.();
    winCleanup.current = null;
    emit(null);
    setKnob(null);
    const o = origin.current;
    if (isUp && !o.left && clientX !== undefined && clientY !== undefined && performance.now() - o.t < TAP_CLOSE_MS) {
      onTap(clientX, clientY);
    }
  };

  useEffect(
    () => () => {
      winCleanup.current?.();
      winCleanup.current = null;
    },
    [],
  );

  return (
    <div
      ref={layerRef}
      className="joystick"
      data-testid="joystick-layer"
      onPointerDown={(e) => {
        if (activeId.current !== null) return;
        activeId.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 캡처를 못 해도 계속 */
        }
        const id = e.pointerId;
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId === id) releaseId(id, ev.clientX, ev.clientY, ev.type === 'pointerup');
        };
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        winCleanup.current = () => {
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
        };
        e.preventDefault();
        const r = layerRef.current!.getBoundingClientRect();
        origin.current = { x: e.clientX, y: e.clientY, t: performance.now(), left: false };
        setKnob({ bx: e.clientX - r.left, by: e.clientY - r.top, kx: 0, ky: 0 });
      }}
      onPointerMove={(e) => {
        if (activeId.current === e.pointerId) track(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => releaseId(e.pointerId, e.clientX, e.clientY, true)}
      onPointerCancel={(e) => releaseId(e.pointerId)}
      onLostPointerCapture={(e) => releaseId(e.pointerId)}
    >
      {knob && (
        <div
          className="joystick__base"
          role="img"
          aria-label="조이스틱"
          style={{ left: knob.bx - JOYSTICK_BASE_PX / 2, top: knob.by - JOYSTICK_BASE_PX / 2, width: JOYSTICK_BASE_PX, height: JOYSTICK_BASE_PX }}
        >
          <div className="joystick__knob" style={{ transform: `translate(calc(-50% + ${knob.kx}px), calc(-50% + ${knob.ky}px))` }} />
        </div>
      )}
    </div>
  );
}

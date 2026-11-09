import { useEffect, useRef } from 'react';
import type { Dir } from '../domain/field/movement';
import { padDirection } from './padDirection';

interface Props {
  onDir(dir: Dir | null): void;
  onA(): void;
  onB(): void;
}

const DEAD_ZONE_RATIO = 0.18; // 패드 폭 대비 가운데 안 눌리는 영역

/** 화면 십자 패드 + A·B 버튼. 십자는 손가락을 끌어도 방향이 따라간다. */
export function TouchPad({ onDir, onA, onB }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const current = useRef<Dir | null>(null);

  const emit = (d: Dir | null) => {
    if (current.current === d) return;
    current.current = d;
    onDir(d);
  };

  const dirFromEvent = (e: React.PointerEvent) => {
    const r = padRef.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return padDirection(dx, dy, r.width * DEAD_ZONE_RATIO);
  };

  // 포인터 캡처가 안 되어도 패드 밖에서 뗀 손가락을 놓치지 않도록 window에서도 듣는다
  const winCleanup = useRef<(() => void) | null>(null);

  const releaseId = (pointerId: number) => {
    if (activeId.current !== pointerId) return;
    activeId.current = null;
    winCleanup.current?.();
    winCleanup.current = null;
    emit(null);
  };
  const release = (e: React.PointerEvent) => releaseId(e.pointerId);

  useEffect(
    () => () => {
      winCleanup.current?.();
      winCleanup.current = null;
    },
    [],
  );

  return (
    <div className="fpad">
      <div
        ref={padRef}
        className="fpad__cross"
        role="group"
        aria-label="십자 패드"
        onPointerDown={(e) => {
          if (activeId.current !== null) return;
          activeId.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* 캡처를 못 해도 계속 */
          }
          const id = e.pointerId;
          const onWin = (ev: PointerEvent) => releaseId(ev.pointerId === id ? id : -1);
          window.addEventListener('pointerup', onWin);
          window.addEventListener('pointercancel', onWin);
          winCleanup.current = () => {
            window.removeEventListener('pointerup', onWin);
            window.removeEventListener('pointercancel', onWin);
          };
          e.preventDefault();
          emit(dirFromEvent(e));
        }}
        onPointerMove={(e) => {
          if (activeId.current === e.pointerId) emit(dirFromEvent(e));
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <span className="fpad__arrow fpad__arrow--up">▲</span>
        <span className="fpad__arrow fpad__arrow--down">▼</span>
        <span className="fpad__arrow fpad__arrow--left">◀</span>
        <span className="fpad__arrow fpad__arrow--right">▶</span>
      </div>
      <div className="fpad__ab">
        <button
          type="button"
          className="fpad__btn fpad__btn--b"
          aria-label="B 버튼"
          onPointerDown={(e) => {
            e.preventDefault();
            onB();
          }}
        >
          B
        </button>
        <button
          type="button"
          className="fpad__btn fpad__btn--a"
          aria-label="A 버튼"
          onPointerDown={(e) => {
            e.preventDefault();
            onA();
          }}
        >
          A
        </button>
      </div>
    </div>
  );
}

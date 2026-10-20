/** 셈 연습 오답 힌트: 덧셈·뺄셈은 자리별 계산, 보수는 10칸·5칸 틀 */
import { type ArithQuestion, arithSteps } from '../domain/arith';

/** 주어진 수만큼 칠하고, 남은 칸(=답)을 빛나게 */
function FrameHint({ whole, given }: { whole: number; given: number }) {
  const rows = whole === 10 ? [0, 5] : [0];
  return (
    <div className="frame" aria-label={`${whole}칸 중 ${given}칸이 차 있어요`}>
      {rows.map((start) => (
        <div key={start} className="frame__row">
          {Array.from({ length: 5 }, (_, i) => {
            const n = start + i;
            const filled = n < given;
            return (
              <span key={n} className={`frame__cell ${filled ? '' : 'frame__cell--empty'}`} style={{ animationDelay: `${n * 0.08}s` }}>
                {filled ? <span className="dot" /> : n - given + 1}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ArithHintPanel({ question }: { question: ArithQuestion }) {
  const { kind, op, a, b, result } = question;
  const isComplement = kind === 'comp10' || kind === 'comp5';
  const given = question.display.a ?? question.display.b ?? 0;
  return (
    <div className="hint">
      <div className="hint__equation">
        {isComplement ? (
          <>
            {question.display.a === null ? <strong>{a}</strong> : a} + {question.display.b === null ? <strong>{b}</strong> : b} = {result}
          </>
        ) : (
          <>
            {a} {op} {b} = <strong>{result}</strong>
          </>
        )}
      </div>
      {isComplement ? (
        <>
          <FrameHint whole={result} given={given} />
          <p className="frame__say">
            {given}에서 {result}{result === 10 ? '이' : '가'} 되려면 빈칸 <strong>{result - given}</strong>칸이 더 필요해요
          </p>
        </>
      ) : (
        <ol className="arith-steps">
          {arithSteps(question).map((s, i) => (
            <li key={i} className="arith-steps__step" style={{ animationDelay: `${i * 0.3}s` }}>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

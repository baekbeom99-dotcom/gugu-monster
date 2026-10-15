/** 오답 힌트 — 설계서 3-6. 점 배열 / 나누어 곱하기 / 규칙 카드 / 뛰어 세기 수직선 */
import type { Fact } from '../domain/facts';
import type { QuestionType } from '../domain/questionGen';

export type HintKind = 'rule' | 'sequence' | 'split' | 'dots';

export function hintKindFor(fact: Fact, type: QuestionType): HintKind {
  if (fact.isRule) return 'rule';
  if (type === 'sequence') return 'sequence';
  if (fact.isChallenge) return 'split';
  return 'dots';
}

const RULES: Record<number, { title: string; example: (a: number) => string[] }> = {
  0: { title: '0을 곱하면 항상 0이 돼요', example: (a) => [`${a} × 0 = 0`, `0 × ${a} = 0`] },
  1: { title: '1을 곱하면 그대로예요', example: (a) => [`${a} × 1 = ${a}`, `1 × ${a} = ${a}`] },
  10: { title: '10을 곱하면 끝에 0을 붙여요', example: (a) => [`${a} × 10 = ${a}0`, `3 × 10 = 30`] },
};

/** a씩 b묶음: 한 줄에 a개, b줄. 줄마다 뛰어 세기 숫자. */
function DotsHint({ a, b }: { a: number; b: number }) {
  return (
    <div className="dots" aria-label={`${a}씩 ${b}묶음`}>
      {Array.from({ length: b }, (_, row) => (
        <div key={row} className="dots__row" style={{ animationDelay: `${row * 0.22}s` }}>
          <span className="dots__group">
            {Array.from({ length: a }, (_, i) => (
              <span key={i} className="dot" />
            ))}
          </span>
          <span className="dots__count">{a * (row + 1)}</span>
        </div>
      ))}
    </div>
  );
}

function SplitHint({ a, b }: { a: number; b: number }) {
  const rest = a - 10;
  return (
    <div className="split">
      <div className="split__card split__card--ten">
        10 × {b} = <strong>{10 * b}</strong>
      </div>
      <div className="split__plus">+</div>
      <div className="split__card split__card--rest">
        {rest} × {b} = <strong>{rest * b}</strong>
      </div>
      <div className="split__sum">
        {a} × {b} = {10 * b} + {rest * b} = <strong>{a * b}</strong>
      </div>
    </div>
  );
}

function SequenceHint({ a, b }: { a: number; b: number }) {
  return (
    <div className="hop" aria-label={`${a}씩 뛰어 세기`}>
      {Array.from({ length: b }, (_, i) => (
        <span key={i} className={`hop__stone ${i === b - 1 ? 'hop__stone--goal' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
          {i > 0 && <span className="hop__arc">+{a}</span>}
          {a * (i + 1)}
        </span>
      ))}
    </div>
  );
}

export function HintPanel({ fact, type }: { fact: Fact; type: QuestionType }) {
  const kind = hintKindFor(fact, type);
  return (
    <div className="hint">
      {kind === 'rule' ? (
        <div className="rule-card">
          <div className="rule-card__title">{RULES[fact.b].title}</div>
          {RULES[fact.b].example(fact.a).map((ex) => (
            <div key={ex} className="rule-card__ex">
              {ex}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="hint__equation">
            {fact.a} × {fact.b} = <strong>{fact.product}</strong>
          </div>
          {kind === 'dots' && <DotsHint a={fact.a} b={fact.b} />}
          {kind === 'split' && <SplitHint a={fact.a} b={fact.b} />}
          {kind === 'sequence' && <SequenceHint a={fact.a} b={fact.b} />}
        </>
      )}
    </div>
  );
}

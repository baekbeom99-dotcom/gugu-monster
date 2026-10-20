import type { ArithDisplay } from '../domain/arith';
import type { QuestionDisplay } from '../domain/questionGen';

interface Props {
  /** 구구단 문제 또는 셈 연습(덧셈·뺄셈·보수) 문제 */
  display: QuestionDisplay | ArithDisplay;
  /** 빈칸에 보여줄 값 (키패드 입력 중이거나 힌트에서 정답 공개) */
  fill?: string;
  reveal?: boolean;
}

function Blank({ fill, reveal }: { fill?: string; reveal?: boolean }) {
  return (
    <span className={`blank ${fill ? 'blank--filled' : ''} ${reveal ? 'blank--reveal' : ''}`} aria-label="빈칸">
      {fill || '?'}
    </span>
  );
}

function Cell({ value, fill, reveal }: { value: number | null; fill?: string; reveal?: boolean }) {
  return value === null ? <Blank fill={fill} reveal={reveal} /> : <span>{value}</span>;
}

export function QuestionView({ display, fill, reveal }: Props) {
  switch (display.kind) {
    case 'arith':
      return (
        <div className="question">
          <Cell value={display.a} fill={fill} reveal={reveal} />
          <span className="op">{display.op}</span>
          <Cell value={display.b} fill={fill} reveal={reveal} />
          <span className="op">=</span>
          <Cell value={display.result} fill={fill} reveal={reveal} />
        </div>
      );
    case 'equation':
      return (
        <div className="question">
          <Cell value={display.a} fill={fill} reveal={reveal} />
          <span className="op">×</span>
          <Cell value={display.b} fill={fill} reveal={reveal} />
          <span className="op">=</span>
          <Cell value={display.result} fill={fill} reveal={reveal} />
        </div>
      );
    case 'commutative':
      return (
        <div className="question question--stack">
          <div className="question__given">
            {display.given.a} × {display.given.b} = {display.given.result} 이면
          </div>
          <div className="question">
            <span>{display.ask.a}</span>
            <span className="op">×</span>
            <span>{display.ask.b}</span>
            <span className="op">=</span>
            <Blank fill={fill} reveal={reveal} />
          </div>
        </div>
      );
    case 'sequence':
      return (
        <div className="question question--sequence">
          {display.terms.map((t, i) => (
            <span key={i} className="seq-term">
              <Cell value={t} fill={fill} reveal={reveal} />
              {i < display.terms.length - 1 && <span className="seq-comma">,</span>}
            </span>
          ))}
        </div>
      );
  }
}

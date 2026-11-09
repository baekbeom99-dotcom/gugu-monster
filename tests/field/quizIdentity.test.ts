import { describe, expect, it } from "vitest";
import { FACTS, getFact } from "../../src/domain/facts";
import { initialFactStats } from "../../src/domain/mastery";
import { seededRng } from "../../src/domain/random";
import { type LearnerSnapshot, planExploration } from "../../src/domain/scheduler";
import { generateQuestion, type QuestionType } from "../../src/domain/questionGen";

/** 필드 옵션을 넣기 전 코드에서 뽑아 둔 값. 퀴즈 모험 출제가 바뀌지 않았는지 지킨다. */
const NOW = new Date(2026, 9, 15, 10).getTime();
const SEEDS = [1, 2, 3, 42];

function mixed(): LearnerSnapshot {
  const facts = initialFactStats();
  for (const f of FACTS) {
    const s = facts[f.id];
    const k = (f.a * 7 + f.b * 3) % 6;
    s.box = k as 0;
    s.dueAt = k === 0 ? null : NOW - ((f.a + f.b) % 5) * 86400000;
    if (k === 1) {
      s.lastWrongAt = NOW - 1000;
      s.dueAt = NOW - 1000;
    }
  }
  return { facts, danRecent: { 3: [true, false, false], 7: [false, false, true, true] }, challengeUnlocked: true, boosted: { "6x7": 2, "9x4": 1 } };
}
const fresh = (): LearnerSnapshot => ({ facts: initialFactStats(), danRecent: {}, challengeUnlocked: false });
const show = (l: LearnerSnapshot, seed: number) =>
  planExploration(l, { kind: "recommended" }, NOW, seededRng(seed)).map((p) => `${p.factId}/${p.type}/${p.isConfidence ? 1 : 0}`);

const FRESH = {"1":["7x0/commutative/0","7x8/product/0","4x2/product/0","9x8/product/0","6x3/product/0","9x7/product/0","6x9/sequence/0","5x3/product/0","2x0/product/0"],"2":["7x0/product/0","6x0/commutative/0","4x9/product/0","4x6/product/0","7x9/product/0","4x2/product/0","8x5/product/0","9x0/missingSecond/0","5x10/product/0"],"3":["8x0/missingSecond/0","4x2/product/0","5x9/product/0","2x3/product/0","7x8/product/0","5x7/sequence/0","3x4/product/0","2x1/product/0","6x0/missingSecond/0"],"42":["7x0/product/0","3x1/product/0","6x2/product/0","5x6/product/0","6x8/sequence/0","8x9/product/0","7x1/missingFirst/0","4x1/missingSecond/0","9x0/missingSecond/0"]} as Record<string, string[]>;
const MIXED = {"1":["13x9/commutative/1","7x10/product/0","7x8/product/0","6x8/product/0","13x5/missingFirst/1","7x6/product/0","4x9/sequence/0","4x1/product/0","4x4/product/1"],"2":["7x1/product/1","6x7/commutative/0","7x0/product/0","6x2/product/0","12x9/commutative/1","12x2/product/0","9x4/product/0","4x8/missingSecond/0","7x9/missingFirst/1"],"3":["2x7/missingSecond/1","9x4/product/0","4x3/product/0","6x8/product/0","9x0/missingSecond/1","7x4/missingSecond/0","4x7/sequence/0","3x6/missingFirst/0","6x3/missingSecond/1"],"42":["8x3/missingFirst/1","4x7/product/0","7x2/missingSecond/0","12x6/sequence/0","3x8/missingFirst/1","7x8/product/0","13x4/missingFirst/0","8x2/missingSecond/0","6x9/missingSecond/1"]} as Record<string, string[]>;
const QUESTIONS = ["7x8/product/56/49,64,56,15","7x8/missingFirst/7/9,6,7,5","7x8/missingSecond/8/9,6,8,10","7x8/commutative/56/56,49,15,63","7x8/sequence/56/63,58,57,56","12x7/product/84/74,104,64,84","12x7/missingFirst/12/13,11,12,10","12x7/missingSecond/7/7,8,6,9","12x7/commutative/84/104,74,94,84","12x7/sequence/84/94,84,64,74","3x0/product/0/0,1,3,10","3x0/missingSecond/0/0,2,1,3","3x0/commutative/0/10,1,3,0","6x10/product/60/60,66,6,50","6x10/missingFirst/6/4,6,7,5","6x10/missingSecond/10/10,7,8,9","6x10/commutative/60/6,60,70,16","6x10/sequence/60/60,59,54,61","9x9/product/81/90,18,72,81","9x9/missingFirst/9/9,11,8,10","9x9/missingSecond/9/10,9,8,7","9x9/commutative/81/81,72,18,90","9x9/sequence/81/82,83,81,90"];

describe("퀴즈 모험 동일성 (옵션 추가 전 출력과 같다)", () => {
  it("처음 학습자의 추천 탐험", () => {
    for (const seed of SEEDS) expect(show(fresh(), seed)).toEqual(FRESH[seed]);
  });
  it("기록이 있는 학습자의 추천 탐험", () => {
    for (const seed of SEEDS) expect(show(mixed(), seed)).toEqual(MIXED[seed]);
  });
  it("generateQuestion 기본 호출(보기 4개)은 같은 난수에서 같은 문제", () => {
    const types: QuestionType[] = ["product", "missingFirst", "missingSecond", "commutative", "sequence"];
    const rng = seededRng(7);
    const out: string[] = [];
    for (const id of ["7x8", "12x7", "3x0", "6x10", "9x9"] as const)
      for (const t of types) {
        const f = getFact(id);
        if ((t === "missingFirst" && f.b === 0) || (t === "sequence" && f.b < 1)) continue;
        const q = generateQuestion(rng, f, t);
        out.push(`${id}/${t}/${q.answer}/${q.choices.join(",")}`);
      }
    expect(out).toEqual(QUESTIONS);
  });
});

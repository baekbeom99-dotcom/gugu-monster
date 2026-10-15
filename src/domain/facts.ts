/** 곱셈 사실 정의 — 설계서 3-1 */

export const BASE_DANS = [2, 3, 4, 5, 6, 7, 8, 9] as const;
export const CHALLENGE_DANS = [12, 13] as const;
export const ALL_DANS = [...BASE_DANS, ...CHALLENGE_DANS] as const;
export const MULTIPLIERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** 규칙으로 풀 수 있는 곱하는 수 (0을 곱하면 0, 1을 곱하면 그대로, 10을 곱하면 끝에 0) */
export const RULE_MULTIPLIERS: readonly Multiplier[] = [0, 1, 10];

export type Dan = (typeof ALL_DANS)[number];
export type Multiplier = (typeof MULTIPLIERS)[number];
export type FactId = `${Dan}x${Multiplier}`;

export interface Fact {
  id: FactId;
  /** 단 (곱해지는 수) */
  a: Dan;
  /** 곱하는 수 */
  b: Multiplier;
  product: number;
  isRule: boolean;
  isChallenge: boolean;
}

export const MAX_PRODUCT = 13 * 10;

export function factId(a: Dan, b: Multiplier): FactId {
  return `${a}x${b}`;
}

export function isChallengeDan(dan: Dan): boolean {
  return (CHALLENGE_DANS as readonly number[]).includes(dan);
}

export const FACTS: readonly Fact[] = ALL_DANS.flatMap((a) =>
  MULTIPLIERS.map(
    (b): Fact => ({
      id: factId(a, b),
      a,
      b,
      product: a * b,
      isRule: RULE_MULTIPLIERS.includes(b),
      isChallenge: isChallengeDan(a),
    }),
  ),
);

const FACT_BY_ID = new Map<FactId, Fact>(FACTS.map((f) => [f.id, f]));

export function getFact(id: FactId): Fact {
  const fact = FACT_BY_ID.get(id);
  if (!fact) throw new Error(`알 수 없는 곱셈 사실: ${id}`);
  return fact;
}

export function factsOfDan(dan: Dan): Fact[] {
  return FACTS.filter((f) => f.a === dan);
}

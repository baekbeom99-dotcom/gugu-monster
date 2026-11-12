/** 지금 함께 다니는(싸우는) 구구몬 고르기 — 필드 만남과 전투가 같은 종을 쓰도록 한곳에 둔다 */
import { STARTERS, type SpeciesId } from '../domain/field/creatures';

/** 동행이 없거나 잡지 않은 종일 때(옛 저장 등): 처음 잡은 종, 그것도 없으면 첫 후보 */
export function pickCompanion(s: { field: { companion: SpeciesId | null; species: Partial<Record<SpeciesId, unknown>> } }): SpeciesId {
  const c = s.field.companion;
  if (c && s.field.species[c]) return c;
  return (Object.keys(s.field.species)[0] as SpeciesId | undefined) ?? STARTERS[0];
}

/** 개발 전용 그림 검수 화면 — 설계서 13-5. 배포 빌드에는 라우트가 없다. */
import { DAN_COLORS } from '../art/colors';
import { type MonsterMood, MonsterSprite } from '../art/MonsterSprite';
import { HatIcon, hatArtOf } from '../art/HatSprite';
import { EggSprite, type PetExpression, PetSprite } from '../art/PetSprite';
import { defaultCatalog } from '../data/defaultCatalog';
import { MONSTER_KINDS } from '../domain/battle';
import { ALL_DANS } from '../domain/facts';
import { SPECIES } from '../domain/pet';

const MOODS: MonsterMood[] = ['idle', 'hit', 'happy', 'sleep'];
const EXPRESSIONS: PetExpression[] = ['idle', 'happy', 'excited', 'cheer', 'sleep', 'request', 'eat', 'sick', 'angry'];
const row = { display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'flex-end' } as const;

export function DevGallery() {
  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <h1>모자</h1>
      <div style={row}>
        {defaultCatalog()
          .items.filter((i) => i.category === 'hat')
          .map((i) => (
            <HatIcon key={i.id} art={hatArtOf(i)!} size={60} />
          ))}
      </div>
      {SPECIES.map((species) => (
        <div key={species} style={row}>
          {(['baby', 'child', 'adult'] as const).flatMap((stage) =>
            ['hat_ribbon', 'hat_straw', 'hat_wizard', 'hat_master_7'].map((id) => (
              <PetSprite key={stage + id} species={species} stage={stage} size={80} hat={hatArtOf(defaultCatalog().items.find((i) => i.id === id))} />
            )),
          )}
        </div>
      ))}
      <h1>펫 갤러리</h1>
      {SPECIES.map((species) => (
        <section key={species}>
          <h2>{species}</h2>
          <div style={row}>
            {([0, 1, 2, 3] as const).map((c) => (
              <EggSprite key={c} species={species} cracks={c} size={90} />
            ))}
          </div>
          <div style={row}>
            {(['baby', 'child', 'adult'] as const).map((stage) => (
              <PetSprite key={stage} species={species} stage={stage} size={130} />
            ))}
          </div>
          <div style={row}>
            {EXPRESSIONS.map((e) => (
              <PetSprite key={e} species={species} stage="child" expression={e} size={90} />
            ))}
          </div>
        </section>
      ))}

      <h1>몬스터 갤러리</h1>
      {MONSTER_KINDS.map((kind) => (
        <section key={kind}>
          <h2>{kind}</h2>
          <div style={row}>
            {MOODS.map((mood) => (
              <MonsterSprite key={mood} kind={kind} mood={mood} color={DAN_COLORS[7]} size={96} />
            ))}
            <MonsterSprite kind={kind} mood="idle" color={DAN_COLORS[12]} golden size={96} />
          </div>
          <div style={row}>
            {ALL_DANS.map((d) => (
              <MonsterSprite key={d} kind={kind} mood="idle" color={DAN_COLORS[d]} size={56} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import { CAPSULE_NAMES, CAPSULE_TYPES } from '../../domain/field/capsules';
import { SPECIES } from '../../domain/field/creatures';
import { COMPANION_MAX_HP } from '../../domain/field/tuning';
import { useGameStore } from '../../store/useGameStore';
import { CapsuleBall } from '../art/CapsuleBall';
import { pickCompanion } from '../companion';
import { HpBar } from '../HpBar';

/** 필드 왼쪽 위 알약: 캡슐 네 가지 수, 도감 n/11, 동행 체력. 저장 값이 바뀔 때만 다시 그린다 */
export function FieldHud() {
  const capsules = useGameStore((s) => s.field.capsules);
  const caught = useGameStore((s) => Object.keys(s.field.species).length);
  const hp = useGameStore((s) => s.field.species[pickCompanion(s)]?.hp ?? COMPANION_MAX_HP);
  return (
    <div className="fieldhud" role="group" aria-label="필드 정보">
      <div className="fieldhud__row">
        {CAPSULE_TYPES.map((t) => (
          <span key={t} className="fieldhud__cap" role="img" aria-label={`${CAPSULE_NAMES[t]} ${capsules[t]}개`}>
            <CapsuleBall type={t} size={18} />
            <span>{capsules[t]}</span>
          </span>
        ))}
      </div>
      <div className="fieldhud__row">
        <span className="fieldhud__dex">
          도감 {caught}/{SPECIES.length}
        </span>
        <HpBar hp={hp} label={`동행 체력 ${hp}`} />
      </div>
    </div>
  );
}

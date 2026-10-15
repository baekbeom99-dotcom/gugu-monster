/** 축하 폭죽 (CSS만으로). 단 마스터·진화·부화·도전 모드 해금에 쓴다. */
const COLORS = ['#ffe14d', '#ff8fc1', '#6fd3ff', '#b8f25c', '#ffa94d', '#c9b6ff'];

export function Confetti({ pieces = 28 }: { pieces?: number }) {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: pieces }, (_, i) => (
        <span
          key={i}
          className="confetti__piece"
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 7) * 0.08}s`,
            // 조각마다 떨어지는 거리·회전을 조금씩 다르게
            ['--fall' as string]: `${55 + ((i * 13) % 35)}vh`,
            ['--spin' as string]: `${(i % 2 ? 1 : -1) * (200 + ((i * 47) % 300))}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** 픽셀 그림(글자 배열, 16×16 또는 32×32)을 또렷한 SVG로 그린다 (타이틀 같은 화면용) */
import { ART_SIZE, type PixelArt, TRANSPARENT } from './pixelArt';

export function PixelSprite({ art, size, className }: { art: PixelArt; size: number; className?: string }) {
  const cols = art.rows[0]?.length || ART_SIZE;
  const rowsN = art.rows.length || ART_SIZE;
  const rects: JSX.Element[] = [];
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== TRANSPARENT) rects.push(<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={art.palette[ch]} />);
    }
  });
  return (
    <svg
      viewBox={`0 0 ${cols} ${rowsN}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      {rects}
    </svg>
  );
}

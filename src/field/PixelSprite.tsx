/** 픽셀 그림(16×16 글자 배열)을 또렷한 SVG로 그린다 (타이틀 같은 화면용) */
import { ART_SIZE, type PixelArt, TRANSPARENT } from './pixelArt';

export function PixelSprite({ art, size, className }: { art: PixelArt; size: number; className?: string }) {
  const rects: JSX.Element[] = [];
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== TRANSPARENT) rects.push(<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={art.palette[ch]} />);
    }
  });
  return (
    <svg
      viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}
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

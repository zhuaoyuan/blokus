import { PIECE_ORIENTATIONS } from "../game/pieces";

interface PieceMiniProps {
  pieceId: string;
  orientIndex: number;
  cellPx: number;
  fill: string;
}

export function PieceMini({
  pieceId,
  orientIndex,
  cellPx,
  fill,
}: PieceMiniProps) {
  const orients = PIECE_ORIENTATIONS[pieceId];
  const shape = orients[orientIndex] ?? orients[0]!;
  const maxX = Math.max(...shape.map((c) => c.x));
  const maxY = Math.max(...shape.map((c) => c.y));
  const w = maxX + 1;
  const h = maxY + 1;
  const cells = new Set(shape.map((c) => `${c.x},${c.y}`));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${w}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${h}, ${cellPx}px)`,
        gap: 1,
      }}
    >
      {Array.from({ length: h * w }, (_, i) => {
        const x = i % w;
        const y = Math.floor(i / w);
        const on = cells.has(`${x},${y}`);
        return (
          <div
            key={i}
            style={{
              borderRadius: 2,
              background: on ? fill : "transparent",
              border: on ? "none" : "1px solid transparent",
            }}
          />
        );
      })}
    </div>
  );
}

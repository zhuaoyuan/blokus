import type { Board } from "../game/rules";
import type { ColorId, Point, Variant } from "../game/types";
import { boardSize, cornerForColor, duoStartCell } from "../game/types";

const DISPLAY_COLORS: Record<ColorId, string> = {
  0: "var(--c0)",
  1: "var(--c1)",
  2: "var(--c2)",
  3: "var(--c3)",
};

const DUO_DISPLAY: Record<ColorId, string> = {
  0: "var(--duo0)",
  1: "var(--duo1)",
  2: "var(--c2)",
  3: "var(--c3)",
};

function cellBg(
  variant: Variant,
  board: Board,
  x: number,
  y: number,
): string | undefined {
  const c = board[y][x];
  if (c === null) return undefined;
  const pal = variant === "duo" ? DUO_DISPLAY : DISPLAY_COLORS;
  return pal[c];
}

function isCornerMarker(variant: Variant, x: number, y: number): boolean {
  if (variant === "duo") return false;
  const { w, h } = boardSize(variant);
  const corners: ColorId[] = [0, 1, 2, 3];
  for (const c of corners) {
    const p = cornerForColor(c, w, h);
    if (p.x === x && p.y === y) return true;
  }
  return false;
}

function isDuoStart(variant: Variant, x: number, y: number): boolean {
  if (variant !== "duo") return false;
  const a = duoStartCell(0);
  const b = duoStartCell(1);
  return (x === a.x && y === a.y) || (x === b.x && y === b.y);
}

interface GameBoardProps {
  variant: Variant;
  board: Board;
  cellSize: number;
  previewCells: Point[] | null;
  previewInvalid: boolean;
  onHover: (p: Point | null) => void;
  onClickCell: (p: Point) => void;
}

export function GameBoard({
  variant,
  board,
  cellSize,
  previewCells,
  previewInvalid,
  onHover,
  onClickCell,
}: GameBoardProps) {
  const { w, h } = boardSize(variant);
  const prevSet =
    previewCells && new Set(previewCells.map((p) => `${p.x},${p.y}`));

  return (
    <div
      className="board-grid"
      style={{
        gridTemplateColumns: `repeat(${w}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${h}, ${cellSize}px)`,
        ["--cell-size" as string]: `${cellSize}px`,
      }}
      onMouseLeave={() => onHover(null)}
    >
      {Array.from({ length: h * w }, (_, i) => {
        const x = i % w;
        const y = Math.floor(i / w);
        const filled = cellBg(variant, board, x, y);
        const isPrev = prevSet?.has(`${x},${y}`) ?? false;
        const onBoard = board[y][x] !== null;
        let cls = "board-cell";
        if (!onBoard && isPrev) {
          cls += previewInvalid ? " preview preview-invalid" : " preview";
        }
        const corner = !onBoard && isCornerMarker(variant, x, y);
        const duoS = !onBoard && isDuoStart(variant, x, y);

        return (
          <div
            key={i}
            className={cls}
            style={{
              background: filled ?? undefined,
              boxShadow: corner
                ? "inset 0 0 0 2px rgba(255,255,255,0.12)"
                : duoS
                  ? "inset 0 0 0 2px rgba(255,255,255,0.18)"
                  : undefined,
            }}
            onMouseEnter={() => onHover({ x, y })}
            onClick={() => onClickCell({ x, y })}
          />
        );
      })}
    </div>
  );
}

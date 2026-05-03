import type { ColorId, Point, Variant } from "./types";
import { boardSize, colorsInPlay, cornerForColor, duoStartCell } from "./types";

export type Board = (ColorId | null)[][];

export function emptyBoard(variant: Variant): Board {
  const { w, h } = boardSize(variant);
  return Array.from({ length: h }, () => Array<ColorId | null>(w).fill(null));
}

function cellKey(p: Point): string {
  return `${p.x},${p.y}`;
}

function hasColorOnBoard(board: Board, color: ColorId): boolean {
  for (const row of board) {
    for (const c of row) {
      if (c === color) return true;
    }
  }
  return false;
}

export function isValidPlacement(
  variant: Variant,
  board: Board,
  color: ColorId,
  cells: Point[],
): boolean {
  const { w, h } = boardSize(variant);
  const occ = new Set(cells.map(cellKey));

  for (const p of cells) {
    if (p.x < 0 || p.x >= w || p.y < 0 || p.y >= h) return false;
    if (board[p.y][p.x] !== null) return false;
  }

  const firstForColor = !hasColorOnBoard(board, color);

  if (firstForColor) {
    if (variant === "duo") {
      const st = duoStartCell(color);
      if (!cells.some((p) => p.x === st.x && p.y === st.y)) return false;
    } else {
      const corner = cornerForColor(color, w, h);
      if (!cells.some((p) => p.x === corner.x && p.y === corner.y)) return false;
    }
  } else {
    let diagTouch = false;
    for (const { x, y } of cells) {
      for (const [dx, dy] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (board[ny][nx] === color) diagTouch = true;
      }
    }
    if (!diagTouch) return false;
  }

  for (const { x, y } of cells) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (occ.has(cellKey({ x: nx, y: ny }))) continue;
      if (board[ny][nx] === color) return false;
    }
  }

  return true;
}

/** 当前颜色是否至少存在一手合法棋（用于 pass / 终局） */
export function colorHasAnyLegalMove(
  variant: Variant,
  board: Board,
  color: ColorId,
  hand: ReadonlySet<string>,
  pieceOrientations: Readonly<Record<string, Point[][]>>,
): boolean {
  const { w, h } = boardSize(variant);
  for (const pieceId of hand) {
    const orients = pieceOrientations[pieceId];
    for (const shape of orients) {
      const maxX = Math.max(...shape.map((c) => c.x));
      const maxY = Math.max(...shape.map((c) => c.y));
      for (let y = 0; y < h - maxY; y++) {
        for (let x = 0; x < w - maxX; x++) {
          const cells = shape.map((c) => ({ x: c.x + x, y: c.y + y }));
          if (isValidPlacement(variant, board, color, cells)) return true;
        }
      }
    }
  }
  return false;
}

export function advanceTurnColor(variant: Variant, current: ColorId): ColorId {
  const order = colorsInPlay(variant);
  const i = order.indexOf(current);
  return order[(i + 1) % order.length]!;
}

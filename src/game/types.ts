export type Variant = "classic2p" | "duo";

/** 0 蓝 1 黄 2 红 3 绿；Duo 仅使用 0、1（紫 / 橙） */
export type ColorId = 0 | 1 | 2 | 3;

export interface Point {
  x: number;
  y: number;
}

export interface Placement {
  color: ColorId;
  pieceId: string;
  /** 绝对棋盘坐标 */
  cells: Point[];
}

export const COLOR_NAMES: Record<ColorId, string> = {
  0: "蓝",
  1: "黄",
  2: "红",
  3: "绿",
};

export function displayColorName(variant: Variant, c: ColorId): string {
  if (variant === "duo") return c === 0 ? "紫" : "橙";
  return COLOR_NAMES[c];
}

export function colorsInPlay(variant: Variant): ColorId[] {
  return variant === "duo" ? [0, 1] : [0, 1, 2, 3];
}

export function colorToPlayer(variant: Variant, c: ColorId): 0 | 1 {
  if (variant === "duo") return c === 0 ? 0 : 1;
  if (c === 0 || c === 2) return 0;
  return 1;
}

export function boardSize(variant: Variant): { w: number; h: number } {
  return variant === "duo" ? { w: 14, h: 14 } : { w: 20, h: 20 };
}

/** 经典四角（与 Pentobi 一致） */
export function cornerForColor(c: ColorId, w: number, h: number): Point {
  const wm = w - 1;
  const hm = h - 1;
  switch (c) {
    case 0:
      return { x: 0, y: 0 };
    case 1:
      return { x: wm, y: 0 };
    case 2:
      return { x: wm, y: hm };
    case 3:
      return { x: 0, y: hm };
  }
}

/** Duo 起始格（Pentobi StartingPoints.cpp） */
export function duoStartCell(c: ColorId): Point {
  return c === 0 ? { x: 4, y: 4 } : { x: 9, y: 9 };
}

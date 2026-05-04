import { allOrientations, flipShapeHorizontalNormalized, shapeKey } from "./transforms";
import type { Point } from "./types";

/** 相对坐标，已归一化到 min x=min y=0 */
export type PieceShape = Point[];

/** 21 种自由多格骨牌（Blokus 标准），名称便于对照 Pentobi */
export const PIECE_DEFS: Record<string, PieceShape> = {
  I1: [{ x: 0, y: 0 }],
  I2: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  I3: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  L3: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  I4: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  O4: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  T4: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
  S4: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  L4: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 0 },
  ],
  F5: [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
  I5: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
  ],
  L5: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
    { x: 1, y: 0 },
  ],
  N5: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
  ],
  P5: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
  ],
  T5: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ],
  U5: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 2, y: 1 },
  ],
  V5: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  W5: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
  X5: [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
  ],
  Y5: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 2, y: 1 },
  ],
  Z5: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
};

export const ALL_PIECE_IDS = Object.keys(PIECE_DEFS);

export function pieceSize(id: string): number {
  return PIECE_DEFS[id].length;
}

/** 每种棋子的全部互不等同朝向 */
export const PIECE_ORIENTATIONS: Record<string, Point[][]> = (() => {
  const m: Record<string, Point[][]> = {};
  for (const id of ALL_PIECE_IDS) {
    m[id] = allOrientations(PIECE_DEFS[id]);
  }
  return m;
})();

/** 当前朝向在水平镜像后对应的朝向下标（对称棋子可能不变） */
export function orientIndexAfterHorizontalFlip(pieceId: string, orientIndex: number): number {
  const orients = PIECE_ORIENTATIONS[pieceId];
  if (!orients?.length) return 0;
  const k = shapeKey(flipShapeHorizontalNormalized(orients[orientIndex]!));
  const i = orients.findIndex((o) => shapeKey(o) === k);
  return i >= 0 ? i : orientIndex;
}

import type { Point } from "./types";

function normalize(cells: Point[]): Point[] {
  if (cells.length === 0) return [];
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function cellsKey(cells: Point[]): string {
  return normalize(cells)
    .map((c) => `${c.x},${c.y}`)
    .join("|");
}

/** 与 `PIECE_ORIENTATIONS` 中形状比对用 */
export function shapeKey(cells: Point[]): string {
  return cellsKey(cells);
}

function rotate90(cells: Point[]): Point[] {
  return cells.map((c) => ({ x: -c.y, y: c.x }));
}

function flipH(cells: Point[]): Point[] {
  return cells.map((c) => ({ x: -c.x, y: c.y }));
}

/** 水平镜像（左右翻转）后归一化到 min x = min y = 0 */
export function flipShapeHorizontalNormalized(cells: Point[]): Point[] {
  return normalize(flipH(cells));
}

/** 去重后的全部朝向（旋转 + 镜像） */
export function allOrientations(base: Point[]): Point[][] {
  const seen = new Set<string>();
  const out: Point[][] = [];
  let cur = base;
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const norm = normalize(cur);
      const k = cellsKey(norm);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(norm);
      }
      cur = rotate90(cur);
    }
    cur = flipH(cur);
  }
  return out;
}

/** 将形状平移到 anchor（形状左上角概念上对齐到 anchor） */
export function translateShape(shape: Point[], anchor: Point): Point[] {
  return shape.map((c) => ({ x: c.x + anchor.x, y: c.y + anchor.y }));
}

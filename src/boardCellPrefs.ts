import type { Variant } from "./game/types";

const STORAGE_KEY = "blokus-board-cell-px";

export const BOARD_CELL_DEFAULTS: Record<Variant, number> = {
  classic2p: 22,
  duo: 28,
};

export const BOARD_CELL_LIMITS: Record<Variant, { min: number; max: number }> = {
  classic2p: { min: 12, max: 44 },
  duo: { min: 14, max: 52 },
};

export function clampBoardCell(variant: Variant, value: number): number {
  const { min, max } = BOARD_CELL_LIMITS[variant];
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function loadBoardCellSizes(): Record<Variant, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...BOARD_CELL_DEFAULTS };
    const o = JSON.parse(raw) as Partial<Record<Variant, number>>;
    return {
      classic2p: clampBoardCell("classic2p", Number(o.classic2p) || BOARD_CELL_DEFAULTS.classic2p),
      duo: clampBoardCell("duo", Number(o.duo) || BOARD_CELL_DEFAULTS.duo),
    };
  } catch {
    return { ...BOARD_CELL_DEFAULTS };
  }
}

export function saveBoardCellSizes(sizes: Record<Variant, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch {
    /* ignore quota / private mode */
  }
}

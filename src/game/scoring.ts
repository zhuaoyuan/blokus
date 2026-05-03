import { ALL_PIECE_IDS, pieceSize } from "./pieces";
import type { ColorId, Variant } from "./types";
import { colorsInPlay } from "./types";

export interface ColorScoreDetail {
  color: ColorId;
  /** 未放置格子数对应的负分之和（每格 -1） */
  penaltyFromRemaining: number;
  allPlacedBonus: number;
  monominoLastBonus: number;
  total: number;
}

export interface GameScoreResult {
  byColor: ColorScoreDetail[];
  /** classic2p: 玩家 0/1 总分；duo 同 byColor 两色 */
  byPlayer: [number, number];
}

function scoreOneColor(
  color: ColorId,
  remainingIds: string[],
  allPlaced: boolean,
  lastWasMonomino: boolean,
): ColorScoreDetail {
  let penaltyFromRemaining = 0;
  for (const id of remainingIds) {
    penaltyFromRemaining -= pieceSize(id);
  }
  const allPlacedBonus = allPlaced ? 15 : 0;
  const monominoLastBonus = allPlaced && lastWasMonomino ? 5 : 0;
  return {
    color,
    penaltyFromRemaining,
    allPlacedBonus,
    monominoLastBonus,
    total:
      penaltyFromRemaining + allPlacedBonus + monominoLastBonus,
  };
}

export function computeScores(
  variant: Variant,
  hands: Readonly<Partial<Record<ColorId, Set<string>>>>,
  lastPieceByColor: Readonly<Partial<Record<ColorId, string>>>,
): GameScoreResult {
  const cols = colorsInPlay(variant);
  const byColor: ColorScoreDetail[] = [];

  for (const c of cols) {
    const rem = [...(hands[c] ?? new Set())];
    const allPlaced = rem.length === 0;
    const lastId = lastPieceByColor[c];
    const lastWasMonomino = lastId === "I1";
    byColor.push(scoreOneColor(c, rem, allPlaced, lastWasMonomino));
  }

  const byPlayer: [number, number] = [0, 0];
  if (variant === "duo") {
    byPlayer[0] = byColor.find((b) => b.color === 0)?.total ?? 0;
    byPlayer[1] = byColor.find((b) => b.color === 1)?.total ?? 0;
  } else {
    for (const d of byColor) {
      const p: 0 | 1 = d.color === 0 || d.color === 2 ? 0 : 1;
      byPlayer[p] += d.total;
    }
  }

  return { byColor, byPlayer };
}

/** 初始每人 21 子 */
export function initialHand(): Set<string> {
  return new Set(ALL_PIECE_IDS);
}

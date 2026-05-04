import type { ColorId, Variant } from "./types";
import { colorsInPlay } from "./types";
import type { Board } from "./rules";
import type { GameSnapshot, GameState, Hands } from "./state";

/** JSON 可传输的快照（hands 为按颜色索引的棋子 id 数组） */
export interface GameSnapshotWire {
  variant: Variant;
  board: Board;
  /** 键为 "0" | "1" | …，值为该颜色仍持有的棋子 id */
  hands: Record<string, string[]>;
  currentColor: ColorId;
  consecutivePasses: number;
  gameOver: boolean;
  lastPieceByColor: Partial<Record<ColorId, string>>;
}

function handsToWire(hands: Hands, variant: Variant): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const c of colorsInPlay(variant)) {
    const set = hands[c];
    out[String(c)] = set ? [...set] : [];
  }
  return out;
}

function wireToHands(
  wireHands: Record<string, string[]>,
  variant: Variant,
): Hands {
  const out: Hands = {};
  for (const c of colorsInPlay(variant)) {
    const arr = wireHands[String(c)];
    out[c] = new Set(Array.isArray(arr) ? arr : []);
  }
  return out;
}

export function snapshotToWire(s: GameSnapshot): GameSnapshotWire {
  return {
    variant: s.variant,
    board: s.board.map((row) => [...row]),
    hands: handsToWire(s.hands, s.variant),
    currentColor: s.currentColor,
    consecutivePasses: s.consecutivePasses,
    gameOver: s.gameOver,
    lastPieceByColor: { ...s.lastPieceByColor },
  };
}

export function wireToSnapshot(w: GameSnapshotWire): GameSnapshot {
  return {
    variant: w.variant,
    board: w.board.map((row) => [...row]),
    hands: wireToHands(w.hands, w.variant),
    currentColor: w.currentColor,
    consecutivePasses: w.consecutivePasses,
    gameOver: w.gameOver,
    lastPieceByColor: { ...w.lastPieceByColor },
  };
}

/** 从线数据恢复对局状态；`history` 恒为空（联机不同步悔棋栈） */
export function wireToGameState(w: GameSnapshotWire): GameState {
  const snap = wireToSnapshot(w);
  const hands: Hands = {};
  for (const c of colorsInPlay(snap.variant)) {
    const s = snap.hands[c];
    hands[c] = new Set(s);
  }
  return {
    variant: snap.variant,
    board: snap.board.map((row) => [...row]),
    hands,
    currentColor: snap.currentColor,
    consecutivePasses: snap.consecutivePasses,
    gameOver: snap.gameOver,
    lastPieceByColor: { ...snap.lastPieceByColor },
    history: [],
  };
}

import { PIECE_ORIENTATIONS } from "./pieces";
import {
  advanceTurnColor,
  colorHasAnyLegalMove,
  emptyBoard,
  isValidPlacement,
  type Board,
} from "./rules";
import type { ColorId, Point, Variant } from "./types";
import { colorsInPlay } from "./types";
import { translateShape } from "./transforms";
import { initialHand } from "./scoring";

export type Hands = Partial<Record<ColorId, Set<string>>>;

export interface GameSnapshot {
  variant: Variant;
  board: Board;
  hands: Hands;
  currentColor: ColorId;
  consecutivePasses: number;
  gameOver: boolean;
  lastPieceByColor: Partial<Record<ColorId, string>>;
}

export interface GameState extends GameSnapshot {
  history: GameSnapshot[];
}

function cloneHands(h: Hands, variant: Variant): Hands {
  const out: Hands = {};
  for (const c of colorsInPlay(variant)) {
    const s = h[c];
    if (s) out[c] = new Set(s);
  }
  return out;
}

function snapshot(s: GameState): GameSnapshot {
  return {
    variant: s.variant,
    board: s.board.map((row) => [...row]),
    hands: cloneHands(s.hands, s.variant),
    currentColor: s.currentColor,
    consecutivePasses: s.consecutivePasses,
    gameOver: s.gameOver,
    lastPieceByColor: { ...s.lastPieceByColor },
  };
}

function restoreFrom(snap: GameSnapshot): GameState {
  return {
    ...snap,
    board: snap.board.map((row) => [...row]),
    hands: cloneHands(snap.hands, snap.variant),
    lastPieceByColor: { ...snap.lastPieceByColor },
    history: [],
  };
}

export function createGame(variant: Variant): GameState {
  const hands: Hands = {};
  for (const c of colorsInPlay(variant)) {
    hands[c] = initialHand();
  }
  const state: GameState = {
    variant,
    board: emptyBoard(variant),
    hands,
    currentColor: 0,
    consecutivePasses: 0,
    gameOver: false,
    lastPieceByColor: {},
    history: [],
  };
  finishTurnTransition(state);
  return state;
}

/** 若当前执子方无任何合法走法则自动 pass，直至有人可走或终局 */
export function finishTurnTransition(s: GameState): void {
  const n = colorsInPlay(s.variant).length;
  while (!s.gameOver) {
    const hand = s.hands[s.currentColor];
    if (
      hand &&
      colorHasAnyLegalMove(
        s.variant,
        s.board,
        s.currentColor,
        hand,
        PIECE_ORIENTATIONS,
      )
    ) {
      return;
    }
    s.consecutivePasses++;
    if (s.consecutivePasses >= n) {
      s.gameOver = true;
      return;
    }
    s.currentColor = advanceTurnColor(s.variant, s.currentColor);
  }
}

export function tryApplyMove(
  state: GameState,
  pieceId: string,
  orientIndex: number,
  anchor: Point,
): GameState | null {
  if (state.gameOver) return null;
  const color = state.currentColor;
  const hand = state.hands[color];
  if (!hand?.has(pieceId)) return null;
  const orients = PIECE_ORIENTATIONS[pieceId];
  if (!orients || orientIndex < 0 || orientIndex >= orients.length)
    return null;
  const cells = translateShape(orients[orientIndex]!, anchor);
  if (!isValidPlacement(state.variant, state.board, color, cells)) return null;

  const next: GameState = {
    ...state,
    board: state.board.map((row) => [...row]),
    hands: cloneHands(state.hands, state.variant),
    lastPieceByColor: { ...state.lastPieceByColor },
    history: [...state.history, snapshot(state)],
  };

  for (const p of cells) {
    next.board[p.y][p.x] = color;
  }
  next.hands[color]!.delete(pieceId);
  next.lastPieceByColor[color] = pieceId;
  next.currentColor = advanceTurnColor(state.variant, color);
  next.consecutivePasses = 0;
  next.gameOver = false;

  finishTurnTransition(next);
  return next;
}

export function undo(state: GameState): GameState | null {
  if (state.history.length === 0) return null;
  const snap = state.history[state.history.length - 1]!;
  const rest = state.history.slice(0, -1);
  const restored = restoreFrom(snap);
  restored.history = rest;
  return restored;
}

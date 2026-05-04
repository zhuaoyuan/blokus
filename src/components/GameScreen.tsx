import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BOARD_CELL_LIMITS,
  clampBoardCell,
  loadBoardCellSizes,
  saveBoardCellSizes,
} from "../boardCellPrefs";
import { GameBoard } from "./GameBoard";
import { PieceMini } from "./PieceMini";
import { PIECE_ORIENTATIONS } from "../game/pieces";
import { isValidPlacement } from "../game/rules";
import { computeScores } from "../game/scoring";
import { createGame, tryApplyMove, undo, type GameState } from "../game/state";
import { translateShape } from "../game/transforms";
import type { ColorId, Point, Variant } from "../game/types";
import { colorToPlayer, colorsInPlay, displayColorName } from "../game/types";

/** 便于棋子池固定排序展示 */
const ALL_SORTED_IDS = [
  "I1",
  "I2",
  "I3",
  "L3",
  "I4",
  "O4",
  "T4",
  "S4",
  "L4",
  "F5",
  "I5",
  "L5",
  "N5",
  "P5",
  "T5",
  "U5",
  "V5",
  "W5",
  "X5",
  "Y5",
  "Z5",
];

function colorsForPlayer(variant: Variant, player: 0 | 1): ColorId[] {
  return colorsInPlay(variant).filter((c) => colorToPlayer(variant, c) === player);
}

function pieceFill(variant: Variant, color: ColorId): string {
  if (variant === "duo") {
    return color === 0 ? "var(--duo0)" : "var(--duo1)";
  }
  return (
    (
      {
        0: "var(--c0)",
        1: "var(--c1)",
        2: "var(--c2)",
        3: "var(--c3)",
      } as const
    )[color]
  );
}

function PieceTraysForColors({
  variant,
  game,
  colors,
  selectedId,
  orient,
  setSelectedId,
  setOrient,
  canInteract,
}: {
  variant: Variant;
  game: GameState;
  colors: ColorId[];
  selectedId: string | null;
  orient: number;
  setSelectedId: (id: string | null) => void;
  setOrient: (n: number) => void;
  canInteract: boolean;
}) {
  return colors.map((c, idx) => (
    <div key={c}>
      <div className="tray-title" style={{ marginTop: idx === 0 ? 4 : 8 }}>
        {displayColorName(variant, c)}
      </div>
      <div className="tray-grid">
        {ALL_SORTED_IDS.map((id) => {
          const inHand = game.hands[c]?.has(id) ?? false;
          const isCurrent = c === game.currentColor;
          const sel = isCurrent && selectedId === id && inHand ? " selected" : "";
          const used = !inHand ? " used" : "";
          return (
            <button
              key={`${c}-${id}`}
              type="button"
              className={`tray-piece${sel}${used}`}
              disabled={!inHand || !isCurrent || game.gameOver || !canInteract}
              onClick={() => {
                if (!isCurrent || !inHand || !canInteract) return;
                setSelectedId(id);
                setOrient(0);
              }}
            >
              <PieceMini
                pieceId={id}
                orientIndex={c === game.currentColor && selectedId === id ? orient : 0}
                cellPx={5}
                fill={pieceFill(variant, c)}
              />
            </button>
          );
        })}
      </div>
    </div>
  ));
}

function usePreview(
  game: GameState,
  selectedId: string | null,
  orient: number,
  hover: Point | null,
) {
  return useMemo(() => {
    if (!selectedId || !hover) return { cells: null as Point[] | null, bad: false };
    const orients = PIECE_ORIENTATIONS[selectedId];
    const shape = orients[orient % orients.length]!;
    const cells = translateShape(shape, hover);
    const ok = isValidPlacement(game.variant, game.board, game.currentColor, cells);
    return { cells, bad: !ok };
  }, [game, selectedId, orient, hover]);
}

export interface GameScreenProps {
  game: GameState;
  setGame: (g: GameState) => void;
  mode?: "local" | "online";
  mySeat?: 0 | 1;
  roomId?: string;
  connectionHint?: string;
  onOnlinePlace?: (pieceId: string, orientIndex: number, anchor: Point) => void;
  onBackToMenu: () => void;
}

export function GameScreen({
  game,
  setGame,
  mode = "local",
  mySeat,
  roomId,
  connectionHint,
  onOnlinePlace,
  onBackToMenu,
}: GameScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orient, setOrient] = useState(0);
  const [hover, setHover] = useState<Point | null>(null);
  const [boardCellByVariant, setBoardCellByVariant] = useState(loadBoardCellSizes);

  const canInteract =
    mode === "local" ||
    (mySeat !== undefined && colorToPlayer(game.variant, game.currentColor) === mySeat);

  const { cells: previewCells, bad: previewBad } = usePreview(
    game,
    selectedId,
    orient,
    hover,
  );

  const cellSize = boardCellByVariant[game.variant];

  useEffect(() => {
    saveBoardCellSizes(boardCellByVariant);
  }, [boardCellByVariant]);

  useEffect(() => {
    if (!canInteract) {
      setSelectedId(null);
      setHover(null);
    }
  }, [canInteract]);

  const onPlace = useCallback(
    (anchor: Point) => {
      if (!selectedId || game.gameOver || !canInteract) return;
      if (mode === "online" && onOnlinePlace) {
        onOnlinePlace(selectedId, orient, anchor);
        setSelectedId(null);
        setHover(null);
        return;
      }
      const next = tryApplyMove(game, selectedId, orient, anchor);
      if (next) {
        setGame(next);
        setSelectedId(null);
        setHover(null);
      }
    },
    [game, selectedId, orient, setGame, canInteract, mode, onOnlinePlace],
  );

  const cycleOrient = useCallback((d: number) => {
    if (!selectedId) return;
    const n = PIECE_ORIENTATIONS[selectedId].length;
    setOrient((o) => (o + d + n * 10) % n);
  }, [selectedId]);

  const scoreResult = useMemo(
    () => computeScores(game.variant, game.hands, game.lastPieceByColor),
    [game],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId || game.gameOver || !canInteract) return;
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        cycleOrient(e.key === "]" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, game.gameOver, cycleOrient, canInteract]);

  const winnerText = useMemo(() => {
    if (!game.gameOver) return "";
    const [a, b] = scoreResult.byPlayer;
    if (a > b) return "玩家 A 获胜";
    if (b > a) return "玩家 B 获胜";
    return "平局";
  }, [game.gameOver, scoreResult.byPlayer]);

  const currentPlayer = colorToPlayer(game.variant, game.currentColor);
  const currentName =
    game.variant === "duo"
      ? `玩家 ${currentPlayer === 0 ? "A（紫）" : "B（橙）"}`
      : `玩家 ${currentPlayer === 0 ? "A（蓝+红）" : "B（黄+绿）"}`;

  const showUndo = mode === "local";

  return (
    <div>
      <div className="hud">
        <div>
          当前回合：
          <strong>{displayColorName(game.variant, game.currentColor)}</strong>（
          {currentName}）
        </div>
        {mode === "online" && roomId !== undefined && mySeat !== undefined && (
          <div style={{ color: "#9aa6bf", fontSize: "0.85rem", marginTop: 4 }}>
            在线房间 <strong>{roomId}</strong> · 你是玩家{" "}
            <strong>{mySeat === 0 ? "A" : "B"}</strong>
            {connectionHint ? ` · ${connectionHint}` : null}
          </div>
        )}
        {game.consecutivePasses > 0 && !game.gameOver && (
          <div style={{ color: "#9aa6bf", fontSize: "0.85rem", marginTop: 4 }}>
            已连续 pass：{game.consecutivePasses} / {colorsInPlay(game.variant).length}
          </div>
        )}
      </div>

      <div className="game-play-stage">
        <p className="tray-global-hint">
          棋子池在棋盘两侧；仅当前回合颜色可选（非回合侧为灰显）。
        </p>
        <div className="game-layout">
          <aside className="piece-tray-side piece-tray-side--left">
            <div className="side-panel piece-tray-panel">
              <div className="tray-column-title">玩家 A</div>
              <PieceTraysForColors
                variant={game.variant}
                game={game}
                colors={colorsForPlayer(game.variant, 0)}
                selectedId={selectedId}
                orient={orient}
                setSelectedId={setSelectedId}
                setOrient={setOrient}
                canInteract={canInteract}
              />
            </div>
          </aside>

          <div className="board-wrap">
            <div className="board-size-row">
              <label htmlFor="board-cell-range">棋盘大小</label>
              <input
                id="board-cell-range"
                type="range"
                min={BOARD_CELL_LIMITS[game.variant].min}
                max={BOARD_CELL_LIMITS[game.variant].max}
                value={cellSize}
                onChange={(e) => {
                  const v = clampBoardCell(game.variant, Number(e.target.value));
                  setBoardCellByVariant((prev) => ({ ...prev, [game.variant]: v }));
                }}
              />
              <span className="board-size-value" aria-live="polite">
                {cellSize}px
              </span>
            </div>
            <GameBoard
              variant={game.variant}
              board={game.board}
              cellSize={cellSize}
              previewCells={previewCells}
              previewInvalid={previewBad}
              onHover={setHover}
              onClickCell={onPlace}
            />
            <div className="controls-row">
              <button type="button" onClick={() => cycleOrient(-1)} disabled={!selectedId || !canInteract}>
                旋转 ↺
              </button>
              <button type="button" onClick={() => cycleOrient(1)} disabled={!selectedId || !canInteract}>
                旋转 ↻
              </button>
              {showUndo && (
                <button
                  type="button"
                  onClick={() => setGame(undo(game) ?? game)}
                  disabled={game.history.length === 0}
                >
                  撤销
                </button>
              )}
            </div>
            <p className="orient-hint">
              先点击棋子池选中棋子，再移动鼠标预览，最后点击棋盘落子。旋转可用按钮或键盘{" "}
              <kbd>[</kbd> / <kbd>]</kbd>。落子后自动轮到下一颜色（无法下子会自动 pass）。
              {mode === "online" && " 联机模式无撤销，以服务器判定为准。"}
            </p>
          </div>

          <aside className="piece-tray-side piece-tray-side--right">
            <div className="side-panel piece-tray-panel">
              <div className="tray-column-title">玩家 B</div>
              <PieceTraysForColors
                variant={game.variant}
                game={game}
                colors={colorsForPlayer(game.variant, 1)}
                selectedId={selectedId}
                orient={orient}
                setSelectedId={setSelectedId}
                setOrient={setOrient}
                canInteract={canInteract}
              />
            </div>
          </aside>
        </div>
      </div>

      {game.gameOver && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="end-title">
            <h2 id="end-title">对局结束</h2>
            <p style={{ margin: "0 0 0.75rem", color: "#9aa6bf" }}>{winnerText}</p>
            <table className="score-table">
              <thead>
                <tr>
                  <th>颜色</th>
                  <th>未下惩罚</th>
                  <th>全下 +15</th>
                  <th>单格收尾 +5</th>
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                {scoreResult.byColor.map((row) => (
                  <tr key={row.color}>
                    <td>{displayColorName(game.variant, row.color)}</td>
                    <td>{row.penaltyFromRemaining}</td>
                    <td>{row.allPlacedBonus || "—"}</td>
                    <td>{row.monominoLastBonus || "—"}</td>
                    <td>
                      <strong>{row.total}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginBottom: "0.75rem", fontSize: "0.92rem" }}>
              玩家总分：A = <strong>{scoreResult.byPlayer[0]}</strong>，B ={" "}
              <strong>{scoreResult.byPlayer[1]}</strong>
            </div>
            {mode === "online" ? (
              <button type="button" onClick={onBackToMenu}>
                返回菜单
              </button>
            ) : (
              <button type="button" onClick={() => setGame(createGame(game.variant))}>
                再来一局
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

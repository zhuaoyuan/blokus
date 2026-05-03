import { useCallback, useEffect, useMemo, useState } from "react";
import { GameBoard } from "./components/GameBoard";
import { PieceMini } from "./components/PieceMini";
import { PIECE_ORIENTATIONS } from "./game/pieces";
import { isValidPlacement } from "./game/rules";
import { computeScores } from "./game/scoring";
import {
  createGame,
  tryApplyMove,
  undo,
  type GameState,
} from "./game/state";
import { translateShape } from "./game/transforms";
import type { ColorId, Point, Variant } from "./game/types";
import { colorToPlayer, colorsInPlay, displayColorName } from "./game/types";

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

function GameScreen({
  game,
  setGame,
}: {
  game: GameState;
  setGame: (g: GameState) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orient, setOrient] = useState(0);
  const [hover, setHover] = useState<Point | null>(null);

  const { cells: previewCells, bad: previewBad } = usePreview(
    game,
    selectedId,
    orient,
    hover,
  );

  const cellSize = game.variant === "duo" ? 22 : 17;

  const onPlace = useCallback(
    (anchor: Point) => {
      if (!selectedId || game.gameOver) return;
      const next = tryApplyMove(game, selectedId, orient, anchor);
      if (next) {
        setGame(next);
        setSelectedId(null);
        setHover(null);
      }
    },
    [game, selectedId, orient, setGame],
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
      if (!selectedId || game.gameOver) return;
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        cycleOrient(e.key === "]" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, game.gameOver, cycleOrient]);

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

  return (
    <div>
      <div className="hud">
        <div>
          当前回合：
          <strong>{displayColorName(game.variant, game.currentColor)}</strong>（
          {currentName}）
        </div>
        {game.consecutivePasses > 0 && !game.gameOver && (
          <div style={{ color: "#9aa6bf", fontSize: "0.85rem", marginTop: 4 }}>
            已连续 pass：{game.consecutivePasses} / {colorsInPlay(game.variant).length}
          </div>
        )}
      </div>

      <div className="game-layout">
        <div className="board-wrap">
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
            <button type="button" onClick={() => cycleOrient(-1)} disabled={!selectedId}>
              旋转 ↺
            </button>
            <button type="button" onClick={() => cycleOrient(1)} disabled={!selectedId}>
              旋转 ↻
            </button>
            <button
              type="button"
              onClick={() => setGame(undo(game) ?? game)}
              disabled={game.history.length === 0}
            >
              撤销
            </button>
          </div>
          <p className="orient-hint">
            先点击棋子池选中棋子，再移动鼠标预览，最后点击棋盘落子。旋转可用按钮或键盘{" "}
            <kbd>[</kbd> / <kbd>]</kbd>。落子后自动轮到下一颜色（无法下子会自动 pass）。
          </p>
        </div>

        <div className="side-panel">
          <div className="tray-title">棋子池（仅当前回合颜色可选）</div>
          {colorsInPlay(game.variant).map((c) => (
            <div key={c}>
              <div
                className="tray-title"
                style={{ marginTop: c === 0 ? 0 : 8 }}
              >
                {displayColorName(game.variant, c)}
                {game.variant === "classic2p" &&
                  ` · 玩家 ${colorToPlayer(game.variant, c) === 0 ? "A" : "B"}`}
                {game.variant === "duo" && ` · 玩家 ${c === 0 ? "A" : "B"}`}
              </div>
              <div
                className="tray-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                }}
              >
                {ALL_SORTED_IDS.map((id) => {
                    const inHand = game.hands[c]?.has(id) ?? false;
                    const isCurrent = c === game.currentColor;
                    const sel =
                      isCurrent && selectedId === id && inHand ? " selected" : "";
                    const used = !inHand ? " used" : "";
                    return (
                      <button
                        key={`${c}-${id}`}
                        type="button"
                        className={`tray-piece${sel}${used}`}
                        disabled={!inHand || !isCurrent || game.gameOver}
                        onClick={() => {
                          if (!isCurrent || !inHand) return;
                          setSelectedId(id);
                          setOrient(0);
                        }}
                      >
                        <PieceMini
                          pieceId={id}
                          orientIndex={c === game.currentColor && selectedId === id ? orient : 0}
                          cellPx={5}
                          fill={pieceFill(game.variant, c)}
                        />
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
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
            <button type="button" onClick={() => setGame(createGame(game.variant))}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<"menu" | "play">("menu");
  const [game, setGame] = useState<GameState | null>(null);

  const start = (v: Variant) => {
    setGame(createGame(v));
    setScreen("play");
  };

  return (
    <div className="app-shell">
      <h1>Blokus 本地双人</h1>
      {screen === "menu" && (
        <div className="menu-card">
          <p>
            规则与维基一致：同色只能角对角相连，不能边贴边；异色无限制。标准双人每人执两色，顺序蓝→黄→红→绿。
            Duo 为 14×14 双人对战。
          </p>
          <div className="menu-actions">
            <button type="button" onClick={() => start("classic2p")}>
              标准双人（20×20，每人两色）
            </button>
            <button type="button" onClick={() => start("duo")}>
              Blokus Duo（14×14）
            </button>
          </div>
        </div>
      )}
      {screen === "play" && game && (
        <>
          <div className="controls-row" style={{ marginBottom: "0.75rem" }}>
            <button type="button" onClick={() => setScreen("menu")}>
              返回菜单
            </button>
            <button type="button" onClick={() => setGame(createGame(game.variant))}>
              新游戏
            </button>
          </div>
          <GameScreen game={game} setGame={setGame} />
        </>
      )}
    </div>
  );
}

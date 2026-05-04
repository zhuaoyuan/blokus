import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { createGame, type GameState } from "./game/state";
import { wireToGameState } from "./game/serialize";
import type { Point, Variant } from "./game/types";
import {
  connectRoom,
  defaultWsUrl,
  getOrCreatePlayerToken,
  type RoomConnection,
  type RoomNetStatus,
} from "./net/roomClient";

function hintForNetStatus(s: RoomNetStatus): string {
  switch (s) {
    case "idle":
      return "";
    case "connecting":
      return "连接中…";
    case "open":
      return "已连接";
    case "closed":
      return "已断开";
    case "error":
      return "连接异常";
    default:
      return "";
  }
}

export default function App() {
  const [screen, setScreen] = useState<"menu" | "play">("menu");
  const [game, setGame] = useState<GameState | null>(null);
  const [onlineMeta, setOnlineMeta] = useState<{
    seat: 0 | 1;
    roomId: string;
  } | null>(null);
  const [netStatus, setNetStatus] = useState<RoomNetStatus>("idle");
  const [menuNetError, setMenuNetError] = useState<string | null>(null);
  const [playNetError, setPlayNetError] = useState<string | null>(null);
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const connRef = useRef<RoomConnection | null>(null);
  /** 是否已进入对局界面（用于区分菜单与对局上的错误提示） */
  const inPlayRef = useRef(false);

  const connectionHint = useMemo(() => hintForNetStatus(netStatus), [netStatus]);

  const closeConnection = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
  }, []);

  useEffect(() => () => closeConnection(), [closeConnection]);

  const backToMenu = useCallback(() => {
    inPlayRef.current = false;
    closeConnection();
    setOnlineMeta(null);
    setGame(null);
    setPlayNetError(null);
    setMenuNetError(null);
    setNetStatus("idle");
    setScreen("menu");
  }, [closeConnection]);

  const startLocal = (v: Variant) => {
    inPlayRef.current = true;
    closeConnection();
    setOnlineMeta(null);
    setGame(createGame(v));
    setScreen("play");
    setNetStatus("idle");
    setMenuNetError(null);
    setPlayNetError(null);
  };

  const openOnlineConnection = useCallback(
    (params: { mode: "create"; variant: Variant } | { mode: "join"; roomId: string }) => {
      setMenuNetError(null);
      setPlayNetError(null);
      closeConnection();
      const url = defaultWsUrl();
      const token = getOrCreatePlayerToken();
      const conn = connectRoom({
        url,
        mode: params.mode,
        variant: params.mode === "create" ? params.variant : undefined,
        roomId: params.mode === "join" ? params.roomId : undefined,
        playerToken: token,
        callbacks: {
          onStatus: (s) => {
            setNetStatus(s);
          },
          onJoined: ({ roomId, seat, snapshot }) => {
            setMenuNetError(null);
            inPlayRef.current = true;
            setGame(wireToGameState(snapshot));
            setOnlineMeta({ roomId, seat });
            setScreen("play");
          },
          onState: (snapshot) => {
            setGame(wireToGameState(snapshot));
          },
          onError: (msg) => {
            if (inPlayRef.current) setPlayNetError(msg);
            else setMenuNetError(msg);
          },
        },
      });
      connRef.current = conn;
    },
    [closeConnection],
  );

  const handleCreateOnline = (variant: Variant) => {
    openOnlineConnection({ mode: "create", variant });
  };

  const handleJoinOnline = () => {
    const rid = joinRoomInput.trim().toUpperCase();
    if (rid.length < 4) {
      setMenuNetError("请输入房间号（至少 4 位）");
      return;
    }
    openOnlineConnection({ mode: "join", roomId: rid });
  };

  const sendOnlineMove = useCallback(
    (pieceId: string, orientIndex: number, anchor: Point) => {
      setPlayNetError(null);
      connRef.current?.sendMove(pieceId, orientIndex, anchor);
    },
    [],
  );

  const isOnline = onlineMeta !== null;

  return (
    <div className="app-shell">
      <h1>Blokus 双人</h1>
      {screen === "menu" && (
        <div className="menu-card">
          <p>
            规则与维基一致：同色只能角对角相连，不能边贴边；异色无限制。标准双人每人执两色，顺序蓝→黄→红→绿。
            Duo 为 14×14 双人对战。在线模式需先在本机运行{" "}
            <code style={{ fontSize: "0.9em" }}>npm run server:dev</code>（默认{" "}
            <code>ws://127.0.0.1:8787</code>，可用环境变量{" "}
            <code>VITE_WS_URL</code> 修改）。
          </p>
          <p style={{ color: "#9aa6bf", fontSize: "0.88rem" }}>
            当前 WebSocket：<strong>{defaultWsUrl()}</strong>
          </p>
          <div className="menu-actions">
            <button type="button" onClick={() => startLocal("classic2p")}>
              本地：标准双人（20×20，每人两色）
            </button>
            <button type="button" onClick={() => startLocal("duo")}>
              本地：Blokus Duo（14×14）
            </button>
          </div>
          <hr style={{ borderColor: "#2a3344", margin: "1rem 0" }} />
          <div className="menu-actions">
            <button type="button" onClick={() => handleCreateOnline("classic2p")}>
              在线：创建房间（标准双人）
            </button>
            <button type="button" onClick={() => handleCreateOnline("duo")}>
              在线：创建房间（Duo）
            </button>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              加入房间（房间号为 6 位大写字母与数字；须与房主模式一致）
            </label>
            <div className="controls-row" style={{ flexWrap: "wrap", gap: 8 }}>
              <input
                type="text"
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                placeholder="例如 AB12CD"
                style={{
                  minWidth: 140,
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  border: "1px solid #2a3344",
                  background: "#121826",
                  color: "#e8ecf4",
                }}
                maxLength={8}
              />
              <button type="button" onClick={handleJoinOnline}>
                在线：加入房间
              </button>
            </div>
          </div>
          {menuNetError && (
            <p style={{ color: "#f0a0a8", marginTop: "0.75rem" }} role="alert">
              {menuNetError}
            </p>
          )}
        </div>
      )}
      {screen === "play" && game && (
        <>
          <div className="controls-row" style={{ marginBottom: "0.75rem" }}>
            <button type="button" onClick={backToMenu}>
              返回菜单
            </button>
            {!isOnline && (
              <button type="button" onClick={() => setGame(createGame(game.variant))}>
                新游戏
              </button>
            )}
          </div>
          {playNetError && (
            <p style={{ color: "#f0a0a8", marginBottom: "0.5rem" }} role="alert">
              {playNetError}
            </p>
          )}
          <GameScreen
            game={game}
            setGame={setGame}
            mode={isOnline ? "online" : "local"}
            mySeat={onlineMeta?.seat}
            roomId={onlineMeta?.roomId}
            connectionHint={isOnline ? connectionHint : undefined}
            onOnlinePlace={isOnline ? sendOnlineMove : undefined}
            onBackToMenu={backToMenu}
          />
        </>
      )}
    </div>
  );
}

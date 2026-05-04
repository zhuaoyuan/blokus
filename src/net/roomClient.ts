import type { GameSnapshotWire } from "../game/serialize";
import type { Point, Variant } from "../game/types";

const PLAYER_TOKEN_KEY = "blokus-player-token";

/** 用于座位绑定与断线重连，存于 localStorage */
export function getOrCreatePlayerToken(): string {
  try {
    const existing = localStorage.getItem(PLAYER_TOKEN_KEY);
    if (existing && existing.length >= 8) return existing;
    const t = crypto.randomUUID();
    localStorage.setItem(PLAYER_TOKEN_KEY, t);
    return t;
  } catch {
    return crypto.randomUUID();
  }
}

export type RoomNetStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

export interface RoomJoinedPayload {
  roomId: string;
  seat: 0 | 1;
  snapshot: GameSnapshotWire;
}

export interface RoomClientCallbacks {
  onStatus(status: RoomNetStatus): void;
  onJoined(payload: RoomJoinedPayload): void;
  onState(snapshot: GameSnapshotWire): void;
  onError(message: string): void;
}

export interface RoomConnection {
  sendMove(pieceId: string, orientIndex: number, anchor: Point): void;
  close(): void;
}

function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^wss?:\/\//i.test(trimmed)
    ? trimmed
    : `ws://${trimmed}`;
  const u = new URL(withScheme);
  if (!u.pathname || u.pathname === "/") {
    u.pathname = "/";
  }
  return u.toString();
}

/** 默认开发环境直连本机 WebSocket 服 */
export function defaultWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL as string | undefined;
  if (env && env.length > 0) return normalizeWsUrl(env);
  return "ws://127.0.0.1:8787/";
}

export function connectRoom(opts: {
  url: string;
  mode: "create" | "join";
  /** 仅 createRoom 需要 */
  variant?: Variant;
  roomId?: string;
  playerToken: string;
  callbacks: RoomClientCallbacks;
}): RoomConnection {
  if (opts.mode === "create" && opts.variant === undefined) {
    throw new Error("connectRoom: create 模式需要 variant");
  }
  opts.callbacks.onStatus("connecting");
  const ws = new WebSocket(opts.url);

  const send = (obj: object) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  };

  ws.onopen = () => {
    opts.callbacks.onStatus("open");
    if (opts.mode === "create") {
      send({
        type: "createRoom",
        variant: opts.variant,
        playerToken: opts.playerToken,
      });
    } else {
      const rid = (opts.roomId ?? "").trim().toUpperCase();
      send({
        type: "joinRoom",
        roomId: rid,
        playerToken: opts.playerToken,
      });
    }
  };

  ws.onmessage = (ev) => {
    let msg: unknown;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      opts.callbacks.onError("服务器返回非 JSON");
      return;
    }
    if (!msg || typeof msg !== "object" || !("type" in msg)) return;
    const t = (msg as { type: string }).type;
    if (t === "joined") {
      const m = msg as RoomJoinedPayload & { type: string };
      if (typeof m.roomId !== "string" || (m.seat !== 0 && m.seat !== 1) || !m.snapshot) {
        opts.callbacks.onError("joined 消息不完整");
        return;
      }
      opts.callbacks.onJoined({
        roomId: m.roomId,
        seat: m.seat,
        snapshot: m.snapshot,
      });
      return;
    }
    if (t === "state") {
      const m = msg as { type: string; snapshot?: GameSnapshotWire };
      if (!m.snapshot) {
        opts.callbacks.onError("state 消息缺少 snapshot");
        return;
      }
      opts.callbacks.onState(m.snapshot);
      return;
    }
    if (t === "error") {
      const m = msg as { type: string; message?: string };
      opts.callbacks.onError(typeof m.message === "string" ? m.message : "未知错误");
    }
  };

  ws.onerror = () => {
    opts.callbacks.onStatus("error");
    opts.callbacks.onError("网络错误");
  };

  ws.onclose = () => {
    opts.callbacks.onStatus("closed");
  };

  return {
    sendMove(pieceId: string, orientIndex: number, anchor: Point) {
      send({ type: "move", pieceId, orientIndex, anchor });
    },
    close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  };
}

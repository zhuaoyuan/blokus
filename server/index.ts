import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createGame, toSnapshot, tryApplyMove, type GameState } from "../src/game/state";
import { snapshotToWire, type GameSnapshotWire } from "../src/game/serialize";
import type { Point, Variant } from "../src/game/types";
import { colorToPlayer } from "../src/game/types";

const PORT = Number(process.env.PORT) || 8787;

interface SeatSlot {
  token: string;
  ws: WebSocket | null;
}

interface Room {
  id: string;
  variant: Variant;
  game: GameState;
  /** 座位 0 房主；座位 1 第二位玩家 */
  seats: [SeatSlot, SeatSlot | null];
}

const rooms = new Map<string, Room>();

const wsMeta = new WeakMap<
  WebSocket,
  { roomId: string; seat: 0 | 1 }
>();

function randomRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]!;
  }
  if (rooms.has(id)) return randomRoomId();
  return id;
}

function isVariant(v: unknown): v is Variant {
  return v === "classic2p" || v === "duo";
}

function isPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return typeof o.x === "number" && typeof o.y === "number";
}

function attachWs(slot: SeatSlot, ws: WebSocket): void {
  if (slot.ws && slot.ws !== ws) {
    try {
      slot.ws.close(4000, "replaced");
    } catch {
      /* ignore */
    }
  }
  slot.ws = ws;
}

function broadcastRoom(room: Room, payload: object): void {
  const raw = JSON.stringify(payload);
  for (const slot of room.seats) {
    if (!slot) continue;
    if (slot.ws && slot.ws.readyState === WebSocket.OPEN) {
      slot.ws.send(raw);
    }
  }
}

function sendError(ws: WebSocket, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "error", message }));
  }
}

function wireFromRoomGame(game: GameState): GameSnapshotWire {
  return snapshotToWire(toSnapshot(game));
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/health/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/" && req.url !== "/ws" && !req.url?.startsWith("/ws?")) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (data) => {
    let msg: unknown;
    try {
      msg = JSON.parse(String(data));
    } catch {
      sendError(ws, "无效 JSON");
      return;
    }
    if (!msg || typeof msg !== "object" || !("type" in msg)) {
      sendError(ws, "缺少 type");
      return;
    }
    const t = (msg as { type: string }).type;

    if (t === "createRoom") {
      const m = msg as {
        type: string;
        variant?: unknown;
        playerToken?: unknown;
      };
      if (wsMeta.has(ws)) {
        sendError(ws, "已加入房间");
        return;
      }
      if (!isVariant(m.variant)) {
        sendError(ws, "无效 variant");
        return;
      }
      if (typeof m.playerToken !== "string" || m.playerToken.length < 8) {
        sendError(ws, "playerToken 过短（至少 8 字符）");
        return;
      }
      const id = randomRoomId();
      const game = createGame(m.variant);
      const room: Room = {
        id,
        variant: m.variant,
        game,
        seats: [{ token: m.playerToken, ws: null }, null],
      };
      rooms.set(id, room);
      const seat0 = room.seats[0]!;
      attachWs(seat0, ws);
      wsMeta.set(ws, { roomId: id, seat: 0 });
      ws.send(
        JSON.stringify({
          type: "joined",
          roomId: id,
          seat: 0,
          snapshot: wireFromRoomGame(room.game),
        }),
      );
      return;
    }

    if (t === "joinRoom") {
      const m = msg as {
        type: string;
        roomId?: unknown;
        playerToken?: unknown;
      };
      if (wsMeta.has(ws)) {
        sendError(ws, "已加入房间");
        return;
      }
      if (typeof m.roomId !== "string" || m.roomId.length === 0) {
        sendError(ws, "无效 roomId");
        return;
      }
      if (typeof m.playerToken !== "string" || m.playerToken.length < 8) {
        sendError(ws, "playerToken 过短（至少 8 字符）");
        return;
      }
      const room = rooms.get(m.roomId.toUpperCase());
      if (!room) {
        sendError(ws, "房间不存在");
        return;
      }
      const id = room.id;
      const token = m.playerToken;
      const seat0 = room.seats[0]!;

      if (seat0.token === token) {
        attachWs(seat0, ws);
        wsMeta.set(ws, { roomId: id, seat: 0 });
        ws.send(
          JSON.stringify({
            type: "joined",
            roomId: id,
            seat: 0,
            snapshot: wireFromRoomGame(room.game),
          }),
        );
        broadcastRoom(room, {
          type: "state",
          snapshot: wireFromRoomGame(room.game),
        });
        return;
      }

      let seat1 = room.seats[1];
      if (!seat1) {
        seat1 = { token, ws: null };
        room.seats[1] = seat1;
      } else if (seat1.token !== token) {
        sendError(ws, "房间已满");
        return;
      }

      attachWs(seat1, ws);
      wsMeta.set(ws, { roomId: id, seat: 1 });
      ws.send(
        JSON.stringify({
          type: "joined",
          roomId: id,
          seat: 1,
          snapshot: wireFromRoomGame(room.game),
        }),
      );
      broadcastRoom(room, {
        type: "state",
        snapshot: wireFromRoomGame(room.game),
      });
      return;
    }

    if (t === "move") {
      const m = msg as {
        type: string;
        pieceId?: unknown;
        orientIndex?: unknown;
        anchor?: unknown;
      };
      const meta = wsMeta.get(ws);
      if (!meta) {
        sendError(ws, "未加入房间");
        return;
      }
      const room = rooms.get(meta.roomId);
      if (!room) {
        sendError(ws, "房间已失效");
        return;
      }
      if (typeof m.pieceId !== "string") {
        sendError(ws, "无效 pieceId");
        return;
      }
      if (typeof m.orientIndex !== "number" || !Number.isInteger(m.orientIndex)) {
        sendError(ws, "无效 orientIndex");
        return;
      }
      if (!isPoint(m.anchor)) {
        sendError(ws, "无效 anchor");
        return;
      }

      const { game, variant } = room;
      const expectedSeat = colorToPlayer(variant, game.currentColor);
      if (expectedSeat !== meta.seat) {
        sendError(ws, "非你方回合");
        return;
      }

      const next = tryApplyMove(game, m.pieceId, m.orientIndex, m.anchor);
      if (!next) {
        sendError(ws, "非法落子");
        return;
      }
      room.game = next;
      broadcastRoom(room, {
        type: "state",
        snapshot: wireFromRoomGame(room.game),
      });
      return;
    }

    sendError(ws, `未知消息: ${t}`);
  });

  ws.on("close", () => {
    const meta = wsMeta.get(ws);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    wsMeta.delete(ws);
    if (!room) return;
    const slot = room.seats[meta.seat];
    if (slot?.ws === ws) slot.ws = null;
  });
});

server.listen(PORT, () => {
  console.log(`Blokus WS server http://127.0.0.1:${PORT}  (health: /health)`);
});

import { describe, expect, it } from "vitest";
import { PIECE_DEFS, PIECE_ORIENTATIONS } from "./pieces";
import {
  advanceTurnColor,
  colorHasAnyLegalMove,
  emptyBoard,
  isValidPlacement,
} from "./rules";
import { translateShape } from "./transforms";
import type { ColorId } from "./types";
import { cornerForColor, duoStartCell } from "./types";

describe("isValidPlacement", () => {
  it("经典：第一手必须占该色角格", () => {
    const board = emptyBoard("classic2p");
    const corner = cornerForColor(0, 20, 20);
    const shape = PIECE_ORIENTATIONS["I3"][0]!;
    const good = translateShape(shape, { x: corner.x, y: corner.y });
    expect(isValidPlacement("classic2p", board, 0, good)).toBe(true);

    const bad = translateShape(shape, { x: 5, y: 5 });
    expect(isValidPlacement("classic2p", board, 0, bad)).toBe(false);
  });

  it("经典：禁止与已有同色边相邻", () => {
    const board = emptyBoard("classic2p");
    const corner = cornerForColor(0, 20, 20);
    const i3 = translateShape(PIECE_ORIENTATIONS["I3"][0]!, {
      x: corner.x,
      y: corner.y,
    });
    for (const p of i3) board[p.y][p.x] = 0 as ColorId;

    const orthoTouch = translateShape(PIECE_ORIENTATIONS["I2"][0]!, {
      x: corner.x + 3,
      y: corner.y,
    });
    expect(isValidPlacement("classic2p", board, 0, orthoTouch)).toBe(false);
  });

  it("经典：允许与已有同色仅角接触", () => {
    const board = emptyBoard("classic2p");
    const corner = cornerForColor(0, 20, 20);
    const l3 = translateShape(PIECE_ORIENTATIONS["L3"][0]!, corner);
    for (const p of l3) board[p.y][p.x] = 0 as ColorId;

    const i1 = translateShape(PIECE_ORIENTATIONS["I1"][0]!, {
      x: corner.x + 1,
      y: corner.y + 2,
    });
    expect(isValidPlacement("classic2p", board, 0, i1)).toBe(true);
  });

  it("Duo：第一手必须覆盖起始格", () => {
    const board = emptyBoard("duo");
    const st = duoStartCell(1);
    const shape = PIECE_ORIENTATIONS["O4"][0]!;
    const ok = translateShape(shape, { x: st.x - 1, y: st.y - 1 });
    expect(isValidPlacement("duo", board, 1, ok)).toBe(true);

    const miss = translateShape(PIECE_DEFS["I1"], { x: 0, y: 0 });
    expect(isValidPlacement("duo", board, 1, miss)).toBe(false);
  });
});

describe("advanceTurnColor", () => {
  it("四人顺序", () => {
    expect(advanceTurnColor("classic2p", 0)).toBe(1);
    expect(advanceTurnColor("classic2p", 3)).toBe(0);
  });

  it("Duo 交替", () => {
    expect(advanceTurnColor("duo", 0)).toBe(1);
    expect(advanceTurnColor("duo", 1)).toBe(0);
  });
});

describe("colorHasAnyLegalMove", () => {
  it("空棋盘蓝方应有合法走法", () => {
    const board = emptyBoard("classic2p");
    const hand = new Set(Object.keys(PIECE_DEFS));
    expect(
      colorHasAnyLegalMove("classic2p", board, 0, hand, PIECE_ORIENTATIONS),
    ).toBe(true);
  });
});

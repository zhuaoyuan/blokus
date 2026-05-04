import { describe, expect, it } from "vitest";
import { createGame, toSnapshot, tryApplyMove } from "./state";
import { snapshotToWire, wireToGameState } from "./serialize";
import { boardSize, colorsInPlay, cornerForColor } from "./types";

function handsEqual(
  a: { hands: import("./state").Hands },
  b: { hands: import("./state").Hands },
  variant: import("./types").Variant,
): boolean {
  for (const c of colorsInPlay(variant)) {
    const sa = [...(a.hands[c] ?? new Set())].sort().join(",");
    const sb = [...(b.hands[c] ?? new Set())].sort().join(",");
    if (sa !== sb) return false;
  }
  return true;
}

describe("serialize", () => {
  it("round-trips snapshot via JSON", () => {
    const g = createGame("duo");
    const snap = toSnapshot(g);
    const wire = snapshotToWire(snap);
    const json = JSON.stringify(wire);
    const parsed = JSON.parse(json) as typeof wire;
    const restored = wireToGameState(parsed);

    expect(restored.variant).toBe(g.variant);
    expect(restored.board).toEqual(g.board);
    expect(restored.currentColor).toBe(g.currentColor);
    expect(restored.consecutivePasses).toBe(g.consecutivePasses);
    expect(restored.gameOver).toBe(g.gameOver);
    expect(restored.lastPieceByColor).toEqual(g.lastPieceByColor);
    expect(handsEqual(restored, g, g.variant)).toBe(true);
    expect(restored.history).toEqual([]);
  });

  it("round-trips after a move", () => {
    let g = createGame("classic2p");
    const before = toSnapshot(g);
    const { w, h } = boardSize("classic2p");
    const corner = cornerForColor(0, w, h);
    const next = tryApplyMove(g, "I3", 0, corner);
    expect(next).not.toBeNull();
    g = next!;
    const wire = snapshotToWire(toSnapshot(g));
    const restored = wireToGameState(JSON.parse(JSON.stringify(wire)));

    expect(restored.board).not.toEqual(before.board);
    expect(restored.hands[g.currentColor]).toBeDefined();
    expect(handsEqual(restored, g, g.variant)).toBe(true);
  });
});

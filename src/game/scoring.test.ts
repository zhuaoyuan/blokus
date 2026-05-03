import { describe, expect, it } from "vitest";
import { ALL_PIECE_IDS } from "./pieces";
import { computeScores } from "./scoring";
import type { ColorId } from "./types";

function fullHand(): Set<string> {
  return new Set(ALL_PIECE_IDS);
}

function classicHands(
  partial: Partial<Record<ColorId, Set<string>>>,
): Partial<Record<ColorId, Set<string>>> {
  const out: Partial<Record<ColorId, Set<string>>> = {};
  for (const c of [0, 1, 2, 3] as ColorId[]) {
    out[c] = partial[c] ?? fullHand();
  }
  return out;
}

describe("computeScores", () => {
  it("未下完按格子扣分", () => {
    const h = classicHands({
      0: new Set(["I1", "I2"]),
    });
    const r = computeScores("classic2p", h, {});
    const blue = r.byColor.find((x) => x.color === 0)!;
    expect(blue.penaltyFromRemaining).toBe(-3);
    expect(blue.allPlacedBonus).toBe(0);
  });

  it("全下 +15，且最后一子为单格再 +5", () => {
    const h = classicHands({
      0: new Set(),
    });
    const r = computeScores("classic2p", h, { 0: "I1" });
    const blue = r.byColor.find((x) => x.color === 0)!;
    expect(blue.total).toBe(20);
  });

  it("全下但最后一子非单格则无 +5", () => {
    const h = classicHands({
      0: new Set(),
    });
    const r = computeScores("classic2p", h, { 0: "I2" });
    const blue = r.byColor.find((x) => x.color === 0)!;
    expect(blue.total).toBe(15);
  });
});

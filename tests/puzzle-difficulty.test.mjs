import assert from "node:assert/strict";
import { test } from "node:test";

import { puzzleDifficultyLevel, puzzleDifficultySummary } from "../src/puzzleDifficulty.js";

test("uses the puzzle difficulty as the overall visible difficulty", () => {
  const puzzle = {
    difficulty: 2,
    groups: [
      { level: 1 },
      { level: 2 },
      { level: 3 },
      { level: 4 }
    ]
  };

  assert.equal(puzzleDifficultyLevel(puzzle), 2);
  assert.deepEqual(puzzleDifficultySummary(puzzle, "zh"), {
    level: 2,
    label: "综合难度",
    value: "常识联想"
  });
});

test("falls back to a rounded average of group levels when puzzle difficulty is missing", () => {
  const puzzle = {
    groups: [
      { level: 2 },
      { level: 2 },
      { level: 3 },
      { level: 4 }
    ]
  };

  assert.equal(puzzleDifficultyLevel(puzzle), 3);
});

test("clamps invalid difficulty values to the supported 1-4 range", () => {
  assert.equal(puzzleDifficultyLevel({ difficulty: 99, groups: [] }), 4);
  assert.equal(puzzleDifficultyLevel({ difficulty: -1, groups: [] }), 1);
  assert.equal(puzzleDifficultyLevel({ difficulty: Number.NaN, groups: [] }), 1);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPendingScorePuzzleId,
  pendingScoreStorageKey,
  readPendingScorePuzzleIds,
  removePendingScorePuzzleIds,
  syncPlayedPuzzleScores
} from "../src/leaderboardSync.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test("syncs locally completed puzzles after a nickname is saved", async () => {
  const initialPlayer = {
    id: "player_1",
    nickname: "Mika",
    text_clears: 0,
    total_score: 0
  };
  const submitted = [];

  const result = await syncPlayedPuzzleScores({
    player: initialPlayer,
    nickname: "Mika",
    puzzleIds: ["text-001", "text-002", "text-001", "loading", ""],
    submitScore: async (body) => {
      submitted.push(body);
      return {
        player: {
          ...initialPlayer,
          text_clears: submitted.length,
          total_score: submitted.length
        },
        duplicate: false
      };
    }
  });

  assert.deepEqual(submitted, [
    { playerId: "player_1", nickname: "Mika", mode: "text", puzzleId: "text-001" },
    { playerId: "player_1", nickname: "Mika", mode: "text", puzzleId: "text-002" }
  ]);
  assert.equal(result.submitted, 2);
  assert.deepEqual(result.syncedPuzzleIds, ["text-001", "text-002"]);
  assert.equal(result.player.text_clears, 2);
  assert.equal(result.player.total_score, 2);
});

test("does not call the score API when there are no valid local completions", async () => {
  const player = {
    id: "player_2",
    nickname: "Nana",
    text_clears: 0,
    total_score: 0
  };

  const result = await syncPlayedPuzzleScores({
    player,
    nickname: "Nana",
    puzzleIds: ["", "loading"],
    submitScore: async () => {
      throw new Error("submitScore should not be called");
    }
  });

  assert.equal(result.submitted, 0);
  assert.deepEqual(result.syncedPuzzleIds, []);
  assert.equal(result.player, player);
});

test("tracks pending leaderboard scores separately from played puzzle history", () => {
  const storage = createMemoryStorage();

  addPendingScorePuzzleId("text-001", storage);
  addPendingScorePuzzleId("text-002", storage);
  addPendingScorePuzzleId("text-001", storage);
  addPendingScorePuzzleId("loading", storage);

  assert.deepEqual(readPendingScorePuzzleIds(storage), ["text-001", "text-002"]);
  assert.equal(storage.getItem(pendingScoreStorageKey), "[\"text-001\",\"text-002\"]");

  removePendingScorePuzzleIds(["text-001"], storage);
  assert.deepEqual(readPendingScorePuzzleIds(storage), ["text-002"]);
});

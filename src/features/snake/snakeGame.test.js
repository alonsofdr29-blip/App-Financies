import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialGameState,
  queueDirection,
  spawnFood,
  stepGame,
  togglePause,
} from "./snakeGame.js";

test("stepGame advances the snake by one cell without growing", () => {
  const state = createInitialGameState({ size: 6, rng: () => 0 });
  const next = stepGame(state, () => 0);

  assert.deepEqual(next.snake, [
    { x: 4, y: 3 },
    { x: 3, y: 3 },
    { x: 2, y: 3 },
  ]);
  assert.equal(next.score, 0);
  assert.equal(next.status, "playing");
});

test("stepGame grows the snake, increments score, and respawns food off the body", () => {
  const state = {
    size: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ],
    direction: "right",
    queuedDirection: "right",
    food: { x: 3, y: 2 },
    score: 0,
    status: "playing",
    reason: null,
  };

  const next = stepGame(state, () => 0);

  assert.equal(next.score, 1);
  assert.deepEqual(next.snake, [
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ]);
  assert.deepEqual(next.food, { x: 0, y: 0 });
});

test("stepGame detects wall and self collisions", () => {
  const wallState = {
    size: 4,
    snake: [
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ],
    direction: "right",
    queuedDirection: "right",
    food: { x: 0, y: 0 },
    score: 0,
    status: "playing",
    reason: null,
  };

  const selfState = {
    size: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    direction: "left",
    queuedDirection: "left",
    food: { x: 5, y: 5 },
    score: 3,
    status: "playing",
    reason: null,
  };

  assert.equal(stepGame(wallState).reason, "wall");
  assert.equal(stepGame(selfState).reason, "self");
});

test("queueDirection blocks immediate reversals and togglePause flips active states", () => {
  const state = createInitialGameState({ size: 8, rng: () => 0 });

  const ignoredTurn = queueDirection(state, "left");
  const acceptedTurn = queueDirection(state, "up");
  const paused = togglePause(state);
  const resumed = togglePause(paused);

  assert.equal(ignoredTurn.queuedDirection, "right");
  assert.equal(acceptedTurn.queuedDirection, "up");
  assert.equal(paused.status, "paused");
  assert.equal(resumed.status, "playing");
});

test("spawnFood returns the only free cell or null for a full board", () => {
  const oneCellLeft = spawnFood({
    size: 2,
    snake: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
    rng: () => 0.9,
  });

  const noCellsLeft = spawnFood({
    size: 2,
    snake: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    rng: () => 0,
  });

  assert.deepEqual(oneCellLeft, { x: 1, y: 1 });
  assert.equal(noCellsLeft, null);
});

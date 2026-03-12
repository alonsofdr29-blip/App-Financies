export const GRID_SIZE = 14;
export const TICK_MS = 160;

export const DIRECTION_VECTORS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  right: Object.freeze({ x: 1, y: 0 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
});

const OPPOSITE_DIRECTIONS = Object.freeze({
  up: "down",
  right: "left",
  down: "up",
  left: "right",
});

function clampRandomIndex(length, rng) {
  const candidate = Number(rng?.() ?? Math.random());
  const safeValue = Number.isFinite(candidate) ? candidate : Math.random();
  return Math.min(length - 1, Math.max(0, Math.floor(safeValue * length)));
}

export function isSameCell(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

export function isOppositeDirection(currentDirection, nextDirection) {
  return OPPOSITE_DIRECTIONS[currentDirection] === nextDirection;
}

export function createInitialSnake(size = GRID_SIZE) {
  const center = Math.floor(size / 2);

  return [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
}

export function getAvailableCells(size, snake) {
  const occupied = new Set(snake.map((segment) => `${segment.x}:${segment.y}`));
  const availableCells = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const key = `${x}:${y}`;
      if (!occupied.has(key)) {
        availableCells.push({ x, y });
      }
    }
  }

  return availableCells;
}

export function spawnFood({ size, snake, rng = Math.random }) {
  const availableCells = getAvailableCells(size, snake);

  if (availableCells.length === 0) {
    return null;
  }

  return availableCells[clampRandomIndex(availableCells.length, rng)];
}

export function createInitialGameState({ size = GRID_SIZE, rng = Math.random } = {}) {
  const snake = createInitialSnake(size);

  return {
    size,
    snake,
    direction: "right",
    queuedDirection: "right",
    food: spawnFood({ size, snake, rng }),
    score: 0,
    status: "playing",
    reason: null,
  };
}

export function queueDirection(state, nextDirection) {
  if (!DIRECTION_VECTORS[nextDirection]) {
    return state;
  }

  if (isOppositeDirection(state.direction, nextDirection)) {
    return state;
  }

  return { ...state, queuedDirection: nextDirection };
}

export function togglePause(state) {
  if (state.status === "playing") {
    return { ...state, status: "paused" };
  }

  if (state.status === "paused") {
    return { ...state, status: "playing" };
  }

  return state;
}

export function stepGame(state, rng = Math.random) {
  if (state.status !== "playing") {
    return state;
  }

  const nextDirection =
    DIRECTION_VECTORS[state.queuedDirection] && !isOppositeDirection(state.direction, state.queuedDirection)
      ? state.queuedDirection
      : state.direction;
  const vector = DIRECTION_VECTORS[nextDirection];
  const currentHead = state.snake[0];
  const nextHead = { x: currentHead.x + vector.x, y: currentHead.y + vector.y };
  const hitWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= state.size || nextHead.y >= state.size;

  if (hitWall) {
    return {
      ...state,
      direction: nextDirection,
      queuedDirection: nextDirection,
      status: "gameover",
      reason: "wall",
    };
  }

  const willEatFood = isSameCell(nextHead, state.food);
  const collisionBody = willEatFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = collisionBody.some((segment) => isSameCell(segment, nextHead));

  if (hitSelf) {
    return {
      ...state,
      direction: nextDirection,
      queuedDirection: nextDirection,
      status: "gameover",
      reason: "self",
    };
  }

  const nextSnake = [nextHead, ...state.snake];

  if (!willEatFood) {
    nextSnake.pop();
  }

  const nextFood = willEatFood ? spawnFood({ size: state.size, snake: nextSnake, rng }) : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction: nextDirection,
    queuedDirection: nextDirection,
    food: nextFood,
    score: state.score + (willEatFood ? 1 : 0),
    status: nextFood ? "playing" : "gameover",
    reason: nextFood ? null : "win",
  };
}

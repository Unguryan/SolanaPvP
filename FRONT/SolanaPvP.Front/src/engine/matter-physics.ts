// Matter.js physics engine for realistic Plinko collisions

import Matter from "matter-js";
import type { BoardConfig, BallState, DeterministicPath } from "@/utils/types";
import type { Logger } from "@/utils/logger";
import {
  rowYPosition,
  slotY,
  slotCenterX,
  slotIndexFromX,
  buildPins,
} from "./geometry";

// Steering parameters for guiding ball to correct hole
const STEERING_FORCE = 25; // Сильная сила отскока в нужную сторону (увеличено для более заметного отскока)
const STEERING_DAMPING = 0.95; // Damping factor for smooth movement

// Collision categories for filtering
const CATEGORY_BALL = 0x0001; // Шарики
const CATEGORY_PIN = 0x0002; // Пины
const CATEGORY_WALL = 0x0002; // Стены (та же категория что и пины)

// Matter.js engine instance (one per board)
let engine: Matter.Engine | null = null;
const pinBodies: Map<string, Matter.Body> = new Map(); // Map pin row-col to body
const ballBodyMap: Map<number, Matter.Body> = new Map(); // Map ballId to Matter body
const bodyIdToBallIdMap: Map<number, number> = new Map(); // Map Matter body.id to ballId
const ballPathMap: Map<number, DeterministicPath> = new Map(); // Map ballId to path
const ballConfigMap: Map<number, BoardConfig> = new Map(); // Map ballId to config

// Callback for pin collisions (for animations)
let onPinCollisionCallback: ((pinKey: string) => void) | null = null;

/**
 * Set callback for pin collisions
 */
export function setPinCollisionCallback(
  callback: ((pinKey: string) => void) | null
): void {
  onPinCollisionCallback = callback;
}

/**
 * Initialize Matter.js engine with deterministic settings
 */
export function initMatterEngine(cfg: BoardConfig): Matter.Engine {
  // Clean up existing engine if any
  if (engine) {
    cleanupMatterEngine();
  }

  // Create engine
  const newEngine = Matter.Engine.create();

  // Configure for determinism
  // Matter.js gravity is in pixels per second squared, scale is multiplier
  newEngine.world.gravity.y = cfg.gravity;
  newEngine.world.gravity.scale = 0.0001; // Очень маленький scale для медленного движения
  newEngine.timing.timeScale = 0.3; // Замедляем время для еще более медленного движения

  // Disable sleep to ensure consistent physics
  // Note: Matter.Sleeping.set works on bodies, not world, so we'll disable it per body if needed

  // Create boundary walls (invisible)
  const walls = [
    // Left wall
    Matter.Bodies.rectangle(0, cfg.height / 2, 1, cfg.height, {
      isStatic: true,
      render: { visible: false },
      collisionFilter: {
        category: CATEGORY_WALL,
        mask: CATEGORY_BALL, // Стены сталкиваются только с шариками
      },
    }),
    // Right wall
    Matter.Bodies.rectangle(cfg.width, cfg.height / 2, 1, cfg.height, {
      isStatic: true,
      render: { visible: false },
      collisionFilter: {
        category: CATEGORY_WALL,
        mask: CATEGORY_BALL,
      },
    }),
    // Top wall
    Matter.Bodies.rectangle(cfg.width / 2, 0, cfg.width, 1, {
      isStatic: true,
      render: { visible: false },
      collisionFilter: {
        category: CATEGORY_WALL,
        mask: CATEGORY_BALL,
      },
    }),
    // Bottom wall (above slots)
    Matter.Bodies.rectangle(cfg.width / 2, slotY(cfg) - 1, cfg.width, 1, {
      isStatic: true,
      render: { visible: false },
      collisionFilter: {
        category: CATEGORY_WALL,
        mask: CATEGORY_BALL,
      },
    }),
  ];

  Matter.World.add(newEngine.world, walls);

  // Create pin bodies
  const pins = buildPins(cfg);
  pinBodies.clear();
  const pinBodiesArray: Matter.Body[] = [];

  pins.forEach((pin) => {
    const pinBody = Matter.Bodies.circle(pin.x, pin.y, pin.r, {
      isStatic: true,
      restitution: 0.8, // Bounce coefficient (увеличено для более сильных отскоков)
      friction: 0.1, // Уменьшено трение
      frictionAir: 0,
      collisionFilter: {
        category: CATEGORY_PIN,
        mask: CATEGORY_BALL, // Пины сталкиваются только с шариками
      },
      render: {
        fillStyle: "#c084fc",
        strokeStyle: "#e9d5ff",
        lineWidth: 2,
      },
    });

    const pinKey = `${pin.row}-${pin.col}`;
    pinBodies.set(pinKey, pinBody);
    pinBodiesArray.push(pinBody);
  });

  Matter.World.add(newEngine.world, pinBodiesArray);

  // Set up collision event handler for steering
  Matter.Events.on(newEngine, "collisionStart", (event) => {
    console.log(
      `[COLLISION EVENT] collisionStart triggered with ${event.pairs.length} pairs`
    );
    handleCollision(event.pairs);
  });

  // Also listen to collisionActive for continuous collisions
  Matter.Events.on(newEngine, "collisionActive", (event) => {
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log(
        `[COLLISION EVENT] collisionActive triggered with ${event.pairs.length} pairs`
      );
    }
  });

  engine = newEngine;
  return newEngine;
}

/**
 * Handle collision events and apply steering towards target hole
 */
function handleCollision(pairs: Matter.Pair[]): void {
  pairs.forEach((pair) => {
    const { bodyA, bodyB } = pair;

    // Find which is ball and which is pin
    let ballBody: Matter.Body | null = null;
    let pinBody: Matter.Body | null = null;
    let ballId: number | null = null;

    // Check if bodyA is a ball
    const ballIdA = bodyIdToBallIdMap.get(bodyA.id);
    const ballIdB = bodyIdToBallIdMap.get(bodyB.id);

    if (ballIdA !== undefined) {
      ballBody = bodyA;
      ballId = ballIdA;
      pinBody = bodyB;
    } else if (ballIdB !== undefined) {
      ballBody = bodyB;
      ballId = ballIdB;
      pinBody = bodyA;
    }

    if (!ballBody || !pinBody || ballId === null) {
      // Not a ball-pin collision, ignore
      return;
    }

    // Log collision for debugging
    console.log(`[COLLISION] Ball ${ballId} collided with body ${pinBody.id}`);

    // Find which pin this is
    let pinRow = -1;
    let pinKey: string | null = null;

    for (const [key, body] of pinBodies.entries()) {
      if (body.id === pinBody.id) {
        pinKey = key;
        const [row] = key.split("-").map(Number);
        pinRow = row;
        break;
      }
    }

    if (pinRow === -1 || !pinKey) {
      // Это может быть стена, игнорируем
      return; // Not a pin collision
    }

    console.log(`[COLLISION] Ball ${ballId} hit pin at row ${pinRow}`);

    // Trigger pin collision callback for animation
    if (onPinCollisionCallback) {
      onPinCollisionCallback(pinKey);
    }

    // Get path and config for this ball
    const path = ballPathMap.get(ballId);
    const cfg = ballConfigMap.get(ballId);

    if (!path || !cfg) {
      console.log(`[COLLISION] No path or config for ball ${ballId}`);
      return;
    }

    // Determine target hole for this row
    const targetHoleX = path.targetPinsX[pinRow];
    if (targetHoleX === undefined) return;

    // Calculate direction from pin center to target hole
    const pinX = pinBody.position.x;
    const pinY = pinBody.position.y;
    const ballX = ballBody.position.x;
    const ballY = ballBody.position.y;

    const dx = targetHoleX - pinX;

    // Normalize direction
    const distance = Math.abs(dx);
    if (distance < 0.1) return; // Already at target

    const dirX = Math.sign(dx);

    // Calculate current velocity
    const vx = ballBody.velocity.x;
    const vy = ballBody.velocity.y;

    // СИЛЬНЫЙ ОТСКОК В НУЖНУЮ СТОРОНУ
    // Вычисляем нормаль столкновения (от пина к шарику)
    const normalDx = ballX - pinX;
    const normalDy = ballY - pinY;
    const normalLength = Math.sqrt(normalDx * normalDx + normalDy * normalDy);

    if (normalLength < 0.001) return; // Защита от деления на ноль

    const nx = normalDx / normalLength;
    const ny = normalDy / normalLength;

    // Вычисляем скорость вдоль нормали (проекция на нормаль)
    const vn = vx * nx + vy * ny;

    // Коэффициент восстановления для отскока
    const restitution = 0.8; // Увеличено для более сильного отскока

    // Отражение скорости по нормали (только если движемся к пину)
    let reflectedVx = vx;
    let reflectedVy = vy;

    if (vn < 0) {
      // Если движемся к пину, делаем отскок
      reflectedVx = vx - 2 * vn * nx;
      reflectedVy = vy - 2 * vn * ny;
    }

    // Применяем restitution
    let newVx = reflectedVx * restitution;
    let newVy = reflectedVy * restitution;

    // СИЛЬНЫЙ ИМПУЛЬС В НУЖНУЮ СТОРОНУ (к целевой дырке) - ВСЕГДА применяем при столкновении
    // Вычисляем направление к целевой дырке
    const targetDirX = dirX; // Направление к целевой дырке

    // Применяем сильный горизонтальный импульс в нужную сторону
    const impulseStrength = STEERING_FORCE; // Сила импульса
    newVx += targetDirX * impulseStrength; // Сильный отскок в нужную сторону

    // Сохраняем вертикальную скорость с небольшим демпфированием
    newVy *= STEERING_DAMPING;

    // Минимальная вертикальная скорость для продолжения падения
    if (newVy < 5) {
      newVy = 5;
    }

    // Применяем новую скорость
    Matter.Body.setVelocity(ballBody, {
      x: newVx,
      y: newVy,
    });

    console.log(
      `[COLLISION] Applied strong bounce: vx=${newVx.toFixed(
        2
      )}, vy=${newVy.toFixed(2)}, direction=${
        dirX > 0 ? "RIGHT" : "LEFT"
      }, targetHoleX=${targetHoleX.toFixed(2)}, pinX=${pinX.toFixed(
        2
      )}, row=${pinRow}`
    );
  });
}

/**
 * Initialize ball with Matter.js body
 */
export function initBallMatter(
  cfg: BoardConfig,
  targetSlot: number,
  id: number,
  path: DeterministicPath
): { ballState: BallState; matterBody: Matter.Body } {
  if (!engine) {
    throw new Error(
      "Matter.js engine not initialized. Call initMatterEngine first."
    );
  }

  // Create Matter.js body for ball
  const matterBody = Matter.Bodies.circle(
    cfg.width / 2,
    cfg.ballRadius + 5,
    cfg.ballRadius,
    {
      restitution: 0.7, // Bounce coefficient (увеличено для более сильных отскоков)
      friction: 0.2, // Уменьшено трение для более плавного движения
      frictionAir: 0.05, // Уменьшено сопротивление воздуха
      density: 0.001,
      collisionFilter: {
        category: CATEGORY_BALL,
        mask: CATEGORY_PIN | CATEGORY_WALL, // Шарики сталкиваются только с пинами и стенами, НЕ друг с другом
      },
    }
  );

  // Set initial velocity (very small downward for realistic start)
  Matter.Body.setVelocity(matterBody, { x: 0, y: 0.01 });

  // Add to world
  Matter.World.add(engine.world, matterBody);

  // Create BallState for compatibility
  const ballState: BallState = {
    id,
    p: { x: matterBody.position.x, y: matterBody.position.y },
    v: { x: matterBody.velocity.x, y: matterBody.velocity.y },
    radius: cfg.ballRadius,
    nextRow: 0,
    ignoreCollisionsUntilY: 0,
    lastCollidedRow: -1,
    lastCollidedPinCol: -1,
    hasLanded: false,
    targetSlot,
  };

  // Store mappings
  ballBodyMap.set(id, matterBody);
  bodyIdToBallIdMap.set(matterBody.id, id);
  ballPathMap.set(id, path);
  ballConfigMap.set(id, cfg);

  return { ballState, matterBody };
}

/**
 * Update Matter.js engine (call once per frame before updating all balls)
 */
export function updateMatterEngine(dt: number): void {
  if (!engine) return;
  // Update Matter.js engine with fixed timestep
  // Matter.js expects deltaTime in milliseconds
  Matter.Engine.update(engine, dt * 1000);
}

/**
 * Advance ball physics using Matter.js (syncs position from Matter.js body)
 */
export function advanceBallMatter(
  cfg: BoardConfig,
  ball: BallState,
  path: DeterministicPath,
  dt: number,
  logger: Logger
): void {
  if (ball.hasLanded) return;

  if (!engine) {
    throw new Error("Matter.js engine not initialized.");
  }

  const matterBody = ballBodyMap.get(ball.id);
  if (!matterBody) {
    logger.warn("PHYS", `Ball ${ball.id} has no Matter.js body`, {}, ball.id);
    return;
  }

  // Sync position and velocity from Matter.js to BallState
  ball.p.x = matterBody.position.x;
  ball.p.y = matterBody.position.y;
  ball.v.x = matterBody.velocity.x;
  ball.v.y = matterBody.velocity.y;

  // ПОСТОЯННОЕ ПРИТЯГИВАНИЕ К ЦЕЛЕВОЙ ДЫРКЕ для точного попадания на пины
  // Определяем текущий ряд шарика
  const currentRow = Math.max(0, Math.min(cfg.rows - 1, ball.nextRow));
  const targetHoleX = path.targetPinsX[currentRow];

  if (targetHoleX !== undefined) {
    const ballX = matterBody.position.x;
    const dx = targetHoleX - ballX;
    const distance = Math.abs(dx);

    // Логирование для отладки
    if (Math.random() < 0.05) {
      // Логируем примерно 5% кадров, чтобы не спамить
      console.log(
        `[ATTRACTION] Ball ${ball.id} row ${currentRow}: ballX=${ballX.toFixed(
          2
        )}, targetHoleX=${targetHoleX.toFixed(2)}, distance=${distance.toFixed(
          2
        )}, vx=${matterBody.velocity.x.toFixed(2)}`
      );
    }

    // Применяем мягкое притягивание только если шарик не слишком близко к цели
    if (distance > 5) {
      // Сила притягивания зависит от расстояния (чем дальше, тем сильнее)
      const attractionStrength = Math.min(distance * 0.05, 2); // Максимум 2 пикселя за кадр
      const dirX = Math.sign(dx);

      // Применяем горизонтальное притягивание
      const currentVx = matterBody.velocity.x;
      const targetVx = dirX * attractionStrength;

      // Плавно смешиваем текущую скорость с целевой
      const blendFactor = 0.1; // Небольшое влияние для плавности
      const newVx = currentVx * (1 - blendFactor) + targetVx * blendFactor;

      Matter.Body.setVelocity(matterBody, {
        x: newVx,
        y: matterBody.velocity.y, // Вертикальную скорость не трогаем
      });
    } else {
      // Логируем когда шарик близко к цели
      if (Math.random() < 0.1) {
        console.log(
          `[ATTRACTION] Ball ${
            ball.id
          } row ${currentRow}: CLOSE to target! ballX=${ballX.toFixed(
            2
          )}, targetHoleX=${targetHoleX.toFixed(
            2
          )}, distance=${distance.toFixed(2)}`
        );
      }
    }
  } else {
    // Логируем если нет целевой дырки для этого ряда
    if (Math.random() < 0.01) {
      console.log(
        `[ATTRACTION] Ball ${
          ball.id
        } row ${currentRow}: NO TARGET HOLE! path.targetPinsX=${JSON.stringify(
          path.targetPinsX
        )}`
      );
    }
  }

  // Check if we've crossed into next row
  if (ball.nextRow < cfg.rows) {
    const nextRowY = rowYPosition(cfg, ball.nextRow);

    if (ball.p.y >= nextRowY) {
      const oldRow = ball.nextRow;
      ball.nextRow++;

      logger.info(
        "ROW",
        `🎯 ROW CROSSED: ${oldRow} → ${ball.nextRow}`,
        {
          oldRow,
          newRow: ball.nextRow,
          ballY: ball.p.y,
          rowY: nextRowY,
          ballX: ball.p.x,
          vx: ball.v.x,
          vy: ball.v.y,
        },
        ball.id
      );
    }
  }

  // Check landing - only after passing all rows
  const slotYPos = slotY(cfg);
  const landingZoneY = slotYPos;

  const hasPassedAllRows = ball.nextRow >= cfg.rows;
  // Упрощенное условие: шарик прошел последний ряд и достиг зоны слотов
  const hasReachedLandingZone = ball.p.y + ball.radius >= landingZoneY - 5; // Небольшой запас для надежности

  // Логирование для отладки landing
  if (hasPassedAllRows && !ball.hasLanded) {
    if (Math.random() < 0.1) {
      // Логируем примерно 10% кадров
      console.log(
        `[LANDING CHECK] Ball ${ball.id}: nextRow=${ball.nextRow}, rows=${
          cfg.rows
        }, ballY=${ball.p.y.toFixed(2)}, ballRadius=${
          ball.radius
        }, slotYPos=${slotYPos}, hasReachedLandingZone=${hasReachedLandingZone}`
      );
    }
  }

  if (hasPassedAllRows && hasReachedLandingZone && !ball.hasLanded) {
    // Final correction: always correct to target slot
    const targetSlotX = slotCenterX(cfg, ball.targetSlot);

    // Set position directly
    Matter.Body.setPosition(matterBody, {
      x: targetSlotX,
      y: slotYPos - ball.radius,
    });
    Matter.Body.setVelocity(matterBody, { x: 0, y: 0 });

    ball.p.x = targetSlotX;
    ball.p.y = slotYPos - ball.radius;
    ball.v.x = 0;
    ball.v.y = 0;
    ball.hasLanded = true;

    const finalSlot = slotIndexFromX(cfg, ball.p.x);
    logger.info(
      "LAND",
      `Ball landed in slot ${finalSlot}`,
      {
        targetSlot: ball.targetSlot,
        finalSlot,
        x: ball.p.x,
        y: ball.p.y,
      },
      ball.id
    );

    return;
  }

  // Boundary clamping (safety)
  ball.p.x = Math.max(ball.radius, Math.min(cfg.width - ball.radius, ball.p.x));
  ball.p.y = Math.max(
    ball.radius,
    Math.min(cfg.height - ball.radius, ball.p.y)
  );

  // Update Matter.js body position if clamped
  if (
    matterBody.position.x !== ball.p.x ||
    matterBody.position.y !== ball.p.y
  ) {
    Matter.Body.setPosition(matterBody, { x: ball.p.x, y: ball.p.y });
  }
}

/**
 * Remove ball from Matter.js world
 */
export function removeBallMatter(ballId: number): void {
  if (!engine) return;

  const matterBody = ballBodyMap.get(ballId);
  if (matterBody) {
    Matter.World.remove(engine.world, matterBody);
    ballBodyMap.delete(ballId);
    bodyIdToBallIdMap.delete(matterBody.id);
    ballPathMap.delete(ballId);
    ballConfigMap.delete(ballId);
  }
}

/**
 * Clean up Matter.js engine
 */
export function cleanupMatterEngine(): void {
  if (engine) {
    Matter.Engine.clear(engine);
    engine = null;
  }
  pinBodies.clear();
  ballBodyMap.clear();
  bodyIdToBallIdMap.clear();
  ballPathMap.clear();
  ballConfigMap.clear();
}

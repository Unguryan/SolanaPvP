// Deterministic Plinko board with Canvas2D rendering
import React, { useEffect, useRef, useState, useCallback } from "react";
import { getSlotValues } from "@/utils/plinkoScoreBreakdown";
import type { BoardConfig, BallState, DeterministicPath } from "@/utils/types";
import {
  createDefaultConfig,
  buildPins,
  slotY,
  slotIndexFromX,
  slotCenterX,
  slotWidth,
} from "@/engine/geometry";
import { computeDeterministicPath } from "@/engine/path";
import {
  advanceBall,
  updatePhysics,
  initBall,
  initPhysics,
  cleanupPhysics,
  removeBall,
} from "@/engine/physics";
import { setPinCollisionCallback } from "@/engine/matter-physics";
import { makeLogger } from "@/utils/logger";
import { DebugOverlay } from "./DebugOverlay";

interface PlinkoBoardProps {
  rows: number;
  slots: number;
  onBallLand: (slotIndex: number, value: number) => void;
  allTargetSlots: number[];
  ballDropCount?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface PinAnimation {
  startTime: number;
  duration: number;
}

const FIXED_DT = 1 / 120; // Fixed timestep for deterministic physics

// Easing functions for smooth animations
const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const easeOutBounce = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
  rows: propsRows,
  slots,
  onBallLand,
  allTargetSlots,
  ballDropCount = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const ballsRef = useRef<Map<number, BallState>>(new Map());
  const pathsRef = useRef<Map<number, DeterministicPath>>(new Map());
  const onBallLandRef = useRef(onBallLand);
  const lastDropCountRef = useRef(0);
  const loggerRef = useRef(makeLogger({ bufferSize: 5000 }));

  const slotValuesRef = useRef<number[]>([]);
  if (slotValuesRef.current.length === 0) {
    slotValuesRef.current = getSlotValues(slots);
  }
  const slotValues = slotValuesRef.current;

  const isVerySmallScreen =
    typeof window !== "undefined" && window.innerWidth < 400;
  const rows = isVerySmallScreen ? Math.min(propsRows, 7) : propsRows;

  const [bouncingSlots, setBouncingSlots] = useState<
    Map<number, { startTime: number; duration: number }>
  >(new Map());
  const [bouncingPins, setBouncingPins] = useState<Map<string, PinAnimation>>(
    new Map()
  ); // pin key -> animation data
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    onBallLandRef.current = onBallLand;
  }, [onBallLand]);

  // Size configuration
  const sizeConfig = useRef<{
    isMobile: boolean;
    isVerySmall: boolean;
    WIDTH: number;
    HEIGHT: number;
    PIN_RADIUS: number;
    BALL_RADIUS: number;
    SLOT_HEIGHT: number;
  } | null>(null);

  if (!sizeConfig.current && typeof window !== "undefined") {
    const isMobile = window.innerWidth < 768;
    const isVerySmall = window.innerWidth < 400;
    sizeConfig.current = {
      isMobile,
      isVerySmall,
      WIDTH: isVerySmall
        ? Math.min(window.innerWidth - 20, 380)
        : isMobile
        ? Math.min(window.innerWidth - 40, 600)
        : 800,
      HEIGHT: isVerySmall ? 360 : isMobile ? 480 : 600,
      PIN_RADIUS: isVerySmall ? 3 : isMobile ? 5 : 8,
      BALL_RADIUS: isVerySmall ? 5 : isMobile ? 7 : 10,
      SLOT_HEIGHT: isVerySmall ? 48 : isMobile ? 56 : 80,
    };
  }

  const { isVerySmall, WIDTH, HEIGHT, PIN_RADIUS, BALL_RADIUS, SLOT_HEIGHT } =
    sizeConfig.current || {
      isMobile: false,
      isVerySmall: false,
      WIDTH: 800,
      HEIGHT: 600,
      PIN_RADIUS: 8,
      BALL_RADIUS: 10,
      SLOT_HEIGHT: 80,
    };

  // Create board config
  const cfg: BoardConfig = createDefaultConfig(rows, slots, WIDTH, HEIGHT);
  cfg.pinRadius = PIN_RADIUS;
  cfg.ballRadius = BALL_RADIUS;
  cfg.slotHeight = SLOT_HEIGHT;

  // Build pins once
  const pins = buildPins(cfg);

  // Initialize Matter.js engine once
  useEffect(() => {
    initPhysics(cfg);

    // Set up pin collision callback for animations
    setPinCollisionCallback((pinKey: string) => {
      const [rowStr, colStr] = pinKey.split("-");
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const pin = pins.find((p) => p.row === row && p.col === col);

      if (pin) {
        // Create spark particles
        const sparkCount = 8;
        const newParticles: Particle[] = [];
        for (let i = 0; i < sparkCount; i++) {
          const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.3;
          const speed = 2 + Math.random() * 3;
          newParticles.push({
            x: pin.x,
            y: pin.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 1,
            maxLife: 0.6 + Math.random() * 0.4,
            color: `hsl(${280 + Math.random() * 40}, 100%, ${
              60 + Math.random() * 20
            }%)`,
            size: 2 + Math.random() * 2,
          });
        }
        setParticles((prev) => [...prev, ...newParticles]);

        // Start pin animation
        setBouncingPins((prev) => {
          const newMap = new Map(prev);
          newMap.set(pinKey, { startTime: Date.now(), duration: 400 });
          return newMap;
        });

        // Remove animation after duration
        setTimeout(() => {
          setBouncingPins((prev) => {
            const newMap = new Map(prev);
            newMap.delete(pinKey);
            return newMap;
          });
        }, 400);
      }
    });

    return () => {
      setPinCollisionCallback(null);
      cleanupPhysics();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, slots, WIDTH, HEIGHT]);

  // Drop ball function
  const dropBall = useCallback(() => {
    if (
      ballDropCount <= lastDropCountRef.current ||
      allTargetSlots.length === 0
    )
      return;

    const currentBallIndex = ballDropCount - 1;
    const targetSlotIndex = allTargetSlots[currentBallIndex];

    if (targetSlotIndex === undefined) {
      console.log("❌ No target slot for ball", currentBallIndex);
      return;
    }

    console.log(
      `🎲 Dropping ball #${ballDropCount} → target slot ${targetSlotIndex}`
    );
    lastDropCountRef.current = ballDropCount;

    // Compute deterministic path with randomization for visual variety
    const ballId = Date.now() + Math.random();
    const path = computeDeterministicPath(cfg, targetSlotIndex, ballId);
    const ball = initBall(cfg, targetSlotIndex, ballId, path);

    ballsRef.current.set(ballId, ball);
    pathsRef.current.set(ballId, path);

    loggerRef.current.info("INIT", `Ball dropped`, {
      ballId,
      targetSlot: targetSlotIndex,
      rows: cfg.rows,
      slotCount: cfg.slotCount,
    });
  }, [ballDropCount, allTargetSlots, cfg]);

  // Drop ball when count changes
  useEffect(() => {
    dropBall();
  }, [dropBall]);

  // Reset when rows/slots change
  useEffect(() => {
    lastDropCountRef.current = 0;
    ballsRef.current.clear();
    pathsRef.current.clear();
  }, [rows, slots]);

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Полифилл для roundRect (если не поддерживается)
    if (!ctx.roundRect) {
      ctx.roundRect = function (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
      };
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw pins with smooth animation
    const currentTime = Date.now();
    pins.forEach((pin) => {
      const pinKey = `${pin.row}-${pin.col}`;
      const animation = bouncingPins.get(pinKey);

      let bounceScale = 1.0;
      let bounceGlow = 0.0;

      if (animation) {
        const elapsed = currentTime - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);

        // Use elastic easing for bouncy effect
        const easedProgress = easeOutElastic(progress);
        bounceScale = 1.0 + easedProgress * 0.5; // Max 1.5x size
        bounceGlow = (1 - progress) * 1.0; // Fade out glow
      }

      // Свечение при столкновении с более сильным эффектом
      if (bounceGlow > 0) {
        ctx.shadowBlur = 25 * bounceGlow;
        ctx.shadowColor = "#c084fc";
      } else {
        ctx.shadowBlur = 0;
      }

      // Gradient for pins
      const pinGradient = ctx.createRadialGradient(
        pin.x - pin.r * 0.3,
        pin.y - pin.r * 0.3,
        0,
        pin.x,
        pin.y,
        pin.r * bounceScale
      );
      pinGradient.addColorStop(0, bounceGlow > 0 ? "#f0abfc" : "#e9d5ff");
      pinGradient.addColorStop(1, "#c084fc");

      ctx.fillStyle = pinGradient;
      ctx.strokeStyle = bounceGlow > 0 ? "#f0abfc" : "#e9d5ff";
      ctx.lineWidth = 2 + bounceGlow * 2;

      ctx.beginPath();
      ctx.arc(pin.x, pin.y, pin.r * bounceScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Сбрасываем shadow
      ctx.shadowBlur = 0;
    });

    // Draw particles (sparks)
    particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life;

      // Glow effect for particles
      ctx.shadowBlur = 10 * particle.life;
      ctx.shadowColor = particle.color;

      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particle.size * particle.life,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    });

    // Draw slots - расположены МЕЖДУ пинами последнего ряда
    // Современный стиль с скругленными углами и анимацией
    const slotYPos = slotY(cfg) - 20; // Поднимаем слоты выше
    const slotW = slotWidth(cfg); // Ширина слота = расстояние между пинами
    const slotMargin = 4; // Отступ между слотами (увеличено)
    const slotBorderWidth = 1; // Толщина границы
    const slotRadius = 8; // Скругление углов

    slotValues.forEach((value, index) => {
      const slotCenter = slotCenterX(cfg, index);
      const slotLeft = slotCenter - slotW / 2;
      const slotAnimation = bouncingSlots.get(index);

      // Вычисляем позицию с учетом отступов
      const slotX = slotLeft + slotMargin;
      const slotWidthWithMargin = slotW - slotMargin * 2;
      const slotHeightWithMargin = SLOT_HEIGHT - slotMargin * 2;

      // Smooth animation with bounce effect
      let bounceScale = 1.0;
      let bounceGlow = 0.0;
      let verticalOffset = 0;

      if (slotAnimation) {
        const elapsed = currentTime - slotAnimation.startTime;
        const progress = Math.min(elapsed / slotAnimation.duration, 1);

        // Use bounce easing for lift up/down effect
        const easedProgress = easeOutBounce(progress);

        // Lift up then down (-20px max lift)
        verticalOffset = -20 * (1 - easedProgress);

        // Scale and glow
        bounceScale = 1.0 + (1 - easedProgress) * 0.15;
        bounceGlow = (1 - progress) * 1.0;
      }

      const animatedSlotX =
        slotX - (slotWidthWithMargin * (bounceScale - 1)) / 2;
      const animatedSlotY =
        slotYPos +
        slotMargin +
        verticalOffset -
        (slotHeightWithMargin * (bounceScale - 1)) / 2;
      const animatedSlotW = slotWidthWithMargin * bounceScale;
      const animatedSlotH = slotHeightWithMargin * bounceScale;

      // Определяем цвета в стиле приложения (точно как в PlinkoGame.tsx)
      // Используем те же Tailwind цвета: from-{color}-500/30 to-{color}-700/20
      let gradientColors: {
        bgStart: string;
        bgEnd: string;
        border: string;
        text: string;
      };

      if (value === 1) {
        // red-500/30 to red-700/20, border-red-500/50, text-red-300
        gradientColors = {
          bgStart: "rgba(239, 68, 68, 0.3)", // red-500/30
          bgEnd: "rgba(185, 28, 28, 0.2)", // red-700/20
          border: "rgba(239, 68, 68, 0.5)", // red-500/50
          text: "#fca5a5", // text-red-300
        };
      } else if (value >= 200) {
        // yellow-400/30 to yellow-600/20, border-yellow-400/50, text-yellow-200
        gradientColors = {
          bgStart: "rgba(250, 204, 21, 0.3)", // yellow-400/30
          bgEnd: "rgba(202, 138, 4, 0.2)", // yellow-600/20
          border: "rgba(250, 204, 21, 0.5)", // yellow-400/50
          text: "#fde047", // text-yellow-200
        };
      } else if (value >= 100) {
        // orange-400/30 to orange-600/20, border-orange-400/50, text-orange-200
        gradientColors = {
          bgStart: "rgba(251, 146, 60, 0.3)", // orange-400/30
          bgEnd: "rgba(234, 88, 12, 0.2)", // orange-600/20
          border: "rgba(251, 146, 60, 0.5)", // orange-400/50
          text: "#fed7aa", // text-orange-200
        };
      } else if (value >= 50) {
        // green-400/30 to green-600/20, border-green-400/50, text-green-200
        gradientColors = {
          bgStart: "rgba(74, 222, 128, 0.3)", // green-400/30
          bgEnd: "rgba(22, 163, 74, 0.2)", // green-600/20
          border: "rgba(74, 222, 128, 0.5)", // green-400/50
          text: "#bbf7d0", // text-green-200
        };
      } else if (value >= 20) {
        // cyan-400/30 to cyan-600/20, border-cyan-400/50, text-cyan-200
        gradientColors = {
          bgStart: "rgba(34, 211, 238, 0.3)", // cyan-400/30
          bgEnd: "rgba(8, 145, 178, 0.2)", // cyan-600/20
          border: "rgba(34, 211, 238, 0.5)", // cyan-400/50
          text: "#a5f3fc", // text-cyan-200
        };
      } else {
        // blue-400/30 to blue-600/20, border-blue-400/50, text-blue-200
        gradientColors = {
          bgStart: "rgba(96, 165, 250, 0.3)", // blue-400/30
          bgEnd: "rgba(37, 99, 235, 0.2)", // blue-600/20
          border: "rgba(96, 165, 250, 0.5)", // blue-400/50
          text: "#bfdbfe", // text-blue-200
        };
      }

      // Создаем вертикальный градиент для слота (glass-card стиль)
      const slotGradient = ctx.createLinearGradient(
        animatedSlotX,
        animatedSlotY,
        animatedSlotX,
        animatedSlotY + animatedSlotH
      );
      slotGradient.addColorStop(0, gradientColors.bgStart);
      slotGradient.addColorStop(1, gradientColors.bgEnd);

      // Рисуем более сильное свечение при анимации
      if (bounceGlow > 0) {
        ctx.shadowBlur = 30 * bounceGlow;
        ctx.shadowColor = gradientColors.border;
      } else {
        ctx.shadowBlur = 0;
      }

      // Рисуем фон слота с градиентом и скругленными углами
      ctx.fillStyle = slotGradient;
      ctx.beginPath();
      ctx.roundRect(
        animatedSlotX,
        animatedSlotY,
        animatedSlotW,
        animatedSlotH,
        slotRadius
      );
      ctx.fill();

      // Рисуем границу слота (тонкая, полупрозрачная) со скругленными углами
      ctx.strokeStyle = gradientColors.border;
      ctx.lineWidth = slotBorderWidth;
      ctx.beginPath();
      ctx.roundRect(
        animatedSlotX,
        animatedSlotY,
        animatedSlotW,
        animatedSlotH,
        slotRadius
      );
      ctx.stroke();

      // Сбрасываем shadow
      ctx.shadowBlur = 0;

      // Slot value text (moves with slot)
      const textY = slotYPos + SLOT_HEIGHT / 2 + verticalOffset;

      ctx.font = `${isVerySmall ? "11px" : "14px"} bold sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Тень текста для читаемости
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillText(value.toString(), slotCenter + 1, textY + 1);

      // Основной текст с цветом из палитры
      ctx.fillStyle = gradientColors.text;
      ctx.fillText(value.toString(), slotCenter, textY);
    });

    // Draw balls
    ballsRef.current.forEach((ball) => {
      if (ball.hasLanded) return;

      // Ball shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.ellipse(
        ball.p.x,
        ball.p.y + ball.radius + 2,
        ball.radius * 0.8,
        ball.radius * 0.4,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Ball gradient
      const ballGradient = ctx.createRadialGradient(
        ball.p.x - ball.radius * 0.3,
        ball.p.y - ball.radius * 0.3,
        0,
        ball.p.x,
        ball.p.y,
        ball.radius
      );
      ballGradient.addColorStop(0, "#fbbf24");
      ballGradient.addColorStop(1, "#f59e0b");
      ctx.fillStyle = ballGradient;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(ball.p.x, ball.p.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }, [
    WIDTH,
    HEIGHT,
    pins,
    slotValues,
    bouncingSlots,
    bouncingPins,
    particles,
    cfg,
    isVerySmall,
    SLOT_HEIGHT,
  ]);

  // Animation loop with fixed timestep
  useEffect(() => {
    let running = true;

    const animate = (currentTime: number) => {
      if (!running) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      // Fixed timestep accumulator
      accumulatorRef.current += deltaTime;
      const maxFrameTime = 0.25; // Prevent spiral of death
      accumulatorRef.current = Math.min(accumulatorRef.current, maxFrameTime);

      // Update particles
      setParticles((prev) => {
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity
            life: p.life - 1 / 60 / p.maxLife,
          }))
          .filter((p) => p.life > 0);
      });

      // Physics steps
      while (accumulatorRef.current >= FIXED_DT) {
        // Update Matter.js engine once per step
        updatePhysics(FIXED_DT);

        ballsRef.current.forEach((ball, ballId) => {
          if (ball.hasLanded) return;

          const path = pathsRef.current.get(ballId);
          if (!path) return;

          advanceBall(cfg, ball, path, FIXED_DT, loggerRef.current);

          // Check landing
          if (ball.hasLanded) {
            const finalSlot = slotIndexFromX(cfg, ball.p.x);
            const value = slotValues[finalSlot];

            console.log(
              `🎯 Ball #${ballId} landed in slot ${finalSlot} (target: ${ball.targetSlot}) Value: ${value}`
            );

            // Trigger smooth bounce animation
            setBouncingSlots((prev) => {
              const newMap = new Map(prev);
              newMap.set(finalSlot, { startTime: Date.now(), duration: 600 });
              return newMap;
            });
            setTimeout(() => {
              setBouncingSlots((prev) => {
                const newMap = new Map(prev);
                newMap.delete(finalSlot);
                return newMap;
              });
            }, 600);

            // Notify parent
            onBallLandRef.current(finalSlot, value);

            // Remove ball after delay
            setTimeout(() => {
              removeBall(ballId);
              ballsRef.current.delete(ballId);
              pathsRef.current.delete(ballId);
            }, 500);
          }
        });

        accumulatorRef.current -= FIXED_DT;
      }

      // Render
      render();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cfg, render, slotValues]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    render();
  }, [WIDTH, HEIGHT, render]);

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: WIDTH + "px" }}>
      <canvas
        ref={canvasRef}
        className={`relative ${isVerySmall ? "rounded-lg" : "rounded-xl"}`}
        style={{
          width: WIDTH + "px",
          height: HEIGHT + "px",
          margin: "0 auto",
          border: isVerySmall ? "none" : "1px solid rgba(168, 85, 247, 0.2)",
          display: "block",
        }}
      />
      {showDebug && (
        <DebugOverlay
          cfg={cfg}
          balls={Array.from(ballsRef.current.values())}
          paths={pathsRef.current}
          showTargetPath={true}
          showCorridors={true}
          showVelocities={true}
          showMagnetZone={true}
        />
      )}
      {/* Debug toggle button */}
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-purple-500/20 text-purple-200 rounded"
        >
          Debug
        </button>
      )}
    </div>
  );
};

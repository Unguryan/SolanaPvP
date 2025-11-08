// Plinko board with REAL PHYSICS using Matter.js
import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { motion } from "framer-motion";
import { getSlotValues } from "@/utils/plinkoScoreBreakdown";

interface PlinkoBoardProps {
  rows: number; // 5, 7, or 9
  slots: number; // 6, 8, or 10
  onBallLand: (slotIndex: number, value: number) => void;
  allTargetSlots: number[]; // ВСЕ слоты для всех шариков!
  ballDropCount?: number; // Сколько шариков бросили
}

export const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
  rows: propsRows,
  slots,
  onBallLand,
  allTargetSlots,
  ballDropCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null); // Контейнер вместо canvas!
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const onBallLandRef = useRef(onBallLand);
  
  // Calculate slot values ONCE and memoize
  const slotValuesRef = useRef<number[]>([]);
  if (slotValuesRef.current.length === 0) {
    slotValuesRef.current = getSlotValues(slots);
  }
  const slotValues = slotValuesRef.current;
  
  // Адаптивное количество rows для маленьких экранов
  const isVerySmallScreen = typeof window !== 'undefined' && window.innerWidth < 400;
  const rows = isVerySmallScreen ? Math.min(propsRows, 7) : propsRows; // Макс 7 rows на маленьких!
  
  // Removed spark/pin animations - они убивают FPS!
  
  // Slot bounce animations
  const [bouncingSlots, setBouncingSlots] = useState<Set<number>>(new Set());
  
  // Keep onBallLand ref updated (use useEffect to avoid re-render loops!)
  useEffect(() => {
    onBallLandRef.current = onBallLand;
  }, [onBallLand]);
  
  // Adaptive sizes - MEMOIZE to prevent engine recreation!
  const sizeConfig = useRef<{
    isMobile: boolean;
    isVerySmall: boolean;
    WIDTH: number;
    HEIGHT: number;
    PIN_RADIUS: number;
    BALL_RADIUS: number;
    SLOT_HEIGHT: number;
  } | null>(null);
  
  if (!sizeConfig.current && typeof window !== 'undefined') {
    const isMobile = window.innerWidth < 768;
    const isVerySmall = window.innerWidth < 400;
    sizeConfig.current = {
      isMobile,
      isVerySmall,
      WIDTH: isVerySmall 
        ? window.innerWidth - 10 
        : isMobile 
        ? Math.min(window.innerWidth - 30, 600) 
        : 800,
      HEIGHT: isVerySmall ? 300 : isMobile ? 400 : 600,
      PIN_RADIUS: isVerySmall ? 3 : isMobile ? 5 : 8,
      BALL_RADIUS: isVerySmall ? 4 : isMobile ? 6 : 10, // Увеличил на 1-2px
      SLOT_HEIGHT: isVerySmall ? 40 : isMobile ? 50 : 80,
    };
  }
  
  const { isMobile, isVerySmall, WIDTH, HEIGHT, PIN_RADIUS, BALL_RADIUS, SLOT_HEIGHT } = sizeConfig.current || {
    isMobile: false,
    isVerySmall: false,
    WIDTH: 800,
    HEIGHT: 600,
    PIN_RADIUS: 8,
    BALL_RADIUS: 10, // Увеличил на 1px
    SLOT_HEIGHT: 80,
  };

  // Initialize Matter.js physics engine ONCE
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Creating Matter.js engine

    const { Engine, Render, World, Bodies, Runner, Events } = Matter;

    // Create engine with optimized settings
    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0012 }, // Замедлил (было 0.0015)
      enableSleeping: false, // Disable sleeping для более плавной анимации
    });
    engineRef.current = engine;

    // Create renderer - Matter.js создаст canvas сам!
    const render = Render.create({
      element: containerRef.current, // Передаем контейнер!
      engine: engine,
      options: {
        width: WIDTH,
        height: HEIGHT,
        wireframes: false, // Красивая графика!
        background: "#1a1a2e", // Темный фон
        pixelRatio: 1, // Убрал retina для FPS
        hasBounds: false,
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false,
      },
    });
    renderRef.current = render;
    
    // Renderer ready

    // Create walls - ТОНКИЕ и НЕВИДИМЫЕ!
    const wallOptions = {
      isStatic: true,
      render: { 
        fillStyle: "transparent", // НЕВИДИМЫЕ стены!
        strokeStyle: "transparent",
        lineWidth: 0
      },
    };
    
    const leftWall = Bodies.rectangle(-5, HEIGHT / 2, 10, HEIGHT, wallOptions); // За краем
    const rightWall = Bodies.rectangle(WIDTH + 5, HEIGHT / 2, 10, HEIGHT, wallOptions); // За краем
    const bottom = Bodies.rectangle(WIDTH / 2, HEIGHT + 5, WIDTH, 10, wallOptions);
    
    World.add(engine.world, [leftWall, rightWall, bottom]);

    // Create pins in pyramid formation
    const pins: Matter.Body[] = [];
    const actualSlots = slotValuesRef.current.length;
    const pinSpacingX = WIDTH / (actualSlots + 1);
    const topMargin = 50; // Меньше отступ сверху - пирамида выше!
    const pinSpacingY = (HEIGHT - SLOT_HEIGHT - topMargin - 20) / (rows + 1); // Больше места для пинов

    for (let row = 0; row < rows; row++) {
      const pinsInRow = row + 2;
      const rowY = topMargin + pinSpacingY * (row + 1);
      const startX = WIDTH / 2 - (pinSpacingX * (pinsInRow - 1)) / 2;

      for (let col = 0; col < pinsInRow; col++) {
        const pinX = startX + col * pinSpacingX;
        const pin = Bodies.circle(pinX, rowY, PIN_RADIUS, {
          isStatic: true,
          restitution: 0.7, // Bounciness
          render: {
            fillStyle: "#c084fc", // Более яркий фиолетовый
            strokeStyle: "#e9d5ff",
            lineWidth: 2,
          },
          label: `pin-${row}-${col}`,
          collisionFilter: {
            category: 0x0001, // Pin category
          },
        });
        pins.push(pin);
      }
    }
    World.add(engine.world, pins);
    // Pins added

    // Create slot dividers - ОЧЕНЬ ТОНКИЕ!
    const slotWidth = WIDTH / actualSlots;
    for (let i = 0; i <= actualSlots; i++) {
      const divider = Bodies.rectangle(
        i * slotWidth,
        HEIGHT - SLOT_HEIGHT / 2,
        1, // ТОНКИЕ разделители (было 3!)
        SLOT_HEIGHT,
        {
          isStatic: true,
          render: { 
            fillStyle: "rgba(168, 85, 247, 0.2)", // Менее яркие
            strokeStyle: "transparent"
          },
        }
      );
      World.add(engine.world, divider);
    }
    // Slots created

    // Collision detection - visual feedback through Matter.js renderer
    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const pin = [bodyA, bodyB].find((b) => b.label?.startsWith("pin-"));
        const ball = [bodyA, bodyB].find((b) => b.label?.startsWith("ball-"));
        
        if (pin && ball) {
          // Flash pin color (native Matter.js - no React re-render!)
          const originalFill = pin.render.fillStyle;
          pin.render.fillStyle = "#ffffff"; // White flash
          setTimeout(() => {
            if (pin.render) pin.render.fillStyle = originalFill;
          }, 50);
        }
      });
    });

    // Check when balls land in slots
    Events.on(engine, "afterUpdate", () => {
      const actualSlots = slotValuesRef.current.length;
      const slotWidth = WIDTH / actualSlots;
      
      ballsRef.current.forEach((ball, index) => {
        if (ball.position.y > HEIGHT - SLOT_HEIGHT - 20 && ball.velocity.y < 0.5) {
          // Ball has landed
          const slotIndex = Math.floor(ball.position.x / slotWidth);
          const finalSlot = Math.max(0, Math.min(actualSlots - 1, slotIndex));
          
          // Ball landed - no console.log to reduce spam
          
          // Trigger slot bounce animation
          setBouncingSlots((prev) => new Set(prev).add(finalSlot));
          setTimeout(() => {
            setBouncingSlots((prev) => {
              const newSet = new Set(prev);
              newSet.delete(finalSlot);
              return newSet;
            });
          }, 300);
          
          // Remove ball and notify
          World.remove(engine.world, ball);
          ballsRef.current.splice(index, 1);
          onBallLandRef.current(finalSlot, slotValuesRef.current[finalSlot]);
        }
      });
    });

    // No need to draw on canvas - using React overlay blocks now
    
    // Run engine with 60 FPS target
    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);
    
    // Engine running

    return () => {
      // Cleanup engine
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
      if (render.canvas && render.canvas.parentElement) {
        render.canvas.remove();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, slots]); // ТОЛЬКО rows/slots! WIDTH/HEIGHT фиксированы в ref!

  // Drop ball when ballDropCount changes
  const lastDropCountRef = useRef(0);
  
  // Reset lastDropCount when rows/slots change (new game)
  useEffect(() => {
    lastDropCountRef.current = 0;
  }, [rows, slots]);
  
  useEffect(() => {
    if (!engineRef.current || ballDropCount <= lastDropCountRef.current || allTargetSlots.length === 0) return;
    
    // Получаем targetSlotIndex для ЭТОГО шарика (ballDropCount - 1)
    const currentBallIndex = ballDropCount - 1;
    const targetSlotIndex = allTargetSlots[currentBallIndex];
    
    if (targetSlotIndex === undefined) {
      console.log('❌ No target slot for ball', currentBallIndex);
      return;
    }
    
    console.log(`🎲 Dropping ball #${ballDropCount} to slot ${targetSlotIndex}`);
    lastDropCountRef.current = ballDropCount;
    
    const { Bodies, World } = Matter;
    
    // Calculate starting X position with slight randomness
    const actualSlots = slotValuesRef.current.length;
    const slotWidth = WIDTH / actualSlots;
    const targetX = (targetSlotIndex + 0.5) * slotWidth;
    
    // Add randomness to starting position (±10% of slot width)
    const randomOffset = (Math.random() - 0.5) * slotWidth * 0.2;
    const startX = WIDTH / 2 + randomOffset;
    
      // Create ball with physics + NO ball-to-ball collisions!
      const ball = Bodies.circle(startX, 30, BALL_RADIUS, {
        restitution: 0.6,
        friction: 0.01,
        density: 0.002,
        render: {
          fillStyle: "#fbbf24", // Золотой
          strokeStyle: "#ffffff", // Белая обводка
          lineWidth: 3,
        },
        label: `ball-${Date.now()}`,
        collisionFilter: {
          group: -1, // Negative group = не сталкиваются друг с другом!
          category: 0x0002, // Ball category
          mask: 0x0001, // Collides only with pins/walls (category 0x0001)
        },
      });

    // Apply slight horizontal force to guide toward target
    const forceDirection = targetX > startX ? 1 : -1;
    const forceMagnitude = 0.00003;
    Matter.Body.applyForce(ball, ball.position, {
      x: forceDirection * forceMagnitude,
      y: 0,
    });

    World.add(engineRef.current.world, ball);
    ballsRef.current.push(ball);
    
      // Ball added
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballDropCount]); // allTargetSlots не меняется в игре

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: WIDTH + 'px' }}>
      {/* Matter.js контейнер */}
      <div 
        ref={containerRef}
        className={`relative overflow-hidden ${
          isVerySmall 
            ? 'rounded-lg' // Маленькие округления на мобильных
            : 'rounded-xl'
        }`}
        style={{ 
          width: WIDTH + 'px',
          height: HEIGHT + 'px',
          margin: '0 auto',
          border: isVerySmall ? 'none' : '1px solid rgba(168, 85, 247, 0.2)', // БЕЗ border на маленьких!
        }}
      >
        {/* Matter.js создаст canvas внутри этого div */}
        
        {/* Slot blocks - анимация отскока вниз при ударе */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: SLOT_HEIGHT + 'px' }}>
          {slotValues.map((value, index) => {
            const actualSlots = slotValues.length;
            const slotWidth = WIDTH / actualSlots;
            const isBouncing = bouncingSlots.has(index);
            
            return (
              <motion.div
                key={`slot-block-${index}`}
                className="absolute bottom-0 flex items-center justify-center m-1"
                style={{
                  left: index * slotWidth + 'px',
                  width: slotWidth - 8 + 'px', // -8 для mx-1 (4px с каждой стороны)
                  height: '100%',
                }}
                animate={{
                  y: isBouncing ? 8 : 0, // Отскок вниз на 8px
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 10,
                }}
              >
                {/* Slot block background - ГРАДИЕНТЫ + border-radius! */}
                <div 
                  className={`absolute inset-0 rounded-md ${
                    value === 1
                      ? "bg-gradient-to-br from-red-500/30 to-red-700/20"
                      : value >= 200
                      ? "bg-gradient-to-br from-yellow-400/30 to-yellow-600/20"
                      : value >= 100
                      ? "bg-gradient-to-br from-orange-400/30 to-orange-600/20"
                      : value >= 50
                      ? "bg-gradient-to-br from-green-400/30 to-green-600/20"
                      : value >= 20
                      ? "bg-gradient-to-br from-cyan-400/30 to-cyan-600/20"
                      : "bg-gradient-to-br from-blue-400/30 to-blue-600/20"
                  }`}
                  style={{
                    borderLeft: index > 0 ? '1px solid rgba(168, 85, 247, 0.3)' : 'none'
                  }}
                />
                
                {/* Value text - БОЛЬШЕ и ярче! */}
                <span 
                  className={`relative z-10 font-bold leading-none drop-shadow-lg ${
                    isVerySmall ? 'text-[10px]' : isMobile ? 'text-xs' : 'text-sm'
                  } ${
                    value === 1
                      ? "text-red-300"
                      : value >= 200
                      ? "text-yellow-200"
                      : value >= 100
                      ? "text-orange-200"
                      : value >= 50
                      ? "text-green-200"
                      : value >= 20
                      ? "text-cyan-200"
                      : "text-blue-200"
                  }`}
                >
                  {value}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

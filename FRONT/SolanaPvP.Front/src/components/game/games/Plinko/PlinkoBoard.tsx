// Plinko board with REAL PHYSICS using Matter.js + GUIDED PATH
import React, { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { motion } from "framer-motion";
import { getSlotValues, calculateBallPath } from "@/utils/plinkoScoreBreakdown";

interface PlinkoBoardProps {
  rows: number;
  slots: number;
  onBallLand: (slotIndex: number, value: number) => void;
  allTargetSlots: number[];
  ballDropCount?: number;
}

interface BallData {
  body: Matter.Body;
  targetSlot: number;
  path: number[];
  currentRow: number;
  hasLanded: boolean;
}

export const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
  rows: propsRows,
  slots,
  onBallLand,
  allTargetSlots,
  ballDropCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsDataRef = useRef<Map<number, BallData>>(new Map());
  const pinPositionsRef = useRef<{ y: number }[]>([]);
  const onBallLandRef = useRef(onBallLand);
  const lastDropCountRef = useRef(0);
  
  const slotValuesRef = useRef<number[]>([]);
  if (slotValuesRef.current.length === 0) {
    slotValuesRef.current = getSlotValues(slots);
  }
  const slotValues = slotValuesRef.current;
  
  const isVerySmallScreen = typeof window !== 'undefined' && window.innerWidth < 400;
  const rows = isVerySmallScreen ? Math.min(propsRows, 7) : propsRows;
  
  const [bouncingSlots, setBouncingSlots] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    onBallLandRef.current = onBallLand;
  }, [onBallLand]);
  
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
  
  const { isVerySmall, WIDTH, HEIGHT, PIN_RADIUS, BALL_RADIUS, SLOT_HEIGHT } = sizeConfig.current || {
    isMobile: false,
    isVerySmall: false,
    WIDTH: 800,
    HEIGHT: 600,
    PIN_RADIUS: 8,
    BALL_RADIUS: 10,
    SLOT_HEIGHT: 80,
  };

  // Initialize Matter.js physics engine
  useEffect(() => {
    if (!containerRef.current) return;
    
    const ballsData = ballsDataRef.current;
    const { Engine, Render, World, Bodies, Runner, Events, Body } = Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0008 }, // ✅ SLOWER gravity for controlled bounces!
      enableSleeping: false,
    });
    engineRef.current = engine;

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width: WIDTH,
        height: HEIGHT,
        wireframes: false,
        background: "#1a1a2e",
        pixelRatio: window.devicePixelRatio || 1,
        hasBounds: false,
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false,
      },
    });
    renderRef.current = render;

    // Create walls
    const wallOptions = {
      isStatic: true,
      render: { 
        fillStyle: "transparent",
        strokeStyle: "transparent",
        lineWidth: 0
      },
      friction: 0.1,
      restitution: 0.5,
    };
    
    const leftWall = Bodies.rectangle(-5, HEIGHT / 2, 10, HEIGHT, wallOptions);
    const rightWall = Bodies.rectangle(WIDTH + 5, HEIGHT / 2, 10, HEIGHT, wallOptions);
    
    // Bottom - make it a sensor so balls don't bounce
    const bottom = Bodies.rectangle(WIDTH / 2, HEIGHT + 50, WIDTH, 100, {
      isStatic: true,
      isSensor: true, // Don't bounce balls!
      render: { 
        fillStyle: "transparent",
        strokeStyle: "transparent",
        lineWidth: 0
      },
    });
    
    World.add(engine.world, [leftWall, rightWall, bottom]);

    // Create pins in pyramid formation
    const pins: Matter.Body[] = [];
    const pinYPositions: number[] = [];
    const actualSlots = slotValuesRef.current.length;
    const pinSpacingX = WIDTH / (actualSlots + 1);
    const topMargin = 50;
    const pinSpacingY = (HEIGHT - SLOT_HEIGHT - topMargin - 40) / (rows + 1);
    
    for (let row = 0; row < rows; row++) {
      const pinsInRow = row + 2;
      const rowY = topMargin + pinSpacingY * (row + 1);
      pinYPositions.push(rowY);
      
      const startX = WIDTH / 2 - (pinSpacingX * (pinsInRow - 1)) / 2;
      
      for (let col = 0; col < pinsInRow; col++) {
        const pinX = startX + col * pinSpacingX;
        const pin = Bodies.circle(pinX, rowY, PIN_RADIUS, {
          isStatic: true,
          restitution: 0.6,
          friction: 0.1,
          render: {
            fillStyle: "#c084fc",
            strokeStyle: "#e9d5ff",
            lineWidth: 2,
          },
          label: `pin-${row}-${col}`,
        });
        pins.push(pin);
      }
    }
    
    pinPositionsRef.current = pinYPositions.map(y => ({ y }));
    World.add(engine.world, pins);

    // Create invisible slot sensors at bottom
    const slotWidth = WIDTH / actualSlots;
    const slotSensors: Matter.Body[] = [];
    
    for (let i = 0; i < actualSlots; i++) {
      const sensor = Bodies.rectangle(
        (i + 0.5) * slotWidth,
        HEIGHT - SLOT_HEIGHT / 2,
        slotWidth - 2,
        SLOT_HEIGHT,
        {
          isStatic: true,
          isSensor: true, // Sensor doesn't affect physics but detects collisions
          render: {
            fillStyle: "transparent",
          },
          label: `slot-sensor-${i}`,
          collisionFilter: {
            category: 0x0001, // Same as pins
            mask: 0xFFFFFFFF, // Collides with everything
          },
        }
      );
      slotSensors.push(sensor);
    }
    World.add(engine.world, slotSensors);

    // Collision detection + DETERMINISTIC BOUNCE based on path!
    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const pin = [bodyA, bodyB].find((b) => b.label?.startsWith("pin-"));
        const ball = [bodyA, bodyB].find((b) => b.label?.startsWith("ball-"));
        
        if (pin && ball) {
          // Flash pin color on collision
          const originalFill = pin.render.fillStyle;
          pin.render.fillStyle = "#ffffff";
          setTimeout(() => {
            if (pin.render) pin.render.fillStyle = originalFill;
          }, 100);
          
          // Impulses are now applied in afterUpdate when crossing rows!
        }
        
        // Check slot sensor collision
        const slotSensor = [bodyA, bodyB].find((b) => b.label?.startsWith("slot-sensor-"));
        const landingBall = [bodyA, bodyB].find((b) => b.label?.startsWith("ball-"));
        
        if (slotSensor && landingBall) {
          const ballId = parseInt(landingBall.label!.split("-")[1]);
          const ballData = ballsDataRef.current.get(ballId);
          
          if (ballData && !ballData.hasLanded) {
            ballData.hasLanded = true;
            
            const slotIndex = parseInt(slotSensor.label!.split("-")[2]);
            const value = slotValuesRef.current[slotIndex];
            
            console.log(`🎯 Ball #${ballId} landed in slot ${slotIndex} (target: ${ballData.targetSlot}) Value: ${value}`);
            
            // Trigger slot bounce animation
            setBouncingSlots((prev) => new Set(prev).add(slotIndex));
    setTimeout(() => {
              setBouncingSlots((prev) => {
        const newSet = new Set(prev);
                newSet.delete(slotIndex);
        return newSet;
              });
            }, 300);
            
            // Remove ball after short delay
            setTimeout(() => {
              World.remove(engine.world, landingBall);
              ballsData.delete(ballId);
            }, 300);
            
            onBallLandRef.current(slotIndex, value);
          }
        }
      });
    });

    // ✅ MAIN GUIDANCE SYSTEM - Apply steering forces continuously!
    Events.on(engine, "afterUpdate", () => {
      ballsData.forEach((ballData) => {
        if (ballData.hasLanded) return;
        
        const ball = ballData.body;
        const ballY = ball.position.y;
        const ballX = ball.position.x;
        
        // Calculate target X position for this ball
        const targetX = (ballData.targetSlot + 0.5) * slotWidth;
        const deltaX = targetX - ballX;
        
        // Determine current row based on Y position
        let currentRow = -1;
        for (let i = 0; i < pinPositionsRef.current.length; i++) {
          if (ballY > pinPositionsRef.current[i].y) {
            currentRow = i;
          }
        }
        
        // Update current row (for tracking only)
        if (currentRow > ballData.currentRow && currentRow >= 0) {
          ballData.currentRow = currentRow;
        }
        
        // ✅ CONSTANT gentle pull toward target - simple and effective!
        const towardTarget = Math.sign(deltaX);
        const pullStrength = 0.0002; // Very gentle constant pull
        
        if (Math.abs(deltaX) > 10 && ball.velocity.y > 1) { // Only if off-target and falling
          Body.applyForce(ball, ball.position, {
            x: towardTarget * pullStrength,
            y: 0,
          });
        }
        
        // ✅ Limit X velocity STRICTLY!
        const maxVelocityX = 3; // Lower limit (was 5)
        if (Math.abs(ball.velocity.x) > maxVelocityX) {
          Body.setVelocity(ball, {
            x: Math.sign(ball.velocity.x) * maxVelocityX,
            y: ball.velocity.y
          });
        }
        
        // ✅ PRIMARY LANDING DETECTION - Check if ball reached slot zone
        const slotZoneY = HEIGHT - SLOT_HEIGHT - 20; // 20px buffer above slots
        
        if (ballY >= slotZoneY && !ballData.hasLanded) { // Remove velocity check - just detect when reaching zone
          const slotIndex = Math.floor(ballX / slotWidth);
          const finalSlot = Math.max(0, Math.min(actualSlots - 1, slotIndex));
          const value = slotValuesRef.current[finalSlot];
          
          console.log(`🎯 Ball #${ballData.targetSlot} landed in slot ${finalSlot}! (target was ${ballData.targetSlot}) | X: ${ballX.toFixed(1)} → ${targetX.toFixed(1)}`);
          
          ballData.hasLanded = true;
          
          // ✅ REMOVE BALL IMMEDIATELY!
          World.remove(engine.world, ball);
          ballsData.delete(parseInt(ball.label!.split("-")[1]));
          
          // Trigger slot bounce animation
          setBouncingSlots((prev) => new Set(prev).add(finalSlot));
    setTimeout(() => {
            setBouncingSlots((prev) => {
        const newSet = new Set(prev);
              newSet.delete(finalSlot);
        return newSet;
      });
    }, 300);
    
          // Notify immediately
          onBallLandRef.current(finalSlot, value);
          return; // Stop processing this ball
        }
        
        // Safety check: remove out-of-bounds balls
        if (ball.position.x < -50 || ball.position.x > WIDTH + 50 || ball.position.y < -50) {
          if (!ballData.hasLanded) { // ✅ PREVENT INFINITE LOOP!
            ballData.hasLanded = true;
            console.log(`⚠️ Ball #${ballData.targetSlot} out of bounds at (${ballX.toFixed(1)}, ${ballY.toFixed(1)})`);
            
            World.remove(engine.world, ball);
            ballsData.delete(parseInt(ball.label!.split("-")[1]));
            
            // Still trigger callback with closest slot
            const slotIndex = Math.max(0, Math.min(actualSlots - 1, Math.floor(ball.position.x / slotWidth)));
            onBallLandRef.current(slotIndex, slotValuesRef.current[slotIndex]);
          }
        }
      });
    });

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
      if (render.canvas && render.canvas.parentElement) {
        render.canvas.remove();
      }
      ballsData.clear();
    };
  }, [rows, slots, WIDTH, HEIGHT, PIN_RADIUS, BALL_RADIUS, SLOT_HEIGHT]);

  // Drop ball when ballDropCount changes
  useEffect(() => {
    lastDropCountRef.current = 0;
    ballsDataRef.current.clear();
  }, [rows, slots]);
  
  const dropBall = useCallback(() => {
    if (!engineRef.current || ballDropCount <= lastDropCountRef.current || allTargetSlots.length === 0) return;
    
    const currentBallIndex = ballDropCount - 1;
    const targetSlotIndex = allTargetSlots[currentBallIndex];
    
    if (targetSlotIndex === undefined) {
      console.log('❌ No target slot for ball', currentBallIndex);
      return;
    }
    
    console.log(`🎲 Dropping ball #${ballDropCount} → target slot ${targetSlotIndex}`);
    lastDropCountRef.current = ballDropCount;
    
    const { Bodies, World, Body } = Matter;
    
    const actualSlots = slotValuesRef.current.length;
    const slotWidth = WIDTH / actualSlots;
    
    // ✅ START POSITION based on target slot!
    const targetX = (targetSlotIndex + 0.5) * slotWidth;
    const centerX = WIDTH / 2;
    
    // Offset from center proportional to target
    const offsetRatio = (targetX - centerX) / centerX; // -1 to +1
    const startX = centerX + offsetRatio * 40; // Start closer to target side!
    
    // Create ball with SLOW physics
    const ballId = Date.now() + Math.random();
    const ball = Bodies.circle(startX, 20, BALL_RADIUS, {
      restitution: 0.5, // ✅ More bouncy (was 0.4)
      friction: 0.1, // ✅ More friction to slow down (was 0.05)
      frictionAir: 0.02, // ✅ More air resistance (was 0.01)
      density: 0.0005, // ✅ Lighter ball (was 0.001)
      render: {
        fillStyle: "#fbbf24",
        strokeStyle: "#ffffff",
        lineWidth: 3,
      },
      label: `ball-${ballId}`,
      collisionFilter: {
        category: 0x0002, // Ball category
        mask: 0x0001 | 0x0002, // Collides with pins (0x0001) and other balls (0x0002) for sensors
        group: -1, // Negative group so balls pass through each other
      },
    });
    
    // Calculate path for this ball
    const path = calculateBallPath(targetSlotIndex, rows, actualSlots);
    console.log(`🎲 Ball #${ballDropCount} created:
  - Target Slot: ${targetSlotIndex}
  - Target X: ${targetX.toFixed(1)} (start: ${startX.toFixed(1)})
  - Path (${path.length} rows): [${path.join(', ')}]
  - Path summary: ${path.filter(d => d > 0).length}R, ${path.filter(d => d < 0).length}L`);
    
    // Store ball data
    const ballData: BallData = {
      body: ball,
      targetSlot: targetSlotIndex,
      path: path,
      currentRow: -1,
      hasLanded: false,
    };
    
    ballsDataRef.current.set(ballId, ballData);
    
    // ✅ Give STRONG initial velocity toward target!
    const initialVelocityX = (targetX - startX) / 50; // Velocity proportional to distance
    Body.setVelocity(ball, {
      x: initialVelocityX, // Direct velocity toward target
      y: 1, // Start falling immediately
    });
    
    World.add(engineRef.current.world, ball);
  }, [ballDropCount, allTargetSlots, rows, WIDTH, BALL_RADIUS]);
  
  useEffect(() => {
    dropBall();
  }, [dropBall]);
  
  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: WIDTH + 'px' }}>
      <div 
        ref={containerRef}
        className={`relative overflow-hidden ${isVerySmall ? 'rounded-lg' : 'rounded-xl'}`}
        style={{ 
          width: WIDTH + 'px',
          height: HEIGHT + 'px',
          margin: '0 auto',
          border: isVerySmall ? 'none' : '1px solid rgba(168, 85, 247, 0.2)',
        }}
      >
        {/* Matter.js canvas will be inserted here */}
        
        {/* Slot value overlays */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: SLOT_HEIGHT + 'px' }}>
          {slotValues.map((value, index) => {
            const actualSlots = slotValues.length;
            const slotWidth = WIDTH / actualSlots;
            const isBouncing = bouncingSlots.has(index);
            
            return (
              <motion.div
                key={`slot-${index}`}
                className="absolute bottom-0 flex items-center justify-center"
                style={{
                  left: index * slotWidth + 4 + 'px',
                  width: slotWidth - 8 + 'px',
                  height: SLOT_HEIGHT - 4 + 'px',
                  bottom: '2px',
                }}
                animate={{
                  y: isBouncing ? 8 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 10,
                }}
              >
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
                
                <span 
                  className={`relative z-10 font-bold leading-none drop-shadow-lg ${
                    isVerySmall ? 'text-[11px]' : 'text-sm md:text-base'
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

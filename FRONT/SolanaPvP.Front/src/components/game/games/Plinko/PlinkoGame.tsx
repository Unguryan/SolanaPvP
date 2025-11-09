// Plinko game logic
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { GamePlayer } from "@/types/game";
import { PlinkoBoard } from "./PlinkoBoard";
import { GlowButton } from "@/components/ui/GlowButton";
import { motion } from "framer-motion";

interface PlinkoGameProps {
  gameMode: "Plinko3Balls" | "Plinko5Balls" | "Plinko7Balls";
  onBallDrop: (slotIndex: number) => void;
  disabled: boolean;
  currentPlayer: string;
  players: GamePlayer[];
  currentBallIndex: number;
  targetSlotIndex?: number; // Pre-determined slot for this ball
  allTargetSlots: number[]; // ВСЕ слоты для всех шариков!
}

export interface PlinkoGameHandle {
  dropAllRemainingBalls: () => void;
  wasAutoDropped: () => boolean;
  getAllBallsLanded: () => boolean;
}

export const PlinkoGame = forwardRef<PlinkoGameHandle, PlinkoGameProps>(({
  gameMode,
  onBallDrop,
  disabled,
  allTargetSlots,
}, ref) => {
  const [ballWins, setBallWins] = useState<number[]>([]);
  const [ballDropCount, setBallDropCount] = useState(0); // Сколько БРОСИЛИ
  const [isDropping, setIsDropping] = useState(false); // Блокировка на 500ms
  const autoDropTriggeredRef = useRef(false); // Защита от повторного автоброса
  const onBallDropRef = useRef(onBallDrop);

  // Get game config
  const config = getConfig(gameMode);

  // Update onBallDrop ref
  useEffect(() => {
    onBallDropRef.current = onBallDrop;
  }, [onBallDrop]);

  // Reset when gameMode changes
  useEffect(() => {
    setBallWins([]);
    setBallDropCount(0);
    setIsDropping(false);
    autoDropTriggeredRef.current = false; // Сбрасываем флаг автоброса
  }, [gameMode, config.balls]);

  const handleDropBall = () => {
    if (disabled || ballDropCount >= config.balls || allTargetSlots.length < config.balls || isDropping) {
      return;
    }
    
    // Блокируем кнопку на 500ms
    setIsDropping(true);
    
    // Бросаем ОДИН шарик!
    setBallDropCount(prev => prev + 1);
    
    // Разблокируем через 500ms
    setTimeout(() => {
      setIsDropping(false);
    }, 500);
  };

  const dropAllRemainingBalls = () => {
    console.log('🤖 AUTO-DROP triggered!');
    
    // Защита от повторного вызова!
    if (autoDropTriggeredRef.current) {
      console.log('❌ AUTO-DROP already triggered, skipping');
      return;
    }
    
    const remaining = config.balls - ballDropCount;
    console.log('🎲 Remaining balls to drop:', remaining);
    
    if (remaining <= 0) return;
    
    // Ставим флаг что автоброс уже запущен
    autoDropTriggeredRef.current = true;
    
    // Бросаем все оставшиеся шарики с интервалом
    for (let i = 0; i < remaining; i++) {
      setTimeout(() => {
        console.log(`🤖 AUTO-DROPPING ball ${i + 1}/${remaining}`);
        setBallDropCount(prev => {
          const newCount = prev + 1;
          console.log(`📊 Ball count: ${prev} → ${newCount}`);
          // Не превышаем максимум!
          return Math.min(newCount, config.balls);
        });
      }, i * 500); // 500ms между бросками
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    dropAllRemainingBalls,
    wasAutoDropped: () => autoDropTriggeredRef.current,
    getAllBallsLanded: () => ballWins.length >= config.balls,
  }));

  // Функция для получения цвета по значению слота (с градиентами!)
  const getSlotColor = (value: number) => {
    if (value === 1) return { 
      bg: 'bg-gradient-to-br from-red-500/30 to-red-700/20', 
      border: 'border-red-500/50', 
      text: 'text-red-300',
      shadow: 'shadow-red-500/20'
    };
    if (value >= 200) return { 
      bg: 'bg-gradient-to-br from-yellow-400/30 to-yellow-600/20', 
      border: 'border-yellow-400/50', 
      text: 'text-yellow-200',
      shadow: 'shadow-yellow-400/20'
    };
    if (value >= 100) return { 
      bg: 'bg-gradient-to-br from-orange-400/30 to-orange-600/20', 
      border: 'border-orange-400/50', 
      text: 'text-orange-200',
      shadow: 'shadow-orange-400/20'
    };
    if (value >= 50) return { 
      bg: 'bg-gradient-to-br from-green-400/30 to-green-600/20', 
      border: 'border-green-400/50', 
      text: 'text-green-200',
      shadow: 'shadow-green-400/20'
    };
    if (value >= 20) return { 
      bg: 'bg-gradient-to-br from-cyan-400/30 to-cyan-600/20', 
      border: 'border-cyan-400/50', 
      text: 'text-cyan-200',
      shadow: 'shadow-cyan-400/20'
    };
    return { 
      bg: 'bg-gradient-to-br from-blue-400/30 to-blue-600/20', 
      border: 'border-blue-400/50', 
      text: 'text-blue-200',
      shadow: 'shadow-blue-400/20'
    };
  };

  const handleBallLand = (slotIndex: number, value: number) => {
    console.log('🎯 Ball landed! Slot:', slotIndex, 'Value:', value, 'Total wins before:', ballWins.length);
    
    // Шарик коснулся поля! Добавляем результат!
    setBallWins((prev) => {
      const newWins = [...prev, value];
      console.log('💰 Updated wins:', newWins, 'Total:', newWins.length);
      return newWins;
    });
    
    // Обновляем реальный slot в UniversalGameBoard
    console.log('📤 Calling onBallDrop with slot:', slotIndex);
    onBallDropRef.current(slotIndex);
  };

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Info bar - адаптивный */}
      <div className="flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2 bg-white/5 rounded-lg border border-purple-500/20">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="text-txt-muted text-xs md:text-sm">Balls:</span>
          <span className="text-lg md:text-xl font-bold text-sol-purple">
            {config.balls - ballDropCount}
          </span>
        </div>
        
        {/* Ball wins history - ВСЕ выигрыши ОДИНАКОВОГО размера */}
        <div className="flex items-center gap-0.5 md:gap-1 justify-end flex-1">
          {ballWins.map((win, index) => {
            const colors = getSlotColor(win);
            return (
              <motion.div
                key={`win-${index}-${win}`}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded ${colors.bg} border ${colors.border} shadow-lg ${colors.shadow} min-w-[32px] md:min-w-[42px] flex items-center justify-center`}
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className={`text-[10px] md:text-xs font-bold ${colors.text} drop-shadow-sm whitespace-nowrap`}>
                  +{win}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Plinko Board */}
      <PlinkoBoard
        rows={config.rows}
        slots={config.slots}
        onBallLand={handleBallLand}
        allTargetSlots={allTargetSlots} // ВСЕ слоты сразу!
        ballDropCount={ballDropCount}
      />

      {/* Drop button - адаптивный */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlowButton
          size="lg"
          variant="neon"
          onClick={handleDropBall}
          disabled={disabled || ballDropCount >= config.balls || isDropping}
          className="text-base md:text-xl px-6 md:px-12 py-2.5 md:py-4 min-w-[140px] md:min-w-[200px]"
        >
          {ballDropCount >= config.balls
            ? "All Dropped"
            : isDropping
            ? "⏳ Wait..."
            : "🎯 Drop"}
        </GlowButton>
      </motion.div>
    </div>
  );
});

PlinkoGame.displayName = 'PlinkoGame';

function getConfig(gameMode: string) {
  switch (gameMode) {
    case "Plinko3Balls":
      return { balls: 3, rows: 5, slots: 7 }; // 5 rows → 7 slots (нечетное!)
    case "Plinko5Balls":
      return { balls: 5, rows: 7, slots: 9 }; // 7 rows → 9 slots (нечетное!)
    case "Plinko7Balls":
      return { balls: 7, rows: 9, slots: 11 }; // 9 rows → 11 slots (нечетное!)
    default:
      return { balls: 3, rows: 5, slots: 7 };
  }
}


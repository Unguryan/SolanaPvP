import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/effects/AuroraBackground";

interface TeamData {
  name: string;
  players: string[];
  additionalCount?: number;
}

interface MatchLoaderProps {
  team1: TeamData;
  team2: TeamData;
  statusMessages?: string[];
}

const DEFAULT_STATUS_MESSAGES = [
  "Connecting to Solana",
  "Creating new arena",
  "Preparing match",
  "Waiting for VRF",
  "Locking escrow...",
  "Match starting soon",
];

// Hook for typewriter effect - с увеличенными паузами для лучшей читаемости
const useTypewriter = (
  texts: string[],
  typingSpeed = 80,
  deletingSpeed = 40
) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return; // Don't do anything while paused

    const currentText = texts[currentIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Typing
          if (displayText.length < currentText.length) {
            setDisplayText(currentText.slice(0, displayText.length + 1));
          } else {
            // Finished typing, pause then start deleting (5 seconds to read)
            setIsPaused(true);
            setTimeout(() => {
              setIsPaused(false);
              setIsDeleting(true);
            }, 5000);
          }
        } else {
          // Deleting
          if (displayText.length > 0) {
            setDisplayText(currentText.slice(0, displayText.length - 1));
          } else {
            // Finished deleting, pause before next text (1 second)
            setIsPaused(true);
            setTimeout(() => {
              setIsPaused(false);
              setIsDeleting(false);
              setCurrentIndex((prev) => (prev + 1) % texts.length);
            }, 1000);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [
    displayText,
    currentIndex,
    isDeleting,
    isPaused,
    texts,
    typingSpeed,
    deletingSpeed,
  ]);

  return displayText;
};

export const MatchLoader: React.FC<MatchLoaderProps> = ({
  team1,
  team2,
  statusMessages = DEFAULT_STATUS_MESSAGES,
}) => {
  const typewriterText = useTypewriter(statusMessages);

  return (
    <div className="relative min-h-screen overflow-hidden bg-loader-bg">
      {/* Aurora Background */}
      <AuroraBackground />

      {/* Main Stage */}
      <section className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-center gap-1 tablet:gap-3 lg:gap-6 mx-auto mt-16 mb-8 px-4 tablet:px-6 lg:px-8 max-w-7xl">
        {/* Team 1 Panel (Bevel) */}
        <div className="w-full md:flex-1 flex justify-center">
          <TeamPanel team={team1} type="bevel" />
        </div>

        {/* VS Center */}
        <div className="flex justify-center md:flex-shrink-0">
          <VSCenter />
        </div>

        {/* Team 2 Panel (Hex) */}
        <div className="w-full md:flex-1 flex justify-center">
          <TeamPanel team={team2} type="hex" />
        </div>
      </section>

      {/* Current Status - с typewriter эффектом */}
      <div className="relative z-10 w-full max-w-[600px] mx-auto mb-6 px-4">
        <div
          className="flex items-center justify-center gap-2 md:gap-3 py-3 px-4 md:py-5 md:px-8 rounded-2xl border-2 border-white/20 shadow-[0_0_40px_rgba(153,69,255,0.2)]"
          style={{
            background: "rgba(11,15,23,0.9)",
          }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: "#14F195" }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-lg text-white font-semibold tracking-wide">
            {typewriterText}
            <span className="inline-block w-0.5 h-5 bg-white/80 ml-2 align-middle animate-blink-caret" />
          </span>
        </div>
      </div>
    </div>
  );
};

// Team Panel Component - с последовательной анимацией
const TeamPanel: React.FC<{ team: TeamData; type: "bevel" | "hex" }> = ({
  team,
  type,
}) => {
  const isLeft = type === "bevel";

  const borderGradient = isLeft
    ? "linear-gradient(135deg, #9945FF 0%, #7F5AF0 50%, #14F195 100%)"
    : "linear-gradient(225deg, #00FFA3 0%, #14F195 50%, #9945FF 100%)";

  const accentColor = isLeft ? "#9945FF" : "#14F195";

  // Задержки: Team1 (0s) → VS (0.4s) → Team2 (0.8s) → players (1.2s+)
  const cardDelay = isLeft ? 0 : 0.8;
  const playersStartDelay = 1.2;

  return (
    <motion.div
      className="relative w-full md:w-[360px] tablet:w-[390px] lg:w-[420px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: cardDelay, ease: "easeOut" }}
    >
      <div className="relative">
        {/* Animated gradient border glow - без blur для оптимизации */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: borderGradient,
            opacity: 0.15,
          }}
          animate={{
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main card - без backdrop-filter для оптимизации */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(11,15,23,0.95)",
            border: `2px solid ${accentColor}40`,
          }}
        >
          {/* Top accent bar */}
          <div
            className="h-1"
            style={{
              background: borderGradient,
            }}
          />

          {/* Scanning effect - упрощенный */}
          <div
            className="absolute left-0 right-0 top-0 h-32 animate-scan pointer-events-none opacity-20"
            style={{
              background: `linear-gradient(to bottom, ${accentColor}20, transparent)`,
              willChange: "transform",
            }}
          />

          {/* Content */}
          <div className="relative p-4 md:p-8 z-10">
            {/* Team name - без лейбла "Team" */}
            <motion.h3
              className="font-display font-extrabold text-white mb-3"
              style={{
                fontSize: "clamp(26px, 3.5vw, 36px)",
                textShadow: `0 0 20px ${accentColor}50`,
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: cardDelay + 0.2 }}
            >
              {team.name}
            </motion.h3>

            {/* Players list - появляются одновременно в обеих командах */}
            <div className="space-y-2">
              {team.players.map((player, idx) => (
                <motion.div
                  key={idx}
                  className="flex items-center gap-3 group"
                  initial={{ opacity: 0, x: isLeft ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: playersStartDelay + idx * 0.15,
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: accentColor,
                      boxShadow: `0 0 8px ${accentColor}80`,
                    }}
                    animate={{
                      opacity: [0.4, 1, 0.4],
                      scale: [0.9, 1.1, 0.9],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: idx * 0.2,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="text-base text-white font-medium group-hover:text-white/90 transition-colors">
                    {player}
                  </span>
                </motion.div>
              ))}
              {team.additionalCount && team.additionalCount > 0 && (
                <motion.div
                  className="text-sm font-medium ml-5 mt-2"
                  style={{ color: `${accentColor}cc` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: playersStartDelay + team.players.length * 0.15,
                  }}
                >
                  + {team.additionalCount} more
                </motion.div>
              )}
            </div>
          </div>

          {/* Corner accent */}
          <div
            className="absolute bottom-0 right-0 w-20 h-20 opacity-20 pointer-events-none"
            style={{
              background: `radial-gradient(circle at bottom right, ${accentColor}, transparent 70%)`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// VS Center Component - уменьшенный и оптимизированный
const VSCenter: React.FC = () => {
  return (
    <motion.div
      className="flex-shrink-0 flex items-center justify-center px-4 py-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
    >
      <div className="relative w-24 md:w-26 tablet:w-30 lg:w-32 h-24 md:h-26 tablet:h-30 lg:h-32">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, #9945FF 25%, transparent 50%, #14F195 75%, transparent 100%)",
            opacity: 0.4,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Inner rotating ring (opposite direction) */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg, transparent 0%, #00FFA3 30%, transparent 50%, #9945FF 80%, transparent 100%)",
            opacity: 0.3,
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Center glow base - без blur для оптимизации */}
        <motion.div
          className="absolute inset-6 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(153,69,255,0.25), rgba(20,241,149,0.15), transparent 70%)",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating energy particles - с рандомными позициями */}
        <div className="absolute inset-0">
          {[
            { angle: Math.random() * 360, delay: 0, color: "#9945FF" },
            { angle: Math.random() * 360, delay: 0.4, color: "#14F195" },
            { angle: Math.random() * 360, delay: 0.8, color: "#00FFA3" },
          ].map((particle, idx) => {
            const distance = 45 + Math.random() * 15; // 45-60px
            return (
              <motion.div
                key={idx}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  background: particle.color,
                  boxShadow: `0 0 10px ${particle.color}`,
                  willChange: "transform, opacity",
                }}
                animate={{
                  x: [
                    0,
                    Math.cos((particle.angle * Math.PI) / 180) * distance,
                    Math.cos((particle.angle * Math.PI) / 180) *
                      (distance + 10),
                  ],
                  y: [
                    0,
                    Math.sin((particle.angle * Math.PI) / 180) * distance,
                    Math.sin((particle.angle * Math.PI) / 180) *
                      (distance + 10),
                  ],
                  opacity: [0, 0.9, 0],
                  scale: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </div>

        {/* VS Text - responsive размер */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div
            className="font-display font-black tracking-[0.25em] text-4xl md:text-5xl"
            style={{
              color: "transparent",
              background:
                "linear-gradient(135deg, #9945FF 0%, #fff 50%, #14F195 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              textShadow:
                "0 0 15px rgba(153,69,255,0.5), 0 0 30px rgba(20,241,149,0.3)",
            }}
          >
            VS
          </div>
        </motion.div>

        {/* Pulsing hex border */}
        <motion.div
          className="absolute inset-3"
          style={{
            clipPath:
              "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          animate={{
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.div>
  );
};

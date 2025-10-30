import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GlowButton } from "@/components/ui/GlowButton";

interface HeroCTAProps {
  className?: string;
  onPlayNow?: () => void;
}

export const HeroCTA: React.FC<HeroCTAProps> = ({
  className = "",
  onPlayNow,
}) => {
  const navigate = useNavigate();

  const handlePlayNow = () => {
    if (onPlayNow) {
      onPlayNow();
    } else {
      // Default action - scroll to matches or navigate
      const matchesSection = document.getElementById("matches-section");
      if (matchesSection) {
        matchesSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleTryDemo = () => {
    navigate("/demo");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`text-center space-y-8 ${className}`}
    >
      {/* Main Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight"
        style={{
          fontSize: "clamp(2rem, 5vw, 3.75rem)",
        }}
      >
        <span className="block text-txt-base mb-2">Risk your</span>
        <span className="block neon-text text-5xl md:text-6xl lg:text-7xl">
          SOL
        </span>
        <span className="block text-txt-base mt-2">Win big.</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="text-lg md:text-xl text-txt-muted max-w-2xl mx-auto leading-relaxed"
      >
        The ultimate PvP gaming platform on Solana. Compete in exciting card and
        chest selection games, climb the leaderboards, and earn real SOL
        rewards.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <GlowButton
          size="lg"
          variant="neon"
          breathing={true}
          onClick={handlePlayNow}
          className="text-xl px-8 py-4 min-w-[200px]"
        >
          PLAY NOW
        </GlowButton>

        <GlowButton
          size="lg"
          variant="glass"
          onClick={handleTryDemo}
          className="text-lg px-6 py-3"
        >
          🎮 Try Demo
        </GlowButton>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="flex flex-wrap justify-center gap-8 pt-8"
      >
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-sol-mint">
            1,000+
          </div>
          <div className="text-sm text-txt-muted">Active Players</div>
        </div>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-sol-purple">
            50,000+
          </div>
          <div className="text-sm text-txt-muted">SOL Won</div>
        </div>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-sol-mint">3</div>
          <div className="text-sm text-txt-muted">Game Modes</div>
        </div>
      </motion.div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-10 left-10 text-2xl opacity-20"
        >
          🎴
        </motion.div>
        <motion.div
          animate={{
            y: [0, 10, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-20 right-10 text-2xl opacity-20"
        >
          🏆
        </motion.div>
        <motion.div
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-20 left-20 text-2xl opacity-20"
        >
          🎯
        </motion.div>
        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute bottom-10 right-20 text-2xl opacity-20"
        >
          💎
        </motion.div>
      </div>
    </motion.div>
  );
};

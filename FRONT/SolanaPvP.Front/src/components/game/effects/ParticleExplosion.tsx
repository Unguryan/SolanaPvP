// Particle explosion effect component
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface ParticleExplosionProps {
  isActive: boolean;
  x: number;
  y: number;
  value: number;
  onComplete?: () => void;
}

export const ParticleExplosion: React.FC<ParticleExplosionProps> = ({
  isActive,
  x,
  y,
  value,
  onComplete,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) return;

    // Generate particles based on value - more particles for mobile visibility
    const particleCount = Math.min(30, Math.max(10, Math.floor(value / 50)));
    const newParticles: Particle[] = [];

    // Determine color based on value
    let color = "#14F195"; // Default mint
    if (value > 500) color = "#9945FF"; // Purple for high values
    if (value > 800) color = "#FFD700"; // Gold for very high values

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 3 + Math.random() * 4; // Increased speed

      newParticles.push({
        id: `particle-${i}`,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }

    setParticles(newParticles);

    // Clean up after animation
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isActive, x, y, value, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: x,
                top: y,
                backgroundColor: particle.color,
                boxShadow: `0 0 8px ${particle.color}, 0 0 16px ${particle.color}`,
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: particle.vx * 80,
                y: particle.vy * 80,
                scale: 0,
                opacity: 0,
              }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

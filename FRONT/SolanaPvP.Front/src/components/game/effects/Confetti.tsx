// Confetti effect component
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  color: string;
  shape: "circle" | "square" | "triangle";
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ isActive, onComplete }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!isActive) return;

    // Generate confetti pieces
    const pieceCount = 200;
    const newPieces: ConfettiPiece[] = [];

    const colors = ["#9945FF", "#14F195", "#FFD700", "#FF6B6B", "#4ECDC4"];
    const shapes: ("circle" | "square" | "triangle")[] = [
      "circle",
      "square",
      "triangle",
    ];

    for (let i = 0; i < pieceCount; i++) {
      // More random positioning - spread across entire screen width
      const startX = Math.random() * window.innerWidth;
      const startY = -100 - Math.random() * 100; // Start from different heights

      newPieces.push({
        id: `confetti-${i}`,
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 8, // Increased horizontal spread
        vy: Math.random() * 4 + 3, // Increased vertical speed variation
        rotation: Math.random() * 720, // More rotation
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    setPieces(newPieces);

    // Clean up after animation
    const timer = setTimeout(() => {
      setPieces([]);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  const getShapeStyle = (shape: string) => {
    switch (shape) {
      case "circle":
        return "rounded-full";
      case "square":
        return "rounded-sm";
      case "triangle":
        return "w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent";
      default:
        return "rounded-full";
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 2147483649 }}
        >
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className={`absolute ${getShapeStyle(piece.shape)}`}
              style={{
                left: piece.x,
                top: piece.y,
                backgroundColor:
                  piece.shape === "triangle" ? "transparent" : piece.color,
                borderBottomColor:
                  piece.shape === "triangle" ? piece.color : "transparent",
                width: piece.shape === "triangle" ? "0" : "16px",
                height: piece.shape === "triangle" ? "0" : "16px",
              }}
              initial={{
                x: piece.x,
                y: piece.y,
                rotate: piece.rotation,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: piece.x + piece.vx * 100,
                y: piece.y + piece.vy * 100 + 500, // Gravity effect
                rotate: piece.rotation + 360,
                scale: 0,
                opacity: 0,
              }}
              transition={{
                duration: 3,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

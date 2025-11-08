import React from "react";
import { motion } from "framer-motion";

export const AuroraBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Animated blobs with GPU acceleration - медленные анимации */}
      <motion.div
        className="absolute -top-40 -left-40 w-[680px] h-[680px] rounded-full opacity-50 mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(153,69,255,0.4), transparent 60%)",
          willChange: "transform",
        }}
        animate={{
          x: [0, 20, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -right-52 -top-16 w-[740px] h-[740px] rounded-full opacity-50 mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(0,255,163,0.3), transparent 60%)",
          willChange: "transform",
        }}
        animate={{
          x: [0, -25, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-56 left-[15%] w-[700px] h-[700px] rounded-full opacity-50 mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(20,241,149,0.2), transparent 65%)",
          willChange: "transform",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(transparent 95%, rgba(255,255,255,0.08) 96%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,0.08) 96%)",
          backgroundSize: "18px 18px",
        }}
      />
    </div>
  );
};


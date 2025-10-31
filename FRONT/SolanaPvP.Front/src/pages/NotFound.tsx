// 404 Not Found page component
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "@/constants/routes";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { HomeIcon } from "@heroicons/react/24/outline";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center py-8 px-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <GlassCard className="p-8 md:p-12">
            {/* 404 Number */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6"
            >
              <h1 className="text-8xl md:text-9xl font-display font-bold bg-gradient-to-r from-sol-purple via-sol-mint to-sol-purple bg-clip-text text-transparent">
                404
              </h1>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl md:text-4xl font-display font-bold text-txt-base mb-4"
            >
              Page Not Found
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-lg text-txt-muted mb-8 max-w-md mx-auto"
            >
              The page you're looking for doesn't exist or has been moved.
              Let's get you back to the action!
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <GlowButton
                variant="neon"
                size="lg"
                onClick={() => navigate(ROUTES.HOME)}
                className="inline-flex items-center gap-2"
              >
                <HomeIcon className="w-5 h-5" />
                Go Home
              </GlowButton>
              <GlowButton
                variant="ghost"
                size="lg"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2"
              >
                Go Back
              </GlowButton>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 pt-8 border-t border-white/10"
            >
              <p className="text-sm text-txt-muted mb-4">Quick Links:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(ROUTES.MATCHES)}
                >
                  Matches
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(ROUTES.LEADERBOARD)}
                >
                  Leaderboard
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(ROUTES.CREATE_LOBBY)}
                >
                  Create Match
                </GlowButton>
              </div>
            </motion.div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

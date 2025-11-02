import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usersApi } from "@/services/api/users";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface ChangeUsernameModalProps {
  isOpen: boolean;
  currentUsername: string;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}

export const ChangeUsernameModal: React.FC<ChangeUsernameModalProps> = ({
  isOpen,
  currentUsername,
  onClose,
  onSuccess,
}) => {
  const [newUsername, setNewUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    "available" | "taken" | "checking" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewUsername("");
      setAvailabilityStatus(null);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Check username availability with debounce
  useEffect(() => {
    const trimmedUsername = newUsername.trim();

    if (!trimmedUsername || trimmedUsername === currentUsername) {
      setAvailabilityStatus(null);
      return;
    }

    if (trimmedUsername.length < 3) {
      setAvailabilityStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setAvailabilityStatus("checking");
        const response = await usersApi.checkUsernameAvailability(
          trimmedUsername
        );
        setAvailabilityStatus(response.isAvailable ? "available" : "taken");
      } catch (err) {
        console.error("Failed to check username availability:", err);
        setAvailabilityStatus(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, currentUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = newUsername.trim();

    if (!trimmedUsername || trimmedUsername === currentUsername) {
      return;
    }

    if (availabilityStatus !== "available") {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await usersApi.changeUsername({ username: trimmedUsername });
      setSuccess(true);
      setTimeout(() => {
        onSuccess(trimmedUsername);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to change username:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to change username"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <GlassCard className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-sol-purple">
                Change Username
              </h2>
              <button
                onClick={onClose}
                className="text-txt-muted hover:text-txt-base transition-colors"
                disabled={isSubmitting}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {success ? (
              /* Success Message */
              <div className="text-center py-8">
                <CheckCircleIcon className="w-16 h-16 text-sol-mint mx-auto mb-4" />
                <p className="text-xl font-semibold text-sol-mint mb-2">
                  Username Changed!
                </p>
                <p className="text-txt-muted">
                  Your username has been updated to{" "}
                  <span className="text-sol-purple font-semibold">
                    {newUsername}
                  </span>
                </p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit}>
                {/* Info Note */}
                <div className="bg-sol-purple/10 border border-sol-purple/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-txt-muted text-center">
                    ℹ️ You can change your username once every 24 hours
                  </p>
                </div>

                {/* Current Username */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-txt-muted mb-2">
                    Current Username
                  </label>
                  <div className="bg-white/5 rounded-lg px-4 py-3 text-txt-base">
                    {currentUsername}
                  </div>
                </div>

                {/* New Username Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-txt-muted mb-2">
                    New Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-txt-base placeholder-txt-muted focus:outline-none focus:border-sol-purple transition-colors"
                      minLength={3}
                      maxLength={20}
                      required
                      disabled={isSubmitting}
                    />
                    {availabilityStatus && newUsername.length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {availabilityStatus === "checking" && (
                          <div className="w-5 h-5 border-2 border-sol-purple border-t-transparent rounded-full animate-spin" />
                        )}
                        {availabilityStatus === "available" && (
                          <CheckCircleIcon className="w-5 h-5 text-sol-mint" />
                        )}
                        {availabilityStatus === "taken" && (
                          <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {/* Availability Message */}
                  {availabilityStatus === "taken" && (
                    <p className="mt-2 text-sm text-red-400">
                      This username is already taken
                    </p>
                  )}
                  {availabilityStatus === "available" && (
                    <p className="mt-2 text-sm text-sol-mint">
                      This username is available
                    </p>
                  )}
                  {newUsername.length > 0 &&
                    newUsername.trim().length === 0 && (
                      <p className="mt-2 text-sm text-red-400">
                        Username cannot contain only spaces
                      </p>
                    )}
                  {newUsername.length > 0 &&
                    newUsername.trim().length > 0 &&
                    newUsername.trim().length < 3 && (
                      <p className="mt-2 text-sm text-txt-muted">
                        Username must be at least 3 characters
                      </p>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <GlowButton
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </GlowButton>
                  <GlowButton
                    type="submit"
                    variant="neon"
                    disabled={
                      isSubmitting ||
                      !newUsername.trim() ||
                      newUsername.trim() === currentUsername ||
                      availabilityStatus !== "available"
                    }
                    className="flex-1"
                  >
                    {isSubmitting ? "Changing..." : "Change Username"}
                  </GlowButton>
                </div>
              </form>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

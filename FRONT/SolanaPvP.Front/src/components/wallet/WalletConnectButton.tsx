import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useWalletUser } from "@/hooks/useWallet";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Toast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants/routes";
import {
  WalletIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface WalletConnectButtonProps {
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  className = "",
}) => {
  const navigate = useNavigate();
  const { connected, connecting, wallets, user, connect, disconnect } =
    useWalletUser();

  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (showWalletSelector) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Disable scroll
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Restore scroll
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showWalletSelector]);

  const handleConnectClick = () => {
    if (connected) {
      setShowDropdown(!showDropdown);
    } else {
      setShowWalletSelector(true);
    }
  };

  const handleWalletSelect = (walletName: string) => {
    connect(walletName);
    setShowWalletSelector(false);
  };

  // Show toast when there's an error
  React.useEffect(() => {
    if (user.error) {
      setShowToast(true);
    }
  }, [user.error]);

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  if (connected && user.profile) {
    return (
      <div className={`relative ${className}`}>
        {/* Connected User Button */}
        <GlowButton
          variant="neon"
          onClick={handleConnectClick}
          className="flex items-center gap-2 min-w-0 px-3 py-2 text-sm"
        >
          <div className="w-6 h-6 bg-gradient-to-r from-sol-purple to-sol-mint rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden text-left">
            <span
              className="text-sm font-medium truncate"
              title={user.profile.username || "Loading..."}
            >
              {user.profile.username || "Loading..."}
            </span>
            <span className="text-xs opacity-80 truncate">
              {user.profile.pubkey
                ? `${user.profile.pubkey.slice(
                    0,
                    6
                  )}...${user.profile.pubkey.slice(-6)}`
                : "Loading..."}
            </span>
          </div>
          <ChevronDownIcon className="w-4 h-4" />
        </GlowButton>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-64 z-50">
            <GlassCard className="p-2 bg-bg/95 backdrop-blur-lg">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    navigate(ROUTES.PROFILE);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-sol-purple" />
                  <span className="text-txt-base">View Profile</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Disconnect</span>
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <GlowButton
        variant="neon"
        onClick={handleConnectClick}
        disabled={connecting || user.isLoading}
        className={`flex items-center gap-2 px-3 py-2 text-sm ${className}`}
      >
        <WalletIcon className="w-5 h-5" />
        {connecting || user.isLoading ? "Connecting..." : "Connect Wallet"}
      </GlowButton>

      {/* Wallet Selector Modal - rendered via Portal to be above everything */}
      {showWalletSelector &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[50] p-2 pt-[15%] md:pt-[10%]"
            onClick={(e) => {
              // Close modal if clicking on backdrop (not on the modal content)
              if (e.target === e.currentTarget) {
                setShowWalletSelector(false);
              }
            }}
          >
            <GlassCard
              className="p-4 w-full max-w-md mx-4"
              onClick={(e) => {
                // Prevent closing when clicking inside the modal
                e.stopPropagation();
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-sol-purple">
                  Connect Wallet
                </h3>
                <button
                  onClick={() => setShowWalletSelector(false)}
                  className="text-txt-muted hover:text-txt-base transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                    className="w-full flex items-center gap-3 p-3 glass-card hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="w-8 h-8"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-txt-base">
                        {wallet.adapter.name}
                      </div>
                      <div className="text-sm text-txt-muted">
                        {wallet.readyState === "Installed"
                          ? "Ready"
                          : "Not Installed"}
                      </div>
                    </div>
                    {wallet.readyState === "Installed" && (
                      <CheckIcon className="w-5 h-5 text-sol-mint" />
                    )}
                  </button>
                ))}
              </div>

              {wallets.length === 0 && (
                <div className="text-center py-8 text-txt-muted">
                  No wallets available. Please install Phantom wallet.
                </div>
              )}
            </GlassCard>
          </div>,
          document.body
        )}

      {/* Toast for errors */}
      {showToast && user.error && (
        <Toast
          message={user.error}
          type="error"
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
};

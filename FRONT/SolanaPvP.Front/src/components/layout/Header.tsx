// Header component
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { Ticker } from "@/components/arena/Ticker";

export const Header: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: "Home", href: ROUTES.HOME },
    { name: "Arena", href: ROUTES.MATCHES },
    { name: "Leaderboard", href: ROUTES.LEADERBOARD },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Show ticker only on specific pages
  const shouldShowTicker = () => {
    const path = location.pathname;
    return path === "/" || path === "/matches" || path === "/leaderboard";
  };

  return (
    <header
      className="bg-bg/95 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40"
      style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to={ROUTES.HOME}
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-sol-purple to-sol-mint rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-glow-strong transition-all duration-300">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-display font-bold text-txt-base group-hover:text-sol-purple transition-colors">
                SolanaPvP
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive(item.href)
                    ? "bg-sol-purple/20 text-sol-purple shadow-glow-purple"
                    : "text-txt-muted hover:text-txt-base hover:bg-white/5"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="flex items-center space-x-4">
            <WalletConnectButton />
          </div>
        </div>
      </div>

      {/* Ticker - only on specific pages */}
      {shouldShowTicker() && <Ticker className="py-1" />}
    </header>
  );
};

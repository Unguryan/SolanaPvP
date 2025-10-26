// Header component
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/common/Button";

export const Header: React.FC = () => {
  const location = useLocation();
  const { isWalletConnected, pubkey, userProfile, clearAuth } = useAuthStore();

  const navigation = [
    { name: "Home", href: ROUTES.HOME },
    { name: "Matches", href: ROUTES.MATCHES },
    { name: "Leaderboard", href: ROUTES.LEADERBOARD },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={ROUTES.HOME} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                SolanaPvP
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="flex items-center space-x-4">
            {isWalletConnected ? (
              <div className="flex items-center space-x-3">
                {/* User info */}
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {userProfile?.username || "Anonymous"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {pubkey
                      ? `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`
                      : ""}
                  </div>
                </div>

                {/* Profile link */}
                <Link to={ROUTES.PROFILE}>
                  <Button variant="ghost" size="sm">
                    Profile
                  </Button>
                </Link>

                {/* Disconnect button */}
                <Button variant="ghost" size="sm" onClick={clearAuth}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

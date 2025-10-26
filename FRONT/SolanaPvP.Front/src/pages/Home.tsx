// Home page component
import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/store/authStore";

export const Home: React.FC = () => {
  const { isWalletConnected } = useAuthStore();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to <span className="text-yellow-300">SolanaPvP</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              The ultimate PvP gaming platform on Solana. Compete in exciting
              card and chest selection games, climb the leaderboards, and earn
              SOL rewards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isWalletConnected ? (
                <>
                  <Link to={ROUTES.MATCHES}>
                    <Button
                      size="lg"
                      className="bg-white text-blue-600 hover:bg-gray-100"
                    >
                      Join Match
                    </Button>
                  </Link>
                  <Link to={ROUTES.LEADERBOARD}>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="border-white text-white hover:bg-white hover:text-blue-600"
                    >
                      View Leaderboard
                    </Button>
                  </Link>
                </>
              ) : (
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Connect Wallet to Play
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Simple, fast, and exciting gameplay with real rewards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎴</span>
                </div>
                <CardTitle>Choose Your Game</CardTitle>
                <CardDescription>
                  Pick from 3 exciting game modes: 3 from 9 cards, 5 from 16
                  chests, or 1 from 3 cards
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚔️</span>
                </div>
                <CardTitle>Compete & Win</CardTitle>
                <CardDescription>
                  Play against other players in 1v1, 2v2, or 5v5 matches with
                  real SOL stakes
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏆</span>
                </div>
                <CardTitle>Earn & Climb</CardTitle>
                <CardDescription>
                  Win matches to earn SOL rewards and climb the leaderboards to
                  prove your skills
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Game Modes
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Three unique game modes to test your strategy and luck
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card hover>
              <CardHeader>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎴</span>
                  </div>
                  <CardTitle>Pick 3 from 9</CardTitle>
                  <CardDescription>
                    Choose 3 cards from 9 available options. Each card has a
                    hidden value. The player with the highest total wins!
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card hover>
              <CardHeader>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏆</span>
                  </div>
                  <CardTitle>Pick 5 from 16</CardTitle>
                  <CardDescription>
                    Select 5 chests from a 4x4 grid. Each chest contains
                    treasures. Find the best combination to win!
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card hover>
              <CardHeader>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <CardTitle>Pick 1 from 3</CardTitle>
                  <CardDescription>
                    Quick decision time! Choose 1 card from 3 options.
                    Fast-paced action with high stakes!
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Playing?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Connect your wallet and join the most exciting PvP gaming experience
            on Solana
          </p>

          {isWalletConnected ? (
            <Link to={ROUTES.MATCHES}>
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                View Active Matches
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

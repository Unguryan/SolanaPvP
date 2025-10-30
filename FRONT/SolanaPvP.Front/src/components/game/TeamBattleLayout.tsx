// Team battle layout component
import React from "react";
import { motion } from "framer-motion";
import { GamePlayer, GameResult } from "@/types/game";
import { PlayerCard } from "./PlayerCard";
import { ScoreCounter } from "./effects/ScoreCounter";

interface TeamBattleLayoutProps {
  players: GamePlayer[];
  currentPlayer: string;
  gameStatus: "waiting" | "loading" | "playing" | "revealing" | "finished";
  gameResult?: GameResult | null;
  shouldHideScores?: (playerUsername: string) => boolean;
  hideTeamScores?: boolean;
}

export const TeamBattleLayout: React.FC<TeamBattleLayoutProps> = ({
  players,
  currentPlayer,
  gameStatus,
  gameResult,
  shouldHideScores,
  hideTeamScores = false,
}) => {
  const teamSize = players.length / 2;
  const teamA = players.slice(0, teamSize);
  const teamB = players.slice(teamSize, teamSize * 2);

  const teamAScore = teamA.reduce(
    (sum, player) => sum + player.currentScore,
    0
  );
  const teamBScore = teamB.reduce(
    (sum, player) => sum + player.currentScore,
    0
  );

  const isTeamAWinner = gameResult?.winner === "Team A";
  const isTeamBWinner = gameResult?.winner === "Team B";

  return (
    <div className="space-y-6">
      {/* Team Scores Header */}
      <div className="flex justify-between items-center">
        {/* Team A Score */}
        <motion.div
          className={`glass-card p-4 rounded-xl border-2 ${
            isTeamAWinner
              ? "border-sol-mint shadow-glow-mint"
              : "border-white/20"
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <h3 className="text-lg font-bold text-sol-purple mb-2">Team A</h3>
            {hideTeamScores ? (
              <span className="text-2xl font-bold text-txt-muted">???</span>
            ) : (
              <ScoreCounter value={teamAScore} className="text-2xl font-bold" />
            )}
          </div>
        </motion.div>

        {/* VS */}
        <motion.div
          className="text-2xl font-bold text-txt-muted"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          VS
        </motion.div>

        {/* Team B Score */}
        <motion.div
          className={`glass-card p-4 rounded-xl border-2 ${
            isTeamBWinner
              ? "border-sol-mint shadow-glow-mint"
              : "border-white/20"
          }`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <h3 className="text-lg font-bold text-sol-mint mb-2">Team B</h3>
            {hideTeamScores ? (
              <span className="text-2xl font-bold text-txt-muted">???</span>
            ) : (
              <ScoreCounter value={teamBScore} className="text-2xl font-bold" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Teams Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Team A Players */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="text-lg font-semibold text-sol-purple text-center mb-4">
            Team A
          </h4>
          <div className="space-y-2">
            {teamA.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isCurrentPlayer={
                  player.username === currentPlayer && gameStatus === "playing"
                }
                isWinner={isTeamAWinner}
                hideScore={
                  shouldHideScores ? shouldHideScores(player.username) : false
                }
                className="text-sm"
              />
            ))}
          </div>
        </motion.div>

        {/* Team B Players */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="text-lg font-semibold text-sol-mint text-center mb-4">
            Team B
          </h4>
          <div className="space-y-2">
            {teamB.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isCurrentPlayer={
                  player.username === currentPlayer && gameStatus === "playing"
                }
                isWinner={isTeamBWinner}
                hideScore={
                  shouldHideScores ? shouldHideScores(player.username) : false
                }
                className="text-sm"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

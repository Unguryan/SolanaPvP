import React from "react";
import { MatchLoader } from "@/components/loaders/MatchLoader";

export const MockLoader1: React.FC = () => {
  return (
    <MatchLoader
      team1={{
        name: "Player 1",
        players: ["@sol_warrior"],
      }}
      team2={{
        name: "Player 2",
        players: ["@crypto_ninja"],
      }}
      statusMessages={[
        "Connecting to Solana",
        "Preparing 1v1 Match",
        "Waiting for VRF",
        "Locking escrow",
        "Match starting soon...",
      ]}
    />
  );
};

export default MockLoader1;


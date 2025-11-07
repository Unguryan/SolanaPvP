import React from "react";
import { MatchLoader } from "@/components/loaders/MatchLoader";

export const MockLoader5: React.FC = () => {
  return (
    <MatchLoader
      team1={{
        name: "Team Alpha",
        players: [
          "@alpha_warrior",
          "@sol_sniper",
          "@neon_fox",
          "@vrf_master",
          "@crypto_king",
        ],
      }}
      team2={{
        name: "Team Omega",
        players: [
          "@pump_fun",
          "@raydium_racer",
          "@orca_whale",
          "@mercurial",
          "@degen_trader",
        ],
      }}
      statusMessages={[
        "Connecting to Web3",
        "Preparing Team Battle",
        "Waiting for VRF",
        "Finalizing 5v5 Match",
        "Seeding randomness",
        "Verifying team payouts",
      ]}
    />
  );
};

export default MockLoader5;


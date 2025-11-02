// Game page component
import React from "react";
import { useParams } from "react-router-dom";

export const Game: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Game Room
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Match ID: {matchId}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Coming soon - Interactive game interface
          </p>
        </div>
      </div>
    </div>
  );
};

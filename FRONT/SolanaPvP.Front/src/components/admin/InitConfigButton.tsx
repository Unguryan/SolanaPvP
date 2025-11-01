import React from "react";
import { useInitConfig, useGlobalConfig } from "@/hooks/usePvpProgram";
import { GlowButton } from "@/components/ui/GlowButton";
import { Button } from "@/components/common/Button";

/**
 * Component for initializing the global config of the PvP program.
 * This should only be used once after deploying the program.
 */
export const InitConfigButton: React.FC = () => {
  const {
    config,
    isLoading: isConfigLoading,
    error: configError,
    refetch,
  } = useGlobalConfig();
  const { initConfig, isInitializing, error, txSignature } = useInitConfig();

  const handleInit = async () => {
    await initConfig();
    // Refetch config after initialization
    setTimeout(() => {
      refetch();
    }, 2000);
  };

  // Config already exists
  if (config) {
    return (
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-green-400 text-sm font-medium">
          ✅ Config already initialized
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Admin: {config.admin.toString().slice(0, 8)}...
        </p>
      </div>
    );
  }

  // Check if error indicates config doesn't exist
  const needsInit =
    configError?.includes("AccountNotFound") ||
    configError?.includes("Account does not exist");

  if (!needsInit && !isConfigLoading && !config) {
    // Still checking...
    return null;
  }

  return (
    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <p className="text-yellow-400 text-sm font-medium mb-2">
        ⚠️ Config not initialized
      </p>
      <p className="text-gray-400 text-xs mb-3">
        The global config needs to be initialized before creating lobbies.
      </p>

      {txSignature ? (
        <div className="space-y-2">
          <p className="text-green-400 text-sm font-medium">
            ✅ Initialization successful!
          </p>
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-xs hover:underline break-all"
          >
            View transaction: {txSignature.slice(0, 16)}...
          </a>
        </div>
      ) : (
        <Button
          onClick={handleInit}
          disabled={isInitializing}
          className="w-full"
        >
          {isInitializing ? "Initializing..." : "Initialize Config"}
        </Button>
      )}

      {error && <p className="text-red-400 text-xs mt-2 break-all">{error}</p>}
    </div>
  );
};

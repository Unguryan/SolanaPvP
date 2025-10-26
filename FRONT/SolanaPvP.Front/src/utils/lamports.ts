// SOL/Lamports conversion utilities
const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function formatSol(lamports: number, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return `${sol.toFixed(decimals)} SOL`;
}

export function formatLamports(lamports: number): string {
  return new Intl.NumberFormat("en-US").format(lamports);
}

export function parseSolAmount(input: string): number {
  const value = parseFloat(input);
  if (isNaN(value) || value < 0) {
    throw new Error("Invalid SOL amount");
  }
  return solToLamports(value);
}

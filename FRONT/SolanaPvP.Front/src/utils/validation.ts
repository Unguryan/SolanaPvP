// Validation utilities
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters long",
    };
  }

  if (username.length > 20) {
    return {
      isValid: false,
      error: "Username must be no more than 20 characters long",
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      isValid: false,
      error:
        "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return { isValid: true };
}

export function validateSolAmount(amount: string): {
  isValid: boolean;
  error?: string;
  value?: number;
} {
  if (!amount || amount.trim().length === 0) {
    return { isValid: false, error: "Amount is required" };
  }

  const value = parseFloat(amount);

  if (isNaN(value)) {
    return { isValid: false, error: "Invalid amount format" };
  }

  if (value <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (value > 1000) {
    return { isValid: false, error: "Amount cannot exceed 1000 SOL" };
  }

  return { isValid: true, value };
}

export function validatePubkey(pubkey: string): {
  isValid: boolean;
  error?: string;
} {
  if (!pubkey || pubkey.trim().length === 0) {
    return { isValid: false, error: "Public key is required" };
  }

  // Basic Solana pubkey validation (base58, 32-44 characters)
  if (pubkey.length < 32 || pubkey.length > 44) {
    return { isValid: false, error: "Invalid public key format" };
  }

  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(pubkey)) {
    return { isValid: false, error: "Invalid public key format" };
  }

  return { isValid: true };
}

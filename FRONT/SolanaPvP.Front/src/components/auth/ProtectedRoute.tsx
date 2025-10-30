import React from "react";
import { Navigate } from "react-router-dom";
import { useWalletUser } from "@/hooks/useWallet";
import { ROUTES } from "@/constants/routes";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { connected } = useWalletUser();

  if (!connected) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};

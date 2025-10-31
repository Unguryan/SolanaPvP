// Background context for managing falling emojis intensity
import React, { useState } from "react";
import { BackgroundContext, Intensity } from "./BackgroundContextCore.ts";

interface BackgroundProviderProps {
  children: React.ReactNode;
}

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({
  children,
}) => {
  const [intensity, setIntensity] = useState<Intensity>("medium");

  return (
    <BackgroundContext.Provider value={{ intensity, setIntensity }}>
      {children}
    </BackgroundContext.Provider>
  );
};

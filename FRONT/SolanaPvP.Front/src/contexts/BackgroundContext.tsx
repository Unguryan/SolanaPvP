// Background context for managing falling emojis intensity
import React, { createContext, useContext, useState } from "react";

type Intensity = "low" | "medium" | "high" | "off";

interface BackgroundContextType {
  intensity: Intensity;
  setIntensity: (intensity: Intensity) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(
  undefined
);

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
};

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

import { createContext } from "react";

export type Intensity = "low" | "medium" | "high" | "off";

export interface BackgroundContextType {
  intensity: Intensity;
  setIntensity: (intensity: Intensity) => void;
}

export const BackgroundContext = createContext<
  BackgroundContextType | undefined
>(undefined);

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface DebugState {
  // Add any debug state properties here
  [key: string]: any;
}

type DebugContextType = {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  debugState: DebugState;
  setDebugState: React.Dispatch<React.SetStateAction<DebugState>>;
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [debugState, setDebugState] = useState<DebugState>({});

  useEffect(() => {
    // Only enable debug mode in development by default
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug mode
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setIsDebugMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleDebugMode = () => {
    setIsDebugMode((prev) => !prev);
  };

  return (
    <DebugContext.Provider
      value={{
        isDebugMode,
        toggleDebugMode,
        debugState,
        setDebugState,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = (): DebugContextType => {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
};

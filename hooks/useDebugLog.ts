import { useState, useCallback } from "react";
import { useDebug } from "@/context/DebugContext";

export const useDebugLog = () => {
  const { isDebugMode } = useDebug();
  const [logs, setLogs] = useState<string[]>([]);

  const debugLog = useCallback(
    (...messages: any[]) => {
      if (!isDebugMode) return;

      const timestamp = new Date().toISOString().substring(11, 23);
      let logMessage: string;

      if (messages.length === 1 && typeof messages[0] === "object") {
        logMessage = `[${timestamp}] ${JSON.stringify(messages[0], null, 2)}`;
      } else {
        logMessage = `[${timestamp}] ${messages.join(" ")}`;
      }

      console.debug(logMessage);
      setLogs((prev) => [...prev.slice(-99), logMessage]);
    },
    [isDebugMode],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    debugLog,
    clearLogs,
  };
};

import React from "react";
import { useDebug } from "@/context/DebugContext";
import { Bug } from "lucide-react";

export const DebugToggle: React.FC = () => {
  const { isDebugMode, toggleDebugMode } = useDebug();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <button
      onClick={toggleDebugMode}
      className={`fixed bottom-4 right-4 z-50 p-2 rounded-full shadow-lg transition-colors ${
        isDebugMode
          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
      }`}
      title={isDebugMode ? "Hide Debug Panel" : "Show Debug Panel"}
      aria-label={isDebugMode ? "Hide Debug Panel" : "Show Debug Panel"}
    >
      <Bug className="w-5 h-5" />
    </button>
  );
};

export default DebugToggle;

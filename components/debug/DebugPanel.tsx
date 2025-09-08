import React from "react";
import { useDebug } from "@/context/DebugContext";
import { Button } from "@/components/ui/button";
import { X, Bug, Terminal } from "lucide-react";

interface DebugPanelProps {
  logs?: string[];
  onClearLogs?: () => void;
  children?: React.ReactNode;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  logs = [],
  onClearLogs,
  children,
}) => {
  const { isDebugMode, toggleDebugMode } = useDebug();

  if (!isDebugMode) return null;

  return (
    <div
      className="fixed bottom-0 right-0 z-50 w-full max-w-md p-4 bg-gray-900 text-white text-sm font-mono overflow-auto"
      style={{ maxHeight: "50vh" }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-yellow-400" />
          <span className="font-bold">Debug Panel</span>
          <span className="text-xs opacity-75">(Ctrl+Shift+D to toggle)</span>
        </div>
        <div className="flex gap-2">
          {onClearLogs && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLogs}
              className="text-xs h-6 px-2"
            >
              <Terminal className="w-3 h-3 mr-1" />
              Clear Logs
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDebugMode}
            className="text-xs h-6 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {children}

      {logs.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-2">
          <h4 className="font-bold mb-2">Logs</h4>
          <div className="text-xs bg-black/20 p-2 rounded max-h-40 overflow-y-auto">
            {logs.map((log, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-words border-b border-gray-700 pb-1 mb-1"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

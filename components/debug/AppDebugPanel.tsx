import React from "react";
import { DebugPanel } from "./DebugPanel";
import { useDebugState } from "@/hooks/useDebugState";

interface AppDebugPanelProps {
  stats: any;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
  articles: Array<{
    id: string;
    sender?: string;
    subject?: string;
    date?: string;
    isRead?: boolean;
    isArchived?: boolean;
  }>;
  fullViewArticle?: {
    id: string;
    sender?: string;
    title?: string;
    publishDate?: string;
    content?: string | null;
    cleanContent?: string | null;
    rawContent?: string | null;
    url?: string;
  };
}

export const AppDebugPanel: React.FC<AppDebugPanelProps> = ({
  stats,
  pagination,
  articles,
  fullViewArticle,
}) => {
  const { debugLogs, clearLogs } = useDebugState();

  const debugContent = (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold mb-1">Application State</h4>
        <pre className="text-xs bg-black/50 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(
            {
              stats,
              pagination,
              articles: articles.map((a) => ({
                id: a.id,
                sender: a.sender,
                subject: a.subject,
                date: a.date,
                isRead: a.isRead,
                isArchived: a.isArchived,
              })),
            },
            null,
            2,
          )}
        </pre>
      </div>

      {fullViewArticle && (
        <div>
          <h4 className="font-bold mb-1">Current Article</h4>
          <pre className="text-xs bg-black/50 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(
              {
                id: fullViewArticle.id,
                ...(fullViewArticle.sender && {
                  sender: fullViewArticle.sender,
                }),
                ...(fullViewArticle.title && { title: fullViewArticle.title }),
                ...(fullViewArticle.publishDate && {
                  date: fullViewArticle.publishDate,
                }),
                contentLength: fullViewArticle.content?.length,
                cleanContentLength: fullViewArticle.cleanContent?.length,
                rawContentLength: fullViewArticle.rawContent?.length,
                hasUrl: !!fullViewArticle.url,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <DebugPanel logs={debugLogs} onClearLogs={clearLogs}>
      {debugContent}
    </DebugPanel>
  );
};

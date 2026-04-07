import React, { useState } from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import FullViewArticle from "@/components/article/FullViewArticle";

interface DigestNewsletter {
  id: string;
  subject: string;
  sender: string;
  date: string;
  summary: string | null;
  preview: string;
  isRead: boolean;
  isArchived: boolean;
  topics: string[];
}

interface CategoryGroup {
  name: string;
  color: string;
  newsletters: DigestNewsletter[];
}

interface MorningReportProps {
  date: string;
  categories: CategoryGroup[];
  uncategorized: DigestNewsletter[];
}

const COLOR_MAP: Record<string, string> = {
  blue:   "border-blue-400 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
  green:  "border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200",
  orange: "border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200",
  purple: "border-purple-400 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200",
  gray:   "border-gray-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
};

const DIVIDER_MAP: Record<string, string> = {
  blue:   "border-blue-400",
  green:  "border-green-400",
  orange: "border-orange-400",
  purple: "border-purple-400",
  gray:   "border-gray-400",
};

function NewsletterRow({
  item,
  onOpen,
}: {
  item: DigestNewsletter;
  onOpen: (item: DigestNewsletter) => void;
}) {
  const displayText = item.summary ?? item.preview ?? "";

  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full text-left py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {item.sender}
          </p>
          <h3
            className={`text-sm font-semibold leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 ${
              item.isRead ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"
            }`}
          >
            {item.subject}
          </h3>
          {displayText && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {displayText}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {format(new Date(item.date), "h:mm a")}
          </span>
          {item.isRead && (
            <span className="text-xs text-gray-400 dark:text-gray-500">read</span>
          )}
          {item.summary && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">AI</span>
          )}
        </div>
      </div>
    </button>
  );
}

function CategorySection({
  group,
  onOpen,
}: {
  group: CategoryGroup;
  onOpen: (item: DigestNewsletter) => void;
}) {
  const color = group.color ?? "gray";
  const badgeClass = COLOR_MAP[color] ?? COLOR_MAP.gray;
  const dividerClass = DIVIDER_MAP[color] ?? DIVIDER_MAP.gray;

  return (
    <section className={`mb-8 border-l-4 pl-4 ${dividerClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
          {group.name}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {group.newsletters.length} {group.newsletters.length === 1 ? "newsletter" : "newsletters"}
        </span>
      </div>
      <div>
        {group.newsletters.map((item) => (
          <NewsletterRow key={item.id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export default function MorningReport({ date, categories, uncategorized }: MorningReportProps) {
  const { theme } = useTheme();
  const [fullViewItem, setFullViewItem] = useState<DigestNewsletter | null>(null);

  const totalCount = categories.reduce((s, c) => s + c.newsletters.length, 0) + uncategorized.length;
  const formattedDate = format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy");

  const handleOpen = (item: DigestNewsletter) => setFullViewItem(item);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <Link
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Inbox
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            Morning Report
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{formattedDate}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {totalCount} newsletter{totalCount !== 1 ? "s" : ""} today
          </p>
        </header>

        {totalCount === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-lg">No newsletters today.</p>
            <p className="text-sm mt-2">Check back after your morning emails arrive.</p>
          </div>
        ) : (
          <>
            {categories.map((group) => (
              <CategorySection key={group.name} group={group} onOpen={handleOpen} />
            ))}

            {uncategorized.length > 0 && (
              <CategorySection
                group={{ name: "Uncategorized", color: "gray", newsletters: uncategorized }}
                onOpen={handleOpen}
              />
            )}
          </>
        )}
      </div>

      {/* Full article modal */}
      {fullViewItem && (
        <FullViewArticle
          article={{
            id: fullViewItem.id,
            title: fullViewItem.subject,
            content: fullViewItem.summary ?? fullViewItem.preview ?? "",
            publishDate: fullViewItem.date,
            sender: fullViewItem.sender,
            isRead: fullViewItem.isRead,
            isArchived: fullViewItem.isArchived,
            rawContent: "",
            cleanContent: "",
          }}
          onClose={() => setFullViewItem(null)}
          onToggleRead={() => {}}
          onToggleArchive={() => {}}
          onShare={() => {}}
        />
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { date } = context.query;
  const dateParam = typeof date === "string" ? date : new Date().toISOString().split("T")[0];

  try {
    // Call the morning-report API internally
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`;

    const res = await fetch(`${baseUrl}/api/morning-report?date=${dateParam}`);
    if (!res.ok) throw new Error(`API responded with ${res.status}`);

    const data = await res.json();
    return { props: data };
  } catch (error) {
    // Return empty state on error rather than 500
    return {
      props: {
        date: dateParam,
        categories: [],
        uncategorized: [],
      },
    };
  }
};

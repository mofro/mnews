"use client";

import React from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSizeOptions = [10, 20, 50];

  // Calculate visible page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few enough
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of the middle section
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the start or end
      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      // Add ellipsis if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageChange = (page: number | string) => {
    if (page === "..." || typeof page !== "number") return;

    // Validate page number
    const newPage = Math.max(1, Math.min(page, totalPages || 1));

    // Only proceed if page actually changed
    if (newPage === currentPage) return;

    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });

    // Call the callback
    onPageChange(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);

    // Don't do anything if size didn't change
    if (newSize === pageSize) return;

    // Call the callback - parent will handle validation and URL updates
    onPageSizeChange(newSize);
  };

  if (totalPages <= 1) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-4",
        className,
      )}
    >
      <div className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium">
          {startItem}-{endItem}
        </span>{" "}
        of <span className="font-medium">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="page-size"
          className="text-sm text-gray-500 whitespace-nowrap"
        >
          Show:
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={handlePageSizeChange}
          className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label="Items per page"
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          per page
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, index) => (
          <Button
            key={page === "..." ? `ellipsis-${index}` : page}
            variant={page === currentPage ? "default" : "ghost"}
            size="sm"
            className={cn(
              "min-w-[2rem] h-8",
              page === "..." && "pointer-events-none",
            )}
            onClick={() => typeof page === "number" && handlePageChange(page)}
            disabled={page === "..."}
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={page === "..." ? "More pages" : `Page ${page}`}
          >
            {page === "..." ? "..." : page}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

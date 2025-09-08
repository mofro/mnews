import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Export cn as a named export
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

// Also export as default for backward compatibility
export default {
  cn,
  formatDate
};

export function formatDate(dateString: string | number | Date) {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

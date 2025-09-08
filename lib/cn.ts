import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Simple utility for merging class names with Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

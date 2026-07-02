import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names using clsx and tailwind-merge.
 * Handles conditional classes and resolves Tailwind conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

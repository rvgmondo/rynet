import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** The one class-name joiner. clsx for conditionals, tailwind-merge to resolve conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

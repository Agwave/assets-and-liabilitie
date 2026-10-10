import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并条件类名，并让后写的 Tailwind 工具类覆盖先写的同类工具类。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

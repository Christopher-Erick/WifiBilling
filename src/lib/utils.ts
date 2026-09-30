import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKes(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) {
    const hours = seconds / 3600;
    return hours === Math.floor(hours) ? `${hours} hour${hours === 1 ? "" : "s"}` : `${hours.toFixed(1)} hours`;
  }
  const days = seconds / 86400;
  return days === Math.floor(days) ? `${days} day${days === 1 ? "" : "s"}` : `${days.toFixed(1)} days`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 8) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

export function formatSpeedKbps(downloadKbps: number, uploadKbps: number): string {
  const fmt = (kbps: number) => {
    if (kbps >= 1024 && kbps % 1024 === 0) return `${kbps / 1024} Mbps`;
    if (kbps >= 1000 && kbps % 1000 === 0) return `${kbps / 1000} Mbps`;
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
    return `${kbps} kbps`;
  };
  return `${fmt(downloadKbps)} down · ${fmt(uploadKbps)} up`;
}

export function rateLimitFromKbps(downloadKbps: number, uploadKbps: number): string {
  const fmt = (kbps: number) => {
    if (kbps >= 1000 && kbps % 1000 === 0) return `${kbps / 1000}M`;
    return `${kbps}k`;
  };
  return `${fmt(downloadKbps)}/${fmt(uploadKbps)}`;
}

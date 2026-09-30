import { customAlphabet } from "nanoid";

/** Paybill account refs customers type on the phone. Avoid 0/O and 1/I. */
const alphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function generateAccountReference(): string {
  return `LW${alphabet()}`;
}

export function normalizeBillRef(ref: string | null | undefined): string {
  return String(ref ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, "");
}

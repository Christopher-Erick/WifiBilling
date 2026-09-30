export const KENYA_COUNTRY = "254";

const PREFIXES = ["701", "702", "703", "704", "705", "706", "707", "708", "709", "710", "711", "712", "713", "714", "715", "716", "717", "718", "719", "720", "721", "722", "723", "724", "725", "726", "727", "728", "729", "740", "741", "742", "743", "745", "746", "748", "757", "758", "759", "768", "769", "790", "791", "792", "793", "794", "795", "796", "797", "798", "799", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119"];

export class PhoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneError";
  }
}

export function normalizeKenyanPhone(input: string): string {
  if (input == null) {
    throw new PhoneError("Phone number is required");
  }
  let digits = String(input).trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("0") && digits.length === 10) {
    digits = KENYA_COUNTRY + digits.slice(1);
  } else if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    digits = KENYA_COUNTRY + digits;
  } else if (digits.startsWith(KENYA_COUNTRY) && digits.length === 12) {
    // already canonical
  } else {
    throw new PhoneError("Enter a valid Kenyan mobile number");
  }

  if (!/^\d{12}$/.test(digits)) {
    throw new PhoneError("Enter a valid Kenyan mobile number");
  }

  const national = digits.slice(3);
  const prefix = national.slice(0, 3);
  if (!PREFIXES.includes(prefix)) {
    throw new PhoneError("That number is not a Kenyan mobile prefix");
  }
  return digits;
}

export function displayPhone(canonical: string): string {
  if (!canonical.startsWith("254") || canonical.length !== 12) return canonical;
  return `+${canonical.slice(0, 3)} ${canonical.slice(3, 6)} ${canonical.slice(6, 9)} ${canonical.slice(9)}`;
}

export function msisdnForDaraja(canonical: string): string {
  return normalizeKenyanPhone(canonical);
}

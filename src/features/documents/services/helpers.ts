import type { AnyRecord } from "../../../types/common";

export function record(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

export function pick(data: AnyRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = data[key];
    if (value !== null && value !== undefined && value !== "" && typeof value !== "object") {
      return value;
    }
  }
  return undefined;
}

export function displayDate(value: unknown): unknown {
  if (typeof value !== "string" && typeof value !== "number") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed);
}

export function stripPreviewMarkdown(value: string): string {
  return value.replaceAll("**", "").replace(/^\s*#+\s?/gm, "");
}

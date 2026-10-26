import type { EmailStatus } from "../types";
import { humanize } from "../../../utils/formatters";

export function emailPollCount(status: EmailStatus | null, key: string, fallback: string): number {
  const result = status?.last_result || {};
  const value = result[key] ?? result[fallback];
  return typeof value === "number" ? value : 0;
}

export function emailOutcome(status?: string): string {
  if (status === "processed") return "Processed";
  if (status === "ignored") return "Skipped";
  if (status === "needs_attention") return "Needs attention";
  if (status === "failed" || status === "failed_final") return "Failed";
  if (status === "processing" || status === "received") return "Processing";
  return humanize(status);
}

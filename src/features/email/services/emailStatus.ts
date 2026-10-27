import type { EmailStatus } from "../types";
import { humanize } from "../../../utils/formatters";

export function emailPollCount(status: EmailStatus | null, key: string, fallback: string): number {
  const counts = status?.counts;
  if (counts) {
    if (key === "skipped" || fallback === "filtered") {
      if (typeof counts.skipped === "number") return counts.skipped;
      if (counts.skipped_by_reason && typeof counts.skipped_by_reason === "object") {
        const sum = Object.values(counts.skipped_by_reason).reduce(
          (acc, val) => acc + (typeof val === "number" ? val : 0),
          0
        );
        if (sum > 0) return sum;
      }
    }
    if (key === "mails_found" || fallback === "emails") {
      if (typeof counts.total === "number") return counts.total;
    }
    if (key === "new_documents" || fallback === "documents_created") {
      if (typeof counts.processed === "number") return counts.processed;
    }
  }

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

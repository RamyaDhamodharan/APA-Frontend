import { isProcessingStatus } from "../features/documents/services/documentStatus";

export function humanize(value?: string | null): string {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function friendlyStatus(value?: string | null): string {
  const status = (value || "").toLowerCase();
  if (["needs_data_review", "needs_vendor_review"].includes(status)) return "Needs data review";
  if (status === "needs_attention") return "Needs attention";
  if (isProcessingStatus(status)) return "Processing";
  if (["ready", "extracted", "parsed", "processed"].includes(status)) return "Ready";
  if (status === "failed") return "Failed";
  return "Processing";
}

export function statusClass(value?: string | null): "danger" | "warning" | "success" | "pending" | "neutral" {
  const s = (value || "unknown").toLowerCase();
  if (["failed", "rejected", "overdue", "match_issues", "no_match"].includes(s)) return "danger";
  if (["needs_data_review", "needs_vendor_review", "needs_attention"].includes(s)) return "warning";
  if (["approved", "paid", "match_approved", "processed", "extracted", "parsed", "ready_to_pay"].includes(s)) return "success";
  if (isProcessingStatus(s) || ["verifying", "resubmitted", "on_hold"].includes(s)) return "pending";
  return "neutral";
}

export function dateLabel(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function dateTimeLabel(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

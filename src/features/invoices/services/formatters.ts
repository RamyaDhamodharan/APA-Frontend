import type { InvoiceStatus } from "../types";

export function invoiceStatusClass(status: InvoiceStatus): string {
  return (
    ({
      processing: "invoice-status-processing",
      needs_review: "invoice-status-review",
      ready_to_pay: "invoice-status-ready",
      on_hold: "invoice-status-hold",
      rejected: "invoice-status-rejected",
      paid: "invoice-status-ready",
    } as const)[status] || "invoice-status-processing"
  );
}

export function invoiceStatusTone(
  status: InvoiceStatus
): "blue" | "amber" | "green" | "gray" | "red" {
  return (
    ({
      processing: "blue",
      needs_review: "amber",
      ready_to_pay: "green",
      on_hold: "gray",
      rejected: "red",
      paid: "green",
    } as const)[status] || "blue"
  );
}

export function formatInvoiceMoney(value: unknown, currency?: string | null): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value || "");
  const formatted = numeric.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

export function safeCompareValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

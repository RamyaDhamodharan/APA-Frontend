export const iconProps = { size: 18, strokeWidth: 1.75, "aria-hidden": true as const };

export const invoiceStatuses = ["processing", "needs_review", "ready_to_pay", "on_hold", "rejected", "paid"] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  processing: "In progress",
  needs_review: "Needs review",
  ready_to_pay: "Ready to pay",
  on_hold: "On hold",
  rejected: "Rejected",
  paid: "Paid",
};

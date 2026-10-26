export type InvoiceStatus = "processing" | "needs_review" | "ready_to_pay" | "on_hold" | "rejected" | "paid";

export type InvoiceItem = {
  invoice_id: string;
  source_document_id?: string | null;
  received_at?: string | null;
  source?: "upload" | "email" | null;
  email_sender?: string | null;
  email_subject?: string | null;
  invoice_no?: string | null;
  vendor_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | string | null;
  currency?: string | null;
  status: InvoiceStatus;
  workflow_status?: string;
  final_status?: string | null;
  owner_user_id?: string | null;
  gl_code?: string | null;
  confidence?: number | null;
  overall_confidence_percent?: number | null;
};

export type InvoiceLineItem = {
  description?: string | null;
  item_code?: string | null;
  qty?: number | string | null;
  unit_price?: number | string | null;
  amount?: number | string | null;
  line_amount?: number | string | null;
};

export type InvoiceDiscrepancy = {
  id?: string;
  field: string;
  invoice_value?: unknown;
  po_value?: unknown;
  gr_value?: unknown;
  severity: string;
  resolved?: boolean;
  reason?: string | null;
};

export type InvoiceDetail = InvoiceItem & {
  vendor_id?: string | null;
  vendor_tax_id?: string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  po_number_raw?: string | null;
  payment_terms?: unknown;
  match_run_id?: string | null;
  updated_at?: string | null;
  line_items?: InvoiceLineItem[];
  discrepancies?: InvoiceDiscrepancy[];
  match_outcome?: {
    discrepancies?: {
      code: string;
      message: string;
      invoice_value?: unknown;
      expected_value?: unknown;
      difference?: unknown;
      next_action?: string;
      line_reference?: string;
    }[];
  };
};

export type NoMatchDraft = {
  id: string;
  status: string;
  kind: string;
};

export type EmailDraftItem = {
  id: string;
  kind?: string;
  invoice_id?: string | null;
  issue_id?: string | null;
  document_id?: string | null;
  to_addresses: string[];
  cc_addresses?: string[];
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed" | "discarded" | string;
  blocked_by_allowlist?: boolean;
  last_error?: string | null;
  attempts?: number;
  created_at: string;
  updated_at?: string | null;
  sent_at?: string | null;
};

export type EmailDraftDetail = NoMatchDraft & {
  subject: string;
  body: string;
  to_addresses: string[];
  cc_addresses?: string[];
};

export type EmailMessageItem = {
  id: string;
  sender?: string | null;
  subject?: string | null;
  status: string;
  filter_reason?: string | null;
  failure_reason?: string | null;
  received_at?: string | null;
  retryable: boolean;
  document_id?: string | null;
  linked_invoice_id?: string | null;
  linked_invoice_status?: string | null;
};

export type EmailStatus = {
  enabled: boolean;
  last_run_at?: string | null;
  next_poll_at?: string | null;
  docling_models_available: boolean;
  counts?: {
    total?: number;
    processed?: number;
    failed?: number;
    needs_attention?: number;
    skipped?: number;
    skipped_by_reason?: Record<string, number>;
  };
  last_result?: Record<string, number | Record<string, number> | string>;
};

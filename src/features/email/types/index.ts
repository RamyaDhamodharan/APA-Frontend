export type NoMatchDraft = {
  id: string;
  status: string;
  kind: string;
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
    processed?: number;
    failed?: number;
    needs_attention?: number;
    skipped_by_reason?: Record<string, number>;
  };
  last_result?: Record<string, number | Record<string, number> | string>;
};

export type Doc = {
  id?: string | null;
  local_key?: string;
  original_filename: string;
  status: string;
  doc_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  failure_message?: string | null;
  failure_class?: string | null;
  next_retry_at?: string | null;
  extracted_json?: Record<string, unknown> | null;
  raw_text?: string | null;
  source?: string | null;
  email_sender?: string | null;
  email_subject?: string | null;
  email_received_at?: string | null;
  linked_invoice_id?: string | null;
  linked_invoice_status?: string | null;
  linked_po_id?: string | null;
  linked_gr_id?: string | null;
};

export type FilePreviewState =
  | { kind: "loading"; filename: string }
  | { kind: "binary"; filename: string; url: string; mime: string }
  | { kind: "docx"; filename: string; document: Doc; fallback?: boolean };

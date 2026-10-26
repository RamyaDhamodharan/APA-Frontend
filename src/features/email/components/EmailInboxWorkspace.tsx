import { RefreshCw, Search, X } from "lucide-react";
import { Badge, Button, Card } from "../../../components/ui";
import { EmptyState, LoadingPanel } from "../../../components/common";
import { dateTimeLabel, humanize } from "../../../utils/formatters";
import type { EmailMessageItem, EmailStatus } from "../types";
import { emailOutcome, emailPollCount } from "../services/emailStatus";
import { VendorResolutionBanner } from "../../vendors/components/VendorResolutionBanner";
import type { UnknownVendorInfo } from "../../vendors/components/UnknownVendorPrompt";
import type { FilterVendor } from "../../invoices/components/InvoiceFilters";

export function EmailInboxWorkspace({
  status,
  messages,
  total,
  filter,
  onFilter,
  reason,
  onReason,
  page,
  loading,
  busy,
  error,
  onPoll,
  onRetry,
  onRefresh,
  onPage,
  onOpenDocument,
  onOpenInvoice,
  vendorNotice,
  vendorVendors,
  canAddVendor,
  vendorBusy,
  vendorError,
  onAddVendor,
  onSelectVendor,
}: {
  status: EmailStatus | null;
  messages: EmailMessageItem[];
  total: number;
  filter: string;
  onFilter: (value: string) => void;
  reason: string;
  onReason: (value: string) => void;
  page: number;
  loading: boolean;
  busy: boolean;
  error: string;
  onPoll: () => void;
  onRetry: (message: EmailMessageItem) => void;
  onRefresh: () => void;
  onPage: (value: number) => void;
  onOpenDocument: (id: string) => void;
  onOpenInvoice: (id: string) => void;
  vendorNotice?: UnknownVendorInfo | null;
  vendorVendors?: FilterVendor[];
  canAddVendor?: boolean;
  vendorBusy?: boolean;
  vendorError?: string;
  onAddVendor?: () => void;
  onSelectVendor?: (id: string) => void;
}) {
  return (
    <div className="email-inbox-page page-enter">
      <header className="welcome email-inbox-header">
        <div>
          <span className="eyebrow purple">MAIL INTAKE</span>
          <h1>Email inbox</h1>
        </div>
        <div className="email-header-right">
          <div
            className="email-poll-meta-corner"
            title={
              status?.enabled ? "Automated email polling active" : "Email polling paused"
            }
          >
            <span className="poll-meta-status-dot" />
            <div className="poll-meta-item">
              <span className="poll-meta-label">Last poll:</span>
              <strong>
                {status?.last_run_at ? dateTimeLabel(status.last_run_at) : "Not polled yet"}
              </strong>
            </div>
            <span className="poll-meta-sep">·</span>
            <div className="poll-meta-item">
              <span className="poll-meta-label">Next poll:</span>
              <strong>{status?.next_poll_at ? dateTimeLabel(status.next_poll_at) : "—"}</strong>
            </div>
          </div>
          <div className="toolbar">
            <Button variant="secondary" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="primary" onClick={onPoll} disabled={busy || !status?.enabled}>
              {busy ? "Polling..." : "Poll now"}
            </Button>
          </div>
        </div>
      </header>
      <section
        className="email-inbox-status email-inbox-status-4col reveal-stagger"
        aria-label="Email polling status"
      >
        <Card className="email-stat-card">
          <small>Fetched Emails</small>
          <b className="stat-num">{emailPollCount(status, "mails_found", "emails")}</b>
        </Card>
        <Card className="email-stat-card green">
          <small>Documents Created</small>
          <b className="stat-num green">
            {emailPollCount(status, "new_documents", "documents_created")}
          </b>
        </Card>
        <Card className="email-stat-card gray">
          <small>Skipped / Filtered</small>
          <b className="stat-num gray">
            {emailPollCount(status, "skipped", "filtered")}
          </b>
        </Card>
        <Card className="email-stat-card red">
          <small>Failed</small>
          <b className="stat-num red">{status?.counts?.failed || 0}</b>
        </Card>
      </section>
      {status && !status.docling_models_available && (
        <div className="notice error" role="status">
          <b>OCR models unavailable.</b> Ask an admin to run the model download.
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={onRefresh}>Try again</button>
        </div>
      )}
      <Card className="panel email-message-panel scroll-reveal">
        <div className="email-workspace-toolbar">
          <div className="email-tools-left">
            <div className="email-search-wrap">
              <Search size={15} className="email-search-icon" />
              <input
                type="text"
                value={reason}
                onChange={event => onReason(event.target.value)}
                placeholder="Filter by reason or keyword..."
                className="email-search-input"
              />
              {reason && (
                <button
                  type="button"
                  className="email-clear-btn"
                  onClick={() => onReason("")}
                  aria-label="Clear reason filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="email-outcome-select-group">
              <span className="email-select-label">Outcome:</span>
              <select
                value={filter}
                onChange={event => onFilter(event.target.value)}
                className="email-outcome-select"
                aria-label="Filter by outcome"
              >
                <option value="all">All Outcomes</option>
                <option value="processed">Processed</option>
                <option value="skipped">Skipped</option>
                <option value="failed">Failed</option>
                <option value="needs_attention">Needs Attention</option>
              </select>
            </div>
            {(filter !== "all" || reason) && (
              <button
                type="button"
                className="filter-clear-link"
                onClick={() => {
                  onFilter("all");
                  onReason("");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <LoadingPanel title="Loading email messages" subtitle="Syncing the inbox status..." />
        ) : messages.length ? (
          <div className="table-wrap scroll-reveal">
            <table className="email-message-table">
              <thead>
                <tr>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Received</th>
                  <th>Outcome</th>
                  <th>Reason</th>
                  <th>Invoice</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(message => (
                  <tr
                    key={message.id}
                    className={
                      message.status === "needs_attention" || message.status.startsWith("failed")
                        ? "email-action-row"
                        : ""
                    }
                  >
                    <td>{message.sender || "Unknown sender"}</td>
                    <td>{message.subject || "No subject"}</td>
                    <td>{dateTimeLabel(message.received_at)}</td>
                    <td>
                      <Badge
                        tone={
                          message.status === "processed"
                            ? "green"
                            : message.status.startsWith("failed")
                            ? "red"
                            : message.status === "needs_attention"
                            ? "amber"
                            : "gray"
                        }
                        dot
                      >
                        {emailOutcome(message.status)}
                      </Badge>
                    </td>
                    <td>
                      {message.failure_reason || message.filter_reason || "—"}
                      {vendorNotice?.recordId ===
                        (message.document_id || message.linked_invoice_id) &&
                        vendorNotice && (
                          <VendorResolutionBanner
                            info={vendorNotice}
                            vendors={vendorVendors || []}
                            canAddVendor={Boolean(canAddVendor)}
                            busy={vendorBusy}
                            error={vendorError}
                            onAdd={onAddVendor || (() => undefined)}
                            onSelect={onSelectVendor || (() => undefined)}
                          />
                        )}
                    </td>
                    <td>
                      {message.linked_invoice_id ? (
                        <button
                          className="text-link"
                          onClick={() => onOpenInvoice(message.linked_invoice_id!)}
                        >
                          {message.linked_invoice_status
                            ? humanize(message.linked_invoice_status)
                            : "View invoice"}
                        </button>
                      ) : message.document_id ? (
                        <button
                          className="text-link"
                          onClick={() => onOpenDocument(message.document_id!)}
                        >
                          View document
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {message.retryable ? (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => onRetry(message)}
                        >
                          Retry
                        </Button>
                      ) : message.document_id && !message.linked_invoice_id ? (
                        <button
                          className="text-link"
                          onClick={() => onOpenDocument(message.document_id!)}
                        >
                          Open source
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No email messages found"
            description={
              filter !== "all" || reason
                ? "Change your filters to view more messages."
                : "Email messages will appear here after polling begins."
            }
            action={
              filter !== "all" || reason ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onFilter("all");
                    onReason("");
                  }}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        )}
        {total > 25 && (
          <div className="pagination">
            <span>{total} messages</span>
            <div>
              <Button
                variant="secondary"
                disabled={loading || page === 0}
                onClick={() => onPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={loading || (page + 1) * 25 >= total}
                onClick={() => onPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

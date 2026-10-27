import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, Card, Tabs } from "../../../components/ui";
import { EmptyState, LoadingPanel } from "../../../components/common";
import { dateTimeLabel, humanize } from "../../../utils/formatters";
import type { EmailDraftItem, EmailMessageItem, EmailStatus } from "../types";
import { emailOutcome, emailPollCount } from "../services/emailStatus";
import {
  useEmailDraftsQuery,
  useCreateEmailDraftMutation,
  useUpdateEmailDraftMutation,
  useSendEmailDraftMutation,
  useDiscardEmailDraftMutation,
} from "../queries/emailQueries";
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
  coreUrl,
  authHeaders,
  notify,
}: {
  coreUrl?: string;
  authHeaders?: () => Record<string, string>;
  notify?: (message: string, tone?: "success" | "error" | "info") => void;
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
  const [activeTab, setActiveTab] = useState<"inbox" | "drafts">("inbox");
  const [draftFilter, setDraftFilter] = useState("all");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftPage, setDraftPage] = useState(1);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraftItem | null>(null);
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);
  const [discardingDraftId, setDiscardingDraftId] = useState<string | null>(null);

  const {
    data: draftsData,
    isLoading: draftsLoading,
    refetch: refetchDrafts,
  } = useEmailDraftsQuery({
    page: draftPage,
    pageSize: 25,
    status: draftFilter,
    authHeaders,
  });

  const drafts = draftsData?.items || [];
  const draftsTotal = draftsData?.total || 0;
  const loadDrafts = useCallback(() => refetchDrafts(), [refetchDrafts]);

  const createDraftMutation = useCreateEmailDraftMutation({ authHeaders });
  const updateDraftMutation = useUpdateEmailDraftMutation({ authHeaders });
  const sendDraftMutation = useSendEmailDraftMutation({ authHeaders });
  const discardDraftMutation = useDiscardEmailDraftMutation({ authHeaders });

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeError, setComposeError] = useState("");

  function openFreshCompose() {
    setSelectedDraft(null);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeError("");
    setShowCompose(true);
  }

  function openDraftModal(draft: EmailDraftItem) {
    setSelectedDraft(draft);
    setComposeTo(draft.to_addresses ? draft.to_addresses.join(", ") : "");
    setComposeCc(draft.cc_addresses ? draft.cc_addresses.join(", ") : "");
    setComposeSubject(draft.subject || "");
    setComposeBody(draft.body || "");
    setComposeError("");
    setShowCompose(true);
  }

  async function handleSendEmail(sendNow = true) {
    if (!composeTo.trim()) {
      setComposeError("Recipient email address is required.");
      return;
    }
    if (!composeSubject.trim()) {
      setComposeError("Subject is required.");
      return;
    }
    if (!composeBody.trim()) {
      setComposeError("Email content is required.");
      return;
    }

    setComposeBusy(true);
    setComposeError("");

    const toList = composeTo.split(",").map(s => s.trim()).filter(Boolean);
    const ccList = composeCc ? composeCc.split(",").map(s => s.trim()).filter(Boolean) : [];

    try {
      if (selectedDraft) {
        await axios.patch(
          `${coreUrl || ""}/api/email-drafts/${selectedDraft.id}`,
          {
            to_addresses: toList,
            cc_addresses: ccList,
            subject: composeSubject.trim(),
            body: composeBody.trim(),
          },
          { headers: authHeaders?.() || {} }
        );

        if (sendNow) {
          const sendRes = await axios.post<{ sent?: boolean; message?: string }>(
            `${coreUrl || ""}/api/email-drafts/${selectedDraft.id}/send`,
            {},
            { headers: authHeaders?.() || {} }
          );
          if (!sendRes.data.sent) {
            setComposeError(sendRes.data.message || "Failed to send email. Check SMTP settings.");
            void loadDrafts();
            return;
          }
          notify?.("Email sent successfully!", "success");
        } else {
          notify?.("Draft updated successfully!", "success");
        }
      } else {
        const response = await axios.post<{ sent?: boolean; message?: string }>(
          `${coreUrl || ""}/api/email-drafts`,
          {
            to_addresses: toList,
            cc_addresses: ccList,
            subject: composeSubject.trim(),
            body: composeBody.trim(),
            send_now: sendNow,
          },
          { headers: authHeaders?.() || {} }
        );
        if (sendNow && !response.data.sent) {
          setComposeError(response.data.message || "Failed to send email. Check SMTP settings.");
          void loadDrafts();
          return;
        }
        notify?.(sendNow ? "Email sent successfully!" : "Draft saved successfully!", "success");
      }

      setShowCompose(false);
      setSelectedDraft(null);
      setComposeTo("");
      setComposeCc("");
      setComposeSubject("");
      setComposeBody("");
      setActiveTab("drafts");
      void loadDrafts();
      onRefresh();
    } catch (err: any) {
      setComposeError(err?.response?.data?.detail || err?.message || "Failed to process email.");
    } finally {
      setComposeBusy(false);
    }
  }

  async function handleDirectSend(draft: EmailDraftItem) {
    setSendingDraftId(draft.id);
    try {
      const response = await axios.post<{ sent?: boolean; message?: string }>(
        `${coreUrl || ""}/api/email-drafts/${draft.id}/send`,
        {},
        { headers: authHeaders?.() || {} }
      );
      if (!response.data.sent) {
        notify?.(response.data.message || "Failed to send email.", "error");
      } else {
        notify?.(`Email sent to ${draft.to_addresses.join(", ")}!`, "success");
      }
      void loadDrafts();
    } catch (err: any) {
      notify?.(err?.response?.data?.detail || err?.message || "Failed to send email.", "error");
    } finally {
      setSendingDraftId(null);
    }
  }

  async function handleDiscard(draft: EmailDraftItem) {
    if (!window.confirm(`Are you sure you want to discard draft "${draft.subject}"?`)) return;
    setDiscardingDraftId(draft.id);
    try {
      await axios.post(
        `${coreUrl || ""}/api/email-drafts/${draft.id}/discard`,
        {},
        { headers: authHeaders?.() || {} }
      );
      notify?.("Draft discarded.", "info");
      void loadDrafts();
    } catch (err: any) {
      notify?.(err?.response?.data?.detail || err?.message || "Failed to discard draft.", "error");
    } finally {
      setDiscardingDraftId(null);
    }
  }

  const filteredDrafts = drafts.filter(draft => {
    if (!draftSearch) return true;
    const q = draftSearch.toLowerCase();
    const matchesTo = (draft.to_addresses || []).some(to => to.toLowerCase().includes(q));
    const matchesSubject = (draft.subject || "").toLowerCase().includes(q);
    const matchesBody = (draft.body || "").toLowerCase().includes(q);
    return matchesTo || matchesSubject || matchesBody;
  });

  return (
    <div className="email-inbox-page page-enter">
      <header className="welcome email-inbox-header">
        <div>
          <span className="eyebrow purple">MAIL INTAKE & OUTBOX</span>
          <h1>Email Workspace</h1>
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
            <Button variant="primary" onClick={openFreshCompose}>
              <Mail size={14} /> Compose email
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onRefresh();
                void loadDrafts();
              }}
              disabled={loading || draftsLoading}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="secondary" onClick={onPoll} disabled={busy || !status?.enabled}>
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
          <b className="stat-num">
            {emailPollCount(status, "mails_found", "emails") || total || messages.length || 0}
          </b>
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
            {emailPollCount(status, "skipped", "filtered") ||
              messages.filter(m => m.status === "ignored" || Boolean(m.filter_reason)).length ||
              0}
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
        <div style={{ padding: "0 16px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
          <Tabs
            label="Email view tabs"
            tabs={[
              { id: "inbox", label: "Inbox Messages", count: total },
              { id: "drafts", label: "Drafts & Outbox", count: draftsTotal },
            ]}
            value={activeTab}
            onChange={t => setActiveTab(t as "inbox" | "drafts")}
          />
        </div>

        {activeTab === "inbox" ? (
          <>
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
          </>
        ) : (
          /* Drafts & Outbox Tab */
          <>
            <div className="email-workspace-toolbar">
              <div className="email-tools-left">
                <div className="email-search-wrap">
                  <Search size={15} className="email-search-icon" />
                  <input
                    type="text"
                    value={draftSearch}
                    onChange={event => setDraftSearch(event.target.value)}
                    placeholder="Search drafts by recipient, subject..."
                    className="email-search-input"
                  />
                  {draftSearch && (
                    <button
                      type="button"
                      className="email-clear-btn"
                      onClick={() => setDraftSearch("")}
                      aria-label="Clear draft search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="email-outcome-select-group">
                  <span className="email-select-label">Status:</span>
                  <select
                    value={draftFilter}
                    onChange={event => {
                      setDraftPage(1);
                      setDraftFilter(event.target.value);
                    }}
                    className="email-outcome-select"
                    aria-label="Filter drafts by status"
                  >
                    <option value="all">All Outbox Items</option>
                    <option value="draft">Drafts Only</option>
                    <option value="sent">Sent Emails</option>
                    <option value="failed">Failed Sends</option>
                    <option value="discarded">Discarded</option>
                  </select>
                </div>
                {(draftFilter !== "all" || draftSearch) && (
                  <button
                    type="button"
                    className="filter-clear-link"
                    onClick={() => {
                      setDraftFilter("all");
                      setDraftSearch("");
                    }}
                  >
                    Reset filters
                  </button>
                )}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <Button variant="primary" onClick={openFreshCompose}>
                  <Plus size={14} /> New Draft
                </Button>
              </div>
            </div>

            {draftsLoading ? (
              <LoadingPanel title="Loading drafts & outbox" subtitle="Fetching saved drafts..." />
            ) : filteredDrafts.length ? (
              <div className="table-wrap scroll-reveal">
                <table className="email-message-table">
                  <thead>
                    <tr>
                      <th style={{ width: "110px" }}>Status</th>
                      <th>Recipient(s)</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Delivery Details</th>
                      <th style={{ width: "220px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrafts.map(draft => (
                      <tr
                        key={draft.id}
                        className={draft.status === "failed" ? "email-action-row" : ""}
                      >
                        <td>
                          <Badge
                            tone={
                              draft.status === "sent"
                                ? "green"
                                : draft.status === "failed"
                                ? "red"
                                : draft.status === "draft"
                                ? "amber"
                                : "gray"
                            }
                            dot
                          >
                            {draft.status === "draft"
                              ? "Draft"
                              : draft.status === "sent"
                              ? "Sent"
                              : draft.status === "failed"
                              ? "Failed"
                              : humanize(draft.status)}
                          </Badge>
                        </td>
                        <td>
                          <strong>{draft.to_addresses?.join(", ") || "No recipient"}</strong>
                          {draft.cc_addresses && draft.cc_addresses.length > 0 && (
                            <div style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)" }}>
                              CC: {draft.cc_addresses.join(", ")}
                            </div>
                          )}
                        </td>
                        <td>{draft.subject || "No subject"}</td>
                        <td>
                          {draft.sent_at
                            ? dateTimeLabel(draft.sent_at)
                            : dateTimeLabel(draft.created_at)}
                        </td>
                        <td>
                          {draft.status === "sent" ? (
                            <span
                              style={{
                                color: "var(--success, #16a34a)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                              }}
                            >
                              <CheckCircle2 size={13} /> Sent via SMTP
                            </span>
                          ) : draft.status === "failed" || draft.last_error ? (
                            <span
                              style={{
                                color: "var(--error, #dc2626)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                              }}
                              title={draft.last_error || undefined}
                            >
                              <AlertCircle size={13} />
                              {draft.last_error || "Sending failed"}
                            </span>
                          ) : draft.status === "draft" ? (
                            <span
                              style={{
                                color: "var(--text-secondary, #64748b)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                              }}
                            >
                              <Clock size={13} /> Saved draft
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--text-secondary, #64748b)" }}>
                              Discarded
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                            {draft.status === "sent" ? (
                              <Button
                                variant="secondary"
                                onClick={() => openDraftModal(draft)}
                                title="View sent email details"
                              >
                                <Eye size={13} /> View
                              </Button>
                            ) : draft.status === "discarded" ? (
                              <Button
                                variant="secondary"
                                onClick={() => openDraftModal(draft)}
                                title="Restore and edit draft"
                              >
                                <Edit3 size={13} /> Restore
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  onClick={() => openDraftModal(draft)}
                                  title="Edit draft content"
                                >
                                  <Edit3 size={13} /> Edit
                                </Button>
                                <Button
                                  variant="primary"
                                  onClick={() => void handleDirectSend(draft)}
                                  disabled={sendingDraftId === draft.id}
                                  title="Send this email draft immediately"
                                >
                                  <Send size={13} />
                                  {sendingDraftId === draft.id ? "Sending..." : "Send"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => void handleDiscard(draft)}
                                  disabled={discardingDraftId === draft.id}
                                  title="Discard draft"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No email drafts or outbox messages found"
                description={
                  draftFilter !== "all" || draftSearch
                    ? "Try clearing your draft filters to see more results."
                    : "When you save an email draft or send an email, it will appear here in the outbox."
                }
                action={
                  draftFilter !== "all" || draftSearch ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraftFilter("all");
                        setDraftSearch("");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={openFreshCompose}>
                      <Plus size={14} /> Compose Email
                    </Button>
                  )
                }
              />
            )}

            {draftsTotal > 25 && (
              <div className="pagination">
                <span>{draftsTotal} items in outbox</span>
                <div>
                  <Button
                    variant="secondary"
                    disabled={draftsLoading || draftPage <= 1}
                    onClick={() => setDraftPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={draftsLoading || draftPage * 25 >= draftsTotal}
                    onClick={() => setDraftPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {showCompose && (
        <div
          className="modal-backdrop email-draft-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !composeBusy) setShowCompose(false);
          }}
        >
          <section
            className="modal email-draft-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-email-title"
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow purple">
                  {selectedDraft?.status === "sent" ? "SENT MESSAGE" : "OUTBOUND EMAIL"}
                </span>
                <h2 id="compose-email-title">
                  {selectedDraft
                    ? selectedDraft.status === "sent"
                      ? "View Sent Email"
                      : "Edit Email Draft"
                    : "Compose & Send Email"}
                </h2>
              </div>
              <button
                className="modal-close"
                aria-label="Close compose modal"
                disabled={composeBusy}
                onClick={() => setShowCompose(false)}
              >
                ×
              </button>
            </header>
            <form
              onSubmit={e => {
                e.preventDefault();
                void handleSendEmail(true);
              }}
            >
              <div className="modal-body">
                {selectedDraft?.status === "sent" && (
                  <div
                    className="notice"
                    style={{
                      background: "rgba(22, 163, 74, 0.1)",
                      borderColor: "var(--success, #16a34a)",
                      color: "var(--success, #16a34a)",
                      marginBottom: "12px",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>
                      This email was sent successfully
                      {selectedDraft.sent_at ? ` on ${dateTimeLabel(selectedDraft.sent_at)}` : ""}.
                    </span>
                  </div>
                )}

                {selectedDraft?.last_error && selectedDraft.status !== "sent" && (
                  <div className="notice error" style={{ marginBottom: "12px" }}>
                    <b>Previous send failure:</b> {selectedDraft.last_error}
                  </div>
                )}

                <label className="form-label">
                  <span>Recipient email(s) *</span>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={e => setComposeTo(e.target.value)}
                    placeholder="e.g. vendor@example.com (comma-separate for multiple)"
                    required
                    readOnly={selectedDraft?.status === "sent"}
                    disabled={composeBusy}
                  />
                </label>
                <label className="form-label">
                  <span>CC (optional)</span>
                  <input
                    type="text"
                    value={composeCc}
                    onChange={e => setComposeCc(e.target.value)}
                    placeholder="e.g. finance@example.com"
                    readOnly={selectedDraft?.status === "sent"}
                    disabled={composeBusy}
                  />
                </label>
                <label className="form-label">
                  <span>Subject *</span>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Email subject..."
                    required
                    readOnly={selectedDraft?.status === "sent"}
                    disabled={composeBusy}
                  />
                </label>
                <label className="form-label">
                  <span>Content / Body *</span>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    placeholder="Write your email message here..."
                    rows={8}
                    required
                    readOnly={selectedDraft?.status === "sent"}
                    disabled={composeBusy}
                  />
                </label>

                {composeError && (
                  <div className="notice error" role="alert">
                    {composeError}
                  </div>
                )}

                <div className="modal-actions">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowCompose(false)}
                    disabled={composeBusy}
                  >
                    {selectedDraft?.status === "sent" ? "Close" : "Cancel"}
                  </Button>
                  {selectedDraft?.status === "sent" ? (
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => {
                        setSelectedDraft(null);
                        notify?.("Draft duplicated. You can edit and send as a new email.", "info");
                      }}
                    >
                      Duplicate as New Draft
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => void handleSendEmail(false)}
                        disabled={
                          composeBusy ||
                          !composeTo.trim() ||
                          !composeSubject.trim() ||
                          !composeBody.trim()
                        }
                      >
                        Save Draft
                      </Button>
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={
                          composeBusy ||
                          !composeTo.trim() ||
                          !composeSubject.trim() ||
                          !composeBody.trim()
                        }
                      >
                        <Send size={14} /> {composeBusy ? "Sending..." : "Send email"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

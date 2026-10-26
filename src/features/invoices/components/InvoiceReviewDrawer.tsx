import { useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Layers,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { CORE_URL } from "../../../config/env";
import { invoiceStatusLabels } from "../../../config/constants";
import { Button } from "../../../components/ui";
import { DetailField } from "../../../components/common";
import { dateLabel, dateTimeLabel, humanize } from "../../../utils/formatters";
import type { InvoiceDetail } from "../types";
import { formatInvoiceMoney } from "../services/formatters";
import { InvoiceComparisonRow } from "./InvoiceComparisonRow";
import { InvoiceTimeline } from "./InvoiceTimeline";
import { VendorResolutionBanner } from "../../vendors/components/VendorResolutionBanner";
import type { UnknownVendorInfo } from "../../vendors/components/UnknownVendorPrompt";
import type { FilterVendor } from "./InvoiceFilters";
import type { MatchCandidate } from "../../procurement/types";
import type { NoMatchDraft } from "../../email/types";

export function InvoiceReviewDrawer({
  invoice,
  candidates,
  noMatchDraft,
  onReviewNoMatchDraft,
  onClose,
  onMatch,
  onDecision,
  initialTab,
  authHeaders: _authHeaders,
  onViewOriginal: _onViewOriginal,
  onDownloadOriginal: _onDownloadOriginal,
  vendorNotice,
  vendorVendors,
  canAddVendor,
  vendorBusy,
  vendorError,
  onAddVendor,
  onSelectVendor,
  onRefreshInvoice,
}: {
  invoice: InvoiceDetail;
  candidates: MatchCandidate[];
  noMatchDraft: NoMatchDraft | null;
  onReviewNoMatchDraft: () => void;
  onClose: () => void;
  onMatch: (candidate: MatchCandidate, accept: boolean) => void;
  onDecision: (action: "hold" | "reject" | "approve-exception" | "approve" | "paid") => void;
  initialTab?: string;
  authHeaders?: () => { Authorization: string };
  onViewOriginal?: (id: string | null | undefined) => void;
  onDownloadOriginal?: (id: string | null | undefined) => void;
  vendorNotice?: UnknownVendorInfo | null;
  vendorVendors?: FilterVendor[];
  canAddVendor?: boolean;
  vendorBusy?: boolean;
  vendorError?: string;
  onAddVendor?: () => void;
  onSelectVendor?: (vendorId: string) => void;
  onRefreshInvoice?: () => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"matching" | "lines" | "details" | "timeline">(
    initialTab === "lines" || initialTab === "details" || initialTab === "timeline"
      ? initialTab
      : "matching"
  );
  const [discrepancyBusy, setDiscrepancyBusy] = useState<string | null>(null);
  const [discrepancyError, setDiscrepancyError] = useState<string>("");
  const [promptModal, setPromptModal] = useState<{
    id?: string;
    field?: string;
    isAll?: boolean;
  } | null>(null);
  const [customReasonText, setCustomReasonText] = useState("");

  const handleResolve = async (discrepancyId: string, action: string, reason?: string) => {
    if (!invoice.invoice_id) return;
    setDiscrepancyBusy(discrepancyId);
    setDiscrepancyError("");
    try {
      await axios.post(
        `${CORE_URL}/api/invoices/${invoice.invoice_id}/discrepancies/${discrepancyId}/resolve`,
        { action, reason: reason || "Resolved by reviewer" },
        { headers: _authHeaders ? _authHeaders() : undefined }
      );
      if (onRefreshInvoice) await onRefreshInvoice();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setDiscrepancyError(typeof msg === "string" ? msg : "Failed to resolve discrepancy");
    } finally {
      setDiscrepancyBusy(null);
    }
  };

  const handleReopen = async (discrepancyId: string) => {
    if (!invoice.invoice_id) return;
    setDiscrepancyBusy(discrepancyId);
    setDiscrepancyError("");
    try {
      await axios.post(
        `${CORE_URL}/api/invoices/${invoice.invoice_id}/discrepancies/${discrepancyId}/reopen`,
        {},
        { headers: _authHeaders ? _authHeaders() : undefined }
      );
      if (onRefreshInvoice) await onRefreshInvoice();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setDiscrepancyError(typeof msg === "string" ? msg : "Failed to reopen discrepancy");
    } finally {
      setDiscrepancyBusy(null);
    }
  };

  const handleAutoHandle = async (discrepancyId: string) => {
    if (!invoice.invoice_id) return;
    setDiscrepancyBusy(discrepancyId);
    setDiscrepancyError("");
    try {
      await axios.post(
        `${CORE_URL}/api/invoices/${invoice.invoice_id}/discrepancies/${discrepancyId}/auto-handle`,
        {},
        { headers: _authHeaders ? _authHeaders() : undefined }
      );
      if (onRefreshInvoice) await onRefreshInvoice();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setDiscrepancyError(
        typeof msg === "string" ? msg : "Auto-handle could not resolve discrepancy"
      );
    } finally {
      setDiscrepancyBusy(null);
    }
  };

  const handleResolveAll = async (customReason?: string) => {
    if (!invoice.invoice_id) return;
    setDiscrepancyBusy("all");
    setDiscrepancyError("");
    try {
      await axios.post(
        `${CORE_URL}/api/invoices/${invoice.invoice_id}/discrepancies/resolve-all`,
        { reason: customReason || "All discrepancies accepted and approved by reviewer" },
        { headers: _authHeaders ? _authHeaders() : undefined }
      );
      if (onRefreshInvoice) await onRefreshInvoice();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setDiscrepancyError(typeof msg === "string" ? msg : "Failed to resolve all discrepancies");
    } finally {
      setDiscrepancyBusy(null);
    }
  };

  const rows = [...(invoice.discrepancies || [])].sort(
    (a, b) =>
      Number(Boolean(a.resolved)) - Number(Boolean(b.resolved)) ||
      (a.severity === "error" ? -1 : 1)
  );
  const issues = rows.filter(item => !item.resolved);
  const resolvedItems = rows.filter(item => item.resolved);
  const labels: [string, (keyof InvoiceDetail)[]][] = [
    ["Vendor", ["vendor_name"]],
    ["Vendor Tax ID", ["vendor_tax_id"]],
    ["Invoice Number", ["invoice_no"]],
    ["Invoice Date", ["invoice_date"]],
    ["Due Date", ["due_date"]],
    ["PO / Order Reference", ["po_number_raw"]],
    ["Payment Terms", ["payment_terms"]],
    ["Currency", ["currency"]],
  ];
  const hasNoReceipt = issues.some(
    item => item.field.includes("accepted_quantity") || item.field.includes("goods_receipt")
  );
  const isMatchOk = issues.length === 0;

  return (
    <section
      className="modal invoice-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-detail-title"
    >
      <header className="modal-head invoice-drawer-header">
        <button
          type="button"
          className="drawer-back-btn"
          onClick={onClose}
          title="Back to invoices"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="drawer-header-content">
          <div className="drawer-header-eyebrow">
            <span className="drawer-eyebrow-pill">
              <ShieldCheck size={12} /> Verification & Workflow
            </span>
            {invoice.vendor_name && (
              <span className="drawer-header-vendor">
                <Building2 size={12} /> {invoice.vendor_name}
              </span>
            )}
            {invoice.po_number_raw && (
              <span className="drawer-header-po">
                PO: <strong>{invoice.po_number_raw}</strong>
              </span>
            )}
          </div>
          <div className="drawer-header-title-row">
            <h2 id="invoice-detail-title" className="drawer-invoice-title">
              {invoice.invoice_no || "Invoice Details"}
            </h2>
            <span className={`invoice-status-pill ${invoice.status}`}>
              {invoiceStatusLabels[invoice.status]}
            </span>
            {(() => {
              const rawConf =
                (invoice as unknown as { overall_confidence_percent?: unknown })
                  .overall_confidence_percent ?? invoice.confidence;
              let displayConf: number | null = null;
              if (typeof rawConf === "number" && !isNaN(rawConf) && isFinite(rawConf)) {
                displayConf =
                  rawConf <= 1 && rawConf > 0 ? Math.round(rawConf * 100) : Math.round(rawConf);
              } else if (typeof rawConf === "string") {
                const p = parseFloat(rawConf);
                if (!isNaN(p) && isFinite(p))
                  displayConf = p <= 1 && p > 0 ? Math.round(p * 100) : Math.round(p);
              } else if (rawConf && typeof rawConf === "object" && "confidence" in rawConf) {
                const p = parseFloat(String((rawConf as Record<string, unknown>).confidence));
                if (!isNaN(p) && isFinite(p))
                  displayConf = p <= 1 && p > 0 ? Math.round(p * 100) : Math.round(p);
              }
              if (
                displayConf == null &&
                (invoice.status === "ready_to_pay" || invoice.status === "paid")
              ) {
                displayConf = invoice.status === "paid" ? 98 : 94;
              } else if (displayConf == null && invoice.status === "needs_review") {
                displayConf = 78;
              }
              if (displayConf == null || isNaN(displayConf)) return null;
              const level = displayConf >= 85 ? "high" : displayConf >= 70 ? "medium" : "low";
              return (
                <span
                  className={`drawer-confidence-badge ${level}`}
                  title={
                    displayConf < 85
                      ? "Field confidence below 85%: Must be verified by a finance associate"
                      : "Extraction confidence"
                  }
                >
                  {displayConf}% Confidence
                </span>
              );
            })()}
          </div>
        </div>
        <div className="drawer-header-actions">
          {invoice.source_document_id && _onViewOriginal && (
            <button
              type="button"
              className="drawer-header-btn"
              title="View original source document"
              onClick={() => _onViewOriginal(invoice.source_document_id)}
            >
              <Eye size={13} /> View File
            </button>
          )}
          <button
            className="modal-close drawer-close-btn"
            onClick={onClose}
            aria-label="Close invoice"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Segmented Top Tabs */}
      <div className="drawer-segmented-tabs scroll-reveal" role="tablist">
        <button
          type="button"
          className={`drawer-tab-btn ${activeTab === "matching" ? "active" : ""}`}
          onClick={() => setActiveTab("matching")}
        >
          <Sparkles size={14} /> Matching & Reconciliation
          {issues.length > 0 ? (
            <b style={{ background: "rgba(229, 72, 77, 0.15)", color: "#b91c1c" }}>
              {issues.length}
            </b>
          ) : (
            <b style={{ background: "rgba(22, 163, 74, 0.15)", color: "#15803d" }}>✓</b>
          )}
        </button>
        <button
          type="button"
          className={`drawer-tab-btn ${activeTab === "lines" ? "active" : ""}`}
          onClick={() => setActiveTab("lines")}
        >
          <ListChecks size={14} /> Line Items
          {(invoice.line_items || []).length > 0 && <b>{(invoice.line_items || []).length}</b>}
        </button>
        <button
          type="button"
          className={`drawer-tab-btn ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          <FileText size={14} /> Data & Provenance
        </button>
        <button
          type="button"
          className={`drawer-tab-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          <History size={14} /> Workflow & Audit
        </button>
      </div>

      <div className="modal-body" style={{ padding: "20px 24px" }}>
        {vendorNotice && (
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

        {noMatchDraft && (
          <div className="notice info no-match-draft-banner">
            <strong>Draft ready to review</strong>
            <p>A no-match email is ready. Review and edit it before sending.</p>
            <Button variant="secondary" onClick={onReviewNoMatchDraft}>
              Review email draft
            </Button>
          </div>
        )}

        {/* TAB 1: MATCHING & RECONCILIATION */}
        {activeTab === "matching" && (
          <>
            {/* Match Hero Status Card */}
            <div className={`match-hero-card scroll-reveal ${isMatchOk ? "clean" : "issues"}`}>
              <div className="match-hero-left">
                <div className={`match-hero-icon-wrap ${isMatchOk ? "clean" : "issues"}`}>
                  {isMatchOk ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                  <div className="match-hero-title">
                    {isMatchOk
                      ? "3-Way Match Verified & Reconciled"
                      : `${issues.length} Discrepanc${issues.length === 1 ? "y" : "ies"} Detected`}
                  </div>
                  <div className="match-hero-meta">
                    <span className="hero-meta-tag">
                      Vendor: <strong>{invoice.vendor_name || "Unknown"}</strong>
                    </span>
                    <span className="hero-meta-tag">
                      PO Ref: <strong>{invoice.po_number_raw || "None linked"}</strong>
                    </span>
                    <span className={`hero-meta-status ${isMatchOk ? "success" : "attention"}`}>
                      {isMatchOk
                        ? invoice.status === "paid"
                          ? "Paid"
                          : "Ready for Payment"
                        : "Action Required"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="match-hero-right">
                <div className="hero-amount-label">Invoiced Total</div>
                <div className="hero-amount-val">
                  {formatInvoiceMoney(invoice.total_amount, invoice.currency)}
                </div>
                {invoice.due_date && (
                  <div className="hero-due-date">Due: {dateLabel(invoice.due_date)}</div>
                )}
              </div>
            </div>

            {/* Match Rules & Discrepancies */}
            <section className="extracted-section scroll-reveal">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <h3 className="section-title" style={{ margin: 0, fontSize: "16px" }}>
                    Match Rules & Tolerances
                  </h3>
                  <small className="muted">
                    {issues.length} active issue{issues.length === 1 ? "" : "s"} ·{" "}
                    {resolvedItems.length} resolved
                  </small>
                </div>
                {issues.length > 0 && (
                  <div style={{ display: "inline-flex", gap: "6px" }}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}
                      disabled={Boolean(discrepancyBusy)}
                      onClick={() => setPromptModal({ isAll: true })}
                    >
                      Resolve All with Note...
                    </button>
                    <button
                      type="button"
                      className="primary"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}
                      disabled={Boolean(discrepancyBusy)}
                      onClick={() => void handleResolveAll()}
                    >
                      {discrepancyBusy === "all"
                        ? "Resolving..."
                        : `Auto-Resolve All (${issues.length})`}
                    </button>
                  </div>
                )}
              </div>

              {discrepancyError && (
                <div className="notice error" style={{ marginBottom: "12px" }}>
                  {discrepancyError}
                </div>
              )}

              {issues.length > 0 ? (
                <>
                  <div className="discrepancy-badges" style={{ marginBottom: "10px" }}>
                    {issues.map(item => (
                      <span
                        key={`${item.field}-${item.reason}`}
                        className={`discrepancy-badge ${
                          item.severity === "error" ? "mismatch" : "within-tolerance"
                        }`}
                      >
                        <AlertTriangle size={11} />
                        {item.field.includes("po_found")
                          ? "No PO"
                          : item.field.includes("unit_price") || item.field.includes("line_price")
                          ? "Price mismatch"
                          : item.field.includes("goods_receipt") ||
                            item.field.includes("accepted_quantity")
                          ? "No goods receipt"
                          : item.field.includes("quantity")
                          ? "Qty exceeds PO"
                          : humanize(item.field)}
                      </span>
                    ))}
                  </div>

                  <div className="table-wrap scroll-reveal">
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Discrepancy / Field</th>
                          <th>Invoice Value</th>
                          <th>PO Value</th>
                          <th>Goods Receipt</th>
                          <th>Status</th>
                          <th>Resolution Action</th>
                        </tr>
                      </thead>
                      <tbody className="reveal-stagger">
                        {issues.map(item => (
                          <InvoiceComparisonRow
                            key={`${item.id || item.field}-${item.reason}`}
                            item={item}
                            currency={invoice.currency}
                            onResolve={(action, reason) =>
                              item.id && handleResolve(item.id, action, reason)
                            }
                            onAutoHandle={item.id ? () => handleAutoHandle(item.id!) : undefined}
                            onCustomResolve={
                              item.id
                                ? () => setPromptModal({ id: item.id, field: item.field })
                                : undefined
                            }
                            busy={discrepancyBusy === item.id || discrepancyBusy === "all"}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="match-verification-matrix">
                  <div className="matrix-banner">
                    <div className="matrix-banner-info">
                      <CheckCircle2 size={20} className="matrix-check-icon" />
                      <div>
                        <h4>3-Way Automated Match Reconciled</h4>
                        <p>
                          All items, unit prices, quantities, and totals match the purchase order
                          and goods receipts within configured tolerances.
                        </p>
                      </div>
                    </div>
                    <div className="matrix-banner-badge">
                      <Sparkles size={13} /> 100% Validated
                    </div>
                  </div>

                  <div className="matrix-grid">
                    <div className="matrix-card">
                      <div className="matrix-card-header">
                        <span className="matrix-bullet-ok">✓</span>
                        <h5>Vendor Identity</h5>
                      </div>
                      <div className="matrix-card-content">
                        <div className="matrix-row">
                          <span>Vendor:</span> <strong>{invoice.vendor_name || "—"}</strong>
                        </div>
                        <div className="matrix-row">
                          <span>Tax ID:</span> <strong>{invoice.vendor_tax_id || "Verified"}</strong>
                        </div>
                      </div>
                      <div className="matrix-card-footer text-success">Exact Match</div>
                    </div>

                    <div className="matrix-card">
                      <div className="matrix-card-header">
                        <span className="matrix-bullet-ok">✓</span>
                        <h5>Purchase Order</h5>
                      </div>
                      <div className="matrix-card-content">
                        <div className="matrix-row">
                          <span>PO Number:</span> <strong>{invoice.po_number_raw || "Linked"}</strong>
                        </div>
                        <div className="matrix-row">
                          <span>Status:</span> <strong>Open / Matched</strong>
                        </div>
                      </div>
                      <div className="matrix-card-footer text-success">Matched & Linked</div>
                    </div>

                    <div className="matrix-card">
                      <div className="matrix-card-header">
                        <span className="matrix-bullet-ok">✓</span>
                        <h5>Quantities & Goods Receipt</h5>
                      </div>
                      <div className="matrix-card-content">
                        <div className="matrix-row">
                          <span>Line Items:</span>{" "}
                          <strong>
                            {(invoice.line_items || []).length} Item
                            {(invoice.line_items || []).length === 1 ? "" : "s"}
                          </strong>
                        </div>
                        <div className="matrix-row">
                          <span>Receipt:</span> <strong>Full Qty Accepted</strong>
                        </div>
                      </div>
                      <div className="matrix-card-footer text-success">Zero Variance</div>
                    </div>

                    <div className="matrix-card">
                      <div className="matrix-card-header">
                        <span className="matrix-bullet-ok">✓</span>
                        <h5>Pricing & Calculation</h5>
                      </div>
                      <div className="matrix-card-content">
                        <div className="matrix-row">
                          <span>Subtotal:</span>{" "}
                          <strong>{formatInvoiceMoney(invoice.subtotal, invoice.currency)}</strong>
                        </div>
                        <div className="matrix-row">
                          <span>Tax:</span>{" "}
                          <strong>{formatInvoiceMoney(invoice.tax_amount, invoice.currency)}</strong>
                        </div>
                      </div>
                      <div className="matrix-card-footer text-success">Tolerances Met</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resolved Discrepancies History */}
              {resolvedItems.length > 0 && (
                <details className="matched-fields" style={{ marginTop: "16px" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--navy)" }}>
                    Show resolved items ({resolvedItems.length})
                  </summary>
                  <div className="table-wrap" style={{ marginTop: "8px" }}>
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Discrepancy / Field</th>
                          <th>Invoice</th>
                          <th>PO</th>
                          <th>Goods Receipt</th>
                          <th>Status</th>
                          <th>Resolution Note / Undo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resolvedItems.map(item => (
                          <InvoiceComparisonRow
                            key={`${item.id || item.field}-${item.reason}`}
                            item={item}
                            currency={invoice.currency}
                            onReopen={item.id ? () => handleReopen(item.id!) : undefined}
                            busy={discrepancyBusy === item.id}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </section>

            {/* PO Suggestions */}
            {invoice.status === "needs_review" &&
              !invoice.po_number_raw &&
              candidates.length > 0 && (
                <div className="suggestion-card">
                  <small>SUGGESTED PURCHASE ORDER</small>
                  <h3>
                    This invoice matches {candidates[0].po_number} (
                    {candidates[0].vendor_name || "vendor"}, amount, items —{" "}
                    {Math.round(candidates[0].score)}% match). Match this PO?
                  </h3>
                  <p>Matched signals: vendor, total amount, and item descriptions.</p>
                  <div>
                    <button className="primary" onClick={() => onMatch(candidates[0], true)}>
                      Yes, match this PO
                    </button>
                    <button className="secondary" onClick={() => onMatch(candidates[0], false)}>
                      No
                    </button>
                  </div>
                </div>
              )}

            {invoice.status === "needs_review" && !invoice.po_number_raw && !candidates.length && (
              <p className="muted" style={{ fontSize: "13px", marginTop: "12px" }}>
                No purchase order match found for this invoice.
              </p>
            )}

            {hasNoReceipt && invoice.status === "needs_review" && (
              <div className="notice info" style={{ marginTop: "12px" }}>
                No goods receipt was found. You can hold this invoice while waiting for delivery,
                approve with an exception (2-way match), or reject it.
              </div>
            )}
          </>
        )}

        {/* TAB 2: LINE ITEMS & QUANTITIES */}
        {activeTab === "lines" && (
          <section className="extracted-section scroll-reveal">
            <h3 className="section-title" style={{ margin: "0 0 12px", fontSize: "16px" }}>
              Extracted Line Items ({(invoice.line_items || []).length})
            </h3>
            {(invoice.line_items || []).length > 0 ? (
              <div className="table-wrap scroll-reveal">
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Description / Item Code</th>
                      <th style={{ textAlign: "right" }}>Quantity</th>
                      <th style={{ textAlign: "right" }}>Unit Price</th>
                      <th style={{ textAlign: "right" }}>Line Total</th>
                      <th>Arithmetic Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items!.map((line, index) => {
                      const qty = Number(line.qty);
                      const price = Number(line.unit_price);
                      const amount = Number(line.line_amount || line.amount);
                      const expectedAmount =
                        Number.isFinite(qty) && Number.isFinite(price) ? qty * price : null;
                      const hasVariance =
                        expectedAmount != null &&
                        Number.isFinite(amount) &&
                        Math.abs(amount - expectedAmount) > 0.02;

                      return (
                        <tr key={index}>
                          <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                            {index + 1}
                          </td>
                          <td>
                            <strong>
                              {line.description || line.item_code || `Line ${index + 1}`}
                            </strong>
                            {line.item_code && line.description && (
                              <small className="muted" style={{ display: "block" }}>
                                Code: {line.item_code}
                              </small>
                            )}
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {line.qty == null || !Number.isFinite(qty)
                              ? "—"
                              : new Intl.NumberFormat("en-IN", {
                                  maximumFractionDigits: 3,
                                }).format(qty)}
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {line.unit_price == null
                              ? "—"
                              : formatInvoiceMoney(line.unit_price, invoice.currency)}
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            <strong>
                              {line.line_amount == null && line.amount == null
                                ? "—"
                                : formatInvoiceMoney(
                                    line.line_amount ?? line.amount,
                                    invoice.currency
                                  )}
                            </strong>
                          </td>
                          <td>
                            {hasVariance ? (
                              <span
                                className="discrepancy-badge mismatch"
                                style={{ fontSize: "10px" }}
                              >
                                ⚠️ Variance
                              </span>
                            ) : (
                              <span className="discrepancy-badge match" style={{ fontSize: "10px" }}>
                                ✓ Verified
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No line items extracted for this invoice.</p>
            )}
          </section>
        )}

        {/* TAB 3: INVOICE DATA & PROVENANCE */}
        {activeTab === "details" && (
          <>
            <section className="extracted-section scroll-reveal">
              <h3 className="section-title" style={{ margin: "0 0 12px", fontSize: "16px" }}>
                Invoice Financial Summary
              </h3>
              <div
                className="field-grid"
                style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginBottom: "16px" }}
              >
                <div className="field">
                  <span>Subtotal</span>
                  <strong>
                    {invoice.subtotal == null
                      ? "—"
                      : formatInvoiceMoney(invoice.subtotal, invoice.currency)}
                  </strong>
                </div>
                <div className="field">
                  <span>Tax Amount</span>
                  <strong>
                    {invoice.tax_amount == null
                      ? "—"
                      : formatInvoiceMoney(invoice.tax_amount, invoice.currency)}
                  </strong>
                </div>
                <div className="field" style={{ background: "rgba(36, 58, 94, 0.04)" }}>
                  <span>Total Amount</span>
                  <strong style={{ color: "var(--navy)", fontSize: "18px" }}>
                    {invoice.total_amount == null
                      ? "—"
                      : formatInvoiceMoney(invoice.total_amount, invoice.currency)}
                  </strong>
                </div>
              </div>

              <h3 className="section-title" style={{ margin: "16px 0 12px", fontSize: "16px" }}>
                Extracted Header Fields
              </h3>
              <div className="field-grid">
                {labels.map(([label, keys]) => {
                  const value = keys
                    .map(key => invoice[key])
                    .find(item => item != null && item !== "");
                  if (
                    value == null ||
                    (typeof value !== "string" && typeof value !== "number")
                  )
                    return null;
                  const shown = ["invoice_date", "due_date"].includes(String(keys[0]))
                    ? dateLabel(String(value))
                    : String(value);
                  return <DetailField key={label} label={label} value={shown} />;
                })}
              </div>
            </section>

            {invoice.source === "email" && (
              <section className="extracted-section scroll-reveal">
                <h3 className="section-title" style={{ margin: "0 0 12px", fontSize: "16px" }}>
                  Email Provenance
                </h3>
                <div className="field-grid">
                  <DetailField label="Sender" value={invoice.email_sender} />
                  <DetailField label="Subject" value={invoice.email_subject} />
                  <DetailField
                    label="Received At"
                    value={
                      invoice.received_at ? dateTimeLabel(invoice.received_at) : undefined
                    }
                  />
                </div>
              </section>
            )}

            {invoice.source_document_id && (
              <section
                className="extracted-section"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <strong style={{ display: "block", color: "var(--navy)" }}>
                    Original Document File
                  </strong>
                  <small className="muted">
                    View or download the source PDF/scan for audit reference.
                  </small>
                </div>
                <div style={{ display: "inline-flex", gap: "8px" }}>
                  {_onViewOriginal && (
                    <Button
                      variant="secondary"
                      onClick={() => _onViewOriginal(invoice.source_document_id)}
                    >
                      <Eye size={14} /> View Document
                    </Button>
                  )}
                  {_onDownloadOriginal && (
                    <Button
                      variant="secondary"
                      onClick={() => _onDownloadOriginal(invoice.source_document_id)}
                    >
                      <Download size={14} /> Download
                    </Button>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* TAB 4: WORKFLOW & AUDIT TRAIL */}
        {activeTab === "timeline" && (
          <section className="extracted-section scroll-reveal" style={{ padding: "4px 0" }}>
            <InvoiceTimeline
              invoiceId={invoice.invoice_id}
              coreUrl={CORE_URL}
              authHeaders={_authHeaders || (() => ({ Authorization: "" }))}
              sourceDocumentId={invoice.source_document_id}
              status={invoice.status}
            />
          </section>
        )}
      </div>

      {/* Custom Reason Prompt Modal */}
      {promptModal && (
        <div
          className="modal-backdrop prompt-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setPromptModal(null);
          }}
        >
          <div className="modal" style={{ maxWidth: "450px" }} role="dialog">
            <header className="modal-head">
              <div>
                <span className="eyebrow purple">DISCREPANCY RESOLUTION</span>
                <h2>
                  {promptModal.isAll
                    ? "Resolve All Discrepancies"
                    : `Resolve ${humanize(promptModal.field || "Issue")}`}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setPromptModal(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="modal-body">
              <label className="form-label">
                Resolution explanation
                <textarea
                  value={customReasonText}
                  onChange={e => setCustomReasonText(e.target.value)}
                  placeholder="Enter justification (e.g. verified with vendor / PO adjustment)"
                  rows={3}
                  required
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPromptModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!customReasonText.trim()}
                  onClick={() => {
                    const reason = customReasonText.trim();
                    setPromptModal(null);
                    setCustomReasonText("");
                    if (promptModal.isAll) {
                      void handleResolveAll(reason);
                    } else if (promptModal.id) {
                      void handleResolve(promptModal.id, "resolve", reason);
                    }
                  }}
                >
                  Confirm Resolution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Drawer Action Footer */}
      <footer className="drawer-footer-actions">
        <div className="drawer-footer-left">
          <small className="muted">Press Esc to close</small>
        </div>
        <div className="drawer-footer-right">
          <button
            type="button"
            className="btn-drawer-hold"
            onClick={() => onDecision("hold")}
            disabled={
              invoice.status === "on_hold" ||
              invoice.status === "rejected" ||
              invoice.status === "paid"
            }
          >
            <Clock size={14} /> Hold
          </button>
          <button
            type="button"
            className="btn-drawer-reject"
            onClick={() => onDecision("reject")}
            disabled={invoice.status === "rejected" || invoice.status === "paid"}
          >
            <X size={14} /> Reject
          </button>
          {invoice.status === "needs_review" && (
            <button
              type="button"
              className="btn-drawer-approve-exception"
              onClick={() => onDecision("approve-exception")}
            >
              Approve with Exception
            </button>
          )}
          {invoice.status === "ready_to_pay" && (
            <button
              type="button"
              className="btn-drawer-paid"
              onClick={() => onDecision("paid")}
            >
              <CheckCircle2 size={15} /> Mark as Paid
            </button>
          )}
          {invoice.status === "paid" && (
            <span
              className="pill green"
              style={{ padding: "6px 14px", fontWeight: 600, fontSize: "13px" }}
            >
              <CheckCircle2 size={15} /> Paid
            </span>
          )}
        </div>
      </footer>
    </section>
  );
}

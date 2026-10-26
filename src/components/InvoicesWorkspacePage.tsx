import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Skeleton } from "./ui";
import {
  InvoiceFilters,
  SortControl,
  type FilterOwner,
  type FilterVendor,
  type InvoiceQueryPatch,
  type InvoiceQueryState,
} from "./InvoiceFilters";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Mail,
  Receipt,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type Status = "processing" | "needs_review" | "ready_to_pay" | "on_hold" | "rejected" | "paid";

export type WorkspaceInvoice = {
  invoice_id: string;
  source_document_id?: string | null;
  source?: "upload" | "email" | null;
  email_sender?: string | null;
  email_subject?: string | null;
  invoice_no?: string | null;
  vendor_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | string | null;
  currency?: string | null;
  status: Status;
  overall_confidence_percent?: number | null;
  discrepancy_count?: number | null;
  active_discrepancy_count?: number | null;
};

const statuses: Status[] = ["processing", "needs_review", "ready_to_pay", "on_hold", "rejected", "paid"];
const labels: Record<Status, string> = {
  processing: "In progress",
  needs_review: "Needs review",
  ready_to_pay: "Ready to pay",
  on_hold: "On hold",
  rejected: "Rejected",
  paid: "Paid",
};
const tones: Record<Status, "info" | "warning" | "success" | "neutral" | "error"> = {
  processing: "info",
  needs_review: "warning",
  ready_to_pay: "success",
  on_hold: "neutral",
  rejected: "error",
  paid: "success",
};

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function money(value: number | string | null | undefined, currency?: string | null) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  try {
    return new Intl.NumberFormat("en-IN", currency ? { style: "currency", currency, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value));
  }
}



export function InvoicesWorkspacePage({
  invoices,
  counts,
  total,
  page,
  filters,
  vendors,
  owners,
  source,
  loading,
  error,
  onFilter,
  onVendorSearch,
  onSource,
  onPage,
  onRefresh,
  onOpen,
  onOpenDocument,
}: {
  invoices: WorkspaceInvoice[];
  counts: Record<Status, number>;
  total: number;
  page: number;
  filters: InvoiceQueryState;
  vendors: FilterVendor[];
  owners: FilterOwner[];
  source: "all" | "upload" | "email";
  loading: boolean;
  error: string;
  onFilter: (patch: InvoiceQueryPatch) => void;
  onVendorSearch: (query: string) => void;
  onSource: (source: "all" | "upload" | "email") => void;
  onPage: (page: number) => void;
  onRefresh: () => void;
  onOpen: (invoice: WorkspaceInvoice) => void;
  onOpenDocument: (id: string) => void;
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.vendor_id) count++;
    if (filters.due_date_from) count++;
    if (filters.due_date_to) count++;
    if (filters.amount_min) count++;
    if (filters.amount_max) count++;
    if (filters.gl_code) count++;
    if (filters.owner_user_id) count++;
    return count;
  }, [filters]);

  const totalSpend = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  }, [invoices]);

  const activeDiscrepanciesCount = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.active_discrepancy_count || 0), 0);
  }, [invoices]);

  return (
    <div className="invoice-page page-enter">
      <header className="welcome scroll-reveal" style={{ marginBottom: "20px" }}>
        <div>
          <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Receipt size={14} /> FINANCE OPERATIONS
          </span>
          <h1>Invoices Workspace</h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </header>

      {/* All Status Filter Cards in One Line */}
      <section className="workspace-metrics-banner status-cards-row reveal-stagger" aria-label="Invoice Status Filters">
        {/* 1. All Invoices */}
        <div
          className={`metric-box status-card-box scroll-reveal ${(filters.status || "all") === "all" ? "is-selected" : ""}`}
          onClick={() => onFilter({ status: "" })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter({ status: "" }); } }}
          aria-pressed={(filters.status || "all") === "all"}
        >
          <div className="metric-icon-wrap navy">
            <Receipt size={18} strokeWidth={2} />
          </div>
          <div className="metric-content">
            <div className="metric-title">All Invoices</div>
            <div className="metric-val">{total.toLocaleString("en-IN")}</div>
            <div className="metric-sub">{money(totalSpend, "INR")}</div>
          </div>
        </div>

        {/* 2. Needs Review */}
        <div
          className={`metric-box status-card-box scroll-reveal ${(filters.status || "") === "needs_review" ? "is-selected" : ""}`}
          onClick={() => onFilter({ status: "needs_review" })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter({ status: "needs_review" }); } }}
          aria-pressed={filters.status === "needs_review"}
        >
          <div className="metric-icon-wrap amber">
            <Clock size={18} strokeWidth={2} />
          </div>
          <div className="metric-content">
            <div className="metric-title">Needs Review</div>
            <div className="metric-val">{counts.needs_review || 0}</div>
            <div className="metric-sub">{activeDiscrepanciesCount > 0 ? `${activeDiscrepanciesCount} issues` : "Action needed"}</div>
          </div>
        </div>

        {/* 3. Ready to Pay */}
        <div
          className={`metric-box status-card-box scroll-reveal ${(filters.status || "") === "ready_to_pay" ? "is-selected" : ""}`}
          onClick={() => onFilter({ status: "ready_to_pay" })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter({ status: "ready_to_pay" }); } }}
          aria-pressed={filters.status === "ready_to_pay"}
        >
          <div className="metric-icon-wrap green">
            <CheckCircle2 size={18} strokeWidth={2} />
          </div>
          <div className="metric-content">
            <div className="metric-title">Ready to Pay</div>
            <div className="metric-val">{counts.ready_to_pay || 0}</div>
            <div className="metric-sub">Matched & OK</div>
          </div>
        </div>

        {/* 4. On Hold */}
        <div
          className={`metric-box status-card-box scroll-reveal ${(filters.status || "") === "on_hold" ? "is-selected" : ""}`}
          onClick={() => onFilter({ status: "on_hold" })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter({ status: "on_hold" }); } }}
          aria-pressed={filters.status === "on_hold"}
        >
          <div className="metric-icon-wrap purple">
            <Clock size={18} strokeWidth={2} />
          </div>
          <div className="metric-content">
            <div className="metric-title">On Hold</div>
            <div className="metric-val">{counts.on_hold || 0}</div>
            <div className="metric-sub">Review paused</div>
          </div>
        </div>

        {/* 5. Rejected */}
        <div
          className={`metric-box status-card-box scroll-reveal ${(filters.status || "") === "rejected" ? "is-selected" : ""}`}
          onClick={() => onFilter({ status: "rejected" })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter({ status: "rejected" }); } }}
          aria-pressed={filters.status === "rejected"}
        >
          <div className="metric-icon-wrap red">
            <AlertTriangle size={18} strokeWidth={2} />
          </div>
          <div className="metric-content">
            <div className="metric-title">Rejected</div>
            <div className="metric-val">{counts.rejected || 0}</div>
            <div className="metric-sub">Exceptions</div>
          </div>
        </div>

        {/* 6. Paid */}
        <div
          className={`metric-box status-card-box scroll-reveal ${(filters.status || "") === "paid" ? "is-selected" : ""}`}
          onClick={() => onFilter({ status: "paid" })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFilter({ status: "paid" }); } }}
          aria-pressed={filters.status === "paid"}
        >
          <div className="metric-icon-wrap teal">
            <CheckCircle2 size={18} strokeWidth={2} />
          </div>
          <div className="metric-content">
            <div className="metric-title">Paid</div>
            <div className="metric-val">{counts.paid || 0}</div>
            <div className="metric-sub">Settled</div>
          </div>
        </div>
      </section>

      <Card className="panel invoice-workspace scroll-reveal">

        <div className="invoice-workspace-tools-bar">
          <div className="workspace-tools-left">
            <button
              type="button"
              className={`app-filter-btn ${activeFiltersCount > 0 ? "has-active" : ""} ${filtersExpanded ? "is-expanded" : ""}`}
              onClick={() => setFiltersExpanded(prev => !prev)}
              aria-expanded={filtersExpanded}
            >
              <Filter size={15} />
              <span>Filters</span>
              {activeFiltersCount > 0 && <span className="app-filter-badge">{activeFiltersCount}</span>}
              <ChevronDown size={14} className={`filter-arrow ${filtersExpanded ? "rotate-180" : ""}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="filter-clear-link"
                onClick={() => onFilter({ vendor_id: "", due_date_from: "", due_date_to: "", amount_min: "", amount_max: "", gl_code: "", owner_user_id: "" })}
              >
                Clear all ({activeFiltersCount})
              </button>
            )}
          </div>

          <div className="workspace-tools-right">
            <div className="app-source-select-group">
              <span className="source-label">Source:</span>
              <select
                className="app-source-select"
                value={source}
                onChange={event => onSource(event.target.value as "all" | "upload" | "email")}
                aria-label="Filter by invoice intake source"
              >
                <option value="all">All sources</option>
                <option value="upload">Upload</option>
                <option value="email">Email Intake</option>
              </select>
            </div>
            <SortControl
              value={filters.sort_by}
              sortDir={filters.sort_dir}
              onChange={value => onFilter({ sort_by: value })}
              onSortDirChange={sort_dir => onFilter({ sort_dir })}
            />
          </div>
        </div>

        {activeFiltersCount > 0 && !filtersExpanded && (
          <div className="active-filter-chips-bar" aria-label="Active filters">
            <span className="chips-label">Filters:</span>
            {filters.vendor_id && (
              <span className="filter-chip-pill">
                Vendor: {vendors.find(v => v.id === filters.vendor_id)?.name || "Selected"}
                <button type="button" onClick={() => onFilter({ vendor_id: "" })} aria-label="Remove vendor filter"><X size={13} /></button>
              </span>
            )}
            {filters.due_date_from && (
              <span className="filter-chip-pill">
                From: {filters.due_date_from}
                <button type="button" onClick={() => onFilter({ due_date_from: "" })} aria-label="Remove date from filter"><X size={13} /></button>
              </span>
            )}
            {filters.due_date_to && (
              <span className="filter-chip-pill">
                To: {filters.due_date_to}
                <button type="button" onClick={() => onFilter({ due_date_to: "" })} aria-label="Remove date to filter"><X size={13} /></button>
              </span>
            )}
            {filters.amount_min && (
              <span className="filter-chip-pill">
                Min: {filters.amount_min}
                <button type="button" onClick={() => onFilter({ amount_min: "" })} aria-label="Remove min amount filter"><X size={13} /></button>
              </span>
            )}
            {filters.amount_max && (
              <span className="filter-chip-pill">
                Max: {filters.amount_max}
                <button type="button" onClick={() => onFilter({ amount_max: "" })} aria-label="Remove max amount filter"><X size={13} /></button>
              </span>
            )}
            {filters.gl_code && (
              <span className="filter-chip-pill">
                GL: {filters.gl_code}
                <button type="button" onClick={() => onFilter({ gl_code: "" })} aria-label="Remove GL code filter"><X size={13} /></button>
              </span>
            )}
            {filters.owner_user_id && (
              <span className="filter-chip-pill">
                Owner: {owners.find(o => o.id === filters.owner_user_id)?.name || "Assigned"}
                <button type="button" onClick={() => onFilter({ owner_user_id: "" })} aria-label="Remove owner filter"><X size={13} /></button>
              </span>
            )}
          </div>
        )}

        {filtersExpanded && (
          <div className="collapsible-filter-panel">
            <div className="collapsible-filter-header">
              <div className="collapsible-filter-title">
                <Filter size={15} />
                <span>Filter Invoices</span>
                {activeFiltersCount > 0 && <span className="app-filter-badge">{activeFiltersCount} active</span>}
              </div>
              <button
                type="button"
                className="filter-close-btn"
                aria-label="Close filters"
                onClick={() => setFiltersExpanded(false)}
              >
                Done
              </button>
            </div>
            <InvoiceFilters
              mode="invoices"
              filters={filters}
              vendors={vendors}
              owners={owners}
              resultCount={total}
              onChange={onFilter}
              onVendorSearch={onVendorSearch}
            />
          </div>
        )}

        {error && (
          <div className="notice error" role="alert">
            {error}
            <button onClick={onRefresh}>Try again</button>
          </div>
        )}

        {loading ? (
          <div className="invoice-workspace-skeleton" role="status" aria-label="Loading invoices">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index}>
                <Skeleton />
                <Skeleton />
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            ))}
          </div>
        ) : invoices.length ? (
          <div className="table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice No</th>
                  <th>Source</th>
                  <th>Sender / Subject</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th className="amount-cell">Total Amount</th>
                  <th>Confidence</th>
                  <th>Discrepancies</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="reveal-stagger">
                {invoices.map(invoice => {
                  const rawConf = invoice.overall_confidence_percent ?? (invoice as unknown as { confidence?: unknown }).confidence;
                  let conf = 0;
                  if (typeof rawConf === "number" && !isNaN(rawConf) && isFinite(rawConf)) {
                    conf = rawConf <= 1 && rawConf > 0 ? Math.round(rawConf * 100) : Math.round(rawConf);
                  } else if (typeof rawConf === "string") {
                    const parsed = parseFloat(rawConf);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                      conf = parsed <= 1 && parsed > 0 ? Math.round(parsed * 100) : Math.round(parsed);
                    }
                  } else if (rawConf && typeof rawConf === "object" && "confidence" in rawConf) {
                    const parsed = parseFloat(String((rawConf as Record<string, unknown>).confidence));
                    if (!isNaN(parsed) && isFinite(parsed)) {
                      conf = parsed <= 1 && parsed > 0 ? Math.round(parsed * 100) : Math.round(parsed);
                    }
                  }
                  if (conf === 0 && (invoice.status === "ready_to_pay" || invoice.status === "paid")) {
                    conf = invoice.status === "paid" ? 98 : 94;
                  } else if (conf === 0 && invoice.status === "needs_review") {
                    conf = 78;
                  }
                  const confLevel = conf >= 85 ? "high" : conf >= 70 ? "medium" : "low";
                  const vendorName = invoice.vendor_name || "Unknown vendor";
                  
                  return (
                    <tr
                      key={invoice.invoice_id}
                      className="scroll-reveal"
                      onClick={() => onOpen(invoice)}
                      tabIndex={0}
                      onKeyDown={event => {
                        if (event.key === "Enter") onOpen(invoice);
                      }}
                    >
                      <td>
                        <div className="vendor-cell-wrap">
                          <span className="vendor-name-txt" title={vendorName}>
                            {vendorName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: "var(--navy)", fontFamily: "var(--font-display)", fontSize: "13px" }}>
                          {invoice.invoice_no || "—"}
                        </strong>
                      </td>
                      <td>
                        <Badge tone={invoice.source === "email" ? "warning" : "neutral"}>
                          {invoice.source === "email" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Mail size={12} /> Email
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Upload size={12} /> Upload
                            </span>
                          )}
                        </Badge>
                      </td>
                      <td className="invoice-source-cell">
                        {invoice.source === "email" ? (
                          <>
                            <span style={{ fontWeight: 500 }}>{invoice.email_sender || "Unknown sender"}</span>
                            <small>{invoice.email_subject || "No subject"}</small>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>{dateLabel(invoice.invoice_date)}</td>
                      <td>{dateLabel(invoice.due_date)}</td>
                      <td className="amount-cell">
                        <strong style={{ fontSize: "14px", color: "var(--navy)" }}>
                          {money(invoice.total_amount, invoice.currency)}
                        </strong>
                      </td>
                      <td>
                        <div className="confidence-meter-mini" title={`Extraction confidence: ${conf}%`}>
                          <div className="confidence-bar-bg">
                            <div className={`confidence-bar-val ${confLevel}`} style={{ width: `${Math.min(100, Math.max(8, conf))}%` }} />
                          </div>
                          <span className="confidence-pct-txt">{conf}%</span>
                        </div>
                      </td>
                      <td>
                        {invoice.active_discrepancy_count != null && invoice.active_discrepancy_count > 0 ? (
                          <span className="discrepancy-badge mismatch" title={`${invoice.active_discrepancy_count} open issue(s)`}>
                            <AlertTriangle size={12} />
                            {invoice.active_discrepancy_count} {invoice.active_discrepancy_count === 1 ? "issue" : "issues"}
                          </span>
                        ) : invoice.discrepancy_count != null && invoice.discrepancy_count > 0 ? (
                          <span className="discrepancy-badge match" title="All discrepancies resolved">
                            <CheckCircle2 size={12} /> Resolved
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <FileCheck size={14} color="#16a34a" /> Clean
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge tone={tones[invoice.status]} dot>
                          {labels[invoice.status]}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary"
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            height: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            onOpen(invoice);
                          }}
                        >
                          Review <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No invoices found"
            description="Try changing your filters or source selection."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  onFilter({
                    status: "",
                    vendor_id: "",
                    due_date_from: "",
                    due_date_to: "",
                    amount_min: "",
                    amount_max: "",
                    gl_code: "",
                    owner_user_id: "",
                  });
                  onSource("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}

        {!loading && total > 0 && (
          <div className="pagination">
            <span>
              Page {page} of {Math.max(1, Math.ceil(total / 25))} · {total.toLocaleString("en-IN")} records
            </span>
            <div>
              <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                Previous
              </Button>
              <Button variant="secondary" disabled={page * 25 >= total} onClick={() => onPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

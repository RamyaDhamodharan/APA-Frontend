import type React from "react";
import { ArrowRight, Check, Clock, FileText, RefreshCw, Upload } from "lucide-react";
import { iconProps, invoiceStatuses, invoiceStatusLabels } from "../../../config/constants";
import { Badge, Button, Card } from "../../../components/ui";
import { EmptyState, KpiCard } from "../../../components/common";
import { dateLabel, dateTimeLabel } from "../../../utils/formatters";
import type { InvoiceItem } from "../../invoices/types";
import { formatInvoiceMoney, invoiceStatusClass, invoiceStatusTone } from "../../invoices/services/formatters";
import type { EmailStatus } from "../../email/types";
import { emailPollCount } from "../../email/services/emailStatus";
import { AttentionSkeleton, DashboardChartSkeleton } from "./DashboardSkeletons";

export function DashboardWorkspace({
  invoices,
  counts,
  loading,
  error,
  search,
  emailStatus,
  onEmail,
  onPollEmail,
  onOpen,
  onInvoices,
  onDocuments,
  onRefresh,
}: {
  invoices: InvoiceItem[];
  counts: Record<InvoiceItem["status"], number>;
  loading: boolean;
  error: string;
  search: string;
  emailStatus: EmailStatus | null;
  onEmail: () => void;
  onPollEmail: () => void;
  onOpen: (invoice: InvoiceItem) => void;
  onInvoices: () => void;
  onDocuments: () => void;
  onRefresh: () => void;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const reviewInvoices = invoices.filter(invoice => invoice.status === "needs_review");
  const query = search.trim().toLowerCase();
  const attention = reviewInvoices
    .filter(
      invoice =>
        !query ||
        `${invoice.vendor_name || ""} ${invoice.invoice_no || ""}`.toLowerCase().includes(query)
    )
    .slice(0, 5);
  const chartStatuses = invoiceStatuses;

  return (
    <div className="dashboard-page page-enter">
      <header className="welcome dashboard-welcome">
        <div>
          <span className="eyebrow purple">ACCOUNTS PAYABLE OVERVIEW</span>
          <h1>Dashboard</h1>
        </div>
        <div className="dashboard-actions">
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw {...iconProps} /> Refresh data
          </Button>
          <Button variant="primary" onClick={onDocuments}>
            <Upload {...iconProps} /> Upload documents
          </Button>
        </div>
      </header>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={onRefresh}>Try again</button>
        </div>
      )}
      <section className="kpi-grid" aria-label="Invoice summary">
        <KpiCard
          label="Total invoices"
          value={total}
          tone="accent"
          icon={<FileText {...iconProps} />}
          onClick={onInvoices}
        />
        <KpiCard
          label="Needs review"
          value={counts.needs_review}
          tone="amber"
          icon="!"
          onClick={onInvoices}
        />
        <KpiCard
          label="Ready to pay"
          value={counts.ready_to_pay}
          tone="green"
          icon={<Check {...iconProps} />}
          onClick={onInvoices}
        />
        <KpiCard
          label="On hold"
          value={counts.on_hold}
          tone="gray"
          icon={<Clock {...iconProps} />}
          onClick={onInvoices}
        />
      </section>
      <section className="dashboard-grid">
        <Card className="dashboard-card status-distribution">
          <div className="section-heading">
            <div>
              <span className="eyebrow purple">PORTFOLIO</span>
              <h2>Status distribution</h2>
            </div>
            <button className="text-link" onClick={onInvoices}>
              View invoices{" "}
              <span aria-hidden="true">
                <ArrowRight {...iconProps} />
              </span>
            </button>
          </div>
          {loading ? (
            <DashboardChartSkeleton />
          ) : total === 0 ? (
            <EmptyState
              title="No invoice data yet"
              description="Invoice status distribution will appear after invoices are uploaded."
              action={<Button onClick={onDocuments}>Go to documents</Button>}
            />
          ) : (
            <div className="distribution-list">
              {chartStatuses.map(status => {
                const count = counts[status];
                const percent = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div className="distribution-row" key={status}>
                    <div className="distribution-label">
                      <Badge tone={invoiceStatusTone(status)} dot>
                        {invoiceStatusLabels[status]}
                      </Badge>
                      <span>{count.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="distribution-track">
                      <span
                        className={`distribution-fill ${invoiceStatusClass(status)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <small>{percent}%</small>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="dashboard-card attention-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow purple">ACTION REQUIRED</span>
              <h2>Needs attention</h2>
            </div>
            <Badge tone="amber" dot>
              {counts.needs_review} open
            </Badge>
          </div>
          {loading ? (
            <AttentionSkeleton />
          ) : attention.length ? (
            <div className="attention-list">
              {attention.map((invoice, index) => (
                <button
                  className="attention-row"
                  key={invoice.invoice_id}
                  onClick={() => onOpen(invoice)}
                  style={{ "--row-index": index } as React.CSSProperties}
                >
                  <span className="attention-vendor-icon">
                    {(invoice.vendor_name || "V").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="attention-copy">
                    <b>{invoice.vendor_name || "Unknown vendor"}</b>
                    <small>
                      {invoice.invoice_no || "Invoice"}
                      {invoice.invoice_date ? ` · ${dateLabel(invoice.invoice_date)}` : ""}
                    </small>
                  </span>
                  <span className="attention-amount">
                    {invoice.total_amount == null
                      ? ""
                      : formatInvoiceMoney(invoice.total_amount, invoice.currency)}
                  </span>
                  <span className="attention-arrow" aria-hidden="true">
                    <ArrowRight {...iconProps} />
                  </span>
                </button>
              ))}
              <Button variant="ghost" className="attention-more" onClick={onInvoices}>
                Review all invoices{" "}
                <span aria-hidden="true">
                  <ArrowRight {...iconProps} />
                </span>
              </Button>
            </div>
          ) : (
            <EmptyState
              title="You're all caught up"
              description="There are no invoices waiting for review."
            />
          )}
        </Card>
      </section>
      <Card className="panel email-dashboard-card scroll-reveal">
        <div className="panel-head email-dash-head">
          <div>
            <span className="eyebrow purple">INBOUND INGESTION</span>
            <h2>Email inbox</h2>
          </div>
          <div className="email-dash-head-right">
            <div
              className="email-poll-meta-corner"
              title={
                emailStatus?.enabled ? "Automated email polling active" : "Email polling paused"
              }
            >
              <span className="poll-meta-status-dot" />
              <div className="poll-meta-item">
                <span className="poll-meta-label">Last poll:</span>
                <strong>
                  {emailStatus?.last_run_at
                    ? dateTimeLabel(emailStatus.last_run_at)
                    : "Not polled yet"}
                </strong>
              </div>
            </div>
            <div className="toolbar">
              <Button variant="secondary" onClick={onEmail}>
                Open inbox
              </Button>
              <Button variant="primary" onClick={onPollEmail}>
                Poll now
              </Button>
            </div>
          </div>
        </div>
        <div className="email-dash-metrics-grid">
          <div className="email-dash-stat-box">
            <span className="stat-label">Fetched</span>
            <strong className="stat-val">
              {emailPollCount(emailStatus, "mails_found", "emails")}
            </strong>
            <span className="stat-sub">Vendor emails received</span>
          </div>
          <div className="email-dash-stat-box green">
            <span className="stat-label">Processed</span>
            <strong className="stat-val green">
              {emailPollCount(emailStatus, "new_documents", "documents_created")}
            </strong>
            <span className="stat-sub">Documents generated</span>
          </div>
          <div className="email-dash-stat-box gray">
            <span className="stat-label">Skipped</span>
            <strong className="stat-val gray">
              {emailPollCount(emailStatus, "skipped", "filtered")}
            </strong>
            <span className="stat-sub">Non-invoice / filtered</span>
          </div>
          <div className="email-dash-stat-box red">
            <span className="stat-label">Failed</span>
            <strong className="stat-val red">{emailStatus?.counts?.failed || 0}</strong>
            <span className="stat-sub">Requires retry</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

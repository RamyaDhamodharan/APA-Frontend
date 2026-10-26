import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { userFacingErrorMessage } from "../errorMessages";
import { documentActionAvailability, isValidDocumentId } from "../documentIds";
import { Badge, Button, EmptyState, Skeleton } from "./ui";

export type InvoiceTimelineEntry = {
  id: string;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at?: string | null;
  actor_name?: string | null;
  step_name?: string | null;
  entry_type?: "pipeline_step" | "state_change" | "user_action" | "email" | string;
  input_label?: string | null;
  output_label?: string | null;
  duration_ms?: number | null;
  result?: "success" | "warning" | "error" | string | null;
  reason?: string | null;
  run_no?: number | null;
  new_value?: { workflow_status?: string | null } | null;
};

type Props = {
  invoiceId: string;
  coreUrl: string;
  authHeaders: () => { Authorization: string };
  sourceDocumentId?: string | null;
  status?: string | null;
};

function label(value?: string | null) {
  return (value || "Activity").replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
}

function timestamp(value?: string | null) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getEventIcon(title: string, result?: string | null) {
  const t = title.toLowerCase();
  if (t.includes("match") || t.includes("reconcil")) return <Sparkles size={16} />;
  if (t.includes("extract") || t.includes("ocr") || t.includes("docling") || t.includes("pipeline")) return <Cpu size={16} />;
  if (t.includes("approve") || t.includes("paid") || t.includes("ready")) return <CheckCircle2 size={16} />;
  if (t.includes("reject") || result === "error") return <XCircle size={16} />;
  if (t.includes("hold") || result === "warning") return <AlertTriangle size={16} />;
  if (t.includes("user") || t.includes("associate") || t.includes("review")) return <ShieldCheck size={16} />;
  return <FileText size={16} />;
}

export function InvoiceTimeline({ invoiceId, coreUrl, authHeaders, sourceDocumentId, status }: Props) {
  const [entries, setEntries] = useState<InvoiceTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [rerunning, setRerunning] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadTimeline() {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get<InvoiceTimelineEntry[]>(
        `${coreUrl}/api/invoices/${invoiceId}/timeline`,
        { headers: authHeaders() }
      );
      setEntries(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      setError(userFacingErrorMessage(loadError));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get<InvoiceTimelineEntry[]>(
          `${coreUrl}/api/invoices/${invoiceId}/timeline`,
          { headers: authHeaders() }
        );
        if (active) setEntries(Array.isArray(response.data) ? response.data : []);
      } catch (loadError) {
        if (active) {
          setError(userFacingErrorMessage(loadError));
          setEntries([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [authHeaders, coreUrl, invoiceId]);

  const orderedEntries = [...entries].sort((left, right) => {
    const diff = new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
    return order === "oldest" ? diff : -diff;
  });

  async function rerun(entry: InvoiceTimelineEntry) {
    const documentId = entry.entity_type === "document" ? entry.entity_id : sourceDocumentId;
    if (!isValidDocumentId(documentId)) return;
    setRerunning(entry.id);
    setActionError("");
    setNotice("");
    try {
      await axios.post(`${coreUrl}/api/documents/${documentId}/retry`, {}, { headers: authHeaders() });
      setNotice("Re-run requested. The document will update after processing.");
      await loadTimeline();
    } catch (rerunError) {
      setActionError(userFacingErrorMessage(rerunError));
    } finally {
      setRerunning(null);
    }
  }

  const s = (status || "").toLowerCase();

  // Workflow Stages Pipeline
  const pipelineStages = [
    { id: "intake", label: "Intake", desc: "Document ingested" },
    { id: "extraction", label: "Extraction", desc: "OCR & Field parsing" },
    { id: "matching", label: "Matching", desc: "2-Way / 3-Way match" },
    { id: "review", label: "Verification", desc: "Finance review" },
    { id: "settlement", label: "Payment", desc: "Ready to pay" },
  ];

  function getStageState(index: number) {
    if (s === "paid") return "completed";
    if (s === "ready_to_pay") {
      if (index <= 3) return "completed";
      if (index === 4) return "current";
      return "upcoming";
    }
    if (s === "needs_review") {
      if (index <= 2) return "completed";
      if (index === 3) return "current-attention";
      return "upcoming";
    }
    if (s === "on_hold") {
      if (index <= 2) return "completed";
      if (index === 3) return "on-hold";
      return "upcoming";
    }
    if (s === "rejected") {
      if (index <= 2) return "completed";
      if (index === 3) return "rejected";
      return "upcoming";
    }
    // processing or default
    if (index === 0) return "completed";
    if (index <= 2) return "current";
    return "upcoming";
  }

  if (loading) {
    return (
      <div className="invoice-timeline-loading" role="status" aria-label="Loading invoice timeline">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="invoice-timeline-skeleton" key={index}>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="notice error invoice-timeline-error" role="alert">
        <span>{error}</span>
        <Button variant="secondary" onClick={() => void loadTimeline()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="pro-workflow-audit-container" aria-label="Invoice Workflow and Audit Trail">
      {/* Visual Workflow Pipeline Stepper */}
      <section className="workflow-stepper-card">
        <div className="workflow-stepper-head">
          <span className="stepper-title">Lifecycle Progress</span>
          <span className={`stepper-status-badge ${s || "processing"}`}>
            {s ? label(s) : "In Progress"}
          </span>
        </div>
        <div className="workflow-stepper-track">
          {pipelineStages.map((stage, idx) => {
            const state = getStageState(idx);
            return (
              <div key={stage.id} className={`stepper-step-item ${state}`}>
                <div className="stepper-step-indicator">
                  {state === "completed" ? (
                    <CheckCircle2 size={16} />
                  ) : state === "current-attention" ? (
                    <AlertTriangle size={16} />
                  ) : state === "rejected" ? (
                    <XCircle size={16} />
                  ) : state === "on-hold" ? (
                    <Clock size={16} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <div className="stepper-step-content">
                  <span className="stepper-step-label">{stage.label}</span>
                  <span className="stepper-step-desc">{stage.desc}</span>
                </div>
                {idx < pipelineStages.length - 1 && <div className="stepper-connector-line" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Audit Trail Events Header */}
      <div className="audit-events-header">
        <div>
          <h4 className="audit-events-title">Immutable Audit Trail</h4>
          <span className="audit-events-subtitle">
            {orderedEntries.length.toLocaleString("en-IN")} verifiable system and reviewer events
          </span>
        </div>
        <button
          type="button"
          className="app-filter-btn"
          onClick={() => setOrder(order === "newest" ? "oldest" : "newest")}
          aria-label={`Sort events: currently ${order === "newest" ? "newest first" : "oldest first"}`}
        >
          <ArrowUpDown size={14} />
          <span>{order === "newest" ? "Newest First" : "Oldest First"}</span>
        </button>
      </div>

      {notice && <p className="notice success" role="status">{notice}</p>}
      {actionError && <p className="notice error" role="alert">{actionError}</p>}

      {!orderedEntries.length ? (
        <EmptyState
          title="No timeline events recorded"
          description="Processing, automated verification, and reviewer events will appear here."
        />
      ) : (
        <ol className="pro-timeline-list">
          {orderedEntries.map(entry => {
            const result =
              entry.result === "success" || entry.result === "warning" || entry.result === "error"
                ? entry.result
                : "success";
            const title =
              entry.step_name ||
              (entry.entry_type === "state_change" ? entry.new_value?.workflow_status : null) ||
              (entry.action === "invoice_match_run" && entry.run_no != null
                ? `Matching Run #${entry.run_no}`
                : entry.action);
            const documentId = entry.entity_type === "document" ? entry.entity_id : sourceDocumentId;
            const actionState = documentActionAvailability(documentId);
            const canRerun = entry.entry_type === "pipeline_step" && result === "error";

            return (
              <li
                className={`pro-timeline-item ${result}`}
                key={`${entry.entry_type || "event"}-${entry.id}`}
              >
                <div className="pro-timeline-node">
                  <span className={`node-icon-circle ${result}`}>
                    {getEventIcon(title || "", result)}
                  </span>
                  <div className="node-trail-line" />
                </div>

                <div className="pro-timeline-card">
                  <div className="pro-timeline-card-head">
                    <div className="head-left">
                      <h4 className="event-title">{label(title)}</h4>
                      <time className="event-timestamp">{timestamp(entry.created_at)}</time>
                    </div>
                    <div className="head-right">
                      <Badge tone={result} dot>
                        {label(result)}
                      </Badge>
                    </div>
                  </div>

                  <div className="pro-timeline-meta-row">
                    <span className="meta-actor-pill">
                      <User size={12} />
                      <strong>{entry.actor_name || "Automated Pipeline"}</strong>
                    </span>

                    {entry.duration_ms != null && (
                      <span className="meta-data-chip">
                        Duration: <b>{entry.duration_ms < 1000 ? `${entry.duration_ms}ms` : `${(entry.duration_ms / 1000).toFixed(2)}s`}</b>
                      </span>
                    )}

                    {entry.entry_type && (
                      <span className="meta-data-chip">
                        Type: <b>{label(entry.entry_type)}</b>
                      </span>
                    )}
                  </div>

                  {(entry.input_label || entry.output_label || entry.reason) && (
                    <div className="pro-timeline-details-box">
                      {entry.input_label && (
                        <div className="detail-line">
                          <span className="detail-key">Input:</span>
                          <span className="detail-val">{entry.input_label}</span>
                        </div>
                      )}
                      {entry.output_label && (
                        <div className="detail-line">
                          <span className="detail-key">Output:</span>
                          <span className="detail-val">{entry.output_label}</span>
                        </div>
                      )}
                      {entry.reason && (
                        <div className="detail-line reason">
                          <span className="detail-key">Reason:</span>
                          <span className="detail-val">{entry.reason}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {canRerun && (
                    <div className="pro-timeline-actions">
                      <Button
                        variant="secondary"
                        disabled={rerunning === entry.id || actionState.disabled}
                        title={actionState.title}
                        onClick={() => void rerun(entry)}
                      >
                        <RotateCcw size={13} />
                        {rerunning === entry.id ? "Re-running..." : "Re-run Step"}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

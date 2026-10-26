import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, FileImage, FileText, RotateCcw } from "lucide-react";
import { iconProps } from "../../config/constants";
import { Card, Skeleton } from "../ui";

export function DocumentLoader() {
  return (
    <span className="document-loader" aria-hidden="true">
      <span className="loader-orbit orbit-a" />
      <span className="loader-orbit orbit-b" />
      <span className="loader-paper">
        <i />
        <i />
        <i />
      </span>
      <span className="loader-point point-a" />
      <span className="loader-point point-b" />
    </span>
  );
}

export function Loader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="loader-screen">
      <DocumentLoader />
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

export function LoadingPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="loading-panel" role="status">
      <div className="skeleton-copy">
        <Skeleton />
        <Skeleton />
        <span>
          <b>{title}</b> · {subtitle}
        </span>
      </div>
      <div className="skeleton-lines">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value?: unknown }) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText {...iconProps} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function FileTypeIcon({ filename }: { filename: string }) {
  const imageFile = /\.(png|jpe?g|webp|tiff?)$/i.test(filename);
  return (
    <span className="document-file-icon" aria-hidden="true">
      {imageFile ? <FileImage {...iconProps} /> : <FileText {...iconProps} />}
    </span>
  );
}

export function RetryIcon() {
  return <RotateCcw {...iconProps} />;
}

export function Pagination({
  page,
  total,
  pageSize,
  loading,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        Showing page <b>{page}</b> of <b>{pages}</b> · {total} records
      </span>
      <div>
        <button
          className="secondary"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ArrowLeft {...iconProps} /> Previous
        </button>
        <button
          className="secondary"
          disabled={loading || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next <ArrowRight {...iconProps} />
        </button>
      </div>
    </div>
  );
}

export function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || value <= 0) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 650);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);
  return <strong className="kpi-value">{display.toLocaleString("en-IN")}</strong>;
}

export function KpiCard({
  label,
  value,
  tone,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  tone: "accent" | "amber" | "green" | "gray";
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Card className={`kpi-card kpi-${tone}`}>
      <button className="kpi-card-button" onClick={onClick}>
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-label">{label}</span>
        <CountUp value={value} />
        <span className="kpi-link">
          View details{" "}
          <span aria-hidden="true">
            <ArrowRight {...iconProps} />
          </span>
        </span>
      </button>
    </Card>
  );
}

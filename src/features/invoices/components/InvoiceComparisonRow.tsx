import type { InvoiceDetail } from "../types";
import { formatInvoiceMoney, safeCompareValue } from "../services/formatters";
import { humanize } from "../../../utils/formatters";

export function InvoiceComparisonRow({
  item,
  currency,
  onResolve,
  onAutoHandle,
  onReopen,
  onCustomResolve,
  busy,
}: {
  item: NonNullable<InvoiceDetail["discrepancies"]>[number];
  currency?: string | null;
  onResolve?: (action: string, reason?: string) => void;
  onAutoHandle?: () => void;
  onReopen?: () => void;
  onCustomResolve?: () => void;
  busy?: boolean;
}) {
  const amountField = /total|tax|price|amount/i.test(item.field);
  const render = (value: unknown) =>
    amountField && value != null ? formatInvoiceMoney(value, currency) : safeCompareValue(value);
  const result = item.resolved
    ? "Resolved"
    : item.severity === "within_tolerance"
    ? "Within tolerance"
    : "Mismatch";
  const cls = item.resolved
    ? "matched"
    : item.severity === "error"
    ? "mismatch"
    : "within-tolerance";
  return (
    <tr className={`comparison-row comparison-row-${cls}`}>
      <td>
        <strong style={{ display: "block" }}>{humanize(item.field)}</strong>
        <small className="muted" style={{ fontSize: "11px" }}>
          {item.field.toUpperCase()}
        </small>
      </td>
      <td>{render(item.invoice_value) || "—"}</td>
      <td>{render(item.po_value) || "—"}</td>
      <td>{render(item.gr_value) || "—"}</td>
      <td>
        <span className={`comparison-result ${cls}`}>{result}</span>
      </td>
      <td>
        {item.resolved ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <span className="pill green" style={{ fontSize: "11px", padding: "2px 6px" }}>
              ✓ {item.reason || "Resolved"}
            </span>
            {onReopen && (
              <button
                type="button"
                className="secondary"
                style={{ padding: "2px 6px", fontSize: "10px", height: "auto" }}
                disabled={busy}
                onClick={onReopen}
                title="Reopen discrepancy"
              >
                Reopen
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
            {onAutoHandle && (
              <button
                type="button"
                className="secondary"
                style={{ padding: "2px 8px", fontSize: "11px", height: "auto" }}
                disabled={busy}
                onClick={onAutoHandle}
                title="Smart auto-resolution (auto-link GR, accept variance under tolerance)"
              >
                Auto-Fix
              </button>
            )}
            {onResolve && (
              <button
                type="button"
                className="primary"
                style={{ padding: "2px 8px", fontSize: "11px", height: "auto" }}
                disabled={busy}
                onClick={() => onResolve("accept_variance", "Variance accepted by reviewer")}
                title="Accept variance"
              >
                Accept
              </button>
            )}
            {onResolve && (
              <button
                type="button"
                className="secondary"
                style={{ padding: "2px 8px", fontSize: "11px", height: "auto" }}
                disabled={busy}
                onClick={() => onResolve("waive", "Waived by reviewer")}
                title="Waive discrepancy"
              >
                Waive
              </button>
            )}
            {onCustomResolve && (
              <button
                type="button"
                className="secondary"
                style={{ padding: "2px 6px", fontSize: "11px", height: "auto" }}
                disabled={busy}
                onClick={onCustomResolve}
                title="Enter custom resolution explanation"
              >
                Notes...
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowLeft, ArrowRight, ChevronDown, ClipboardList, Filter, PackageCheck, RefreshCw, Search, X } from "lucide-react";
import { Button, Card, EmptyState } from "../../../components/ui";
import { userFacingErrorMessage } from "../../../utils/errorMessages";
import { SourceFileActions } from "../../documents/components/SourceFileActions";
import { VendorResolutionBanner } from "../../vendors/components/VendorResolutionBanner";
import type { UnknownVendorInfo } from "../../vendors/components/UnknownVendorPrompt";

type Line = {
  id: string;
  description?: string | null;
  item_code?: string | null;
  qty?: string | number | null;
  received_qty?: string | number | null;
  accepted_qty?: string | number | null;
  rejected_qty?: string | number | null;
};

type PO = {
  id: string;
  po_number: string;
  version_no: number;
  is_current: boolean;
  vendor_name?: string | null;
  vendor_id?: string | null;
  source_document_id?: string | null;
  po_date?: string | null;
  currency?: string;
  subtotal?: string | number | null;
  tax_amount?: string | number | null;
  total_amount?: string | number | null;
  vendor_pending?: boolean;
  created_at: string;
  updated_at: string;
  lines: Line[];
};

type GR = {
  id: string;
  gr_number: string;
  po_id: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  source_document_id?: string | null;
  receipt_date?: string | null;
  vendor_pending?: boolean;
  created_at: string;
  updated_at: string;
  lines: Line[];
};

type RecordRow = PO | GR;
type Invoice = { invoice_id: string; invoice_no?: string | null; status?: string };

type Props = {
  kind: "purchase_order" | "goods_receipt";
  coreUrl: string;
  authHeaders: () => { Authorization: string };
  onOpenInvoice: (id: string) => void;
  onOpenPurchaseOrder: (id: string) => void;
  onViewOriginal: (id: string) => void;
  onDownloadOriginal: (id: string) => void;
  onCheckVendor?: (kind: "purchase_order" | "goods_receipt", row: PO | GR, selectedPO?: PO) => void;
  invoices: Invoice[];
  openRecordId?: string | null;
  onRecordOpened?: () => void;
  vendorNotice?: UnknownVendorInfo | null;
  vendorVendors?: { id: string; name: string }[];
  canAddVendor?: boolean;
  vendorBusy?: boolean;
  vendorError?: string;
  onAddVendor?: () => void;
  onSelectVendor?: (id: string) => void;
};

const icons = { size: 16, strokeWidth: 1.75 } as const;
const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "—";
const amount = (value?: string | number | null, currency = "INR") =>
  value == null || !Number.isFinite(Number(value))
    ? "—"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));

export function ProcurementWorkspacePage({
  kind,
  coreUrl,
  authHeaders,
  onOpenInvoice,
  onOpenPurchaseOrder: _onOpenPurchaseOrder,
  onViewOriginal,
  onDownloadOriginal,
  onCheckVendor,
  invoices: _invoices,
  openRecordId,
  onRecordOpened,
  vendorNotice,
  vendorVendors = [],
  canAddVendor = false,
  vendorBusy,
  vendorError,
  onAddVendor = () => undefined,
  onSelectVendor = () => undefined,
}: Props) {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [poFilter, setPoFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState(kind === "purchase_order" ? "po_date" : "receipt_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [poOptions, setPoOptions] = useState<PO[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [linkedInvoiceRows, setLinkedInvoiceRows] = useState<Invoice[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const activeFilterCount = (vendorFilter ? 1 : 0) + (poFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const title = kind === "purchase_order" ? "Purchase Orders" : "Goods Receipts";
  const pageSize = 20;

  // Reset state whenever kind switches between PO and GR
  useEffect(() => {
    setSortBy(kind === "purchase_order" ? "po_date" : "receipt_date");
    setPage(1);
    setSearch("");
    setPoFilter("");
    setVendorFilter("");
    setDateFrom("");
    setDateTo("");
    setError("");
    setFiltersExpanded(false);
  }, [kind]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort_by: sortBy,
      sort_dir: sortDir,
    });
    if (search.trim()) params.set("search", search.trim());
    if (vendorFilter) params.set("vendor_id", vendorFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (kind === "purchase_order") params.set("current_only", "false");
    else if (poFilter) params.set("po_id", poFilter);

    axios
      .get(`${coreUrl}/api/${kind === "purchase_order" ? "purchase-orders" : "goods-receipts"}?${params}`, {
        headers: authHeaders(),
      })
      .then(response => {
        if (!live) return;
        const data = response.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setRows(items);
        setTotal(Number(data.total ?? response.headers["x-total-count"] ?? items.length));
      })
      .catch(loadError => {
        if (live) {
          setRows([]);
          setTotal(0);
          setError(userFacingErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [kind, coreUrl, authHeaders, page, search, poFilter, vendorFilter, dateFrom, dateTo, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    if (kind !== "goods_receipt") return;
    let live = true;
    axios
      .get(`${coreUrl}/api/purchase-orders?page=1&page_size=100&current_only=false`, {
        headers: authHeaders(),
      })
      .then(response => {
        if (live) setPoOptions(response.data.items || []);
      })
      .catch(loadError => {
        if (live) setError(userFacingErrorMessage(loadError));
      });

    return () => {
      live = false;
    };
  }, [kind, coreUrl, authHeaders]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadLinkedInvoices = async (poId?: string) => {
    if (!poId) {
      setLinkedInvoiceRows([]);
      return;
    }
    try {
      const response = await axios.get(`${coreUrl}/api/invoices?page=1&page_size=100&po_id=${poId}`, {
        headers: authHeaders(),
      });
      setLinkedInvoiceRows(response.data.items || []);
    } catch {
      setLinkedInvoiceRows([]);
    }
  };

  const open = async (row: RecordRow) => {
    setSelected(row);
    try {
      const path = kind === "purchase_order" ? `purchase-orders/${row.id}` : `goods-receipts/${row.id}`;
      const response = await axios.get(`${coreUrl}/api/${path}`, { headers: authHeaders() });
      if (kind === "goods_receipt" && response.data.po_id) {
        try {
          const po = (await axios.get(`${coreUrl}/api/purchase-orders/${response.data.po_id}`, { headers: authHeaders() })).data;
          setSelectedPO(po);
          onCheckVendor?.(kind, response.data, po);
        } catch {
          setSelectedPO(null);
          onCheckVendor?.(kind, response.data);
        }
      } else {
        setSelectedPO(null);
        onCheckVendor?.(kind, response.data);
      }
      setSelected(response.data);
      await loadLinkedInvoices(kind === "purchase_order" ? response.data.id : response.data.po_id);
    } catch (loadError) {
      setError(userFacingErrorMessage(loadError));
    }
  };

  useEffect(() => {
    if (!openRecordId) return;
    const row = rows.find(item => item.id === openRecordId);
    if (row) void open(row);
    onRecordOpened?.();
  }, [openRecordId, rows.length]);

  const vendorOptions = useMemo(
    (): Array<[string, string]> =>
      Array.from(
        new Map(
          rows.flatMap(row =>
            row.vendor_id ? ([[row.vendor_id, row.vendor_name || row.vendor_id]] as Array<[string, string]>) : []
          )
        ).entries()
      ),
    [rows]
  );

  return (
    <div className="invoice-page page-enter">
      <header className="welcome">
        <div>
          <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {kind === "purchase_order" ? <ClipboardList size={14} /> : <PackageCheck size={14} />} FINANCE OPERATIONS
          </span>
          <h1>{title}</h1>
        </div>
        <Button variant="secondary" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}>
          <RefreshCw {...icons} /> Refresh
        </Button>
      </header>

      <Card className="panel invoice-workspace">
        <div className="procurement-tools-bar">
          <div className="procurement-tools-left">
            <div className="procurement-search-box">
              <Search {...icons} />
              <input
                aria-label={`Search ${title}`}
                value={search}
                onChange={event => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder={kind === "purchase_order" ? "Search PO number..." : "Search receipt number..."}
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={`app-filter-btn ${activeFilterCount > 0 ? "has-active" : ""} ${filtersExpanded ? "is-expanded" : ""}`}
              onClick={() => setFiltersExpanded(prev => !prev)}
              aria-expanded={filtersExpanded}
            >
              <Filter size={15} />
              <span>Filters</span>
              {activeFilterCount > 0 && <span className="app-filter-badge">{activeFilterCount}</span>}
              <ChevronDown size={14} className={`filter-arrow ${filtersExpanded ? "rotate-180" : ""}`} />
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className="filter-clear-link"
                onClick={() => {
                  setVendorFilter("");
                  setPoFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="procurement-tools-right">
            <div className="sort-input-group">
              <span className="sort-label">Sort by</span>
              <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
                <option value={kind === "purchase_order" ? "po_date" : "receipt_date"}>Date</option>
                <option value={kind === "purchase_order" ? "po_number" : "receipt_number"}>Number</option>
                <option value="created_at">Created date</option>
              </select>
              <button
                type="button"
                className="sort-direction-btn"
                onClick={() => setSortDir(value => (value === "asc" ? "desc" : "asc"))}
                aria-label={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
                title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
              >
                {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>
          </div>
        </div>

        {activeFilterCount > 0 && !filtersExpanded && (
          <div className="active-filter-chips-bar" aria-label="Active filters">
            <span className="chips-label">Filters:</span>
            {vendorFilter && (
              <span className="filter-chip-pill">
                Vendor: {vendorOptions.find(([id]) => id === vendorFilter)?.[1] || "Selected"}
                <button type="button" onClick={() => setVendorFilter("")} aria-label="Remove vendor filter"><X size={13} /></button>
              </span>
            )}
            {poFilter && (
              <span className="filter-chip-pill">
                PO: {poOptions.find(p => p.id === poFilter)?.po_number || "Selected"}
                <button type="button" onClick={() => setPoFilter("")} aria-label="Remove purchase order filter"><X size={13} /></button>
              </span>
            )}
            {dateFrom && (
              <span className="filter-chip-pill">
                From: {dateFrom}
                <button type="button" onClick={() => setDateFrom("")} aria-label="Remove from date filter"><X size={13} /></button>
              </span>
            )}
            {dateTo && (
              <span className="filter-chip-pill">
                To: {dateTo}
                <button type="button" onClick={() => setDateTo("")} aria-label="Remove to date filter"><X size={13} /></button>
              </span>
            )}
          </div>
        )}

        {filtersExpanded && (
          <div className="collapsible-filter-panel">
            <div className="collapsible-filter-header">
              <div className="collapsible-filter-title">
                <Filter size={15} />
                <span>Filter {title}</span>
                {activeFilterCount > 0 && <span className="app-filter-badge">{activeFilterCount} active</span>}
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
            <div className="collapsible-filter-grid">
              <label className="form-label">
                <span>Vendor</span>
                <select
                  aria-label="Filter by vendor"
                  value={vendorFilter}
                  onChange={event => {
                    setPage(1);
                    setVendorFilter(event.target.value);
                  }}
                >
                  <option value="">All vendors</option>
                  {vendorOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              {kind === "goods_receipt" && (
                <label className="form-label">
                  <span>Purchase order</span>
                  <select
                    aria-label="Filter by purchase order"
                    value={poFilter}
                    onChange={event => {
                      setPage(1);
                      setPoFilter(event.target.value);
                    }}
                  >
                    <option value="">All purchase orders</option>
                    {poOptions.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="form-label">
                <span>From date</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={event => {
                    setPage(1);
                    setDateFrom(event.target.value);
                  }}
                />
              </label>

              <label className="form-label">
                <span>To date</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={event => {
                    setPage(1);
                    setDateTo(event.target.value);
                  }}
                />
              </label>
            </div>
            <div className="collapsible-filter-footer">
              <span className="filter-result-count">{total.toLocaleString("en-IN")} results</span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="filter-chips-reset-btn"
                  onClick={() => {
                    setVendorFilter("");
                    setPoFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="notice error" role="alert" style={{ margin: "16px 20px" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-panel" role="status" style={{ padding: "40px 20px" }}>
            Loading {title.toLowerCase()}...
          </div>
        ) : rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {kind === "purchase_order" ? (
                    <>
                      <th>PO number</th>
                      <th>Vendor</th>
                      <th>Date</th>
                      <th>Total</th>
                    </>
                  ) : (
                    <>
                      <th>Receipt number</th>
                      <th>Vendor</th>
                      <th>PO</th>
                      <th>Receipt date</th>
                      <th>Lines</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    onClick={() => void open(row)}
                    onKeyDown={event => {
                      if (event.key === "Enter") void open(row);
                    }}
                  >
                    {kind === "purchase_order" ? (
                      <>
                        <td>
                          <strong>{(row as PO).po_number}</strong>
                        </td>
                        <td>{(row as PO).vendor_name || "Vendor pending"}</td>
                        <td>{dateLabel((row as PO).po_date)}</td>
                        <td>
                          <strong>{amount((row as PO).total_amount, (row as PO).currency)}</strong>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{(row as GR).gr_number}</strong>
                        </td>
                        <td>{(row as GR).vendor_name || "Vendor pending"}</td>
                        <td>
                          {poOptions.find(po => po.id === (row as GR).po_id)?.po_number ||
                            (row as GR).po_id?.slice(0, 8) ||
                            "—"}
                        </td>
                        <td>{dateLabel((row as GR).receipt_date)}</td>
                        <td>
                          <span className="pill neutral">{(row as GR).lines?.length || 0} items</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={`No ${title.toLowerCase()} found`}
            description="Try changing the search or filters to find records."
          />
        )}

        <div className="pagination">
          <span>
            Page <b>{page}</b> of <b>{Math.max(1, Math.ceil(total / pageSize))}</b> · {total} records
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>
              <ArrowLeft {...icons} /> Previous
            </Button>
            <Button
              variant="secondary"
              disabled={loading || page * pageSize >= total}
              onClick={() => setPage(value => value + 1)}
            >
              Next <ArrowRight {...icons} />
            </Button>
          </div>
        </div>
      </Card>

      {selected && (
        <div
          className="modal-backdrop drawer-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="modal invoice-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="procurement-detail-title"
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow purple" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {kind === "purchase_order" ? <ClipboardList size={14} /> : <PackageCheck size={14} />}{" "}
                  {title.toUpperCase()}
                </span>
                <h2 id="procurement-detail-title">
                  {kind === "purchase_order" ? (selected as PO).po_number : (selected as GR).gr_number}
                </h2>
              </div>
              <button
                className="modal-close"
                aria-label={`Close ${title} details`}
                onClick={() => setSelected(null)}
              >
                <X {...icons} />
              </button>
            </header>

            <div className="modal-body">
              <div className="detail-summary">
                <span className="pill neutral">{selected.vendor_name || "Vendor pending"}</span>
              </div>

              {vendorNotice && (
                <VendorResolutionBanner
                  info={vendorNotice}
                  vendors={vendorVendors}
                  canAddVendor={canAddVendor}
                  busy={vendorBusy}
                  error={vendorError}
                  onAdd={onAddVendor}
                  onSelect={onSelectVendor}
                />
              )}

              <SourceFileActions
                sourceDocumentId={selected.source_document_id}
                coreUrl={coreUrl}
                authHeaders={authHeaders}
                onView={onViewOriginal}
                onDownload={onDownloadOriginal}
              />

              <div className="field-grid">
                {kind === "purchase_order" ? (
                  <>
                    <Detail label="PO number" value={(selected as PO).po_number} />
                    <Detail label="Version" value={String((selected as PO).version_no)} />
                    <Detail label="PO date" value={dateLabel((selected as PO).po_date)} />
                    <Detail label="Subtotal" value={amount((selected as PO).subtotal, (selected as PO).currency)} />
                    <Detail label="Tax" value={amount((selected as PO).tax_amount, (selected as PO).currency)} />
                    <Detail label="Total" value={amount((selected as PO).total_amount, (selected as PO).currency)} />
                  </>
                ) : (
                  <>
                    <Detail label="Receipt number" value={(selected as GR).gr_number} />
                    <Detail label="Receipt date" value={dateLabel((selected as GR).receipt_date)} />
                    <Detail
                      label="Purchase order"
                      value={selectedPO?.po_number || (selected as GR).po_id || "—"}
                    />
                  </>
                )}
              </div>

              <section className="extracted-section">
                <h3 className="section-title">Line items</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th>{kind === "purchase_order" ? "Quantity" : "Received"}</th>
                        {kind === "goods_receipt" && (
                          <>
                            <th>Accepted</th>
                            <th>Rejected</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.lines || []).map(line => (
                        <tr key={line.id}>
                          <td>{line.item_code || "—"}</td>
                          <td>{line.description || "—"}</td>
                          <td>{line.qty ?? line.received_qty ?? "—"}</td>
                          {kind === "goods_receipt" && (
                            <>
                              <td>{line.accepted_qty ?? "0"}</td>
                              <td>{line.rejected_qty ?? "0"}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="extracted-section">
                <h3 className="section-title">Linked invoices</h3>
                {linkedInvoiceRows.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {linkedInvoiceRows.map(invoice => (
                      <button
                        key={invoice.invoice_id}
                        type="button"
                        className="text-link"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid rgba(36, 58, 94, 0.15)",
                          background: "#ffffff",
                        }}
                        onClick={() => onOpenInvoice(invoice.invoice_id)}
                      >
                        {invoice.invoice_no || invoice.invoice_id} · {invoice.status || "Invoice"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No linked invoices are associated with this record.</p>
                )}
              </section>

              <p className="muted" style={{ marginTop: "24px", fontSize: "12px" }}>
                Created {dateLabel(selected.created_at)} · Updated {dateLabel(selected.updated_at)}
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="field detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

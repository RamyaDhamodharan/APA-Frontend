import { useEffect, useState } from "react";
import axios from "axios";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Hash,
  Mail,
  Pencil,
  Percent,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { userFacingErrorMessage } from "../../../utils/errorMessages";

type Vendor = {
  id: string;
  name: string;
  tax_id?: string | null;
  default_tax_rate?: string | number | null;
  is_active: boolean;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

type Alias = {
  id: string;
  alias_norm: string;
  is_active: boolean;
};

type Draft = {
  name: string;
  tax_id: string;
  default_tax_rate: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

const empty: Draft = {
  name: "",
  tax_id: "",
  default_tax_rate: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

export function VendorsPage({
  coreUrl,
  authHeaders,
  isAdmin,
  canCreateVendor,
}: {
  coreUrl: string;
  authHeaders: () => { Authorization: string };
  isAdmin: boolean;
  canCreateVendor: boolean;
}) {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Vendor Details Drawer/Modal
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorAliases, setVendorAliases] = useState<Alias[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Aliases Management Modal
  const [aliasesFor, setAliasesFor] = useState<Vendor | null>(null);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [aliasText, setAliasText] = useState("");
  const [aliasEditing, setAliasEditing] = useState<Alias | null>(null);
  const [formError, setFormError] = useState("");

  const pageSize = 20;

  useEffect(() => {
    let live = true;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());
    axios
      .get<Vendor[]>(`${coreUrl}/api/vendors?${params}`, { headers: authHeaders() })
      .then(res => {
        if (live) setRows(res.data);
      })
      .catch(err => {
        if (live)
          setError(
            userFacingErrorMessage(err, "The vendor request could not be completed. Try again.", {
              conflict: "vendor",
            })
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [coreUrl, authHeaders, page, search, refresh]);

  const viewVendorDetails = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDetailsLoading(true);
    try {
      const res = await axios.get<Alias[]>(`${coreUrl}/api/vendors/${vendor.id}/aliases`, {
        headers: authHeaders(),
      });
      setVendorAliases(res.data);
    } catch {
      setVendorAliases([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const startEdit = (vendor?: Vendor) => {
    setEditing(vendor || null);
    setDraft(
      vendor
        ? {
            name: vendor.name,
            tax_id: vendor.tax_id || "",
            default_tax_rate:
              vendor.default_tax_rate == null ? "" : String(vendor.default_tax_rate),
            contact_name: vendor.contact_name || "",
            contact_email: vendor.contact_email || "",
            contact_phone: vendor.contact_phone || "",
          }
        : empty
    );
    setFormError("");
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setFormError("Enter a vendor name.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const payload = {
        name: draft.name.trim(),
        tax_id: draft.tax_id.trim() || null,
        default_tax_rate: draft.default_tax_rate ? Number(draft.default_tax_rate) : null,
        contact_name: draft.contact_name.trim() || null,
        contact_email: draft.contact_email.trim() || null,
        contact_phone: draft.contact_phone.trim() || null,
      };
      if (editing) {
        await axios.patch(`${coreUrl}/api/vendors/${editing.id}`, payload, {
          headers: authHeaders(),
        });
        if (selectedVendor && selectedVendor.id === editing.id) {
          setSelectedVendor({ ...selectedVendor, ...payload });
        }
      } else {
        await axios.post(`${coreUrl}/api/vendors`, payload, { headers: authHeaders() });
      }
      setFormOpen(false);
      setRefresh(value => value + 1);
    } catch (err) {
      setFormError(
        userFacingErrorMessage(
          err,
          "Could not save this vendor. Check the name and tax ID and try again.",
          { conflict: "vendor" }
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (vendor: Vendor) => {
    if (!window.confirm(`Delete ${vendor.name}? This will also remove associated aliases.`))
      return;
    try {
      await axios.delete(`${coreUrl}/api/vendors/${vendor.id}`, { headers: authHeaders() });
      if (selectedVendor && selectedVendor.id === vendor.id) {
        setSelectedVendor(null);
      }
      setRefresh(value => value + 1);
    } catch (err) {
      setError(
        userFacingErrorMessage(err, "The vendor request could not be completed. Try again.", {
          conflict: "vendor",
        })
      );
    }
  };

  const showAliases = async (vendor: Vendor) => {
    setAliasesFor(vendor);
    setAliasText("");
    setAliasEditing(null);
    setFormError("");
    try {
      const res = await axios.get<Alias[]>(`${coreUrl}/api/vendors/${vendor.id}/aliases`, {
        headers: authHeaders(),
      });
      setAliases(res.data);
    } catch (err) {
      setError(
        userFacingErrorMessage(err, "The vendor request could not be completed. Try again.", {
          conflict: "vendor",
        })
      );
    }
  };

  const addAlias = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!aliasesFor || !aliasText.trim()) return;
    try {
      await axios.post(
        `${coreUrl}/api/vendors/${aliasesFor.id}/aliases`,
        { alias: aliasText.trim() },
        { headers: authHeaders() }
      );
      setAliasText("");
      await showAliases(aliasesFor);
      if (selectedVendor && selectedVendor.id === aliasesFor.id) {
        void viewVendorDetails(selectedVendor);
      }
    } catch (err) {
      setFormError(
        userFacingErrorMessage(err, "The vendor request could not be completed. Try again.", {
          conflict: "vendor",
        })
      );
    }
  };

  const deactivateAlias = async (alias: Alias) => {
    if (!aliasesFor) return;
    try {
      await axios.delete(`${coreUrl}/api/vendors/${aliasesFor.id}/aliases/${alias.id}`, {
        headers: authHeaders(),
      });
      await showAliases(aliasesFor);
      if (selectedVendor && selectedVendor.id === aliasesFor.id) {
        void viewVendorDetails(selectedVendor);
      }
    } catch (err) {
      setError(
        userFacingErrorMessage(err, "The vendor request could not be completed. Try again.", {
          conflict: "vendor",
        })
      );
    }
  };

  const updateAlias = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!aliasesFor || !aliasEditing || !aliasText.trim()) return;
    try {
      await axios.patch(
        `${coreUrl}/api/vendors/${aliasesFor.id}/aliases/${aliasEditing.id}`,
        { alias: aliasText.trim() },
        { headers: authHeaders() }
      );
      setAliasEditing(null);
      setAliasText("");
      await showAliases(aliasesFor);
      if (selectedVendor && selectedVendor.id === aliasesFor.id) {
        void viewVendorDetails(selectedVendor);
      }
    } catch (err) {
      setFormError(
        userFacingErrorMessage(err, "The vendor request could not be completed. Try again.", {
          conflict: "vendor",
        })
      );
    }
  };

  return (
    <div className="invoice-page page-enter">
      <header className="welcome">
        <div>
          <span className="eyebrow">FINANCE OPERATIONS</span>
          <h1>Vendors</h1>
        </div>
        {canCreateVendor && (
          <button className="primary" onClick={() => startEdit()}>
            <Plus size={18} strokeWidth={1.75} /> Add vendor
          </button>
        )}
      </header>

      <section className="panel invoice-workspace scroll-reveal">
        <div className="vendors-toolbar">
          <div className="vendors-search-wrap">
            <Building2 size={16} className="vendors-search-icon" />
            <input
              aria-label="Search vendors"
              value={search}
              onChange={event => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search by vendor name, tax ID, or contact person..."
              className="vendors-search-input"
            />
            {search && (
              <button
                type="button"
                className="email-clear-btn"
                onClick={() => setSearch("")}
                aria-label="Clear vendor search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <span className="vendors-count-pill">{rows.length} vendors</span>
        </div>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-panel" role="status">
            Loading vendors…
          </div>
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="vendors-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Tax ID</th>
                  <th>Contact Person</th>
                  <th>Contact Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(v => (
                  <tr
                    key={v.id}
                    className="vendor-clickable-row"
                    onClick={() => void viewVendorDetails(v)}
                    title="Click to view vendor details"
                  >
                    <td>
                      <div className="vendor-name-cell">
                        <span className="vendor-avatar">
                          {(v.name || "V").slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong className="vendor-title">{v.name}</strong>
                          {v.default_tax_rate != null && (
                            <small className="vendor-tax-sub">
                              Tax: {v.default_tax_rate}%
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{v.tax_id || "—"}</td>
                    <td>{v.contact_name || "—"}</td>
                    <td>{v.contact_email || "—"}</td>
                    <td>
                      <span className={`pill ${v.is_active ? "success" : "neutral"}`}>
                        <i />
                        {v.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="vendor-actions-cell" onClick={e => e.stopPropagation()}>
                      <div className="vendor-action-group">
                        <button
                          type="button"
                          className="vendor-action-btn secondary"
                          title="Manage Aliases"
                          onClick={() => void showAliases(v)}
                        >
                          Aliases
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="vendor-action-btn icon-btn"
                              title={`Edit ${v.name}`}
                              onClick={() => startEdit(v)}
                              aria-label={`Edit ${v.name}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="vendor-action-btn icon-btn danger"
                              title={`Delete ${v.name}`}
                              onClick={() => void remove(v)}
                              aria-label={`Delete ${v.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
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
          <div className="empty-state">
            <h2>No vendors found</h2>
            <p>Try another search or add a vendor to get started.</p>
          </div>
        )}

        <div className="pagination">
          <span>Page {page}</span>
          <div>
            <button
              className="secondary"
              disabled={loading || page <= 1}
              onClick={() => setPage(v => v - 1)}
            >
              <ChevronLeft size={18} strokeWidth={1.75} /> Previous
            </button>
            <button
              className="secondary"
              disabled={loading || rows.length < pageSize}
              onClick={() => setPage(v => v + 1)}
            >
              Next <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </section>

      {/* Vendor Details Drawer / Modal */}
      {selectedVendor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedVendor(null);
          }}
        >
          <section
            className="modal vendor-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-detail-title"
          >
            <header className="modal-head">
              <div className="vendor-detail-head">
                <span className="eyebrow purple">VENDOR PROFILE</span>
                <div className="vendor-detail-title-row">
                  <h2 id="vendor-detail-title">{selectedVendor.name}</h2>
                  <span
                    className={`pill ${selectedVendor.is_active ? "success" : "neutral"}`}
                  >
                    <i />
                    {selectedVendor.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close vendor details"
                onClick={() => setSelectedVendor(null)}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="modal-body vendor-details-body">
              <div className="vendor-info-grid">
                <div className="vendor-info-card">
                  <span className="info-label">
                    <Hash size={14} /> Tax ID / GSTIN
                  </span>
                  <span className="info-value">{selectedVendor.tax_id || "Not registered"}</span>
                </div>
                <div className="vendor-info-card">
                  <span className="info-label">
                    <Percent size={14} /> Default Tax Rate
                  </span>
                  <span className="info-value">
                    {selectedVendor.default_tax_rate != null
                      ? `${selectedVendor.default_tax_rate}%`
                      : "Default rate"}
                  </span>
                </div>
                <div className="vendor-info-card">
                  <span className="info-label">
                    <User size={14} /> Contact Person
                  </span>
                  <span className="info-value">
                    {selectedVendor.contact_name || "Not provided"}
                  </span>
                </div>
                <div className="vendor-info-card">
                  <span className="info-label">
                    <Mail size={14} /> Contact Email
                  </span>
                  <span className="info-value">
                    {selectedVendor.contact_email ? (
                      <a href={`mailto:${selectedVendor.contact_email}`}>
                        {selectedVendor.contact_email}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </span>
                </div>
                <div className="vendor-info-card">
                  <span className="info-label">
                    <Phone size={14} /> Contact Phone
                  </span>
                  <span className="info-value">
                    {selectedVendor.contact_phone ? (
                      <a href={`tel:${selectedVendor.contact_phone}`}>
                        {selectedVendor.contact_phone}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </span>
                </div>
              </div>

              {/* Aliases Card */}
              <div className="vendor-aliases-section">
                <div className="aliases-section-head">
                  <div>
                    <strong>Recognized Aliases</strong>
                    <p className="muted">
                      Alternative names used on incoming invoices and POs for automatic matching.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={() => {
                      const v = selectedVendor;
                      setSelectedVendor(null);
                      void showAliases(v);
                    }}
                  >
                    Manage Aliases
                  </button>
                </div>

                {detailsLoading ? (
                  <p className="muted">Loading aliases...</p>
                ) : vendorAliases.length > 0 ? (
                  <div className="alias-pills-wrap">
                    {vendorAliases.map(alias => (
                      <span
                        key={alias.id}
                        className={`alias-pill ${alias.is_active ? "active" : "inactive"}`}
                      >
                        {alias.alias_norm}
                        {!alias.is_active && <small>(inactive)</small>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="alias-empty-note">
                    <span>No matching aliases configured yet.</span>
                  </div>
                )}
              </div>

              <div className="modal-actions vendor-details-footer">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedVendor(null)}
                >
                  Close
                </button>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        const v = selectedVendor;
                        setSelectedVendor(null);
                        startEdit(v);
                      }}
                    >
                      <Pencil size={15} /> Edit vendor
                    </button>
                    <button
                      type="button"
                      className="secondary danger-btn"
                      onClick={() => void remove(selectedVendor)}
                    >
                      <Trash2 size={15} /> Delete vendor
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {formOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !busy) setFormOpen(false);
          }}
        >
          <form
            className="modal vendor-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-form-title"
            onSubmit={save}
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow purple">VENDOR MANAGEMENT</span>
                <h2 id="vendor-form-title">{editing ? "Edit vendor" : "Add vendor"}</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close vendor form"
                onClick={() => setFormOpen(false)}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="modal-body">
              <div className="vendor-form-grid">
                <label className="form-label span-2">
                  <span>Vendor name *</span>
                  <input
                    required
                    maxLength={200}
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Company or legal entity name"
                  />
                </label>
                <label className="form-label">
                  <span>Tax ID / GSTIN</span>
                  <input
                    maxLength={30}
                    value={draft.tax_id}
                    onChange={e => setDraft({ ...draft, tax_id: e.target.value })}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                  />
                </label>
                <label className="form-label">
                  <span>Default tax rate (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.default_tax_rate}
                    onChange={e => setDraft({ ...draft, default_tax_rate: e.target.value })}
                    placeholder="e.g. 18.00"
                  />
                </label>
                <label className="form-label">
                  <span>Contact name</span>
                  <input
                    value={draft.contact_name}
                    onChange={e => setDraft({ ...draft, contact_name: e.target.value })}
                    placeholder="Primary contact person"
                  />
                </label>
                <label className="form-label">
                  <span>Contact email</span>
                  <input
                    type="email"
                    value={draft.contact_email}
                    onChange={e => setDraft({ ...draft, contact_email: e.target.value })}
                    placeholder="billing@vendor.com"
                  />
                </label>
                <label className="form-label span-2">
                  <span>Contact phone</span>
                  <input
                    value={draft.contact_phone}
                    onChange={e => setDraft({ ...draft, contact_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </label>
              </div>

              {formError && (
                <div role="alert" className="notice error">
                  {formError}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Add vendor"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Aliases Modal */}
      {aliasesFor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setAliasesFor(null);
          }}
        >
          <section
            className="modal alias-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aliases-title"
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow purple">MATCHING ALIASES</span>
                <h2 id="aliases-title">{aliasesFor.name}</h2>
                <p className="muted">
                  Variations of this vendor's name recognized during document extraction.
                </p>
              </div>
              <button
                className="modal-close"
                aria-label="Close aliases"
                onClick={() => setAliasesFor(null)}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="modal-body">
              {isAdmin && (
                <form
                  onSubmit={aliasEditing ? updateAlias : addAlias}
                  className="alias-input-form"
                >
                  <input
                    aria-label={aliasEditing ? "Edit vendor alias" : "Vendor alias"}
                    required
                    value={aliasText}
                    onChange={e => setAliasText(e.target.value)}
                    placeholder={
                      aliasEditing ? "Update alias name..." : "Add new alternate name..."
                    }
                  />
                  <button className="primary" type="submit">
                    <Plus size={16} strokeWidth={2} />
                    <span>{aliasEditing ? "Save alias" : "Add alias"}</span>
                  </button>
                  {aliasEditing && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setAliasEditing(null);
                        setAliasText("");
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              )}

              <div className="alias-cards-container">
                {aliases.length > 0 ? (
                  aliases.map(alias => (
                    <div key={alias.id} className="alias-row-card">
                      <div className="alias-info">
                        <strong className="alias-name">{alias.alias_norm}</strong>
                        <span
                          className={`alias-status-tag ${
                            alias.is_active ? "active" : "inactive"
                          }`}
                        >
                          {alias.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {isAdmin && alias.is_active && (
                        <div className="alias-item-actions">
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => {
                              setAliasEditing(alias);
                              setAliasText(alias.alias_norm);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-link danger"
                            onClick={() => void deactivateAlias(alias)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="muted">No aliases registered for this vendor yet.</p>
                )}
              </div>

              {formError && (
                <div role="alert" className="notice error">
                  {formError}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

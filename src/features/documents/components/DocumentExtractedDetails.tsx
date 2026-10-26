import type { Doc } from "../types";
import { DetailField } from "../../../components/common";
import { documentDetailSectionTitle } from "../services/documentNavigation";
import { displayDate, pick, record } from "../services/helpers";

const invoiceFields: { label: string; keys: string[]; date?: boolean }[] = [
  { label: "Vendor", keys: ["vendor", "vendor_name", "supplier", "supplier_name"] },
  { label: "Vendor Tax ID", keys: ["vendor_tax_id", "tax_id", "gstin", "vat_number"] },
  { label: "Invoice Number", keys: ["invoice_number", "invoice_no", "number"] },
  { label: "Invoice Date", keys: ["invoice_date", "date"], date: true },
  { label: "Due Date", keys: ["due_date"], date: true },
  {
    label: "PO/Order Number",
    keys: ["po_number", "purchase_order_number", "order_number", "po_no"],
  },
  { label: "Payment Terms", keys: ["payment_terms", "terms"] },
  { label: "Currency", keys: ["currency", "currency_code"] },
];

export function DocumentExtractedDetails({ doc }: { doc: Doc }) {
  const data = record(doc.extracted_json);
  const nested = doc.doc_type === "invoice" ? record(data.invoice) : {};
  const source = { ...data, ...nested };
  const currencyValue = pick(source, ["currency", "currency_code"]);
  const currency =
    typeof currencyValue === "string" && /^[A-Za-z]{3}$/.test(currencyValue)
      ? currencyValue.toUpperCase()
      : "";
  const formatAmount = (value: unknown) => {
    if (value == null || value === "" || (typeof value !== "number" && typeof value !== "string"))
      return undefined;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value);
    try {
      return new Intl.NumberFormat(
        "en-IN",
        currency
          ? { style: "currency", currency, maximumFractionDigits: 2 }
          : { maximumFractionDigits: 2 }
      ).format(amount);
    } catch {
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount);
    }
  };
  const formatQuantity = (value: unknown) => {
    if (typeof value !== "number" && typeof value !== "string") return undefined;
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(amount)
      : String(value);
  };
  const linesValue = pick(source, ["line_items", "items"]);
  const lines = Array.isArray(linesValue) ? linesValue.map(record) : [];
  const amountFields = [
    { label: "Subtotal", keys: ["subtotal", "sub_total"] },
    { label: "Tax", keys: ["tax", "tax_amount", "total_tax"] },
    { label: "Total", keys: ["total", "total_amount", "invoice_total", "grand_total"] },
  ];
  const documentFields =
    doc.doc_type === "po" || doc.doc_type === "purchase_order"
      ? [
          { label: "PO Number", keys: ["po_number", "order_number"] },
          { label: "PO Date", keys: ["po_date"], date: true },
          { label: "Vendor", keys: ["vendor", "vendor_name"] },
          { label: "Payment Terms", keys: ["payment_terms", "terms"] },
        ]
      : doc.doc_type === "goods_receipt"
      ? [
          {
            label: "Receipt Number",
            keys: ["gr_number", "receipt_number", "goods_receipt_number"],
          },
          { label: "Receipt Date", keys: ["receipt_date"], date: true },
          { label: "PO Number", keys: ["po_number", "order_number"] },
          { label: "Vendor", keys: ["vendor", "vendor_name"] },
        ]
      : doc.doc_type === "invoice"
      ? invoiceFields
      : [];
  const sectionTitle = documentDetailSectionTitle(doc.doc_type);
  const ownFieldsPresent = documentFields.some(field => pick(source, field.keys) !== undefined);

  return (
    <div className="extracted-details">
      {ownFieldsPresent && (
        <section className="extracted-section scroll-reveal">
          <h3 className="section-title">{sectionTitle}</h3>
          <div className="field-grid">
            {documentFields.map(field => {
              const value = pick(source, field.keys);
              return (
                <DetailField
                  key={field.label}
                  label={field.label}
                  value={field.date ? displayDate(value) : value}
                />
              );
            })}
          </div>
        </section>
      )}
      {amountFields.some(field => pick(source, field.keys) !== undefined) && (
        <section className="extracted-section scroll-reveal">
          <h3 className="section-title">Amounts</h3>
          <div className="field-grid">
            {amountFields.map(field => {
              const value = pick(source, field.keys);
              return (
                <DetailField
                  key={field.label}
                  label={field.label}
                  value={formatAmount(value)}
                />
              );
            })}
          </div>
        </section>
      )}
      {lines.length > 0 && (
        <section className="extracted-section scroll-reveal">
          <h3 className="section-title">Line Items</h3>
          <div className="table-wrap scroll-reveal">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const description = pick(line, ["description", "item_description", "name"]);
                  const quantity = pick(line, ["qty", "quantity"]);
                  const price = pick(line, ["unit_price", "price"]);
                  const amount = pick(line, ["amount", "line_amount", "line_total", "total"]);
                  return (
                    <tr key={index}>
                      <td>{description == null ? "" : String(description)}</td>
                      <td>{formatQuantity(quantity) || ""}</td>
                      <td>{formatAmount(price) || ""}</td>
                      <td>{formatAmount(amount) || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!ownFieldsPresent &&
        !amountFields.some(field => pick(source, field.keys) !== undefined) &&
        !lines.length && (
          <p className="muted">No {sectionTitle.toLowerCase()} details are available yet.</p>
        )}
    </div>
  );
}

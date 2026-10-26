import { Fragment } from "react";
import type { Doc } from "../types";
import { humanize } from "../../../utils/formatters";
import { pick, record, stripPreviewMarkdown } from "../services/helpers";

export function DocxExtractedPreview({ doc }: { doc: Doc }) {
  const data = record(doc.extracted_json);
  const source = {
    ...data,
    ...record(data.extraction),
    ...record(data.fields),
    ...record(data.invoice),
    ...record(data.purchase_order),
    ...record(data.goods_receipt),
  };
  const lineValue = pick(source, ["line_items", "items"]);
  const lines = Array.isArray(lineValue) ? lineValue.map(record) : [];
  const hiddenKeys = new Set([
    "raw_text",
    "text",
    "line_items",
    "items",
    "confidence",
    "field_confidence",
  ]);
  const fields = Object.entries(source).filter(
    ([key, value]) =>
      !hiddenKeys.has(key.toLowerCase()) &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
      String(value).trim().length > 0
  );
  const text = stripPreviewMarkdown(
    doc.raw_text?.trim() || (typeof source.text === "string" ? source.text.trim() : "")
  );
  if (!text && !fields.length && !lines.length) {
    return (
      <div className="file-preview-content">
        <p className="muted" role="status">
          No extracted content is available to preview for this document.
        </p>
      </div>
    );
  }
  const lineValueText = (line: Record<string, unknown>, keys: string[]) => {
    const value = pick(line, keys);
    return value == null ? "" : String(value);
  };
  return (
    <div className="file-preview-content docx-extracted-preview">
      {text && (
        <section>
          <h3>Extracted text</h3>
          <pre>{text}</pre>
        </section>
      )}
      {fields.length > 0 && (
        <section>
          <h3>Extracted fields</h3>
          <dl className="docx-preview-fields">
            {fields.map(([key, value]) => (
              <Fragment key={key}>
                <dt>{humanize(key)}</dt>
                <dd>{String(value)}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}
      {lines.length > 0 && (
        <section>
          <h3>Extracted line items</h3>
          <div className="table-wrap scroll-reveal">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Item code</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      {lineValueText(line, ["description", "item_description", "name"])}
                    </td>
                    <td>{lineValueText(line, ["item_code", "sku", "code"])}</td>
                    <td>{lineValueText(line, ["qty", "quantity"])}</td>
                    <td>{lineValueText(line, ["unit_price", "price"])}</td>
                    <td>
                      {lineValueText(line, [
                        "amount",
                        "line_amount",
                        "line_total",
                        "total",
                      ])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

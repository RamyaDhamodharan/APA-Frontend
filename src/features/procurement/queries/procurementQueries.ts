import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export type ProcurementRow = {
  id: string;
  po_number?: string;
  gr_number?: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  total_amount?: number | null;
  receipt_date?: string | null;
  po_date?: string | null;
  status?: string;
  source_document_id?: string | null;
  lines?: any[];
};

export function useProcurementQuery({
  kind,
  page = 1,
  pageSize = 20,
  search = "",
  vendorFilter,
  poFilter,
  dateFrom,
  dateTo,
  sortBy,
  sortDir,
  authHeaders,
  enabled = true,
}: {
  kind: "purchase_order" | "goods_receipt";
  page?: number;
  pageSize?: number;
  search?: string;
  vendorFilter?: string;
  poFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  const endpoint =
    kind === "purchase_order" ? "/api/purchase-orders" : "/api/goods-receipts";

  return useQuery({
    queryKey: [
      "procurement",
      kind,
      { page, pageSize, search, vendorFilter, poFilter, dateFrom, dateTo, sortBy, sortDir },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      if (vendorFilter) params.set("vendor_id", vendorFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (sortBy) params.set("sort_by", sortBy);
      if (sortDir) params.set("sort_dir", sortDir);
      if (kind === "purchase_order") params.set("current_only", "false");
      else if (poFilter) params.set("po_id", poFilter);

      const response = await axios.get<any>(`${endpoint}?${params.toString()}`, {
        headers: authHeaders?.() || {},
      });
      if (Array.isArray(response.data)) {
        return { items: response.data, total: response.data.length };
      }
      return response.data;
    },
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useCreateGoodsReceiptMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: any) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      gr_number: string;
      receipt_date?: string | null;
      po_id?: string | null;
      vendor_id?: string | null;
      lines?: any[];
    }) => {
      const response = await axios.post("/api/goods-receipts", payload, {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({
        queryKey: ["procurement", "goods_receipt"],
      });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useCreatePurchaseOrderMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: any) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      po_number: string;
      vendor_id?: string | null;
      total_amount?: number | null;
      po_date?: string | null;
      lines?: any[];
    }) => {
      const response = await axios.post("/api/purchase-orders", payload, {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({
        queryKey: ["procurement", "purchase_order"],
      });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.(data);
    },
    onError,
  });
}

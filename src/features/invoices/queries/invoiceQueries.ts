import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { InvoiceDetail, InvoiceItem } from "../types";

export type InvoicesQueryParams = {
  page?: number;
  pageSize?: number;
  source?: string;
  status?: string;
  search?: string;
  vendorId?: string;
  ownerId?: string;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
};

export type PageResponse<T> = {
  items: T[];
  total: number;
  counts?: Record<string, number>;
};

export function useInvoicesQuery({
  page = 1,
  pageSize = 25,
  source,
  status,
  search,
  vendorId,
  ownerId,
  authHeaders,
  enabled = true,
}: InvoicesQueryParams) {
  return useQuery({
    queryKey: [
      "invoices",
      { page, pageSize, source, status, search, vendorId, ownerId },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (source && source !== "all") params.set("source", source);
      if (status && status !== "all") params.set("status", status);
      if (search?.trim()) params.set("search", search.trim());
      if (vendorId) params.set("vendor_id", vendorId);
      if (ownerId) params.set("owner_user_id", ownerId);

      const response = await axios.get<PageResponse<InvoiceItem>>(
        `/api/invoices?${params.toString()}`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useInvoiceDetailQuery({
  invoiceId,
  authHeaders,
  enabled = true,
}: {
  invoiceId?: string | null;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await axios.get<InvoiceDetail>(
        `/api/invoices/${invoiceId}`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled: Boolean(enabled && invoiceId),
  });
}

export function useMatchCandidatesQuery({
  invoiceId,
  authHeaders,
  enabled = true,
}: {
  invoiceId?: string | null;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["invoices", "matchCandidates", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const response = await axios.get<{ candidates: any[] }>(
        `/api/invoices/${invoiceId}/match-candidates`,
        { headers: authHeaders?.() || {} }
      );
      return response.data.candidates || [];
    },
    enabled: Boolean(enabled && invoiceId),
  });
}

export function useInvoiceDecisionMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      action,
      payload = {},
    }: {
      invoiceId: string;
      action: "approve" | "reject" | "hold" | string;
      payload?: Record<string, unknown>;
    }) => {
      const endpoint =
        action === "approve"
          ? `/api/invoices/${invoiceId}/approve`
          : `/api/invoices/${invoiceId}/${action}`;
      const response = await axios.post(endpoint, payload, {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
    },
    onError,
  });
}

export function useInvoiceMatchMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      poId,
    }: {
      invoiceId: string;
      poId: string;
    }) => {
      const response = await axios.post(
        `/api/invoices/${invoiceId}/match`,
        { po_id: poId },
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
    },
    onError,
  });
}

export function useInvoiceMatchRejectMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      poId,
    }: {
      invoiceId: string;
      poId: string;
    }) => {
      const response = await axios.post(
        `/api/invoices/${invoiceId}/match/reject`,
        { po_id: poId },
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
    },
    onError,
  });
}

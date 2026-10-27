import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Doc } from "../types";

export type DocumentsQueryParams = {
  page?: number;
  pageSize?: number;
  source?: string;
  status?: string;
  search?: string;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
};

export function useDocumentsQuery({
  page = 1,
  pageSize = 25,
  source = "all",
  status,
  search = "",
  authHeaders,
  enabled = true,
}: DocumentsQueryParams) {
  return useQuery({
    queryKey: ["documents", { page, pageSize, source, status, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (source && source !== "all") params.set("source", source);
      if (status && status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());

      const response = await axios.get<Doc[] | { items: Doc[]; total: number }>(
        `/api/documents?${params.toString()}`,
        { headers: authHeaders?.() || {} }
      );
      if (Array.isArray(response.data)) {
        return { items: response.data, total: response.data.length };
      }
      return response.data;
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useDocumentDetailQuery({
  docId,
  authHeaders,
  enabled = true,
}: {
  docId?: string | null;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["documents", "detail", docId],
    queryFn: async () => {
      if (!docId) return null;
      const response = await axios.get<Doc>(`/api/documents/${docId}`, {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    enabled: Boolean(enabled && docId),
  });
}

export function useUploadDocumentMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (doc: Doc) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post<Doc>(
        "/api/documents/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(authHeaders?.() || {}),
          },
        }
      );
      return response.data;
    },
    onSuccess: doc => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.(doc);
    },
    onError,
  });
}

export function useRetryDocumentMutation({
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
      docId,
      endpoint = "retry",
    }: {
      docId: string;
      endpoint?: string;
    }) => {
      await axios.post(
        `/api/documents/${docId}/${endpoint}`,
        {},
        { headers: authHeaders?.() || {} }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.();
    },
    onError,
  });
}

export function useReprocessAllDocumentsMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: {
    scanned: number;
    completed: number;
    failed: number;
    remaining: number;
  }) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post<{
        scanned: number;
        completed: number;
        failed: number;
        remaining: number;
      }>(
        "/api/documents/admin/reprocess-all",
        {},
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.(data);
    },
    onError,
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  EmailDraftItem,
  EmailMessageItem,
  EmailStatus,
} from "../types";

export function useEmailStatusQuery({
  authHeaders,
  enabled = true,
}: {
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["email", "status"],
    queryFn: async () => {
      const response = await axios.get<EmailStatus>("/api/email/status", {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    enabled,
    refetchInterval: 1000 * 30, // poll status every 30 seconds
  });
}

export function useEmailMessagesQuery({
  page = 0,
  pageSize = 25,
  filter = "all",
  reason = "",
  authHeaders,
  enabled = true,
}: {
  page?: number;
  pageSize?: number;
  filter?: string;
  reason?: string;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["email", "messages", { page, pageSize, filter, reason }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (filter && filter !== "all") params.set("status", filter);
      if (reason.trim()) params.set("reason", reason.trim());

      const response = await axios.get<{ items: EmailMessageItem[]; total: number }>(
        `/api/email/messages?${params.toString()}`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled,
  });
}

export function useEmailDraftsQuery({
  page = 1,
  pageSize = 25,
  status = "all",
  invoiceId,
  authHeaders,
  enabled = true,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  invoiceId?: string;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["email", "drafts", { page, pageSize, status, invoiceId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (status && status !== "all") params.set("status", status);
      if (invoiceId) params.set("invoice", invoiceId);

      const response = await axios.get<{ items: EmailDraftItem[]; total: number }>(
        `/api/email-drafts?${params.toString()}`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled,
  });
}

export function usePollEmailMutation({
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
    mutationFn: async () => {
      const response = await axios.post(
        "/api/email/poll",
        {},
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["email"] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useRetryEmailMessageMutation({
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
    mutationFn: async (messageId: string) => {
      await axios.post(
        `/api/email/messages/${messageId}/retry`,
        {},
        { headers: authHeaders?.() || {} }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["email"] });
      onSuccess?.();
    },
    onError,
  });
}

export function useCreateEmailDraftMutation({
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
      to_addresses: string[];
      cc_addresses?: string[];
      subject: string;
      body: string;
      send_now?: boolean;
    }) => {
      const response = await axios.post("/api/email-drafts", payload, {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["email", "drafts"] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useUpdateEmailDraftMutation({
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
    mutationFn: async ({
      draftId,
      payload,
    }: {
      draftId: string;
      payload: {
        to_addresses?: string[];
        cc_addresses?: string[];
        subject?: string;
        body?: string;
      };
    }) => {
      const response = await axios.patch(
        `/api/email-drafts/${draftId}`,
        payload,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["email", "drafts"] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useSendEmailDraftMutation({
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
    mutationFn: async ({
      draftId,
      reason,
    }: {
      draftId: string;
      reason?: string;
    }) => {
      const response = await axios.post(
        `/api/email-drafts/${draftId}/send`,
        reason ? { reason } : {},
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["email", "drafts"] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useDiscardEmailDraftMutation({
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
    mutationFn: async (draftId: string) => {
      await axios.post(
        `/api/email-drafts/${draftId}/discard`,
        {},
        { headers: authHeaders?.() || {} }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["email", "drafts"] });
      onSuccess?.();
    },
    onError,
  });
}

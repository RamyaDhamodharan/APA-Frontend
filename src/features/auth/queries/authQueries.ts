import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Associate, AuthProfile } from "../types";

export function useProfileQuery({
  token,
  enabled = true,
}: {
  token?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["auth", "profile", token],
    queryFn: async () => {
      const response = await axios.get<AuthProfile>("/api/users/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    },
    enabled: Boolean(enabled && token),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAssociatesQuery({
  authHeaders,
  enabled = true,
}: {
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["admin", "associates"],
    queryFn: async () => {
      const response = await axios.get<Associate[]>("/admin/associates", {
        headers: authHeaders?.() || {},
      });
      return response.data;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLoginMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { access_token?: string }) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const response = await axios.post<{ access_token?: string }>(
        "/api/auth/login",
        payload,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      onSuccess?.(data);
    },
    onError: err => {
      onError?.(err);
    },
  });
}

export function useLogoutMutation({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await axios.post(
        "/api/auth/logout",
        {},
        {
          withCredentials: true,
          headers: { "X-CSRF-Protection": "1" },
        }
      );
    },
    onSuccess: () => {
      queryClient.clear();
      onSuccess?.();
    },
  });
}

export function useSetPasswordMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: { access_token: string }) => void;
  onError?: (error: unknown) => void;
} = {}) {
  return useMutation({
    mutationFn: async (payload: {
      current_password: string;
      new_password: string;
    }) => {
      const response = await axios.post<{ access_token: string }>(
        "/auth/set-password",
        payload,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess,
    onError,
  });
}

export function useCreateAssociateMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: {
    temp_password_expires_at: string;
    temporary_password: string;
  }) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      temporary_password: string;
    }) => {
      const response = await axios.post<{
        temp_password_expires_at: string;
        temporary_password: string;
      }>("/admin/associates", payload, { headers: authHeaders?.() || {} });
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "associates"] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useDeleteAssociateMutation({
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
    mutationFn: async (associateId: string) => {
      await axios.delete(`/admin/associates/${associateId}`, {
        headers: authHeaders?.() || {},
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "associates"] });
      onSuccess?.();
    },
    onError,
  });
}

export function useResetAssociatePasswordMutation({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: {
    temporary_password: string;
    temp_password_expires_at?: string;
  }) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      associateId,
      temporaryPassword,
    }: {
      associateId: string;
      temporaryPassword?: string;
    }) => {
      const response = await axios.post<{
        temporary_password: string;
        temp_password_expires_at?: string;
      }>(
        `/admin/associates/${associateId}/reset-password`,
        temporaryPassword ? { temporary_password: temporaryPassword } : {},
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "associates"] });
      onSuccess?.(data);
    },
    onError,
  });
}

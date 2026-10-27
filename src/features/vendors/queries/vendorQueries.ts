import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export type VendorItem = {
  id: string;
  name: string;
  tax_id?: string | null;
  default_tax_rate?: string | number | null;
  is_active: boolean;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export type VendorAliasItem = {
  id: string;
  alias_norm: string;
  is_active: boolean;
};

export type VendorPayload = {
  name: string;
  tax_id?: string | null;
  default_tax_rate?: number | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export function useVendorsQuery({
  coreUrl = "",
  authHeaders,
  page = 1,
  pageSize = 20,
  search = "",
  enabled = true,
}: {
  coreUrl?: string;
  authHeaders?: () => Record<string, string>;
  page?: number;
  pageSize?: number;
  search?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["vendors", { page, pageSize, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      const response = await axios.get<VendorItem[]>(
        `${coreUrl}/api/vendors?${params.toString()}`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled,
  });
}

export function useCreateVendorMutation({
  coreUrl = "",
  authHeaders,
  onSuccess,
  onError,
}: {
  coreUrl?: string;
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: VendorItem) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VendorPayload) => {
      const response = await axios.post<VendorItem>(
        `${coreUrl}/api/vendors`,
        payload,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onSuccess?.(data);
    },
    onError: err => {
      onError?.(err);
    },
  });
}

export function useUpdateVendorMutation({
  coreUrl = "",
  authHeaders,
  onSuccess,
  onError,
}: {
  coreUrl?: string;
  authHeaders?: () => Record<string, string>;
  onSuccess?: (data: VendorItem) => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendorId,
      payload,
    }: {
      vendorId: string;
      payload: Partial<VendorPayload>;
    }) => {
      const response = await axios.patch<VendorItem>(
        `${coreUrl}/api/vendors/${vendorId}`,
        payload,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onSuccess?.(data);
    },
    onError: err => {
      onError?.(err);
    },
  });
}

export function useVendorAliasesQuery({
  coreUrl = "",
  authHeaders,
  vendorId,
  enabled = true,
}: {
  coreUrl?: string;
  authHeaders?: () => Record<string, string>;
  vendorId?: string | null;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["vendorAliases", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const response = await axios.get<VendorAliasItem[]>(
        `${coreUrl}/api/vendors/${vendorId}/aliases`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled: Boolean(enabled && vendorId),
  });
}

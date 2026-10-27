import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useAuditLogsQuery({
  params,
  authHeaders,
  enabled = true,
}: {
  params: Record<string, string>;
  authHeaders?: () => Record<string, string>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["auditLogs", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params);
      const response = await axios.get<{ items?: any[]; total?: number }>(
        `/api/audit-log?${searchParams.toString()}`,
        { headers: authHeaders?.() || {} }
      );
      return response.data;
    },
    enabled,
    staleTime: 1000 * 30,
  });
}

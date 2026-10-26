import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { AUTH_URL, CORE_URL } from "../config/env";
import { createAuthSession } from "../features/auth/services/authSession";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    authRetried?: boolean;
  }
}

export const authSession = createAuthSession(async () => {
  const response = await axios.post<{ access_token?: string }>(
    `${AUTH_URL}/api/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: { "X-CSRF-Protection": "1" },
    }
  );
  return response.data.access_token || null;
});

axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authSession.getAccessToken();
  if (
    token &&
    (config.url?.startsWith(CORE_URL) ||
      (config.url?.startsWith(AUTH_URL) &&
        !config.url?.includes("/api/auth/login") &&
        !config.url?.includes("/api/auth/refresh")))
  ) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

axios.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config;
  const isAuthEndpoint = Boolean(
    config?.url?.includes("/api/auth/refresh") || config?.url?.includes("/api/auth/login")
  );
  if (error.response?.status !== 401 || !config || config.authRetried || isAuthEndpoint) {
    throw error;
  }
  config.authRetried = true;
  const token = await authSession.refresh();
  if (!token) throw error;
  config.headers.set("Authorization", `Bearer ${token}`);
  return axios.request(config);
});

export default axios;

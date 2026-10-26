export const AUTH_URL = String(import.meta.env.VITE_AUTH_API_BASE_URL || "http://localhost:8001").replace(/\/$/, "");
export const CORE_URL = String(import.meta.env.VITE_AP_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

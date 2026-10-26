import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { App } from "./App";

export type WorkspacePage =
  | "dashboard"
  | "documents"
  | "invoices"
  | "purchase-orders"
  | "goods-receipts"
  | "vendors"
  | "associates"
  | "email"
  | "logs";

export function getPageFromPathname(
  pathname: string,
  search: Record<string, unknown> | string = ""
): WorkspacePage {
  const segment = pathname.replace(/^\//, "").split("/")[0] || "";
  if (
    segment === "logs" ||
    segment === "email" ||
    segment === "invoices" ||
    segment === "purchase-orders" ||
    segment === "goods-receipts" ||
    segment === "vendors" ||
    segment === "associates" ||
    segment === "documents"
  ) {
    return segment as WorkspacePage;
  }
  if (typeof search === "object" && search !== null) {
    if ((search as Record<string, unknown>).page === "logs") return "logs";
  } else if (typeof search === "string") {
    const pageParam = new URLSearchParams(search).get("page");
    if (pageParam === "logs") return "logs";
  }
  return "dashboard";
}

export function getPathnameForPage(page: WorkspacePage): string {
  return page === "dashboard" ? "/" : `/${page}`;
}

export const rootRoute = createRootRoute({
  component: App,
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
});

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
});

export const documentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/documents",
});

export const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invoices",
});

export const purchaseOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/purchase-orders",
});

export const goodsReceiptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goods-receipts",
});

export const vendorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendors",
});

export const associatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/associates",
});

export const emailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/email",
});

export const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  documentsRoute,
  invoicesRoute,
  purchaseOrdersRoute,
  goodsReceiptsRoute,
  vendorsRoute,
  associatesRoute,
  emailRoute,
  logsRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

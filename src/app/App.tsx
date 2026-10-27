import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { getPageFromPathname, getPathnameForPage } from "./routes";
import axios, { authSession } from "../lib/axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Download,
  Eye,
  FileImage,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  Layers,
  ExternalLink,
  Menu,
  RefreshCw,
  RotateCcw,
  Search,
  Upload,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  History,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  LogOut,
  UserPlus,
  Mail,
} from "lucide-react";
import { initScrollReveal } from "../utils/scrollReveal";
import { Badge, Button, Card, Skeleton, Tabs } from "../components/ui";
import {
  Loader,
  DocumentLoader,
  LoadingPanel,
  EmptyState,
  Pagination,
  FileTypeIcon,
  RetryIcon,
  KpiCard,
  CountUp,
  DetailField,
} from "../components/common";
import { Sidebar, type WorkspacePage } from "../layouts/Sidebar";
import { AUTH_URL, CORE_URL } from "../config/env";
import { iconProps, invoiceStatuses, invoiceStatusLabels } from "../config/constants";
import { humanize, friendlyStatus, statusClass, dateLabel, dateTimeLabel } from "../utils/formatters";
import { userFacingErrorMessage as getError } from "../utils/errorMessages";
import {
  documentStatusLabel,
  isDocumentProcessing,
  isProcessingStatus,
  isRetryScheduled,
  documentActionAvailability,
  isValidDocumentId,
  isSupportedUploadFilename,
  uploadLimitMessage,
  documentDetailSectionTitle,
  linkedRecordDestination,
  sourceFilePreviewMime,
  sourceFileViewerMode,
  useUploadDocumentMutation,
  useRetryDocumentMutation,
  useReprocessAllDocumentsMutation,
} from "../features/documents";
import {
  canAccessLogs,
  canCreateVendor,
  canSeeAdminNavigation,
  readAccessClaims,
  type AuthProfile,
  type Associate,
  type AccessClaims,
} from "../features/auth";
import {
  InvoicesWorkspacePage,
  InvoiceReviewDrawer,
  InvoiceComparisonRow,
  InvoiceTimeline,
  useInvoiceQueryState,
  formatInvoiceMoney,
  invoiceStatusClass,
  invoiceStatusTone,
  safeCompareValue,
  type InvoiceItem,
  type InvoiceDetail,
  type FilterOwner,
  type FilterVendor,
  useInvoiceDecisionMutation,
  useInvoiceMatchMutation,
  useInvoiceMatchRejectMutation,
} from "../features/invoices";
import {
  ProcurementWorkspacePage,
  type MatchCandidate,
} from "../features/procurement";
import {
  VendorsPage,
  VendorResolutionBanner,
  UnknownVendorPrompt,
  addAndResolveVendor,
  type UnknownVendorInfo,
} from "../features/vendors";
import {
  DocumentExtractedDetails,
  DocxExtractedPreview,
  stripPreviewMarkdown,
  type Doc,
  type FilePreviewState,
} from "../features/documents";
import {
  EmailInboxWorkspace,
  emailOutcome,
  emailPollCount,
  type EmailMessageItem,
  type EmailStatus,
  type EmailDraftDetail,
  type NoMatchDraft,
} from "../features/email";
import {
  DashboardWorkspace,
  DashboardChartSkeleton,
  AttentionSkeleton,
} from "../features/dashboard";
import { LogsPage } from "../features/logs";
import type { PageResponse, AnyRecord } from "../types";

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const activePage = useMemo(
    () => getPageFromPathname(location.pathname, location.search),
    [location.pathname, location.search]
  );
  const [pageHistory, setPageHistory] = useState<WorkspacePage[]>([]);
  const setActivePage = useCallback(
    (page: WorkspacePage) => {
      void navigate({ to: getPathnameForPage(page) });
    },
    [navigate]
  );
  const { filters: invoiceQuery, update: updateInvoiceQuery } = useInvoiceQueryState();
  const invoiceSource = (invoiceQuery.source || "all") as "all" | "upload" | "email";
  const [globalSearch, setGlobalSearch] = useState(invoiceQuery.search || "");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [credentialCopied, setCredentialCopied] = useState(false);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [associateName, setAssociateName] = useState("");
  const [associateEmail, setAssociateEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [associatesLoading, setAssociatesLoading] = useState(false);
  const [associatesError, setAssociatesError] = useState("");
  const [associateCredential, setAssociateCredential] = useState<{ email: string; password: string; expiresAt: string } | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [bulkReprocessBusy, setBulkReprocessBusy] = useState(false);
  const [bulkReprocessProgress, setBulkReprocessProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [localFailedDocuments, setLocalFailedDocuments] = useState<Doc[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoiceCounts, setInvoiceCounts] = useState<Record<InvoiceItem["status"], number>>({ processing: 0, needs_review: 0, ready_to_pay: 0, on_hold: 0, rejected: 0, paid: 0 });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const setInvoiceSource = (source: "all" | "upload" | "email") => updateInvoiceQuery({ source });
  // URL history is managed natively by TanStack Router
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceDrawerTab, setInvoiceDrawerTab] = useState<string>("details");
  useEffect(() => {
    const cleanup = initScrollReveal();
    return cleanup;
  }, [activePage, selectedInvoice, invoiceDrawerTab]);
  const [procurementRecordId, setProcurementRecordId] = useState<string | null>(null);
  const [noMatchDraft, setNoMatchDraft] = useState<NoMatchDraft | null>(null);
  const [emailDraftEditor, setEmailDraftEditor] = useState<EmailDraftDetail | null>(null);
  const [emailDraftSubject, setEmailDraftSubject] = useState("");
  const [emailDraftBody, setEmailDraftBody] = useState("");
  const [emailDraftRecipient, setEmailDraftRecipient] = useState("");
  const [emailDraftOpened, setEmailDraftOpened] = useState(false);
  const [emailDraftBusy, setEmailDraftBusy] = useState(false);
  const [emailDraftError, setEmailDraftError] = useState("");
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [decision, setDecision] = useState<{ invoiceId: string; action: "hold" | "reject" | "approve-exception" | "approve" | "paid"; reason: string; expectedMatchRunId?: string | null; expectedUpdatedAt?: string | null } | null>(null);
  const [recentBatchIds, setRecentBatchIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("ap-recent-upload-ids");
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch { return []; }
  });
  const [docTotal, setDocTotal] = useState(0);
  const [docPage, setDocPage] = useState(1);
  const [docSearch, setDocSearch] = useState("");
  const [docType, setDocType] = useState("all");
  const [docStatus, setDocStatus] = useState("all");
  const [docSource, setDocSource] = useState<"latest" | "all" | "email">("all");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraggingDocuments, setIsDraggingDocuments] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerDocumentUpload = useCallback(() => {
    navigateTo("documents");
    if (documentFileInputRef.current) {
      documentFileInputRef.current.click();
    } else {
      setTimeout(() => {
        documentFileInputRef.current?.click();
      }, 50);
    }
  }, [navigateTo]);
  const [unknownVendor, setUnknownVendor] = useState<UnknownVendorInfo | null>(null);
  const [unknownVendorBusy, setUnknownVendorBusy] = useState(false);
  const [unknownVendorError, setUnknownVendorError] = useState("");
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const filePreviewRequestId = useRef(0);
  useEffect(() => {
    if (!filePreview) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilePreview();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (filePreview.kind === "binary") URL.revokeObjectURL(filePreview.url);
    };
  }, [filePreview]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [processMenuOpen, setProcessMenuOpen] = useState(false);
  const processMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!processMenuOpen) return;
    const handleClose = (e: MouseEvent) => {
      if (processMenuRef.current && !processMenuRef.current.contains(e.target as Node)) {
        setProcessMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, [processMenuOpen]);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [emailMessages, setEmailMessages] = useState<EmailMessageItem[]>([]);
  const [emailTotal, setEmailTotal] = useState(0);
  const [emailFilter, setEmailFilter] = useState("all");
  const [emailReasonFilter, setEmailReasonFilter] = useState("");
  const [emailPage, setEmailPage] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [filterVendors, setFilterVendors] = useState<FilterVendor[]>([]);
  const [filterOwners, setFilterOwners] = useState<FilterOwner[]>([]);
  const notifiedEmailInvoiceIds = useRef<Set<string> | null>(null);

  const notify = useCallback((text: string, kind: "success" | "error" | "info" = "info") => {
    setToast({ text, kind });
  }, []);
  const clearSession = useCallback(() => {
    authSession.clear(); setToken(""); setProfile(null); setActivePage("dashboard"); setMustChangePassword(false); setProfileLoading(false); setDocuments([]); setSelectedDoc(null); setAssociateCredential(null);
  }, []);
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${authSession.getAccessToken()}` }), []);
  const uploadDocumentMutation = useUploadDocumentMutation({ authHeaders });
  const retryDocumentMutation = useRetryDocumentMutation({ authHeaders });
  const reprocessAllMutation = useReprocessAllDocumentsMutation({ authHeaders });
  const invoiceDecisionMutation = useInvoiceDecisionMutation({ authHeaders });
  const invoiceMatchMutation = useInvoiceMatchMutation({ authHeaders });
  const invoiceMatchRejectMutation = useInvoiceMatchRejectMutation({ authHeaders });

  useEffect(() => { setGlobalSearch(invoiceQuery.search); }, [invoiceQuery.search]);

  useEffect(() => {
    let active = true;
    void authSession.restore().then(restored => { if (active && restored) setToken(restored); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const claims = readAccessClaims(token);
    if (claims?.must_change_password) {
      setProfile({
        email: claims.email || "",
        role: claims.role,
        name: claims.name,
        must_change_password: true,
        temp_password_expires_at: claims.temp_password_expires_at,
      });
      setEmail(claims.email || "");
      setMustChangePassword(true);
      setProfileLoading(false);
      return () => { active = false; };
    }
    setProfileLoading(true);
    void axios.get<AuthProfile>(`${AUTH_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        if (!active) return;
        setProfile(response.data);
        setEmail(response.data.email);
        setMustChangePassword(response.data.must_change_password);
      })
      .catch(error => {
        if (!active) return;
        clearSession();
        notify(getError(error, "Could not load your account."), "error");
      })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [token, clearSession, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.kind === "error" ? 6500 : 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadDocuments = useCallback(async (nextPage = docPage) => {
    if (!token) return;
    setDocLoading(true); setDocError("");
    try {
      const query = new URLSearchParams({ page: String(nextPage), page_size: "50" });
      if (docSource === "email") query.set("source", "email");
      if (docStatus !== "all" && !["processing", "ready"].includes(docStatus)) query.set("status", docStatus);
      if (docType !== "all") query.set("doc_type", docType);

      const response = await axios.get<PageResponse<Doc> | Doc[]>(`${CORE_URL}/api/documents?${query}`, { headers: authHeaders() });
      const data = response.data;
      const serverItems = Array.isArray(data) ? data : data.items || [];
      const totalCount = Array.isArray(data) ? serverItems.length : data.total ?? serverItems.length;

      // Merge recent in-flight or session batch documents if not yet returned by server
      const serverIds = new Set(serverItems.map(item => item.id).filter(Boolean));
      const inFlightBatch = await Promise.all(
        recentBatchIds.filter(id => isValidDocumentId(id) && !serverIds.has(id)).map(id =>
          axios.get<Doc>(`${CORE_URL}/api/documents/${encodeURIComponent(id)}`, { headers: authHeaders() }).then(r => r.data).catch(() => null)
        )
      );
      const validInFlight = inFlightBatch.filter((d): d is Doc => Boolean(d));
      const allDocs = [...validInFlight, ...localFailedDocuments, ...serverItems];

      setDocPage(Array.isArray(data) ? nextPage : data.page ?? nextPage);
      setDocuments(allDocs);
      setDocTotal(totalCount + validInFlight.length);
      setSelectedDoc(current => {
        const latest = current && allDocs.find(item => item.id === current.id);
        return latest && current ? { ...current, status: latest.status, updated_at: latest.updated_at, failure_message: latest.failure_message, linked_invoice_id: latest.linked_invoice_id, linked_invoice_status: latest.linked_invoice_status } : current;
      });
    } catch (error) {
      const message = getError(error, "Could not load documents."); setDocError(message);
      if (axios.isAxiosError(error) && error.response?.status === 401) { clearSession(); notify("Your session expired. Please sign in again.", "error"); }
    } finally { setDocLoading(false); }
  }, [token, docPage, docStatus, docType, docSource, authHeaders, clearSession, notify, recentBatchIds, localFailedDocuments]);

  const loadAssociates = useCallback(async () => {
    if (!token || profile?.role !== "admin") return;
    setAssociatesLoading(true); setAssociatesError("");
    try {
      const response = await axios.get<Associate[]>(`${AUTH_URL}/admin/associates`, { headers: authHeaders() });
      setAssociates(response.data);
    } catch (error) {
      setAssociatesError(getError(error, "Could not load associate accounts."));
    } finally { setAssociatesLoading(false); }
  }, [token, profile?.role, authHeaders]);

  const loadInvoices = useCallback(async () => {
    if (!token) return;
    setInvoiceLoading(true); setInvoiceError("");
    try {
      const makeQuery = (includeStatus: boolean, pageSize: number) => {
        const query = new URLSearchParams({ page: String(invoiceQuery.page), page_size: String(pageSize) });
        if (includeStatus && invoiceStatuses.includes(invoiceQuery.status as InvoiceItem["status"])) query.set("status", invoiceQuery.status);
        if (invoiceSource !== "all") query.set("source", invoiceSource);
        if (invoiceQuery.vendor_id) query.set("vendor_id", invoiceQuery.vendor_id);
        if (invoiceQuery.due_date_from) query.set("due_date_from", invoiceQuery.due_date_from);
        if (invoiceQuery.due_date_to) query.set("due_date_to", invoiceQuery.due_date_to);
        if (invoiceQuery.amount_min) query.set("amount_min", invoiceQuery.amount_min);
        if (invoiceQuery.amount_max) query.set("amount_max", invoiceQuery.amount_max);
        if (invoiceQuery.gl_code) query.set("gl_code", invoiceQuery.gl_code);
        if (invoiceQuery.owner_user_id) query.set("owner_user_id", invoiceQuery.owner_user_id);
        if (invoiceQuery.sort_by) query.set("sort_by", invoiceQuery.sort_by);
        query.set("sort_dir", invoiceQuery.sort_dir);
        if (globalSearch.trim()) query.set("search", globalSearch.trim());
        return query;
      };
      const countQuery = makeQuery(false, 1);
      const [list, ...counts] = await Promise.all([
        axios.get<PageResponse<InvoiceItem>>(`${CORE_URL}/api/invoices?${makeQuery(true, 25)}`, { headers: authHeaders() }),
        ...invoiceStatuses.map(status => {
          const query = new URLSearchParams(countQuery);
          query.set("status", status);
          return axios.get<PageResponse<InvoiceItem>>(`${CORE_URL}/api/invoices?${query}`, { headers: authHeaders() });
        }),
      ]);
      const nextInvoices = list.data.items || [];
      const nextEmailIds = new Set(nextInvoices.filter(invoice => invoice.source === "email").map(invoice => invoice.invoice_id));
      if (invoiceSource === "all" && notifiedEmailInvoiceIds.current) {
        const arrived = nextInvoices.find(invoice => invoice.source === "email" && !notifiedEmailInvoiceIds.current?.has(invoice.invoice_id));
        if (arrived) notify(`New email invoice received${arrived.vendor_name ? ` from ${arrived.vendor_name}` : ""}.`, "info");
      }
      if (invoiceSource === "all") notifiedEmailInvoiceIds.current = nextEmailIds;
      setInvoices(nextInvoices);
      setInvoiceTotal(list.data.total || 0);
      setInvoiceCounts(Object.fromEntries(invoiceStatuses.map((status, index) => [status, counts[index].data.total || 0])) as Record<InvoiceItem["status"], number>);
    } catch (error) { setInvoiceError(getError(error, "Could not load invoices.")); }
    finally { setInvoiceLoading(false); }
  }, [token, authHeaders, invoiceSource, invoiceQuery, globalSearch, notify]);


  const vendorSearchTimer = useRef<number | undefined>(undefined);
  const searchFilterVendors = useCallback((search: string) => {
    if (vendorSearchTimer.current) window.clearTimeout(vendorSearchTimer.current);
    if (search.trim().length < 2) return;
    vendorSearchTimer.current = window.setTimeout(() => {
      const query = new URLSearchParams({ search: search.trim(), page: "1", page_size: "100" });
      void axios.get<FilterVendor[]>(`${CORE_URL}/api/vendors?${query}`, { headers: authHeaders() })
        .then(response => setFilterVendors(response.data.map(vendor => ({ id: vendor.id, name: vendor.name }))))
        .catch(() => undefined);
    }, 250);
  }, [authHeaders]);

  useEffect(() => {
    if (!token || profileLoading || mustChangePassword) return;
    void Promise.all([
      axios.get<{ items: FilterOwner[] }>(`${CORE_URL}/api/users/assignable`, { headers: authHeaders() }),
      axios.get<FilterVendor[]>(`${CORE_URL}/api/vendors?page=1&page_size=100`, { headers: authHeaders() }),
    ]).then(([usersResponse, vendorsResponse]) => {
      setFilterOwners(usersResponse.data.items || []);
      setFilterVendors(vendorsResponse.data.map(vendor => ({ id: vendor.id, name: vendor.name })));
    }).catch(() => undefined);
  }, [token, profileLoading, mustChangePassword, authHeaders]);

  const loadEmailInbox = useCallback(async () => {
    if (!token) return;
    setEmailLoading(true); setEmailError("");
    try {
      const query = new URLSearchParams({ limit: "25", offset: String(emailPage * 25) });
      if (emailFilter !== "all") query.set("status", emailFilter);
      if (emailReasonFilter.trim()) query.set("reason", emailReasonFilter.trim());
      const [status, messages] = await Promise.all([
        axios.get<EmailStatus>(`${CORE_URL}/api/email/status`, { headers: authHeaders() }),
        axios.get<PageResponse<EmailMessageItem>>(`${CORE_URL}/api/email/messages?${query}`, { headers: authHeaders() }),
      ]);
      setEmailStatus(status.data); setEmailMessages(messages.data.items || []); setEmailTotal(messages.data.total || 0);
    } catch (error) { setEmailError(getError(error, "Could not load the email inbox.")); }
    finally { setEmailLoading(false); }
  }, [token, authHeaders, emailPage, emailFilter, emailReasonFilter]);

  useEffect(() => { if (token && !profileLoading && !mustChangePassword) void loadDocuments(1); }, [token, profileLoading, mustChangePassword, docStatus, docType, docSource]);
  useEffect(() => {
    if (!token || profileLoading || mustChangePassword) return;
    const running = invoices.some(invoice => invoice.status === "processing")
      || emailMessages.some(message => ["processing", "received", "failed"].includes(message.status));
    if (!running) return;
    const timer = window.setInterval(() => {
      void loadInvoices(); void loadEmailInbox();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [token, profileLoading, mustChangePassword, documents, invoices, emailMessages, docPage, loadDocuments, loadInvoices, loadEmailInbox]);
  useEffect(() => { if (activePage === "associates" || activePage === "logs") void loadAssociates(); }, [activePage, loadAssociates]);
  useEffect(() => { if ((activePage === "invoices" || activePage === "dashboard") && token && !profileLoading && !mustChangePassword) void loadInvoices(); }, [activePage, token, profileLoading, mustChangePassword, loadInvoices]);
  useEffect(() => { if (token && !profileLoading && !mustChangePassword && ["email", "dashboard"].includes(activePage)) void loadEmailInbox(); }, [token, profileLoading, mustChangePassword, activePage, loadEmailInbox]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setToast(null); setLoginError("");
    try {
      const response = await axios.post<{ access_token?: string }>(`${AUTH_URL}/api/auth/login`, { email: email.trim(), password }, { withCredentials: true });
      if (!response.data.access_token) throw new Error("The sign-in response did not contain an access token.");
      setProfileLoading(true);
      authSession.setAccessToken(response.data.access_token); setToken(response.data.access_token);
    } catch (error) {
      setPassword("");
      const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
      const detail = axios.isAxiosError(error) ? String(error.response?.data?.detail || "").toLowerCase() : "";
      setLoginError(statusCode === 429 ? "Too many attempts. Please try again in a few minutes."
        : statusCode === 403 && detail.includes("inactive") ? "Your account is inactive. Please contact your admin."
        : statusCode === 401 && detail.includes("temporary password") ? "Your temporary password has expired. Please contact your admin for a new one."
        : statusCode === 401 ? "Invalid email or password. Please try again."
        : "Something went wrong. Please try again later.");
    }
    finally { setAuthBusy(false); }
  }
  async function logout() {
    setAuthBusy(true);
    try {
      await axios.post(`${AUTH_URL}/api/auth/logout`, {}, { withCredentials: true, headers: { "X-CSRF-Protection": "1" } });
      clearSession(); setPassword(""); notify("You have signed out.", "success");
    } catch (error) { notify(getError(error, "Could not safely sign out. Try again."), "error"); }
    finally { setAuthBusy(false); }
  }

  async function submitPasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { notify("The new passwords do not match.", "error"); return; }
    setAuthBusy(true);
    try {
      const response = await axios.post<{ access_token: string }>(`${AUTH_URL}/auth/set-password`, {
        current_password: currentPassword, new_password: newPassword,
      }, { headers: authHeaders(), withCredentials: true });
      authSession.setAccessToken(response.data.access_token);
      setToken(response.data.access_token); setMustChangePassword(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      notify("Password changed. Your workspace is ready.", "success");
    } catch (error) { notify(getError(error, "Could not change password."), "error"); }
    finally { setAuthBusy(false); }
  }

  async function createAssociate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true);
    try {
      const response = await axios.post<{ temp_password_expires_at: string; temporary_password: string }>(`${AUTH_URL}/admin/associates`, {
        name: associateName.trim(), email: associateEmail.trim(),
        ...(temporaryPassword.trim() ? { temporary_password: temporaryPassword } : {}),
      }, { headers: authHeaders() });
      setAssociateCredential({ email: associateEmail.trim(), password: response.data.temporary_password, expiresAt: response.data.temp_password_expires_at });
      setAssociateName(""); setAssociateEmail(""); setTemporaryPassword("");
      notify("Associate created. Share the temporary password shown below; it will not be shown again.", "success");
      await loadAssociates();
    } catch (error) { notify(getError(error, "Could not create associate account."), "error"); }
    finally { setAuthBusy(false); }
  }

  async function removeAssociate(associate: Associate) {
    if (!window.confirm(`Remove ${associate.name} (${associate.email})? They will no longer be able to sign in.`)) return;
    try {
      await axios.delete(`${AUTH_URL}/admin/associates/${associate.id}`, { headers: authHeaders() });
      setAssociates(current => current.map(item => item.id === associate.id ? { ...item, is_active: false } : item));
      notify(`${associate.name}'s access has been removed.`, "success");
    } catch (error) { notify(getError(error, "Could not remove this associate."), "error"); }
  }

  async function resetAssociatePassword(associate: Associate) {
    setAuthBusy(true);
    try {
      const response = await axios.post<{ temporary_password: string; temp_password_expires_at: string }>(
        `${AUTH_URL}/admin/associates/${associate.id}/reset-password`, {}, { headers: authHeaders() },
      );
      setCredentialCopied(false);
      setAssociateCredential({ email: associate.email, password: response.data.temporary_password, expiresAt: response.data.temp_password_expires_at });
      notify("Password reset. Share this temporary password with the associate.", "success");
    } catch (error) { notify(getError(error, "Could not reset this associate's password."), "error"); }
    finally { setAuthBusy(false); }
  }

  async function copyAssociateCredential() {
    if (!associateCredential) return;
    try {
      await navigator.clipboard.writeText(associateCredential.password);
      setCredentialCopied(true);
    } catch { notify("Could not access the clipboard. Select and copy the password manually.", "error"); }
  }

  async function uploadFiles(chosen: File[]) {
    const limitMessage = uploadLimitMessage(chosen.length);
    if (limitMessage) {
      notify(limitMessage, "error");
      return;
    }
    if (!chosen.length) return;
    if (uploading) {
      notify("An upload is already in progress.", "info");
      return;
    }
    const tooLarge = chosen.filter(file => file.size > 20 * 1024 * 1024);
    const sizeValid = chosen.filter(file => file.size <= 20 * 1024 * 1024);
    if (tooLarge.length) notify(`${tooLarge.map(file => file.name).join(", ")}: each file must be 20 MB or smaller.`, "error");
    const valid: File[] = [];
    const rejectedDocs: Doc[] = [];
    const outcomes: { name: string; ok: boolean; message?: string }[] = [];
    for (const file of sizeValid) {
      if (isSupportedUploadFilename(file.name)) valid.push(file);
      else {
        const reason = "This file type is not supported. Upload a PDF, PNG, JPG, DOCX or EML file.";
        rejectedDocs.push({ id: null, local_key: `rejected-${Date.now()}-${rejectedDocs.length}`, original_filename: file.name, status: "failed", failure_message: reason });
        outcomes.push({ name: file.name, ok: false, message: reason });
      }
    }
    if (!valid.length && !rejectedDocs.length) return;
    setDocSource("latest");
    setRecentBatchIds([]);
    setLocalFailedDocuments([]);
    try { sessionStorage.removeItem("ap-recent-upload-ids"); } catch { /* Browser storage may be disabled. */ }
    setDocuments(rejectedDocs); setDocTotal(rejectedDocs.length); setDocPage(1); setSelectedDoc(null);
    setUploading(true); setUploadProgress(0);
    const batchDocs: Doc[] = [...rejectedDocs];
    for (let index = 0; index < valid.length; index++) {
      const file = valid[index];
      try {
        const body = new FormData(); body.append("file", file);
        const result = await uploadDocumentMutation.mutateAsync({
          formData: body,
          onUploadProgress: (progress: any) => {
            if (progress?.total) {
              setUploadProgress(Math.round(((index + progress.loaded / progress.total) / valid.length) * 100));
            }
          },
        });
        if (result.status === "duplicate_blocked") outcomes.push({ name: file.name, ok: false, message: "Already uploaded (duplicate)" });
        else if (result.status === "failed" || !isValidDocumentId(result.id)) {
          const message = "Something went wrong with this file. Please retry or upload it again.";
          batchDocs.push({ ...result, id: null, local_key: `rejected-${Date.now()}-${index}`, original_filename: result.original_filename || file.name, status: "failed", failure_message: message });
          outcomes.push({ name: result.original_filename || file.name, ok: false, message });
        } else { batchDocs.push(result); outcomes.push({ name: result.original_filename || file.name, ok: true, message: friendlyStatus(result.status || "received") }); }
      } catch (error) { outcomes.push({ name: file.name, ok: false, message: getError(error, "Upload failed") }); }
      setUploadProgress(Math.round(((index + 1) / Math.max(valid.length, 1)) * 100));
    }
    setUploading(false);
    const batchIds = batchDocs.map(doc => doc.id).filter(isValidDocumentId);
    setRecentBatchIds(batchIds);
    try { sessionStorage.setItem("ap-recent-upload-ids", JSON.stringify(batchIds)); } catch { /* Keep the batch in React state for this page session. */ }
    setDocuments(batchDocs); setDocTotal(batchDocs.length); setDocPage(1);
    setLocalFailedDocuments(batchDocs.filter(doc => !isValidDocumentId(doc.id)));
    const successes = outcomes.filter(item => item.ok).length;
    setModalError("");
    setUploadResult({ outcomes, successes, total: valid.length });
  }
  const [uploadResult, setUploadResult] = useState<{ outcomes: { name: string; ok: boolean; message?: string }[]; successes: number; total: number } | null>(null);

  async function checkUnknownVendor(info: UnknownVendorInfo) {
    if (!info.vendorName.trim() && !info.taxId.trim()) return;
    const key = `ap-unknown-vendor:${info.recordType}:${info.recordId}`;
    let alreadyShown = false;
    try { alreadyShown = Boolean(sessionStorage.getItem(key)); } catch { /* Continue without session storage. */ }
    try {
      const response = await axios.get<{ status: string; vendor?: { id: string; name: string }; candidates?: { id: string; name: string }[] }>(`${CORE_URL}/api/vendors/resolve-extracted`, { params: { name: info.vendorName || undefined, tax_id: info.taxId || undefined }, headers: authHeaders() });
      if (response.data.status === "resolved") { setUnknownVendor(current => current?.recordId === info.recordId ? null : current); return; }
      if (alreadyShown) return;
      try { sessionStorage.setItem(key, "shown"); } catch { /* Session storage may be unavailable. */ }
      setUnknownVendor({ ...info, suggestedVendors: response.data.candidates || [] }); setUnknownVendorError("");
    } catch (error) { notify(getError(error, "Could not check the vendor directory.", { conflict: "vendor" }), "error"); }
  }
  async function addUnknownVendor(values: { name: string; tax_id: string }) {
    if (!unknownVendor || !values.name.trim()) return;
    setUnknownVendorBusy(true); setUnknownVendorError("");
    try {
      const info = unknownVendor;
      const created = await addAndResolveVendor({ name: values.name, taxId: values.tax_id, create: async payload => (await axios.post<{ id: string }>(`${CORE_URL}/api/vendors`, payload, { headers: authHeaders() })).data, resolve: async (vendorId, payload) => { await axios.post(`${CORE_URL}/api/vendors/${vendorId}/resolve-extracted`, payload, { headers: authHeaders() }); } });
      setUnknownVendor(null); notify("Vendor added. Matching has been requested.", "success");
      if (info.recordType === "invoice" && info.linkedId) await openInvoice(info.linkedId);
      if ((info.recordType === "purchase_order" || info.recordType === "goods_receipt") && info.linkedId) setProcurementRecordId(info.linkedId);
      await Promise.all([loadDocuments(1), loadInvoices()]);
    } catch (error) { setUnknownVendorError(getError(error, "Could not add or match this vendor.", { conflict: "vendor" })); }
    finally { setUnknownVendorBusy(false); }
  }
  async function selectExistingVendor(vendorId: string) {
    if (!unknownVendor || !vendorId) return;
    setUnknownVendorBusy(true); setUnknownVendorError("");
    try {
      const info = unknownVendor;
      await axios.post(`${CORE_URL}/api/vendors/${vendorId}/resolve-extracted`, { name: info.vendorName, tax_id: info.taxId || null, create_alias: true }, { headers: authHeaders() });
      setUnknownVendor(null); notify("Vendor linked. Matching has been requested.", "success");
      if (info.recordType === "invoice" && info.linkedId) await openInvoice(info.linkedId);
      if ((info.recordType === "purchase_order" || info.recordType === "goods_receipt") && info.linkedId) setProcurementRecordId(info.linkedId);
      await Promise.all([loadDocuments(1), loadInvoices()]);
    } catch (error) { setUnknownVendorError(getError(error, "Could not link this vendor.", { conflict: "vendor" })); }
    finally { setUnknownVendorBusy(false); }
  }

  async function openDocument(doc: Doc) {
    setSelectedDoc(doc); setModalError(""); setDetailLoading(true);
    try {
      if (!isValidDocumentId(doc.id)) return;
      const response = await axios.get<Doc>(`${CORE_URL}/api/documents/${doc.id}`, { headers: authHeaders() });
      const detail = response.data;
      const extracted = detail.extracted_json || {};
      void checkUnknownVendor({ recordId: detail.linked_invoice_id || detail.linked_po_id || detail.linked_gr_id || detail.id!, recordType: detail.linked_invoice_id ? "invoice" : detail.linked_po_id ? "purchase_order" : detail.linked_gr_id ? "goods_receipt" : "document", docType: detail.doc_type, linkedId: detail.linked_invoice_id || detail.linked_po_id || detail.linked_gr_id, sourceDocumentId: detail.id, status: detail.status, vendorName: String(extracted.vendor || extracted.vendor_name || ""), taxId: String(extracted.vendor_tax_id || extracted.tax_id || ""), filename: detail.original_filename });
      const destination = linkedRecordDestination(detail);
      if (destination?.page === "invoices") {
        setSelectedDoc(null);
        setActivePage("invoices");
        await openInvoice(destination.recordId, "details");
        return;
      }
      if (destination?.page === "purchase-orders" || destination?.page === "goods-receipts") {
        setSelectedDoc(null); setProcurementRecordId(destination.recordId); setActivePage(destination.page); return;
      }
      setSelectedDoc(detail);
    } catch (error) { setModalError(getError(error, "Could not load document details.")); }
    finally { setDetailLoading(false); }
  }
  async function openInvoice(invoiceId: string, tab: string = "details") {
    setInvoiceDrawerTab(tab);
    setNoMatchDraft(null); setEmailDraftEditor(null); setEmailDraftOpened(false); setEmailDraftError("");
    try {
      const [detail, candidates] = await Promise.all([
        axios.get<InvoiceDetail>(`${CORE_URL}/api/invoices/${invoiceId}`, { headers: authHeaders() }),
        axios.get<{ candidates: MatchCandidate[] }>(`${CORE_URL}/api/invoices/${invoiceId}/match-candidates`, { headers: authHeaders() }),
      ]);
      setSelectedInvoice(detail.data); setMatchCandidates(candidates.data.candidates || []);
      if (detail.data.status === "rejected") {
        try {
          const drafts = await axios.get<{ items?: NoMatchDraft[] }>(`${CORE_URL}/api/email-drafts`, { params: { invoice: invoiceId, kind: "no_match", status: "draft", page: 1, page_size: 10 }, headers: authHeaders() });
          setNoMatchDraft((drafts.data.items || []).find(item => item.kind === "no_match" && item.status === "draft") || null);
        } catch { setNoMatchDraft(null); }
      }
    } catch (error) { notify(getError(error, "Could not load invoice details."), "error"); }
  }
  async function reviewNoMatchDraft() {
    if (!noMatchDraft) return;
    setEmailDraftError(""); setEmailDraftBusy(true);
    try {
      const response = await axios.get<EmailDraftDetail>(`${CORE_URL}/api/email-drafts/${noMatchDraft.id}`, { headers: authHeaders() });
      setEmailDraftEditor(response.data); setEmailDraftSubject(response.data.subject || ""); setEmailDraftBody(response.data.body || "");
      setEmailDraftRecipient((response.data.to_addresses || []).join(", ")); setEmailDraftOpened(true);
    } catch (error) { setEmailDraftError(getError(error, "Could not open the email draft.")); }
    finally { setEmailDraftBusy(false); }
  }
  async function sendNoMatchDraft() {
    if (!emailDraftEditor || !emailDraftOpened) return;
    setEmailDraftBusy(true); setEmailDraftError("");
    try {
      await axios.patch(`${CORE_URL}/api/email-drafts/${emailDraftEditor.id}`, {
        subject: emailDraftSubject, body: emailDraftBody,
        to_addresses: emailDraftRecipient.split(",").map(value => value.trim()).filter(Boolean),
        cc_addresses: emailDraftEditor.cc_addresses || [],
      }, { headers: authHeaders() });
      const response = await axios.post<{ sent?: boolean; message?: string }>(`${CORE_URL}/api/email-drafts/${emailDraftEditor.id}/send`, { reason: "No match notification reviewed by associate" }, { headers: authHeaders() });
      if (!response.data.sent) { setEmailDraftError(response.data.message || "The email was not sent."); return; }
      notify("Email sent.", "success"); setEmailDraftEditor(null); setNoMatchDraft(null); setSelectedInvoice(null);
      await loadInvoices();
    } catch (error) { setEmailDraftError(getError(error, "Could not send the email.")); }
    finally { setEmailDraftBusy(false); }
  }
  async function submitInvoiceDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!decision) return;
    try {
      const endpoint = decision.action === "approve"
        ? `${CORE_URL}/api/invoices/${decision.invoiceId}/approve`
        : `${CORE_URL}/api/invoices/${decision.invoiceId}/${decision.action}`;
      const payload = decision.action === "approve"
        ? { comment: decision.reason || "Approved by reviewer" }
        : { reason: decision.reason, ...(decision.expectedMatchRunId ? { expected_match_run_id: decision.expectedMatchRunId } : {}), ...(decision.expectedUpdatedAt ? { expected_updated_at: decision.expectedUpdatedAt } : {}) };
      await invoiceDecisionMutation.mutateAsync({ invoiceId: decision.invoiceId, action: decision.action, payload });
      notify("Invoice decision saved.", "success"); setDecision(null); setSelectedInvoice(null); await loadInvoices();
    } catch (error) { notify(getError(error, "Could not save the invoice decision."), "error"); }
  }
  async function confirmSuggestedMatch(candidate: MatchCandidate, accept: boolean) {
    if (!selectedInvoice) return;
    try {
      if (accept) {
        await invoiceMatchMutation.mutateAsync({ invoiceId: selectedInvoice.invoice_id, poId: candidate.po_id });
      } else {
        await invoiceMatchRejectMutation.mutateAsync({ invoiceId: selectedInvoice.invoice_id, poId: candidate.po_id });
      }
      await openInvoice(selectedInvoice.invoice_id); await loadInvoices();
    } catch (error) { notify(getError(error, "Could not update the suggested match."), "error"); }
  }
  function closeFilePreview() {
    filePreviewRequestId.current += 1;
    setFilePreview(null);
    setPreviewZoom(1);
    setPreviewRotation(0);
    setPreviewFullscreen(false);
  }
  async function openOriginalFile(doc: Doc) {
    if (!isValidDocumentId(doc.id)) return;
    const viewerMode = sourceFileViewerMode(doc.original_filename);
    if (viewerMode === "unsupported") {
      notify("This file cannot be previewed in the browser. Use Download to open it.", "info");
      return;
    }
    const isDocx = viewerMode === "extracted-preview";
    const requestId = ++filePreviewRequestId.current;
    setPreviewZoom(1);
    setPreviewRotation(0);
    setPreviewFullscreen(false);
    setFilePreview({ kind: "loading", filename: doc.original_filename });
    try {
      const response = await axios.get<Blob>(`${CORE_URL}/api/documents/${doc.id}/${isDocx ? "preview" : "file"}`, {
        ...(isDocx ? {} : { params: { disposition: "inline" } }), headers: authHeaders(), responseType: "blob",
      });
      const mime = isDocx ? "application/pdf" : sourceFilePreviewMime(doc.original_filename);
      if (!mime) {
        setFilePreview(null);
        notify("This file cannot be previewed in the browser. Use Download to open it.", "info");
        return;
      }
      const url = URL.createObjectURL(new Blob([response.data], { type: mime }));
      if (requestId !== filePreviewRequestId.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setFilePreview({ kind: "binary", url, mime, filename: doc.original_filename });
    } catch (error) {
      if (requestId === filePreviewRequestId.current) {
        if (isDocx) {
          setFilePreview({ kind: "docx", filename: doc.original_filename, document: doc, fallback: true });
        } else {
          setFilePreview(null);
          notify(getError(error, "Could not open the original file."), "error");
        }
      }
    }
  }
  async function downloadOriginalFile(doc: Doc) {
    if (!isValidDocumentId(doc.id)) return;
    try {
      const response = await axios.get<Blob>(`${CORE_URL}/api/documents/${doc.id}/file`, {
        params: { disposition: "attachment" }, headers: authHeaders(), responseType: "blob",
      });
      const contentType = response.headers["content-type"];
      const mime = (typeof contentType === "string" ? contentType : "") || response.data.type || "application/octet-stream";
      const url = URL.createObjectURL(new Blob([response.data], { type: mime }));
      const link = document.createElement("a");
      link.href = url; link.download = doc.original_filename; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { notify(getError(error, "Could not download the original file."), "error"); }
  }
  async function openOriginalSource(sourceDocumentId: string | null | undefined, download = false) {
    if (!isValidDocumentId(sourceDocumentId)) return;
    try {
      const response = await axios.get<Doc>(`${CORE_URL}/api/documents/${sourceDocumentId}`, { headers: authHeaders() });
      const source = { ...response.data, id: sourceDocumentId };
      if (download) await downloadOriginalFile(source);
      else await openOriginalFile(source);
    } catch (error) { notify(getError(error, "Could not open the original file."), "error"); }
  }
  async function retryDocument(doc: Doc) {
    if (!isValidDocumentId(doc.id)) return;
    try {
      setDetailLoading(true);
      const endpoint = doc.status === "received" ? "parse" : "retry";
      await retryDocumentMutation.mutateAsync({ docId: doc.id, endpoint });
      notify("Reprocessing has been requested. The status will update when the backend finishes.", "success");
      await loadDocuments(1);
    } catch (error) { notify(getError(error, "Could not retry document processing."), "error"); }
    finally { setDetailLoading(false); }
  }
  async function reprocessAllDocuments() {
    if (profile?.role !== "admin" || bulkReprocessBusy) return;
    if (!window.confirm("Reprocess up to five eligible documents at a time? This will run the current processing code on documents marked for review or retry.")) return;
    setBulkReprocessBusy(true);
    setBulkReprocessProgress({ done: 0, total: 0, failed: 0 });
    let done = 0;
    let total = 0;
    let failed = 0;
    try {
      while (true) {
        const batch = await reprocessAllMutation.mutateAsync();
        done += batch.completed;
        failed += batch.failed;
        total = Math.max(total, done + batch.remaining);
        setBulkReprocessProgress({ done, total, failed });
        await loadDocuments(1);
        if (batch.remaining <= 0 || batch.scanned === 0) break;
      }
      notify(`Reprocessing finished: ${done} documents handled, ${failed} failed.`, failed ? "error" : "success");
    } catch (error) {
      notify(getError(error, "Could not reprocess the documents."), "error");
    } finally {
      setBulkReprocessBusy(false);
    }
  }
  async function reprocessSelectedDocuments() {
    if (selectedDocIds.size === 0) {
      notify("Select one or more documents using the checkboxes to process.", "info");
      return;
    }
    const docs = documents.filter(d => Boolean(d.id && selectedDocIds.has(d.id)));
    if (!docs.length) return;
    setBulkReprocessBusy(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const doc of docs) {
        try {
          const endpoint = doc.status === "received" ? "parse" : "retry";
          await axios.post(`${CORE_URL}/api/documents/${doc.id}/${endpoint}`, {}, { headers: authHeaders() });
          successCount++;
        } catch {
          failCount++;
        }
      }
      notify(`Processing started for ${successCount} document(s)${failCount ? `, ${failCount} failed` : ""}.`, failCount ? "info" : "success");
      setSelectedDocIds(new Set());
      await loadDocuments(docPage);
    } catch (error) {
      notify(getError(error, "Could not process selected documents."), "error");
    } finally {
      setBulkReprocessBusy(false);
    }
  }
  async function pollEmailNow() {
    setEmailBusy(true);
    try {
      const response = await axios.post<Record<string, unknown>>(`${CORE_URL}/api/email/poll`, {}, { headers: authHeaders() });
      const summary = response.data;
      notify(`Email poll complete. ${Number(summary.new_documents || 0)} new documents, ${Number(summary.failed || 0)} failed.`, Number(summary.failed || 0) ? "error" : "success");
      await Promise.all([loadEmailInbox(), loadDocuments(1), loadInvoices()]);
    } catch (error) { notify(getError(error, "Could not poll the email inbox."), "error"); }
    finally { setEmailBusy(false); }
  }
  async function retryEmailMessage(message: EmailMessageItem) {
    setEmailBusy(true);
    try {
      await axios.post(`${CORE_URL}/api/email/messages/${message.id}/retry`, {}, { headers: authHeaders() });
      notify("Email retry queued.", "success"); await loadEmailInbox();
    } catch (error) { notify(getError(error, "Could not retry this email."), "error"); }
    finally { setEmailBusy(false); }
  }


  const filteredDocs = useMemo(() => documents.filter(doc => {
    const q = docSearch.trim().toLowerCase();
    const actualType = String(doc.doc_type || (doc.extracted_json?.document_type as string | undefined) || "").toLowerCase();
    const isPoOrGr = ["po", "purchase_order", "goods_receipt", "gr"].includes(actualType);
    if (docSource === "latest" && !isPoOrGr) return false;
    const matchesSearch = !q || [doc.original_filename, doc.id, actualType, doc.email_sender].some(value => String(value || "").toLowerCase().includes(q));
    const matchesType = docType === "all" || actualType === docType;
    const matchesStatus = docStatus === "all" || (docStatus === "processing" ? isDocumentProcessing(doc) : docStatus === "ready" ? ["parsed", "extracted", "processed"].includes(doc.status.toLowerCase()) : doc.status === docStatus);
    return matchesSearch && matchesType && matchesStatus;
  }), [documents, docSearch, docType, docStatus, docSource]);

  function handleDocumentCardClick(doc: Doc) {
    const actualType = String(
      doc.doc_type || (doc.extracted_json?.document_type as string | undefined) || ""
    ).toLowerCase();
    if (["po", "purchase_order"].includes(actualType)) {
      setProcurementRecordId(doc.id || null);
      setActivePage("purchase-orders");
      void navigate({ to: "/purchase-orders" });
      return;
    }
    if (["goods_receipt", "gr"].includes(actualType)) {
      setProcurementRecordId(doc.id || null);
      setActivePage("goods-receipts");
      void navigate({ to: "/goods-receipts" });
      return;
    }
    void openDocument(doc);
  }
  const docCounts = useMemo(() => ({ processing: documents.filter(isDocumentProcessing).length, completed: documents.filter(d => ["extracted", "processed", "match_approved", "approved"].includes(d.status)).length, attention: documents.filter(d => ["failed", "needs_data_review", "needs_vendor_review", "incomplete", "match_issues"].includes(d.status)).length }), [documents]);

  function navigateTo(page: WorkspacePage) {
    if (page !== activePage) {
      setPageHistory(h => [...h, activePage]);
    }
    void navigate({ to: getPathnameForPage(page) });
    setMobileNavOpen(false);
    if (
      page === "invoices" &&
      activePage !== "invoices" &&
      invoiceQuery.status &&
      !invoiceStatuses.includes(invoiceQuery.status as InvoiceItem["status"])
    ) {
      updateInvoiceQuery({ status: "" });
    }
  }

  function goBack() {
    if (pageHistory.length > 0) {
      const prev = pageHistory[pageHistory.length - 1];
      setPageHistory(h => h.slice(0, -1));
      void navigate({ to: getPathnameForPage(prev) });
    } else {
      router.history.back();
    }
  }

  async function checkProcurementVendor(kind: "purchase_order" | "goods_receipt", row: { id: string; source_document_id?: string | null; vendor_name?: string | null }, purchaseOrder?: { vendor_name?: string | null }) {
    let source: Doc | null = null;
    if (row.source_document_id && isValidDocumentId(row.source_document_id)) {
      try { source = (await axios.get<Doc>(`${CORE_URL}/api/documents/${row.source_document_id}`, { headers: authHeaders() })).data; } catch { /* Keep the procurement drawer usable without source details. */ }
    }
    const extracted = source?.extracted_json || {};
    void checkUnknownVendor({ recordId: row.id, recordType: kind, linkedId: row.id, linkedPoId: kind === "goods_receipt" ? (purchaseOrder as { id?: string } | undefined)?.id : undefined, sourceDocumentId: row.source_document_id, docType: source?.doc_type, status: source?.status, vendorName: String(extracted.vendor || extracted.vendor_name || row.vendor_name || purchaseOrder?.vendor_name || ""), taxId: String(extracted.vendor_tax_id || extracted.tax_id || ""), filename: source?.original_filename || "" });
  }

  if (restoring && !token) return <main className="session-screen"><Loader title="Restoring secure session" subtitle="Checking your sign-in session..." /></main>;
  if (!token) return <main className="auth-shell page-enter">
    <section className="auth-hero"><div className="brand brand-light"><span className="brand-mark">G</span><span>GENWORX<small>FINANCE AUTOMATION</small></span></div><div className="hero-copy"><span className="eyebrow">ACCOUNTS PAYABLE WORKSPACE</span><h1>Clarity for every<br /><em>invoice and document.</em></h1><p>Bring your documents together, track invoice progress, and spot issues without losing sight of the source evidence.</p><div className="hero-points"><span><Check {...iconProps}/> Secure workspace</span><span><Check {...iconProps}/> Clear processing status</span><span><Check {...iconProps}/> Human-reviewed decisions</span></div></div><div className="hero-orbit"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-file"><FileText {...iconProps}/></div><span className="orbit-dot dot-one"/><span className="orbit-dot dot-two"/><span className="orbit-dot dot-three"/></div></section>
    <section className="auth-side"><form className="auth-card" onSubmit={submitAuth}><span className="eyebrow purple">WELCOME TO GENWORX</span><h2>Sign in to your workspace</h2><p className="muted">Use the work email and password provided by your administrator.</p>
      <label className="form-label">Work email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" /></label>
      <label className="form-label">Password<span className="password-control"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} minLength={1} required placeholder="Enter your password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button></span></label>
      {loginError && <div className="login-error" role="alert">{loginError}</div>}
      <button className="primary full" disabled={authBusy}>{authBusy ? <><span className="mini-spin"/> Please wait...</> : <>Sign in <ArrowRight {...iconProps}/></>}</button>
      <p className="security-note"><span>•</span> Your session is handled securely by GenWorx Auth.</p></form></section>
  </main>;

  if (profileLoading) return <main className="session-screen"><Loader title="Loading your workspace" subtitle="Checking your account permissions..." /></main>;
  if (mustChangePassword) return <main className="session-screen page-enter"><form className="auth-card" onSubmit={submitPasswordChange}><span className="eyebrow purple">SECURE YOUR ACCOUNT</span><h2>Change your temporary password</h2><p className="muted">Your administrator issued a temporary password. Set a new password before continuing. Use at least 12 characters with an uppercase letter, lowercase letter, number, and symbol.</p>{profile?.temp_password_expires_at && <p className="muted">Temporary password expires {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(profile.temp_password_expires_at))}.</p>}<label className="form-label">Temporary password<span className="password-control"><input type={showCurrentPassword ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /><button type="button" aria-label={showCurrentPassword ? "Hide temporary password" : "Show temporary password"} onClick={() => setShowCurrentPassword(value => !value)}>{showCurrentPassword ? "Hide" : "Show"}</button></span></label><label className="form-label">New password<span className="password-control"><input type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={12} maxLength={128} required /><button type="button" aria-label={showNewPassword ? "Hide new password" : "Show new password"} onClick={() => setShowNewPassword(value => !value)}>{showNewPassword ? "Hide" : "Show"}</button></span></label><label className="form-label">Confirm new password<span className="password-control"><input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={12} maxLength={128} required /><button type="button" aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"} onClick={() => setShowConfirmPassword(value => !value)}>{showConfirmPassword ? "Hide" : "Show"}</button></span></label><button className="primary full" disabled={authBusy}>{authBusy ? "Saving..." : "Change password and continue"}</button><button className="secondary full" type="button" onClick={() => void logout()} disabled={authBusy}>Sign out</button></form></main>;

  return <div className="app-shell">
    <Sidebar
      activePage={activePage}
      isAdmin={profile?.role === "admin"}
      canAccessVendors={true}
      documentCount={docTotal}
      invoiceCount={Object.values(invoiceCounts).reduce((sum, count) => sum + count, 0)}
      emailAttentionCount={emailStatus?.counts?.needs_attention || 0}
      name={profile?.name || email || "Workspace user"}
      email={email}
      mobileOpen={mobileNavOpen}
      onMobileClose={() => setMobileNavOpen(false)}
      onNavigate={page => {
        navigateTo(page);
      }}
      onSignOut={() => void logout()}
      signOutDisabled={authBusy}
    />
    <main className="main-area">
      <input
        ref={documentFileInputRef}
        id="document-upload-input"
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.docx,.eml"
        style={{ display: "none" }}
        onChange={event => {
          const files = Array.from(event.target.files || []);
          if (files.length) void uploadFiles(files);
          event.target.value = "";
        }}
        disabled={uploading}
      />
      <header className="topbar">
      <button className="topbar-nav-toggle" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(value => !value)}><Menu {...iconProps}/></button>
      {activePage !== "dashboard" && (
        <button
          type="button"
          className="topbar-back-btn"
          onClick={goBack}
          title="Go back to previous page"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
      )}
      <div className="topbar-title"><span className="muted">Workspace</span><span className="breadcrumb-separator">/</span><b>{activePage === "logs" ? "Logs" : activePage === "associates" && profile?.role === "admin" ? "Associates" : activePage === "invoices" ? "Invoices" : activePage === "purchase-orders" ? "Purchase Orders" : activePage === "goods-receipts" ? "Goods Receipts" : activePage === "vendors" ? "Vendors" : activePage === "documents" ? "Documents" : activePage === "email" ? "Email inbox" : "Dashboard"}</b></div>{activePage !== "logs" && <label className="topbar-search"><Search {...iconProps}/><input value={globalSearch} onChange={event => { setGlobalSearch(event.target.value); updateInvoiceQuery({ search: event.target.value }); }} placeholder="Search invoices or documents" aria-label="Search invoices or documents" /></label>}<div className="topbar-user-wrapper" ref={userMenuRef}>
  <button
    type="button"
    className={`topbar-user topbar-user-avatar-only ${userMenuOpen ? "topbar-user-open" : ""}`}
    aria-label={`Signed in as ${email}`}
    aria-expanded={userMenuOpen}
    onClick={() => setUserMenuOpen(value => !value)}
    title={`Account (${profile?.name || email})`}
  >
    <span className="avatar">A</span>
  </button>
  {userMenuOpen && (
    <div className="topbar-user-dropdown" role="menu">
      <div className="topbar-dropdown-user-info">
        <span className="avatar large">A</span>
        <div className="topbar-dropdown-user-meta">
          <strong>{profile?.name || "Workspace user"}</strong>
          <small>{email}</small>
          <span className="role-tag">{profile?.role === "admin" ? "Administrator" : "Finance Associate"}</span>
        </div>
      </div>
      <div className="topbar-dropdown-divider" />
      <button
        type="button"
        className="topbar-dropdown-action signout-action"
        onClick={() => {
          setUserMenuOpen(false);
          void logout();
        }}
        disabled={authBusy}
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </button>
    </div>
  )}
</div></header>
      <div className="content">
      {activePage === "logs" ? canAccessLogs(profile?.role) ? <LogsPage coreUrl={CORE_URL} authHeaders={authHeaders} vendors={filterVendors} owners={filterOwners} userNames={{ ...Object.fromEntries(associates.map(user => [user.id, user.name])), ...(readAccessClaims(token)?.sub ? { [readAccessClaims(token)!.sub]: profile?.name || profile?.email || "Admin" } : {}) }} onOpenInvoice={id => { setActivePage("invoices"); void openInvoice(id); }}/> : <section className="panel"><p>You do not have access</p></section> : activePage === "email" ? <EmailInboxWorkspace coreUrl={CORE_URL} authHeaders={authHeaders} notify={notify} status={emailStatus} messages={emailMessages} total={emailTotal} filter={emailFilter} onFilter={value => { setEmailPage(0); setEmailFilter(value); }} reason={emailReasonFilter} onReason={value => { setEmailPage(0); setEmailReasonFilter(value); }} page={emailPage} loading={emailLoading} busy={emailBusy} error={emailError} onPoll={() => void pollEmailNow()} onRetry={message => void retryEmailMessage(message)} onRefresh={() => void loadEmailInbox()} onPage={setEmailPage} onOpenDocument={id => { const doc = documents.find(item => item.id === id); if (doc) void openDocument(doc); else { setDocSource("email"); setActivePage("documents"); } }} onOpenInvoice={id => { setActivePage("invoices"); const found = invoices.find(invoice => invoice.invoice_id === id); if (found) void openInvoice(id); }} /> : activePage === "invoices" ? <InvoicesWorkspacePage invoices={invoices} counts={invoiceCounts} total={invoiceTotal} page={invoiceQuery.page} filters={invoiceQuery} vendors={filterVendors} owners={filterOwners} source={invoiceSource} loading={invoiceLoading} error={invoiceError} onFilter={patch => updateInvoiceQuery(patch)} onVendorSearch={searchFilterVendors} onSource={value => setInvoiceSource(value)} onPage={page => updateInvoiceQuery({ page }, false)} onRefresh={() => void loadInvoices()} onOpen={invoice => void openInvoice(invoice.invoice_id)} onOpenDocument={id => { setActivePage("documents"); const doc = documents.find(item => item.id === id); if (doc) void openDocument(doc); }} /> : activePage === "purchase-orders" || activePage === "goods-receipts" ? <ProcurementWorkspacePage key={activePage} kind={activePage === "purchase-orders" ? "purchase_order" : "goods_receipt"} coreUrl={CORE_URL} authHeaders={authHeaders} onOpenInvoice={id => { setActivePage("invoices"); void openInvoice(id); }} onOpenPurchaseOrder={id => { setActivePage("purchase-orders"); setProcurementRecordId(id); }} onViewOriginal={id => void openOriginalSource(id)} onDownloadOriginal={id => void openOriginalSource(id, true)} onCheckVendor={(kind, row, po) => void checkProcurementVendor(kind, row, po)} invoices={invoices} openRecordId={procurementRecordId} onRecordOpened={() => setProcurementRecordId(null)} vendorNotice={unknownVendor?.recordType === (activePage === "purchase-orders" ? "purchase_order" : "goods_receipt") ? unknownVendor : null} vendorVendors={filterVendors} canAddVendor={canCreateVendor(profile?.role)} vendorBusy={unknownVendorBusy} vendorError={unknownVendorError} onAddVendor={() => { if (unknownVendor) setUnknownVendor(unknownVendor); }} onSelectVendor={vendorId => void selectExistingVendor(vendorId)} /> : activePage === "vendors" ? <VendorsPage coreUrl={CORE_URL} authHeaders={authHeaders} isAdmin={profile?.role === "admin"} canCreateVendor={canCreateVendor(profile?.role)} /> : activePage === "associates" && profile?.role === "admin" ? <>
        <header className="welcome">
          <div>
            <span className="eyebrow purple">USER MANAGEMENT</span>
            <h1>Associates</h1>
          </div>
          <div className="toolbar">
            <button className="secondary" onClick={() => void loadAssociates()} disabled={associatesLoading}>
              <RefreshCw size={14} /> Refresh list
            </button>
          </div>
        </header>
        <section className="panel admin-associate-panel scroll-reveal">
          <div className="panel-head">
            <div>
              <span className="eyebrow purple">TEAM ACCESS</span>
              <h2>Add an associate</h2>
            </div>
          </div>
          <form className="associate-form-grid" onSubmit={createAssociate}>
            <div className="assoc-form-field">
              <label className="assoc-field-label">Name *</label>
              <input
                className="assoc-field-input"
                value={associateName}
                onChange={e => setAssociateName(e.target.value)}
                minLength={2}
                maxLength={150}
                required
                placeholder="Full name"
              />
            </div>
            <div className="assoc-form-field">
              <label className="assoc-field-label">Email *</label>
              <input
                type="email"
                className="assoc-field-input"
                value={associateEmail}
                onChange={e => setAssociateEmail(e.target.value)}
                required
                placeholder="associate@genworx.com"
              />
            </div>
            <div className="assoc-form-field">
              <label className="assoc-field-label">Temporary password <small>(optional)</small></label>
              <input
                type="password"
                className="assoc-field-input"
                value={temporaryPassword}
                onChange={e => setTemporaryPassword(e.target.value)}
                minLength={12}
                maxLength={128}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div className="assoc-form-btn-wrap">
              <button className="primary assoc-submit-btn" disabled={authBusy}>
                <UserPlus size={15} />
                <span>{authBusy ? "Creating..." : "Add associate"}</span>
              </button>
            </div>
          </form>
        </section>
        <section className="panel scroll-reveal">
          <div className="panel-head">
            <div>
              <h2>Active Associates</h2>
            </div>
            <span className="count-pill">{associates.filter(item => item.is_active).length} members</span>
          </div>
          {associatesError && <div className="notice error">{associatesError}<button onClick={() => void loadAssociates()}>Try again</button></div>}
          {associatesLoading ? <LoadingPanel title="Loading associates" subtitle="Retrieving active accounts..."/> : associates.filter(item => item.is_active).length ? <div className="table-wrap scroll-reveal"><table className="associates-table"><thead><tr><th>Name</th><th>Email</th><th>Added</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead><tbody>{associates.filter(item => item.is_active).map(associate => <tr key={associate.id}><td><div className="associate-user-cell"><span className="associate-avatar">{(associate.name || "A").slice(0, 1).toUpperCase()}</span><strong>{associate.name}</strong></div></td><td><span className="associate-email-cell"><Mail size={13} /> {associate.email}</span></td><td>{dateLabel(associate.created_at)}</td><td className="associate-actions"><div className="table-action-group"><button className="secondary small-btn" onClick={() => void resetAssociatePassword(associate)} disabled={authBusy}>Reset password</button><button className="secondary small-btn danger-btn" onClick={() => void removeAssociate(associate)} disabled={authBusy}>Remove access</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No associates yet" description="Add an associate using the form above."/>}
        </section>
      </> : activePage === "dashboard" ? <DashboardWorkspace invoices={invoices} counts={invoiceCounts} loading={invoiceLoading} error={invoiceError} search={globalSearch} emailStatus={emailStatus} onEmail={() => navigateTo("email")} onPollEmail={() => void pollEmailNow()} onOpen={invoice => void openInvoice(invoice.invoice_id)} onInvoices={() => navigateTo("invoices")} onDocuments={triggerDocumentUpload} onRefresh={() => void loadInvoices()} /> : <>
        <header className="welcome"><div><span className="eyebrow purple">FINANCE OPERATIONS</span><h1>Documents</h1></div><button type="button" className={`primary upload ${uploading ? "disabled" : ""}`} onClick={() => documentFileInputRef.current?.click()} disabled={uploading}><span>＋</span> {uploading ? "Uploading…" : "Upload documents"}</button></header>
        {uploading && <div className="compact-upload-progress panel">
          <div className="compact-upload-status"><DocumentLoader/><span>Uploading documents... {uploadProgress}%</span></div>
          <div className="progress-track"><span style={{ width: `${uploadProgress}%` }}/></div>
        </div>}
        <section className={`panel simple-documents ${isDraggingDocuments ? "is-dragging" : ""}`} onDragOver={event => { event.preventDefault(); setIsDraggingDocuments(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingDocuments(false); }} onDrop={event => { event.preventDefault(); setIsDraggingDocuments(false); void uploadFiles(Array.from(event.dataTransfer.files)); }}>
          <div className="document-drop-hint" aria-live="polite">Drop up to 5 files here, or use Upload documents.</div>
          <div className="panel-head"><div><h2>Your documents</h2></div><div className="panel-head-actions">{profile?.role === "admin" && (
            <div className="process-split-wrapper" ref={processMenuRef}>
              <button
                type="button"
                className="secondary process-split-main-btn"
                disabled={bulkReprocessBusy}
                onClick={() => {
                  if (selectedDocIds.size > 0) {
                    void reprocessSelectedDocuments();
                  } else {
                    setProcessMenuOpen(o => !o);
                  }
                }}
                title={selectedDocIds.size > 0 ? `Process ${selectedDocIds.size} selected document(s)` : "Process options"}
              >
                <Sparkles size={14} />
                <span>
                  {bulkReprocessBusy
                    ? "Processing..."
                    : selectedDocIds.size > 0
                    ? `Process Selected (${selectedDocIds.size})`
                    : "Process ▾"}
                </span>
              </button>
              <button
                type="button"
                className="secondary process-split-arrow-btn"
                disabled={bulkReprocessBusy}
                aria-label="Process options menu"
                onClick={() => setProcessMenuOpen(o => !o)}
              >
                <ChevronDown size={14} />
              </button>
              {processMenuOpen && (
                <div className="process-dropdown-menu" role="menu">
                  <button
                    type="button"
                    className="process-dropdown-item"
                    disabled={selectedDocIds.size === 0 || bulkReprocessBusy}
                    onClick={() => {
                      setProcessMenuOpen(false);
                      void reprocessSelectedDocuments();
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <div>
                      <strong>Process Selected</strong>
                      <small>
                        {selectedDocIds.size > 0
                          ? `${selectedDocIds.size} document(s) checked`
                          : "Select documents using card checkboxes"}
                      </small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="process-dropdown-item"
                    disabled={bulkReprocessBusy}
                    onClick={() => {
                      setProcessMenuOpen(false);
                      void reprocessAllDocuments();
                    }}
                  >
                    <Layers size={15} />
                    <div>
                      <strong>Process All</strong>
                      <small>Reprocess all eligible documents</small>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}<span className="count">{docTotal} files</span></div></div>
          {bulkReprocessProgress && <div className="notice info" role="status">{bulkReprocessBusy ? "Reprocessing" : "Reprocessed"} {bulkReprocessProgress.done} of {bulkReprocessProgress.total} documents{bulkReprocessProgress.failed ? ` · ${bulkReprocessProgress.failed} failed` : ""}</div>}
          <div className="toolbar simple-toolbar">
            <label className="search"><Search {...iconProps}/><input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search documents..." /></label>
            <select value={docSource} onChange={e => { setDocPage(1); setDocSource(e.target.value as "latest" | "all" | "email"); }} aria-label="Filter documents by source"><option value="latest">Latest upload</option><option value="email">Email</option><option value="all">All</option></select>
            <select value={docType} onChange={e => { setDocPage(1); setDocType(e.target.value); }} aria-label="Filter by document type"><option value="all">All types</option><option value="invoice">Invoices</option><option value="po">Purchase orders</option><option value="goods_receipt">Goods receipts</option><option value="other">Other</option></select>
            <select value={docStatus} onChange={e => { setDocPage(1); setDocStatus(e.target.value); }} aria-label="Filter by document status"><option value="all">All statuses</option><option value="processing">Processing</option><option value="ready">Ready</option><option value="failed">Failed</option><option value="ignored">Ignored</option></select>
            {filteredDocs.length > 0 && (
              <button
                type="button"
                className="secondary select-all-docs-btn"
                title={selectedDocIds.size === filteredDocs.filter(d => Boolean(d.id)).length ? "Deselect all" : "Select all documents on this page"}
                onClick={() => {
                  const validIds = filteredDocs.map(d => d.id).filter((id): id is string => Boolean(id));
                  if (selectedDocIds.size === validIds.length) {
                    setSelectedDocIds(new Set());
                  } else {
                    setSelectedDocIds(new Set(validIds));
                  }
                }}
              >
                {selectedDocIds.size > 0 && selectedDocIds.size === filteredDocs.filter(d => Boolean(d.id)).length ? "Deselect all" : `Select all (${filteredDocs.filter(d => Boolean(d.id)).length})`}
              </button>
            )}
            <button className="icon-button" onClick={() => void loadDocuments(docPage)} disabled={docLoading} aria-label="Refresh documents"><RefreshCw {...iconProps}/></button>
          </div>
          {docError && <div className="notice error">{docError}<button onClick={() => void loadDocuments(docPage)}>Try again</button></div>}
          {docLoading ? <LoadingPanel title="Loading documents" subtitle="Syncing your latest uploads..."/> : filteredDocs.length ? <>
            <div className="document-card-grid">{filteredDocs.map((doc, index) => { const actionState = documentActionAvailability(doc.id || ""); const docId = doc.id; return <article role="button" aria-label={`Open ${doc.original_filename}`} tabIndex={0} className={`document-card ${Boolean(docId && selectedDocIds.has(docId)) ? "doc-card-selected" : ""}`} key={doc.id || doc.local_key || `${doc.original_filename}-${index}`} style={{ "--row-index": index } as React.CSSProperties} onClick={() => void handleDocumentCardClick(doc)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); void handleDocumentCardClick(doc); } }}>
              <div className="document-card-heading">
                {docId && (
                  <input
                    type="checkbox"
                    className="doc-card-checkbox"
                    aria-label={`Select ${doc.original_filename}`}
                    checked={selectedDocIds.has(docId)}
                    onChange={e => {
                      e.stopPropagation();
                      const next = new Set(selectedDocIds);
                      if (next.has(docId)) next.delete(docId);
                      else next.add(docId);
                      setSelectedDocIds(next);
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                )}
                <FileTypeIcon filename={doc.original_filename}/>
                <strong title={doc.original_filename}>{doc.original_filename}</strong>
              </div>
              <div className="document-card-status"><span className={`pill ${statusClass(isDocumentProcessing(doc) ? "processing" : doc.status)}`}><i/>{documentStatusLabel(doc, friendlyStatus)}</span>
                {doc.status === "failed" && !isRetryScheduled(doc) && doc.failure_class !== "permanent" && <button type="button" className="document-retry" aria-label={`Retry ${doc.original_filename}`} title={actionState.title || "Retry processing"} onClick={event => { event.stopPropagation(); void retryDocument(doc); }} disabled={detailLoading || uploading || actionState.disabled}><RetryIcon/></button>}
              </div>
              <span className="document-card-reason" title={isDocumentProcessing(doc) ? undefined : (doc.failure_message || undefined)}>{isDocumentProcessing(doc) ? "Processing. Status refreshes automatically." : doc.failure_message || (doc.status === "failed" ? "Processing failed." : "Open document details.")}</span>{doc.status === "needs_vendor_review" && <button type="button" className="text-link" onClick={event => { event.stopPropagation(); void openDocument(doc); }}>Add vendor</button>}
            </article>; })}</div>
            <Pagination page={docPage} total={docTotal} pageSize={50} loading={docLoading} onChange={next => { setDocPage(next); void loadDocuments(next); }}/>
          </> : <EmptyState title={docSearch || docType !== "all" || docStatus !== "all" ? "No matching documents" : "Upload up to 5 bills to get started"} description={docSearch || docType !== "all" || docStatus !== "all" ? "Try changing your search or filters." : "Choose files above to upload your first document."} action={(docSearch || docType !== "all" || docStatus !== "all") ? <button className="secondary" onClick={() => { setDocSearch(""); setDocType("all"); setDocStatus("all"); }}>Clear filters</button> : null}/>}
        </section>
      </>}
      <footer className="footer" />
      </div>
    </main>
    {toast && <div className={`toast ${toast.kind}`} role="status"><span className="toast-symbol">{toast.kind === "success" ? <CircleCheck {...iconProps}/> : toast.kind === "error" ? <CircleAlert {...iconProps}/> : <CircleHelp {...iconProps}/>}</span><span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X {...iconProps}/></button></div>}
    {unknownVendor && <UnknownVendorPrompt info={unknownVendor} vendors={filterVendors} canAddVendor={canCreateVendor(profile?.role)} busy={unknownVendorBusy} error={unknownVendorError} onAdd={values => void addUnknownVendor(values)} onSelectExisting={vendorId => void selectExistingVendor(vendorId)} onClose={() => setUnknownVendor(null)}/>}
    {associateCredential && <div className="modal-backdrop credential-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAssociateCredential(null); }}><section className="modal credential-modal" role="dialog" aria-modal="true" aria-labelledby="credential-title"><header className="modal-head"><div><span className="eyebrow purple">TEMPORARY CREDENTIAL</span><h2 id="credential-title">Share with {associateCredential.email}</h2><p className="muted">This password is shown once. The associate must set a new password at sign in.</p></div><button className="modal-close" aria-label="Close" onClick={() => setAssociateCredential(null)}><X {...iconProps}/></button></header><div className="modal-body"><label className="form-label">Temporary password<input className="credential-value" readOnly value={associateCredential.password} onFocus={event => event.currentTarget.select()} /></label><p className="muted">Expires {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(associateCredential.expiresAt))}.</p><div className="modal-actions"><button className="secondary" onClick={() => setAssociateCredential(null)}>Close</button><button className="primary" onClick={() => void copyAssociateCredential()}>{credentialCopied ? "Copied" : "Copy password"}</button></div></div></section></div>}
    {selectedDoc && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedDoc(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><header className="modal-head modal-head-with-back"><button type="button" className="drawer-back-btn modal-back-btn" onClick={() => setSelectedDoc(null)} title="Back to documents"><ArrowLeft size={15} /><span>Back</span></button><div><span className="eyebrow purple">RECORD DETAILS</span><h2 id="detail-title">{selectedDoc.original_filename}</h2></div><button className="modal-close" aria-label="Close details" onClick={() => setSelectedDoc(null)}><X {...iconProps}/></button></header>
      {detailLoading ? <LoadingPanel title="Opening record" subtitle="Fetching the latest information..."/> : modalError && <div className="notice error">{modalError}</div>}
    {selectedDoc && !detailLoading && <div className="modal-body"><div className="detail-summary"><span className={`pill ${statusClass(isDocumentProcessing(selectedDoc) ? "processing" : selectedDoc.status)}`}><i/>{documentStatusLabel(selectedDoc, friendlyStatus)}</span><span className="pill neutral">{humanize(selectedDoc.doc_type)}</span></div>{unknownVendor && unknownVendor.sourceDocumentId === selectedDoc.id && <VendorResolutionBanner info={unknownVendor} vendors={filterVendors} canAddVendor={canCreateVendor(profile?.role)} busy={unknownVendorBusy} error={unknownVendorError} onAdd={() => { if (unknownVendor) setUnknownVendor(unknownVendor); }} onSelect={vendorId => void selectExistingVendor(vendorId)}/>} {isDocumentProcessing(selectedDoc) ? <div className="notice info" role="status">Document is still processing. This view updates automatically.</div> : <div className="notice error">{selectedDoc.failure_message || "No linked record is available for this document."}</div>}<div className="field-grid"><DetailField label="Uploaded" value={dateLabel(selectedDoc.created_at)}/><DetailField label="Last updated" value={dateLabel(selectedDoc.updated_at)}/><DetailField label="Email sender" value={selectedDoc.email_sender}/><DetailField label="Email subject" value={selectedDoc.email_subject}/><DetailField label="Email received" value={selectedDoc.email_received_at ? dateTimeLabel(selectedDoc.email_received_at) : undefined}/></div><DocumentExtractedDetails doc={selectedDoc}/><div className="modal-actions">{(() => { const actionState = documentActionAvailability(selectedDoc.id); return <><button className="secondary" title={actionState.title} disabled={actionState.disabled} onClick={() => void openOriginalFile(selectedDoc)}><Eye {...iconProps}/> View document</button><button className="secondary" title={actionState.title} disabled={actionState.disabled} onClick={() => void downloadOriginalFile(selectedDoc)}><Download {...iconProps}/> Download</button>{["failed", "needs_data_review", "needs_vendor_review", "incomplete"].includes(selectedDoc.status.toLowerCase()) && !isRetryScheduled(selectedDoc) && (selectedDoc.status.toLowerCase() !== "failed" || selectedDoc.failure_class !== "permanent") && <button className="primary" title={actionState.title} onClick={() => void retryDocument(selectedDoc)} disabled={detailLoading || actionState.disabled}><RotateCcw {...iconProps}/> Retry processing</button>}</>; })()}</div></div>}
    </section></div>}
    {filePreview && (
      <div
        className={`modal-backdrop file-preview-backdrop ${previewFullscreen ? "file-preview-backdrop-fullscreen" : ""}`}
        role="presentation"
        onMouseDown={event => {
          if (event.target === event.currentTarget) closeFilePreview();
        }}
      >
        <section
          className={`file-preview-modal ${previewFullscreen ? "file-preview-modal-fullscreen" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="file-preview-title"
        >
          <header className="file-preview-header">
            <div className="file-preview-header-left">
              <span className="file-preview-icon">
                {filePreview.kind === "binary" && filePreview.mime.startsWith("image/") ? (
                  <FileImage size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </span>
              <div className="file-preview-title-wrap">
                <h2 id="file-preview-title" className="file-preview-title" title={filePreview.filename}>
                  {filePreview.filename}
                </h2>
                {filePreview.kind === "docx" && (
                  <span className="file-preview-subtitle">
                    {filePreview.fallback ? "Extracted text preview" : "Extracted document content"}
                  </span>
                )}
              </div>
              <span className="file-preview-badge">
                {filePreview.kind === "loading"
                  ? "LOADING"
                  : filePreview.kind === "docx"
                  ? "DOCX"
                  : filePreview.mime.includes("pdf")
                  ? "PDF"
                  : filePreview.mime.replace("image/", "").toUpperCase()}
              </span>
            </div>

            <div className="file-preview-header-right">
              {filePreview.kind === "binary" && filePreview.mime.startsWith("image/") && (
                <div className="file-preview-zoom-controls">
                  <button
                    type="button"
                    className="file-preview-tool-btn"
                    title="Zoom Out"
                    onClick={() => setPreviewZoom(z => Math.max(0.3, Number((z - 0.2).toFixed(1))))}
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span
                    className="file-preview-zoom-val"
                    title="Reset Zoom"
                    onClick={() => setPreviewZoom(1)}
                  >
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="file-preview-tool-btn"
                    title="Zoom In"
                    onClick={() => setPreviewZoom(z => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    type="button"
                    className="file-preview-tool-btn"
                    title="Rotate 90°"
                    onClick={() => setPreviewRotation(r => (r + 90) % 360)}
                  >
                    <RotateCw size={15} />
                  </button>
                  <div className="file-preview-divider" />
                </div>
              )}

              {filePreview.kind === "binary" && (
                <>
                  <a
                    href={filePreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-preview-action-btn file-preview-btn-secondary"
                    title="Open original document in a new browser tab"
                  >
                    <ExternalLink size={14} />
                    <span>Open in Tab</span>
                  </a>
                  <a
                    href={filePreview.url}
                    download={filePreview.filename}
                    className="file-preview-action-btn file-preview-btn-primary"
                    title="Download original file"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>
                  <div className="file-preview-divider" />
                </>
              )}

              <button
                type="button"
                className="file-preview-tool-btn"
                title={previewFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                onClick={() => setPreviewFullscreen(f => !f)}
              >
                {previewFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                type="button"
                className="file-preview-close-btn"
                aria-label="Close file preview"
                title="Close (Esc)"
                onClick={closeFilePreview}
              >
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="file-preview-body">
            {filePreview.kind === "loading" ? (
              <div className="file-preview-loading" role="status" aria-live="polite">
                <span className="spinner" />
                <span>Loading original document...</span>
              </div>
            ) : filePreview.kind === "docx" ? (
              <div className="file-preview-docx-viewport">
                <div className="file-preview-docx-card">
                  <DocxExtractedPreview doc={filePreview.document} />
                </div>
              </div>
            ) : filePreview.mime.startsWith("image/") ? (
              <div className="file-preview-image-viewport">
                <img
                  alt={`Preview of ${filePreview.filename}`}
                  src={filePreview.url}
                  className="file-preview-image"
                  style={{
                    transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            ) : (
              <div className="file-preview-iframe-container">
                <iframe
                  className="file-preview-iframe"
                  title={`Preview of ${filePreview.filename}`}
                  src={`${filePreview.url}#view=FitH&toolbar=1`}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    )}
    {selectedInvoice && (
      <div className="modal-backdrop drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedInvoice(null); }}>
        <InvoiceReviewDrawer
          invoice={selectedInvoice}
          initialTab={invoiceDrawerTab}
          authHeaders={authHeaders}
          onViewOriginal={id => void openOriginalSource(id)}
          onDownloadOriginal={id => void openOriginalSource(id, true)}
          candidates={matchCandidates}
          noMatchDraft={noMatchDraft}
          onReviewNoMatchDraft={() => void reviewNoMatchDraft()}
          onClose={() => setSelectedInvoice(null)}
          onMatch={(candidate, accept) => { void confirmSuggestedMatch(candidate, accept); }}
          onDecision={action => { setDecision({ invoiceId: selectedInvoice.invoice_id, action, reason: "", expectedMatchRunId: selectedInvoice.match_run_id, expectedUpdatedAt: selectedInvoice.updated_at }); }}
          vendorNotice={unknownVendor?.recordType === "invoice" && unknownVendor.recordId === selectedInvoice.invoice_id ? unknownVendor : null}
          vendorVendors={filterVendors}
          canAddVendor={canCreateVendor(profile?.role)}
          vendorBusy={unknownVendorBusy}
          vendorError={unknownVendorError}
          onAddVendor={() => { if (unknownVendor) setUnknownVendor(unknownVendor); }}
          onSelectVendor={vendorId => void selectExistingVendor(vendorId)}
          onRefreshInvoice={async () => {
            await openInvoice(selectedInvoice.invoice_id);
            await loadInvoices();
          }}
        />
      </div>
    )}
    {emailDraftEditor && emailDraftOpened && <div className="modal-backdrop email-draft-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !emailDraftBusy) setEmailDraftEditor(null); }}><section className="modal email-draft-modal" role="dialog" aria-modal="true" aria-labelledby="email-draft-title"><header className="modal-head"><div><span className="eyebrow">NO MATCH EMAIL</span><h2 id="email-draft-title">Review email draft</h2></div><button className="modal-close" aria-label="Close email draft" disabled={emailDraftBusy} onClick={() => setEmailDraftEditor(null)}>?</button></header><div className="modal-body"><label className="form-label">Recipient<input type="text" value={emailDraftRecipient} onChange={event => setEmailDraftRecipient(event.target.value)} required aria-label="Email recipient"/></label><label className="form-label">Subject<input value={emailDraftSubject} onChange={event => setEmailDraftSubject(event.target.value)} required/></label><label className="form-label">Body<textarea value={emailDraftBody} onChange={event => setEmailDraftBody(event.target.value)} required rows={10}/></label>{emailDraftError && <div className="notice error" role="alert">{emailDraftError}</div>}<div className="modal-actions"><Button variant="secondary" onClick={() => setEmailDraftEditor(null)} disabled={emailDraftBusy}>Close</Button><Button variant="primary" onClick={() => void sendNoMatchDraft()} disabled={!emailDraftOpened || emailDraftBusy || !emailDraftRecipient.trim() || !emailDraftSubject.trim() || !emailDraftBody.trim()}>{emailDraftBusy ? "Sending?" : "Send"}</Button></div></div></section></div>}
    {decision && <div className="modal-backdrop reason-backdrop" role="presentation"><form className="modal reason-modal" onSubmit={submitInvoiceDecision}><header className="modal-head"><div><span className="eyebrow purple">REVIEW DECISION</span><h2>{decision.action === "hold" ? "Place invoice on hold" : decision.action === "reject" ? "Reject invoice" : decision.action === "paid" ? "Mark invoice as paid" : decision.action === "approve" ? "Approve invoice" : "Approve with exception"}</h2></div><button className="modal-close" type="button" onClick={() => setDecision(null)} aria-label="Cancel">×</button></header><div className="modal-body"><label className="form-label">{decision.action === "paid" || decision.action === "approve" ? "Payment notes (optional)" : "Reason"}<textarea value={decision.reason} onChange={event => setDecision({ ...decision, reason: event.target.value })} required={decision.action !== "approve" && decision.action !== "paid"} minLength={decision.action === "approve" || decision.action === "paid" ? 0 : 3} maxLength={1000} rows={4} placeholder={decision.action === "paid" ? "Optional payment notes / reference" : decision.action === "approve" ? "Optional approval notes" : "Explain this decision"} /></label><div className="modal-actions"><button className="secondary" type="button" onClick={() => setDecision(null)}>Cancel</button><button className="primary" type="submit">{decision.action === "paid" ? "Confirm payment" : decision.action === "approve" ? "Confirm approval" : "Save decision"}</button></div></div></form></div>}
    {uploadResult && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setUploadResult(null); }}><section className="modal results-modal" role="dialog" aria-modal="true" aria-labelledby="upload-result-title"><header className="modal-head"><div><span className="eyebrow purple">UPLOAD SUMMARY</span><h2 id="upload-result-title">{uploadResult.successes} of {uploadResult.total} files uploaded</h2></div><button className="modal-close" onClick={() => setUploadResult(null)} aria-label="Close upload summary">×</button></header><div className="modal-body"><div className="outcome-list">{uploadResult.outcomes.map((outcome, index) => <div className="outcome-row" key={`${outcome.name}-${index}`}><span className={`outcome-icon ${outcome.ok ? "ok" : "bad"}`}>{outcome.ok ? "✓" : "!"}</span><div><b>{outcome.name}</b><small>{outcome.message}</small></div></div>)}</div><div className="modal-actions"><button className="secondary" onClick={() => setUploadResult(null)}>Close</button><button className="primary" onClick={() => setUploadResult(null)}>View documents</button></div></div></section></div>}
  </div>;
}

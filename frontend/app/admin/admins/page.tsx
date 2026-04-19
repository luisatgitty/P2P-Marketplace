"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Trash2, Eye, EyeOff, X, UserCog,
  Shield, ShieldCheck, CheckCircle2, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown, UserX, UserCheck,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SafeImage } from "@/components/ui/safe-image";
import {
  createAdminAccount,
  getAdminAccounts,
  type AdminAccountRecord,
} from "@/services/adminAdminsService";
import {
  deleteAdminUser,
  setAdminUserActive,
} from "@/services/adminUsersService";
import {
  AUTH_LIMITS,
  validateCreateAdminInput,
} from "@/utils/validation";

// ── shadcn components ──────────────────────────────────────────────────────────
import { Button }            from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input }             from "@/components/ui/input";
import { Label }             from "@/components/ui/label";
import { Separator }         from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──────────────────────────────────────────────────────────────────────
type AdminRole = "ADMIN" | "SUPER_ADMIN";
type SortField = "name" | "created" | "last_login" | "updated" | "deleted";
type SortDir = "asc" | "desc";

interface AdminAccount {
  id:         string;
  first_name: string;
  last_name:  string;
  profile_image_url: string;
  email:      string;
  phone:      string;
  role:       AdminRole;
  is_active:  boolean;
  created_at: string;
  last_login: string | null;
  updated_at: string;
  deleted_at: string | null;
  deleted_by_name: string;
  deleted_by_email: string;
  added_by:   string;
}

function getCurrentAdminSnapshot(): { fullName: string; email: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) return null;

    const parsed = JSON.parse(rawUser) as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };

    const firstName = (parsed?.firstName ?? "").trim();
    const lastName = (parsed?.lastName ?? "").trim();
    const email = (parsed?.email ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (!fullName && !email) return null;
    return { fullName, email };
  } catch {
    return null;
  }
}

const ADMINS: AdminAccount[] = [];

// ── Add Admin Modal ────────────────────────────────────────────────────────────
interface AddModalProps {
  onClose: () => void;
  onAdd:   (admin: { firstName: string; lastName: string; email: string; phone?: string; role: AdminRole; password: string }) => Promise<void>;
}

function AddAdminModal({ onClose, onAdd }: AddModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [role,      setRole]      = useState<AdminRole>("ADMIN");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState("");
  const [saving,    setSaving]    = useState(false);

  async function handleSubmit() {
    setError("");
    const validationError = validateCreateAdminInput({
      firstName,
      lastName,
      email,
      phone,
      role,
      password,
      confirmPassword: confirm,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        password,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-[#1e2433] px-6 py-5 flex items-start justify-between shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-violet-400" />
            <h2 className="text-white font-bold text-base">Add New Admin</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                First Name
              </Label>
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value.slice(0, AUTH_LIMITS.nameMaxLength))}
                placeholder="Enter first name"
                name="firstName"
                autoComplete="given-name"
                minLength={AUTH_LIMITS.nameMinLength}
                maxLength={AUTH_LIMITS.nameMaxLength}
                className="dark:bg-[#13151f] dark:border-[#2a2d3e]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                Last Name
              </Label>
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value.slice(0, AUTH_LIMITS.nameMaxLength))}
                placeholder="Enter last name"
                name="lastName"
                autoComplete="family-name"
                minLength={AUTH_LIMITS.nameMinLength}
                maxLength={AUTH_LIMITS.nameMaxLength}
                className="dark:bg-[#13151f] dark:border-[#2a2d3e]"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              Email Address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value.slice(0, AUTH_LIMITS.emailMaxLength))}
              placeholder="Enter email address"
              name="email"
              autoComplete="email"
              minLength={AUTH_LIMITS.emailMinLength}
              maxLength={AUTH_LIMITS.emailMaxLength}
              className="dark:bg-[#13151f] dark:border-[#2a2d3e]"
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              Contact Number (optional)
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, AUTH_LIMITS.phoneLength))}
              placeholder="Enter contact number"
              name="phone"
              autoComplete="tel"
              maxLength={AUTH_LIMITS.phoneLength}
              className="dark:bg-[#13151f] dark:border-[#2a2d3e]"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              Role
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["ADMIN", "SUPER_ADMIN"] as AdminRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-all",
                    role === r
                      ? "bg-[#1e2433] border-[#3a4a6a] text-white"
                      : "bg-stone-50 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:border-stone-400",
                  )}
                >
                  {r === "SUPER_ADMIN"
                    ? <Shield    className="w-4 h-4 text-amber-400 shrink-0" />
                    : <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {r === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                    </p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {r === "SUPER_ADMIN" ? "Full access" : "Standard access"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              Temporary Password
            </Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value.slice(0, AUTH_LIMITS.passwordMaxLength))}
                placeholder="Enter temporary password"
                name="password"
                autoComplete="new-password"
                minLength={AUTH_LIMITS.passwordMinLength}
                maxLength={AUTH_LIMITS.passwordMaxLength}
                className="pr-10 dark:bg-[#13151f] dark:border-[#2a2d3e]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              Confirm Password
            </Label>
            <Input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value.slice(0, AUTH_LIMITS.passwordMaxLength))}
              placeholder="Re-enter password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.passwordMinLength}
              maxLength={AUTH_LIMITS.passwordMaxLength}
              className="dark:bg-[#13151f] dark:border-[#2a2d3e]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Note */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong className="font-bold">Note:</strong> The new admin should change their password immediately on first login.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 flex gap-2.5 shrink-0 border-t border-stone-100 dark:border-[#252837]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-full dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-full bg-[#1e2433] hover:bg-[#2a3650] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 text-white font-bold"
          >
            {saving ? "Creating…" : "Create Admin"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminsPage() {
  const [search,               setSearch]               = useState("");
  const [debouncedSearch,      setDebouncedSearch]      = useState("");
  const [roleFilter,           setRoleFilter]           = useState("ALL");
  const [statusFilter,         setStatusFilter]         = useState("ALL");
  const [sort,                 setSort]                 = useState<{ field: SortField; dir: SortDir }>({ field: "created", dir: "desc" });
  const [admins,               setAdmins]               = useState<AdminAccount[]>(ADMINS);
  const [showAdd,              setShowAdd]              = useState(false);
  const [addSuccess,           setAddSuccess]           = useState<string | null>(null);
  const [loadingAdmins,        setLoadingAdmins]        = useState(true);
  const [currentPage,          setCurrentPage]          = useState(1);
  const [totalCount,           setTotalCount]           = useState(0);
  const [isRefreshing,         setIsRefreshing]         = useState(false);
  const [removingId,           setRemovingId]           = useState<string | null>(null);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);
  const FETCH_LIMIT = 10;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function formatDate(value?: string | null): string {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function mapAdminRecord(record: AdminAccountRecord): AdminAccount {
    return {
      id:         record.id,
      first_name: record.first_name,
      last_name:  record.last_name,
      profile_image_url: record.profile_image_url,
      email:      record.email,
      phone:      record.phone,
      role:       record.role,
      is_active:  record.is_active,
      created_at: record.created_at,
      last_login: record.last_login,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
      deleted_by_name: record.deleted_by_name,
      deleted_by_email: record.deleted_by_email,
      added_by:   "System",
    };
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadAdmins = useCallback(async (pageNumber: number) => {
    setLoadingAdmins(true);
    const nextOffset = (pageNumber - 1) * FETCH_LIMIT;

    try {
      const payload = await getAdminAccounts({
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        limit: FETCH_LIMIT,
        offset: nextOffset,
      });

      const received = (payload.admins ?? []).map(mapAdminRecord);
      setAdmins(received);
      setTotalCount(payload.total);
      setCurrentPage(pageNumber);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to load admin accounts";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoadingAdmins(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    void loadAdmins(currentPage);
  }, [currentPage, loadAdmins]);

  function toggleSort(field: SortField) {
    setCurrentPage(1);
    setSort((current) => (
      current.field === field
        ? { field, dir: current.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    ));
  }

  // ── Sort loaded chunk ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...admins];

    data.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";

      if (sort.field === "name") {
        va = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
        vb = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
      } else if (sort.field === "created") {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sort.field === "last_login") {
        va = a.last_login ? new Date(a.last_login).getTime() : 0;
        vb = b.last_login ? new Date(b.last_login).getTime() : 0;
      } else if (sort.field === "updated") {
        va = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        vb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      } else if (sort.field === "deleted") {
        va = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        vb = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
      }

      if (typeof va === "string" && typeof vb === "string") {
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }

      return sort.dir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return data;
  }, [admins, sort]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ChevronsUpDown className="w-3 h-3 text-stone-300 dark:text-stone-600 ml-1" />;
    return sort.dir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const hasActiveFilters = search || roleFilter !== "ALL" || statusFilter !== "ALL";

  const SortableTH = ({ label, field }: { label: string; field: SortField }) => (
    <TableHead
      className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} />
      </span>
    </TableHead>
  );

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleAdd({ firstName, lastName, email, phone, role, password }: {
    firstName: string; lastName: string; email: string; phone?: string; role: AdminRole; password: string;
  }) {
    try {
      const created  = await createAdminAccount({ firstName, lastName, email, phone, role, password });
      const newAdmin = mapAdminRecord(created);
      setAdmins(as => [newAdmin, ...as]);
      setShowAdd(false);
      const fullName = `${newAdmin.first_name} ${newAdmin.last_name}`.trim();
      setAddSuccess(`${fullName} has been added as ${role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}.`);
      setTimeout(() => setAddSuccess(null), 5000);
      toast.success("Admin account created successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to create admin account";
      toast.error(message, { position: "top-center" });
      throw err;
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove admin account for ${name}? They will lose all admin access immediately.`)) return;
    setRemovingId(id);
    try {
      await deleteAdminUser(id);
      const nowIso = new Date().toISOString();
      const actor = getCurrentAdminSnapshot();
      setAdmins((as) => as.map((admin) => (
        admin.id === id
          ? {
              ...admin,
              is_active: false,
              updated_at: nowIso,
              deleted_at: nowIso,
              deleted_by_name: actor?.fullName || admin.deleted_by_name || "",
              deleted_by_email: actor?.email || admin.deleted_by_email || "",
            }
          : admin
      )));
      toast.success("Admin account removed successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to remove admin account";
      toast.error(message, { position: "top-center" });
    } finally {
      setRemovingId(null);
    }
  }

  async function handleToggleActive(id: string) {
    const target = admins.find((admin) => admin.id === id);
    if (!target || target.role === "SUPER_ADMIN" || target.deleted_at) return;

    const nextActive = !target.is_active;
    setActionLoadingUserId(id);
    try {
      await setAdminUserActive(id, nextActive);
      const nowIso = new Date().toISOString();
      setAdmins((as) => as.map((admin) => (
        admin.id === id ? { ...admin, is_active: nextActive, updated_at: nowIso } : admin
      )));
      toast.success(`Admin account ${nextActive ? "activated" : "deactivated"} successfully`, { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to update admin account status";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingUserId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / FETCH_LIMIT));
  const paginationPages = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh)] p-5 sm:p-6 flex flex-col gap-5 min-h-0">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
            Admin Management
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Create, manage, and revoke admin access
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowAdd(true)}
          className="gap-2 bg-[#1e2433] hover:bg-[#2a3650] text-white font-medium shrink-0"
        >
          <Plus className="w-4 h-4" /> Admin
        </Button>
      </div>

      {/* ── Success banner ── */}
      {addSuccess && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl text-sm text-teal-700 dark:text-teal-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {addSuccess}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Admins",
            value: admins.length,
            role: "ALL",
            color: "text-stone-700 dark:text-stone-200",
            bg: "bg-stone-100 dark:bg-[#13151f]",
            border: "border-stone-200 dark:border-[#2a2d3e]",
          },
          {
            label: "Super Admins",
            value: admins.filter(a => a.role === "SUPER_ADMIN" && !a.deleted_at).length,
            role: "SUPER_ADMIN",
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/20",
            border: "border-amber-200 dark:border-amber-800",
          },
          {
            label: "Regular Admins",
            value: admins.filter(a => a.role === "ADMIN" && !a.deleted_at).length,
            role: "ADMIN",
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50 dark:bg-violet-950/20",
            border: "border-violet-200 dark:border-violet-800",
          },
        ].map(({ label, value, role, color, bg, border }) => (
          <Card
            key={label}
            className={cn(
              "p-4 rounded-md cursor-pointer hover:shadow-sm transition-all border",
              bg,
              border,
              roleFilter === role && "ring-2 ring-offset-1 ring-current",
            )}
            onClick={() => {
              setCurrentPage(1);
              setRoleFilter((prev) => {
                if (role === "ALL") return "ALL";
                return prev === role ? "ALL" : role;
              });
            }}
          >
            <CardContent className="text-center">
              <p className={cn("text-2xl font-extrabold", color)}>{value}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Search by name or email…"
            autoComplete="off"
            name="admin-search"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        {/* Role filter */}
        <div className="relative shrink-0">
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="pl-3 pr-8 py-2 h-9 bg-transparent border border-stone-200 dark:border-[#2a2d3e] rounded-md text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer dark:bg-[#13151f]"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          {/* Chevron indicator */}
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Status filter */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="pl-3 pr-8 py-2 h-9 bg-transparent border border-stone-200 dark:border-[#2a2d3e] rounded-md text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer dark:bg-[#13151f]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DELETED">Deleted</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={() => { setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); setCurrentPage(1); }}
            className="hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
          >
            <X className="w-3 h-3" /> Clear
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsRefreshing(true);
            void loadAdmins(currentPage);
          }}
          disabled={loadingAdmins}
          className="border-sky-600 text-sky-600! hover:bg-sky-600/10 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:border-sky-400 dark:text-sky-400! dark:hover:bg-sky-400/10 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/40"
        >
          <RotateCw className={cn("w-3.5 h-3.5", loadingAdmins && isRefreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* ── Table ── */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden flex-1 min-h-0">
        <CardContent className="p-0 h-full min-h-0 flex flex-col">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <SortableTH label="Admin Name" field="name" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Contact Info
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Status
                  </TableHead>
                  <SortableTH label="Created" field="created" />
                  <SortableTH label="Last Login" field="last_login" />
                  <SortableTH label="Updated" field="updated" />
                  <SortableTH label="Deleted" field="deleted" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingAdmins && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                    >
                      Loading admin accounts…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                    >
                      No admin accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(admin => (
                    <TableRow
                      key={admin.id}
                      className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                    >
                      {/* Name */}
                      <TableCell className="py-2 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={admin.profile_image_url}
                            type="profile"
                            alt={`${admin.first_name} ${admin.last_name}'s profile picture`}
                            width={36}
                            height={36}
                            className="w-9 h-9 shrink-0"
                          />
                          <div className="w-max">
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                              {admin.first_name}
                            </p>
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                              {admin.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact info */}
                      <TableCell className="py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-stone-700 dark:text-stone-200 truncate max-w-44">
                            {admin.email}
                          </p>
                          {admin.phone ? (
                            <p className="text-sm text-stone-400 dark:text-stone-500 truncate max-w-44">
                              {admin.phone}
                            </p>
                          ) : (
                            <p className="text-sm text-stone-300 dark:text-stone-600">—</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Role badge */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
                          admin.role === "SUPER_ADMIN"
                            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                            : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
                        )}>
                          {admin.role === "SUPER_ADMIN"
                            ? <Shield    className="w-2.5 h-2.5" />
                            : <ShieldCheck className="w-2.5 h-2.5" />
                          }
                          {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                        </span>
                      </TableCell>

                      {/* Active status */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        {admin.deleted_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                            Deleted
                          </span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
                            admin.is_active
                              ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                              : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300",
                          )}>
                            {admin.is_active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </TableCell>

                      {/* Created */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDate(admin.created_at)}
                      </TableCell>

                      {/* Last login */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {admin.last_login ? (
                          <div className="leading-tight">
                            <p className="text-sm font-medium">{formatDate(admin.last_login)}</p>
                            <p className="text-xs">{formatTime(admin.last_login)}</p>
                          </div>
                        ) : <span className="text-stone-300 dark:text-stone-600">Never</span>}
                      </TableCell>

                      {/* Updated */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDate(admin.updated_at)}
                      </TableCell>

                      {/* Deleted */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {(admin.deleted_at) ? (
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                              {admin.deleted_by_name || "—"}
                            </p>
                            <p className="text-xs">
                              {admin.deleted_at ? formatDate(admin.deleted_at) : <span className="text-stone-300 dark:text-stone-600">—</span>}
                            </p>
                          </div>
                        ) : <span className="text-stone-300 dark:text-stone-600">—</span>}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 text-right">
                        {admin.deleted_at ? (
                          <span className="text-sm text-stone-300 dark:text-stone-600 pr-1">
                            Deleted
                          </span>
                        ) : admin.role === "SUPER_ADMIN" ? (
                          <span className="text-sm text-stone-300 dark:text-stone-600 pr-1">
                            Protected
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={admin.is_active ? "Deactivate" : "Activate"}
                              aria-label={admin.is_active ? "Deactivate" : "Activate"}
                              onClick={() => void handleToggleActive(admin.id)}
                              disabled={actionLoadingUserId === admin.id || removingId === admin.id}
                              className="w-7 h-7 hover:bg-stone-100 dark:hover:bg-[#252837] disabled:opacity-50"
                            >
                              {admin.is_active
                                ? <UserX className="w-4 h-4 text-amber-500 hover:text-amber-800" />
                                : <UserCheck className="w-4 h-4 text-teal-500 hover:text-teal-800" />
                              }
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={removingId === admin.id ? "Removing..." : "Remove admin"}
                              aria-label={removingId === admin.id ? "Removing..." : "Remove admin"}
                              onClick={() => void handleDelete(admin.id, `${admin.first_name} ${admin.last_name}`.trim())}
                              disabled={removingId === admin.id || actionLoadingUserId === admin.id}
                              className="w-7 h-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}

              </TableBody>
            </Table>
          </div>

          <Separator className="dark:bg-[#2a2d3e]" />
          <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-stone-400 dark:text-stone-500">
            <span>
              Showing {filtered.length.toLocaleString()} of {totalCount.toLocaleString()} account{totalCount !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={loadingAdmins || currentPage <= 1}
                className="h-8 px-2.5"
              >
                Prev
              </Button>
              {paginationPages.map((page) => (
                <Button
                  key={page}
                  type="button"
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  disabled={loadingAdmins}
                  className="h-8 min-w-8 px-2"
                >
                  {page}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={loadingAdmins || currentPage >= totalPages}
                className="h-8 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Security notice ── */}
      <div className="bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg p-4 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
        <strong className="font-bold text-stone-700 dark:text-stone-300">Admin Account Policy: </strong>
        Admin accounts have access to sensitive user data and platform controls.
        Only create accounts for trusted personnel.
        All admin actions are logged for accountability.
      </div>

      {/* ── Modal ── */}
      {showAdd && (
        <AddAdminModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

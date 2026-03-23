"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search, Plus, Trash2, Eye, EyeOff, X, UserCog,
  Shield, ShieldCheck, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateImageURL } from "@/utils/validation";
import {
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccounts,
  type AdminAccountRecord,
} from "@/services/adminAdminsService";

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

interface AdminAccount {
  id:         string;
  name:       string;
  profile_image_url: string;
  email:      string;
  phone:      string;
  role:       AdminRole;
  is_active:  boolean;
  created_at: string;
  last_login: string | null;
  added_by:   string;
}

const ADMINS: AdminAccount[] = [];
const PER_PAGE = 8;

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
    if (!firstName.trim())   { setError("First name is required."); return; }
    if (!lastName.trim())    { setError("Last name is required."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Valid email is required."); return;
    }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
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
                onChange={e => setFirstName(e.target.value)}
                placeholder="Enter first name"
                name="firstName"
                autoComplete="given-name"
                className="dark:bg-[#13151f] dark:border-[#2a2d3e]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                Last Name
              </Label>
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Enter last name"
                name="lastName"
                autoComplete="family-name"
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
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email address"
              name="email"
              autoComplete="email"
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
              onChange={e => setPhone(e.target.value)}
              placeholder="Enter contact number"
              name="phone"
              autoComplete="tel"
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
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter temporary password"
                name="password"
                autoComplete="new-password"
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
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              name="confirmPassword"
              autoComplete="new-password"
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
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("ALL");
  const [admins,       setAdmins]       = useState<AdminAccount[]>(ADMINS);
  const [showAdd,      setShowAdd]      = useState(false);
  const [addSuccess,   setAddSuccess]   = useState<string | null>(null);
  const [loadingAdmins,setLoadingAdmins]= useState(true);
  const [removingId,   setRemovingId]   = useState<string | null>(null);
  const [page,         setPage]         = useState(1);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function formatDate(value?: string | null): string {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function mapAdminRecord(record: AdminAccountRecord): AdminAccount {
    return {
      id:         record.id,
      name:       `${record.first_name} ${record.last_name}`.trim(),
      profile_image_url: record.profile_image_url,
      email:      record.email,
      phone:      record.phone,
      role:       record.role,
      is_active:  record.is_active,
      created_at: formatDate(record.created_at),
      last_login: record.last_login ? formatDate(record.last_login) : null,
      added_by:   "System",
    };
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const data = await getAdminAccounts();
        if (!mounted) return;
        setAdmins((data ?? []).map(mapAdminRecord));
      } catch (err) {
        if (!mounted) return;
        const message = typeof err === "string" ? err : "Failed to load admin accounts";
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setLoadingAdmins(false);
      }
    };
    void loadAdmins();
    return () => { mounted = false; };
  }, []);

  // ── Filter + paginate ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...admins];
    if (search)
      data = data.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase()),
      );
    if (roleFilter !== "ALL") data = data.filter(a => a.role === roleFilter);
    return data;
  }, [admins, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset to page 1 when filters change
  useMemo(() => { setPage(1); }, [search, roleFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleAdd({ firstName, lastName, email, phone, role, password }: {
    firstName: string; lastName: string; email: string; phone?: string; role: AdminRole; password: string;
  }) {
    try {
      const created  = await createAdminAccount({ firstName, lastName, email, phone, role, password });
      const newAdmin = mapAdminRecord(created);
      setAdmins(as => [newAdmin, ...as]);
      setShowAdd(false);
      setAddSuccess(`${newAdmin.name} has been added as ${role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}.`);
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
      await deleteAdminAccount(id);
      setAdmins(as => as.filter(a => a.id !== id));
      toast.success("Admin account removed successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to remove admin account";
      toast.error(message, { position: "top-center" });
    } finally {
      setRemovingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-6 space-y-5">

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
          className="gap-2 rounded-full bg-[#1e2433] hover:bg-[#2a3650] text-white font-medium shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Admin
        </Button>
      </div>

      {/* ── Success banner ── */}
      {addSuccess && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl text-sm text-teal-700 dark:text-teal-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {addSuccess}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Super Admins",
            value: admins.filter(a => a.role === "SUPER_ADMIN").length,
            color: "text-amber-600 dark:text-amber-400",
          },
          {
            label: "Regular Admins",
            value: admins.filter(a => a.role === "ADMIN").length,
            color: "text-violet-600 dark:text-violet-400",
          },
        ].map(({ label, value, color }) => (
          <Card key={label} className="rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e]">
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
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
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
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
      </div>

      {/* ── Table ── */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    Admin
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Created
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Last Login
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingAdmins ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                    >
                      Loading admin accounts…
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                    >
                      No admin accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map(admin => (
                    <TableRow
                      key={admin.id}
                      className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                    >
                      {/* Name + email + number */}
                      <TableCell className="py-2">
                        <div className="flex items-center gap-3">
                          <Image
                            src={validateImageURL(admin.profile_image_url) || "/profile-icon.png"}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="w-10 h-10 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                              {admin.name}
                            </p>
                            <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                              {admin.email}
                            </p>
                            {admin.phone && (
                              <p className="text-xs text-stone-400 dark:text-stone-500">
                                {admin.phone}
                              </p>
                            )}
                          </div>
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

                      {/* Created */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {admin.created_at}
                      </TableCell>

                      {/* Last login */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {admin.last_login ?? (
                          <span className="text-stone-300 dark:text-stone-600">Never</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 text-right">
                        {admin.role === "SUPER_ADMIN" ? (
                          <span className="text-sm text-stone-300 dark:text-stone-600 pr-1">
                            Protected
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={removingId === admin.id ? "Removing…" : "Remove admin"}
                            aria-label={removingId === admin.id ? "Removing…" : "Remove admin"}
                            onClick={() => void handleDelete(admin.id, admin.name)}
                            disabled={removingId === admin.id}
                            className="w-7 h-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          {!loadingAdmins && filtered.length > PER_PAGE && (
            <>
              <Separator className="dark:bg-[#2a2d3e]" />
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-stone-400 dark:text-stone-500">
                  Page {page} of {totalPages} · {filtered.length} account{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 w-8 p-0 rounded-lg dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <Button
                      key={n}
                      variant={page === n ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPage(n)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg text-sm font-bold",
                        page === n
                          ? "bg-[#1e2433] text-white hover:bg-[#2a3650]"
                          : "text-stone-500 dark:text-stone-400 dark:hover:bg-[#252837]",
                      )}
                    >
                      {n}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 w-8 p-0 rounded-lg dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Security notice ── */}
      <div className="bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg p-4 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
        <strong className="font-bold text-stone-700 dark:text-stone-300">Admin Account Policy: </strong>
        Admin accounts have access to sensitive user data and platform controls. Only create accounts for trusted personnel.
        Removed accounts are permanently deleted. All admin actions are logged for accountability.
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

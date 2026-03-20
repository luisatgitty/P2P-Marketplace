"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Trash2, Eye, EyeOff, X, UserCog,
  Shield, ShieldCheck, Filter, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccounts,
  type AdminAccountRecord,
} from "@/services/adminAdminsService";

type AdminRole = "ADMIN" | "SUPER_ADMIN";

interface AdminAccount {
  id:        string;
  name:      string;
  email:     string;
  role:      AdminRole;
  is_active: boolean;
  created_at:string;
  last_login:string | null;
  added_by:  string;
}

const ADMINS: AdminAccount[] = [];

// ── Add admin modal ────────────────────────────────────────────────────────────
interface AddModalProps {
  onClose: () => void;
  onAdd:   (admin: { firstName: string; lastName: string; email: string; role: AdminRole; password: string }) => Promise<void>;
}

function AddAdminModal({ onClose, onAdd }: AddModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,    setEmail]   = useState("");
  const [role,     setRole]    = useState<AdminRole>("ADMIN");
  const [password, setPassword]= useState("");
  const [confirm,  setConfirm] = useState("");
  const [showPw,   setShowPw]  = useState(false);
  const [error,    setError]   = useState("");
  const [saving,   setSaving]  = useState(false);

  async function handleSubmit() {
    setError("");
    if (!firstName.trim())   { setError("First name is required."); return; }
    if (!lastName.trim())    { setError("Last name is required."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Valid email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), role, password });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-[#1c1f2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        <div className="bg-[#1e2433] px-6 py-5 flex items-start justify-between shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCog className="w-4 h-4 text-violet-400" />
              <h2 className="text-white font-bold text-base">Add New Admin</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* First name */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">First Name</label>
              <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              name="firstName"
              autoComplete="given-name"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
              />
            </div>

            {/* Last name */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Last Name</label>
              <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              name="lastName"
              autoComplete="family-name"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
              />
            </div>
          </div>

            {/* Email */}
            <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="full.name@org.com" name="email" autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors" />
            </div>

          {/* Role */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(["ADMIN", "SUPER_ADMIN"] as AdminRole[]).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-all",
                    role === r
                      ? "bg-[#1e2433] border-[#3a4a6a] text-white"
                      : "bg-stone-50 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:border-stone-400",
                  )}>
                  {r === "SUPER_ADMIN" ? <Shield className="w-4 h-4 text-amber-400 shrink-0" /> : <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />}
                  <div>
                    <p className="text-xs font-bold leading-tight">{r === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{r === "SUPER_ADMIN" ? "Full access" : "Standard access"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Temporary Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
                name="password"
                autoComplete="new-password"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" name="confirmPassword" autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors" />
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong className="font-bold">Note:</strong> The new admin should change their password immediately on first login.
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 flex gap-2.5 shrink-0 border-t border-stone-100 dark:border-[#252837]">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 rounded-full bg-[#1e2433] dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity">
            {saving ? "Creating…" : "Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [admins,     setAdmins]     = useState<AdminAccount[]>(ADMINS);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function formatDate(value?: string | null): string {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function mapAdminRecord(record: AdminAccountRecord): AdminAccount {
    return {
      id: record.id,
      name: `${record.first_name} ${record.last_name}`.trim(),
      email: record.email,
      role: record.role,
      is_active: record.is_active,
      created_at: formatDate(record.created_at),
      last_login: record.last_login ? formatDate(record.last_login) : null,
      added_by: "System",
    };
  }

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
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let data = [...admins];
    if (search)            data = data.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== "ALL") data = data.filter(a => a.role === roleFilter);
    return data;
  }, [admins, search, roleFilter]);

  async function handleAdd({ firstName, lastName, email, role, password }: { firstName: string; lastName: string; email: string; role: AdminRole; password: string }) {
    try {
      const created = await createAdminAccount({ firstName, lastName, email, role, password });
      const newAdmin = mapAdminRecord(created);
      setAdmins((as) => [newAdmin, ...as]);
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

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">Admin Management</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e2433] text-white text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Admin
        </button>
      </div>

      {/* Success banner */}
      {addSuccess && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl text-sm text-teal-700 dark:text-teal-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {addSuccess}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        {[
          { label:"Super Admins",    value: admins.filter(a => a.role === "SUPER_ADMIN").length,     color:"text-amber-600 dark:text-amber-400" },
          { label:"Regular Admins",  value: admins.filter(a => a.role === "ADMIN").length,           color:"text-violet-600 dark:text-violet-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4 text-center">
            <p className={cn("text-2xl font-extrabold", color)}>{value}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" autoComplete="new-password" name="admin-search"
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="pl-7 pr-8 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer">
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]">
              <tr>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Admin</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Role</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Created</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Last Login</th>
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {loadingAdmins ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading admin accounts...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">No admin accounts found.</td>
                </tr>
              ) : (
                filtered.map((admin) => (
                  <tr key={admin.id} className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0",
                          admin.role === "SUPER_ADMIN"
                            ? "bg-linear-to-br from-amber-500 to-amber-600"
                            : "bg-linear-to-br from-violet-500 to-violet-700",
                        )}>
                          {admin.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-100">{admin.name}</p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                        admin.role === "SUPER_ADMIN"
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                          : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
                      )}>
                        {admin.role === "SUPER_ADMIN" ? <Shield className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                        {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{admin.created_at}</td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {admin.last_login ?? <span className="text-stone-300 dark:text-stone-600">Never</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {admin.role === "SUPER_ADMIN" ? (
                        <p className="text-[11px] text-stone-300 dark:text-stone-600 text-right pr-1">Protected</p>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDelete(admin.id, admin.name)}
                            disabled={removingId === admin.id}
                            className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3" /> {removingId === admin.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}

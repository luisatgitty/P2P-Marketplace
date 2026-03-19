"use client";

import { useState, useMemo } from "react";
import {
  Search, Plus, Trash2, Eye, EyeOff, X, UserCog,
  Shield, ShieldCheck, Filter, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const ADMINS: AdminAccount[] = [
  { id:"a1", name:"Super Admin",   email:"superadmin@p2pmarket.ph", role:"SUPER_ADMIN", is_active:true,  created_at:"Sep 1, 2025",  last_login:"Mar 19, 2026", added_by:"System"     },
  { id:"a2", name:"Admin One",     email:"admin1@p2pmarket.ph",     role:"ADMIN",       is_active:true,  created_at:"Sep 5, 2025",  last_login:"Mar 19, 2026", added_by:"Super Admin" },
  { id:"a3", name:"Admin Two",     email:"admin2@p2pmarket.ph",     role:"ADMIN",       is_active:true,  created_at:"Oct 12, 2025", last_login:"Mar 18, 2026", added_by:"Super Admin" },
  { id:"a4", name:"Admin Three",   email:"admin3@p2pmarket.ph",     role:"ADMIN",       is_active:false, created_at:"Dec 1, 2025",  last_login:"Jan 30, 2026", added_by:"Super Admin" },
];

// ── Add admin modal ────────────────────────────────────────────────────────────
interface AddModalProps {
  onClose: () => void;
  onAdd:   (admin: { name: string; email: string; role: AdminRole; password: string }) => void;
}

function AddAdminModal({ onClose, onAdd }: AddModalProps) {
  const [name,     setName]    = useState("");
  const [email,    setEmail]   = useState("");
  const [role,     setRole]    = useState<AdminRole>("ADMIN");
  const [password, setPassword]= useState("");
  const [confirm,  setConfirm] = useState("");
  const [showPw,   setShowPw]  = useState(false);
  const [error,    setError]   = useState("");
  const [saving,   setSaving]  = useState(false);

  function handleSubmit() {
    setError("");
    if (!name.trim())   { setError("Full name is required."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Valid email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onAdd({ name: name.trim(), email: email.trim(), role, password });
    }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-[#1c1f2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        <div className="bg-[#1e2433] px-6 py-5 flex items-start justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCog className="w-4 h-4 text-violet-400" />
              <h2 className="text-white font-bold text-base">Add New Admin</h2>
            </div>
            <p className="text-slate-400 text-xs">Create a new admin account. The password must be changed on first login.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Admin Four"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@p2pmarket.ph"
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
                  {r === "SUPER_ADMIN" ? <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" /> : <ShieldCheck className="w-4 h-4 text-violet-400 flex-shrink-0" />}
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
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors" />
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong className="font-bold">Note:</strong> The new admin should change their password immediately on first login.
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 flex gap-2.5 flex-shrink-0 border-t border-stone-100 dark:border-[#252837]">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 rounded-full bg-[#1e2433] dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity">
            {saving ? "Creating…" : "Create Admin →"}
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

  const filtered = useMemo(() => {
    let data = [...admins];
    if (search)            data = data.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== "ALL") data = data.filter(a => a.role === roleFilter);
    return data;
  }, [admins, search, roleFilter]);

  function handleAdd({ name, email, role }: { name: string; email: string; role: AdminRole; password: string }) {
    const newAdmin: AdminAccount = {
      id: `a${Date.now()}`, name, email, role, is_active: true,
      created_at: new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
      last_login: null, added_by: "Super Admin",
    };
    setAdmins(as => [newAdmin, ...as]);
    setShowAdd(false);
    setAddSuccess(`${name} has been added as ${role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}.`);
    setTimeout(() => setAddSuccess(null), 5000);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove admin account for ${name}? They will lose all admin access immediately.`)) return;
    setAdmins(as => as.filter(a => a.id !== id));
  }

  function handleToggle(id: string) {
    setAdmins(as => as.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">Admin Management</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            <span className="font-semibold text-amber-600 dark:text-amber-400">Super Admin only</span>
            {" "}— Create, manage, and revoke admin access
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e2433] text-white text-sm font-bold hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Admin
        </button>
      </div>

      {/* Success banner */}
      {addSuccess && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl text-sm text-teal-700 dark:text-teal-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {addSuccess}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Total Admins",    value: admins.length,                                           color:"text-stone-700 dark:text-stone-200" },
          { label:"Super Admins",    value: admins.filter(a => a.role === "SUPER_ADMIN").length,     color:"text-amber-600 dark:text-amber-400" },
          { label:"Regular Admins",  value: admins.filter(a => a.role === "ADMIN").length,           color:"text-violet-600 dark:text-violet-400" },
          { label:"Active Accounts", value: admins.filter(a => a.is_active).length,                 color:"text-teal-600 dark:text-teal-400" },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
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
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Added By</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Created</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Last Login</th>
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {filtered.map(admin => (
                <tr key={admin.id} className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0",
                        admin.role === "SUPER_ADMIN"
                          ? "bg-gradient-to-br from-amber-500 to-amber-600"
                          : "bg-gradient-to-br from-violet-500 to-violet-700",
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
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold",
                      admin.is_active ? "text-teal-600 dark:text-teal-400" : "text-stone-400 dark:text-stone-500"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", admin.is_active ? "bg-teal-500" : "bg-stone-400")} />
                      {admin.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{admin.added_by}</td>
                  <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{admin.created_at}</td>
                  <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                    {admin.last_login ?? <span className="text-stone-300 dark:text-stone-600">Never</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {/* Protect the current super admin from being removed */}
                    {admin.role === "SUPER_ADMIN" && admin.id === "a1" ? (
                      <p className="text-[11px] text-stone-300 dark:text-stone-600 text-right pr-1">Protected</p>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => handleToggle(admin.id)}
                          className={cn("text-[11px] font-bold px-2 py-1 rounded-lg transition-colors",
                            admin.is_active
                              ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              : "text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20",
                          )}>
                          {admin.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" onClick={() => handleDelete(admin.id, admin.name)}
                          className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded-lg transition-colors">
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-2xl p-4 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
        <strong className="font-bold text-stone-700 dark:text-stone-300">Admin Account Policy:</strong>{" "}
        Admin accounts have access to sensitive user data and platform controls. Only create accounts for trusted personnel.
        Removed accounts are permanently deleted. All admin actions are logged for accountability.
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}

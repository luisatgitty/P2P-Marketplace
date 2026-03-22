"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserCheck,
  UserX,
  Trash2,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateImageURL } from "@/utils/validation";
import {
  getAdminUsers,
  setAdminUserActive,
  deleteAdminUser,
  type AdminUserRecord,
} from "@/services/adminUsersService";

// ── Types ──────────────────────────────────────────────────────────────────────
type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
type VerifStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
type SortField =
  | "name"
  | "email"
  | "role"
  | "verification"
  | "joined"
  | "last_login"
  | "listings";
type SortDir = "asc" | "desc";

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string | null;
  role: Role;
  verification: VerifStatus;
  is_active: boolean;
  is_email_verified: boolean;
  failed_login: number;
  listings: number;
  last_login: string | null;
  joined: string;
  location: string;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}


function VerifBadge({ status }: { status: VerifStatus }) {
  const map = {
    VERIFIED:
      "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    PENDING:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    UNVERIFIED:
      "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
    REJECTED: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  };
  const label = {
    VERIFIED: "Verified",
    PENDING: "Pending",
    UNVERIFIED: "Unverified",
    REJECTED: "Rejected",
  };
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full",
        map[status],
      )}
    >
      {label[status]}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold",
        active
          ? "text-teal-600 dark:text-teal-400"
          : "text-stone-400 dark:text-stone-500",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-teal-500" : "bg-stone-400",
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SortIcon({
  field,
  sort,
}: {
  field: SortField;
  sort: { field: SortField; dir: SortDir };
}) {
  if (sort.field !== field)
    return (
      <ChevronsUpDown className="w-3 h-3 text-stone-300 dark:text-stone-600 ml-1" />
    );
  return sort.dir === "asc" ? (
    <ChevronUp className="w-3 h-3 text-stone-700 dark:text-stone-200 ml-1" />
  ) : (
    <ChevronDown className="w-3 h-3 text-stone-700 dark:text-stone-200 ml-1" />
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [verifFilter, setVerif] = useState<string>("ALL");
  const [statusFilter, setStatus] = useState<string>("ALL");
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "joined",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);
  const PER_PAGE = 8;

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const data = await getAdminUsers();
        if (!mounted) return;
        setUsers((data ?? []) as AdminUserRecord[]);
      } catch (err) {
        if (!mounted) return;
        const message = typeof err === "string" ? err : "Failed to load users";
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    };

    void loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleSort(field: SortField) {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );
    setPage(1);
  }

  const filtered = useMemo(() => {
    let data = [...users];
    if (search)
      data = data.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      );
    if (verifFilter !== "ALL")
      data = data.filter((u) => u.verification === verifFilter);
    if (statusFilter !== "ALL")
      data = data.filter((u) => (statusFilter === "ACTIVE") === u.is_active);
    data.sort((a, b) => {
      let va: any, vb: any;
      if (sort.field === "name") {
        va = `${a.first_name} ${a.last_name}`;
        vb = `${b.first_name} ${b.last_name}`;
      } else if (sort.field === "email") {
        va = a.email;
        vb = b.email;
      } else if (sort.field === "listings") {
        va = a.listings;
        vb = b.listings;
      } else if (sort.field === "joined") {
        va = new Date(a.joined).getTime();
        vb = new Date(b.joined).getTime();
      } else if (sort.field === "last_login") {
        va = a.last_login ? new Date(a.last_login).getTime() : 0;
        vb = b.last_login ? new Date(b.last_login).getTime() : 0;
      } else {
        va = "";
        vb = "";
      }
      return sort.dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });
    return data;
  }, [users, search, verifFilter, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleToggleActive(id: string) {
    const target = users.find((u) => u.id === id);
    if (!target) return;

    if (target.is_active) {
      const confirmed = window.confirm("Deactivate this user account?");
      if (!confirmed) return;
    }

    const nextIsActive = !target.is_active;
    setActionLoadingUserId(id);
    try {
      await setAdminUserActive(id, nextIsActive);
      setUsers((u) =>
        u.map((user) =>
          user.id === id ? { ...user, is_active: nextIsActive } : user,
        ),
      );
      toast.success(`User ${nextIsActive ? "activated" : "deactivated"} successfully`, { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to update user status";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Permanently delete this user? This cannot be undone."))
      return;

    setActionLoadingUserId(id);
    try {
      await deleteAdminUser(id);
      setUsers((u) => u.filter((user) => user.id !== id));
      toast.success("User deleted successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to delete user";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingUserId(null);
    }
  }

  const TH = ({ label, field }: { label: string; field: SortField }) => (
    <th
      className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sort={sort} />
      </span>
    </th>
  );

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
            Users
          </h2>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {[
              {
                label: "Verification",
                value: verifFilter,
                setter: setVerif,
                options: [
                  ["ALL", "All"],
                  ["VERIFIED", "Verified"],
                  ["PENDING", "Pending"],
                  ["UNVERIFIED", "Unverified"],
                  ["REJECTED", "Rejected"],
                ],
              },
              {
                label: "Status",
                value: statusFilter,
                setter: setStatus,
                options: [
                  ["ALL", "All"],
                  ["ACTIVE", "Active"],
                  ["INACTIVE", "Inactive"],
                ],
              },
            ].map(({ label, value, setter, options }) => (
              <div key={label} className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                <select
                  value={value}
                  onChange={(e) => {
                    setter(e.target.value);
                    setPage(1);
                  }}
                  className="pl-7 pr-8 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors appearance-none cursor-pointer"
                >
                  {options.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {(search ||
              verifFilter !== "ALL" ||
              statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setVerif("ALL");
                  setStatus("ALL");
                  setPage(1);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2.5">
          {loadingUsers ? "Loading users..." : `Showing ${paged.length} of ${filtered.length} users`}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]">
              <tr>
                <TH label="Name" field="name" />
                <TH label="Verification" field="verification" />
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  Status
                </th>
                <TH label="Listings" field="listings" />
                <TH label="Joined" field="joined" />
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  Last Login
                </th>
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {loadingUsers ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                  >
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                paged.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.profile_image_url ? (
                          <img
                            src={validateImageURL(user.profile_image_url)}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {user.first_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate max-w-40">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate max-w-40">
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-[11px] text-stone-400 dark:text-stone-500">
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <VerifBadge status={user.verification} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusDot active={user.is_active} />
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-stone-600 dark:text-stone-300 text-center">
                      {user.listings}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {formatDateTime(user.joined)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {user.last_login ? formatDateTime(user.last_login) : (
                        <span className="text-stone-300 dark:text-stone-600">
                          Never
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/profile?userId=${user.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View"
                          aria-label="View"
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#252837] hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          title={user.is_active ? "Deactivate" : "Activate"}
                          aria-label={user.is_active ? "Deactivate" : "Activate"}
                          onClick={() => handleToggleActive(user.id)}
                          disabled={actionLoadingUserId === user.id}
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#252837] hover:text-stone-700 dark:hover:text-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {user.is_active ? (
                            <UserX className="w-4 h-4 text-amber-500" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-teal-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Delete User"
                          aria-label="Delete User"
                          onClick={() => handleDelete(user.id)}
                          disabled={actionLoadingUserId === user.id}
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 dark:border-[#2a2d3e]">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Page {page} of {totalPages} · {filtered.length} results
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                  page === n
                    ? "bg-[#1e2433] text-white"
                    : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837]",
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

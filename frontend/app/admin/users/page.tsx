"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  RotateCw,
  X,
  CircleDashed,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImageLink } from "@/components/image-link";
import {
  getAdminUsers,
  setAdminUserActive,
  deleteAdminUser,
  type AdminUserRecord,
} from "@/services/adminUsersService";

// ── shadcn components ──────────────────────────────────────────────────────────
import { Button }            from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input }             from "@/components/ui/input";
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
type Role        = "USER" | "ADMIN" | "SUPER_ADMIN";
type VerifStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
type SortField   = "name" | "email" | "role" | "verification" | "joined" | "last_login" | "listings" | "locked_until" | "updated" | "deleted";
type SortDir     = "asc" | "desc";

interface AdminUser {
  id:                string;
  first_name:        string;
  last_name:         string;
  profile_image_url: string;
  email:             string;
  phone:             string | null;
  role:              Role;
  verification:      VerifStatus;
  is_active:         boolean;
  is_email_verified: boolean;
  failed_login:      number;
  listings:          number;
  client_transactions:number;
  owner_transactions: number;
  account_locked_until: string | null;
  last_login:        string | null;
  joined:            string;
  updated_at:        string;
  deleted_at:        string | null;
  action_by_name:    string;
  action_by_email:   string;
  location:          string;
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day:   "2-digit",
    year:  "numeric",
  });
}

function formatTime12h(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function VerifBadge({ status }: { status: VerifStatus }) {
  const map = {
    VERIFIED:   "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    PENDING:    "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    UNVERIFIED: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
    REJECTED:   "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  };
  const label = {
    VERIFIED: "Verified", PENDING: "Pending", UNVERIFIED: "Unverified", REJECTED: "Rejected",
  };
  return (
    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", map[status])}>
      {label[status]}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-sm font-semibold",
      active ? "text-teal-600 dark:text-teal-400" : "text-stone-400 dark:text-stone-500",
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-teal-500" : "bg-stone-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field)
    return <ChevronsUpDown className="w-3 h-3 text-stone-300 dark:text-stone-600 ml-1" />;
  return sort.dir === "asc"
    ? <ChevronUp   className="w-3 h-3 text-stone-700 dark:text-stone-200 ml-1" />
    : <ChevronDown className="w-3 h-3 text-stone-700 dark:text-stone-200 ml-1" />;
}

// ── Shared filter select ───────────────────────────────────────────────────────
function FilterSelect({
  value,
  onChange,
  options,
}: {
  value:    string;
  onChange: (v: string) => void;
  options:  [string, string][];
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-3 pr-8 py-2 h-9 bg-transparent border border-stone-200 dark:border-[#2a2d3e] rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer dark:bg-[#13151f]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [search,             setSearch]             = useState("");
  const [debouncedSearch,    setDebouncedSearch]    = useState("");
  const [verifFilter,        setVerif]              = useState<string>("ALL");
  const [statusFilter,       setStatus]             = useState<string>("ALL");
  const [sort,               setSort]               = useState<{ field: SortField; dir: SortDir }>({ field: "joined", dir: "desc" });
  const [users,              setUsers]              = useState<AdminUser[]>([]);
  const [loadingUsers,       setLoadingUsers]       = useState(true);
  const [currentPage,        setCurrentPage]        = useState(1);
  const [totalUsersCount,    setTotalUsersCount]    = useState(0);
  const [isRefreshing,       setIsRefreshing]       = useState(false);
  const [actionLoadingUserId,setActionLoadingUserId]= useState<string | null>(null);
  const FETCH_LIMIT = 15;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (pageNumber: number) => {
    setLoadingUsers(true);
    const nextOffset = (pageNumber - 1) * FETCH_LIMIT;

    try {
      const payload = await getAdminUsers({
        search: debouncedSearch,
        verified: verifFilter,
        status: statusFilter,
        limit: FETCH_LIMIT,
        offset: nextOffset,
      });

      const received = (payload.users ?? []) as AdminUserRecord[];
      setUsers(received);
      setTotalUsersCount(payload.total);
      setCurrentPage(pageNumber);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to load users";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoadingUsers(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, verifFilter, statusFilter]);

  useEffect(() => {
    void loadUsers(currentPage);
  }, [currentPage, loadUsers]);

  // ── Sort ──────────────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    setCurrentPage(1);
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
  }

  // ── Sort loaded chunk ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...users];
    data.sort((a, b) => {
      let va: any, vb: any;
      if      (sort.field === "name")       { va = `${a.first_name} ${a.last_name}`; vb = `${b.first_name} ${b.last_name}`; }
      else if (sort.field === "email")      { va = a.email;      vb = b.email;      }
      else if (sort.field === "listings")   { va = a.listings;   vb = b.listings;   }
      else if (sort.field === "joined")     { va = new Date(a.joined).getTime();     vb = new Date(b.joined).getTime();     }
      else if (sort.field === "last_login") { va = a.last_login ? new Date(a.last_login).getTime() : 0; vb = b.last_login ? new Date(b.last_login).getTime() : 0; }
      else if (sort.field === "locked_until") { va = a.account_locked_until ? new Date(a.account_locked_until).getTime() : 0; vb = b.account_locked_until ? new Date(b.account_locked_until).getTime() : 0; }
      else if (sort.field === "updated")    { va = a.updated_at ? new Date(a.updated_at).getTime() : 0; vb = b.updated_at ? new Date(b.updated_at).getTime() : 0; }
      else if (sort.field === "deleted")    { va = a.deleted_at ? new Date(a.deleted_at).getTime() : 0; vb = b.deleted_at ? new Date(b.deleted_at).getTime() : 0; }
      else { va = ""; vb = ""; }
      return sort.dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });
    return data;
  }, [users, sort]);

  const verifiedCount    = users.filter(u => u.verification === "VERIFIED").length;
  const pendingCount     = users.filter(u => u.verification === "PENDING").length;
  const unverifiedCount  = users.filter(u => u.verification === "UNVERIFIED").length;
  const rejectedCount    = users.filter(u => u.verification === "REJECTED").length;

  // ── Actions ───────────────────────────────────────────────────────────────────

  function formatDate(value?: string | null): string {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  async function handleToggleActive(id: string) {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const isCurrentlyBanned = !!(target.account_locked_until && new Date(target.account_locked_until) > new Date());
    if (!isCurrentlyBanned && !window.confirm("Ban this user for 3 days?")) return;
    if (isCurrentlyBanned && !window.confirm("Unban this user account?")) return;

    const nextIsActive = isCurrentlyBanned;
    const nowIso = new Date().toISOString();
    const lockUntilIso = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString();
    const actor = getCurrentAdminSnapshot();

    setActionLoadingUserId(id);
    try {
      await setAdminUserActive(id, nextIsActive);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id
            ? {
                ...user,
                is_active: nextIsActive,
                account_locked_until: nextIsActive ? null : lockUntilIso,
                action_by_name: nextIsActive ? "" : (actor?.fullName || user.action_by_name || ""),
                action_by_email: nextIsActive ? "" : (actor?.email || user.action_by_email || ""),
                updated_at: nowIso,
              }
            : user
        )
      );
      toast.success(`User ${nextIsActive ? "unbanned" : "banned for 3 days"} successfully`, { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to update user status";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    setActionLoadingUserId(id);
    try {
      await deleteAdminUser(id);
      const nowIso = new Date().toISOString();
      const actor = getCurrentAdminSnapshot();
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id
            ? {
                ...user,
                is_active: false,
                deleted_at: nowIso,
                updated_at: nowIso,
                action_by_name: actor?.fullName || user.action_by_name || "",
                action_by_email: actor?.email || user.action_by_email || "",
              }
            : user
        )
      );
      toast.success("User deleted successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to delete user";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingUserId(null);
    }
  }

  const hasActiveFilters = search || verifFilter !== "ALL" || statusFilter !== "ALL";
  const totalPages = Math.max(1, Math.ceil(totalUsersCount / FETCH_LIMIT));
  const paginationPages = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  // ── Sortable column header ────────────────────────────────────────────────────
  const SortableTH = ({ label, field }: { label: string; field: SortField }) => (
    <TableHead
      className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sort={sort} />
      </span>
    </TableHead>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh)] p-5 sm:p-6 flex flex-col gap-5 min-h-0">

      {/* ── Page header ── */}
      {/* <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Users
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Search, filter, and manage all registered user accounts
        </p>
      </div> */}

      {/* ── Summary cards — clickable to filter by status ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: "Total", count: totalUsersCount, status: "ALL",        color: "text-stone-700 dark:text-stone-200", Icon: Users },
          { label: "Verified",    count: verifiedCount,   status: "VERIFIED",   color: "text-teal-600 dark:text-teal-400",   Icon: ShieldCheck },
          { label: "Pending",     count: pendingCount,    status: "PENDING",    color: "text-amber-600 dark:text-amber-400", Icon: Clock },
          { label: "Unverified",  count: unverifiedCount, status: "UNVERIFIED", color: "text-stone-600 dark:text-stone-300", Icon: AlertTriangle },
          { label: "Rejected",    count: rejectedCount,   status: "REJECTED",   color: "text-red-600 dark:text-red-400",     Icon: XCircle },
        ].map(({ label, count, status, color, Icon }) => (
          <Card
            key={label}
            className={cn(
              "p-4 rounded-lg cursor-pointer hover:shadow-sm transition-all card-glass border border-stone-200 dark:border-[#2a2d3e]",
              verifFilter === status && "ring-2 ring-offset-1 ring-current",
            )}
            onClick={() => {
              setVerif(prev => {
                if (status === "ALL") return "ALL";
                return prev === status ? "ALL" : status;
              });
              setCurrentPage(1);
            }}
          >
            <CardContent className="text-center">
              {/* <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} /> */}
              <p className={cn("text-xl font-extrabold", color)}>{count}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Search by name or email…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        {/* Filter selects + clear */}
        <div className="flex gap-2 flex-wrap">
          <FilterSelect
            value={verifFilter}
            onChange={v => { setVerif(v); setCurrentPage(1); }}
            options={[
              ["ALL",        "All Verification" ],
              ["VERIFIED",   "Verified"         ],
              ["PENDING",    "Pending"           ],
              ["UNVERIFIED", "Unverified"        ],
              ["REJECTED",   "Rejected"          ],
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatus(v); setCurrentPage(1); }}
            options={[
              ["ALL",      "All Status" ],
              ["ACTIVE",   "Active"     ],
              ["INACTIVE", "Inactive"   ],
            ]}
          />

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => { setSearch(""); setVerif("ALL"); setStatus("ALL"); setCurrentPage(1); }}
              className="hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsRefreshing(true);
            void loadUsers(currentPage);
          }}
          disabled={loadingUsers}
          className="border-sky-600 text-sky-600! hover:bg-sky-600/10 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:border-sky-400 dark:text-sky-400! dark:hover:bg-sky-400/10 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/40"
        >
          <RotateCw className={cn("w-3.5 h-3.5", loadingUsers && isRefreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* ── Table ── */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden flex-1 min-h-0">
        <CardContent className="p-0 h-full min-h-0 flex flex-col">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <SortableTH label="Name"         field="name"         />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Contact Info
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Verification
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Status
                  </TableHead>
                  <SortableTH label="Listings"     field="listings"     />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Transactions
                  </TableHead>
                  <SortableTH label="Locked Until" field="locked_until" />
                  <SortableTH label="Joined"       field="joined"       />
                  <SortableTH label="Last Login"   field="last_login"   />
                  <SortableTH label="Updated" field="updated" />
                  <SortableTH label="Deleted" field="deleted" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Action By
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingUsers && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      Loading users…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(user => (
                    <TableRow
                      key={user.id}
                      className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                    >
                      {/* Name */}
                      <TableCell className="py-2 whitespace-nowrap">
                        <div className="flex items-center gap-3 w-max">
                          <ImageLink
                            href={`/profile?userId=${user.id}`}
                            newTab
                            src={user.profile_image_url}
                            type="profile"
                            label={`${user.first_name} ${user.last_name}`}
                          />
                          <div className="w-max">
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                              {user.first_name}
                            </p>
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                              {user.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email + Phone Number */}
                      <TableCell className="py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm truncate max-w-40">
                              {user.email}
                            </p>
                            {user.phone && (
                              <p className="text-sm text-stone-400 dark:text-stone-500">
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Verification badge */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 max-w-44 truncate">
                        {user.location || <span className="text-stone-300 dark:text-stone-600">—</span>}
                      </TableCell>

                      {/* Verification badge */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <VerifBadge status={user.verification} />
                      </TableCell>

                      {/* Active status */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <StatusDot active={user.is_active} />
                      </TableCell>

                      {/* Listings count */}
                      <TableCell className="py-3.5 text-sm font-semibold text-stone-600 dark:text-stone-300 text-center">
                        {user.listings}
                      </TableCell>

                      {/* Transactions */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-stone-700 dark:text-stone-200 font-semibold">
                            Client: {user.client_transactions.toLocaleString()}
                          </p>
                          <p className="text-stone-500 dark:text-stone-400">
                            Owner: {user.owner_transactions.toLocaleString()}
                          </p>
                        </div>
                      </TableCell>

                      {/* Account locked until */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {user.account_locked_until
                          ? (
                            <div className="leading-tight">
                              <p className="text-sm font-medium">
                                {formatDateTime(user.account_locked_until)}
                              </p>
                              <p className="text-xs">
                                {formatTime12h(user.account_locked_until)}
                              </p>
                            </div>
                          )
                          : <span className="text-stone-300 dark:text-stone-600">Never</span>
                        }
                      </TableCell>

                      {/* Joined */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDateTime(user.joined)}
                      </TableCell>

                      {/* Last login */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {user.last_login
                          ? (
                            <div className="leading-tight">
                              <p className="text-sm font-medium">
                                {formatDateTime(user.last_login)}
                              </p>
                              <p className="text-xs">
                                {formatTime12h(user.last_login)}
                              </p>
                            </div>
                          )
                          : <span className="text-stone-300 dark:text-stone-600">Never</span>
                        }
                      </TableCell>

                      {/* Updated */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDateTime(user.updated_at)}
                      </TableCell>

                      {/* Deleted */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {(user.deleted_at)
                          ? (
                            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                              {formatDate(user.deleted_at)}
                            </p>
                          )
                          : <span className="text-stone-300 dark:text-stone-600">—</span>
                        }
                      </TableCell>

                      {/* Action By */}
                      <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {user.action_by_name
                          ? (
                            <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                              {user.action_by_name || "—"}
                            </p>
                          )
                          : <span className="text-stone-300 dark:text-stone-600">—</span>
                        }
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {!user.deleted_at && (
                            <>
                              {/* Activate / deactivate */}
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                title={user.account_locked_until && new Date(user.account_locked_until) > new Date() ? "Unban" : "Ban 3 Days"}
                                aria-label={user.account_locked_until && new Date(user.account_locked_until) > new Date() ? "Unban" : "Ban 3 Days"}
                                onClick={() => handleToggleActive(user.id)}
                                disabled={actionLoadingUserId === user.id}
                                className="w-7 h-7 hover:bg-stone-100 dark:hover:bg-[#252837] disabled:opacity-50"
                              >
                                {user.account_locked_until && new Date(user.account_locked_until) > new Date()
                                  ? <CircleDashed className="w-4 h-4 text-teal-500 hover:text-teal-800" />
                                  : <Ban className="w-4 h-4 text-amber-500 hover:text-amber-800" />
                                }
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                title="Delete User"
                                aria-label="Delete User"
                                onClick={() => handleDelete(user.id)}
                                disabled={actionLoadingUserId === user.id}
                                className="w-7 h-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
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
              Showing {filtered.length.toLocaleString()} of {totalUsersCount.toLocaleString()} result{totalUsersCount !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={loadingUsers || currentPage <= 1}
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
                  disabled={loadingUsers}
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
                disabled={loadingUsers || currentPage >= totalPages}
                className="h-8 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

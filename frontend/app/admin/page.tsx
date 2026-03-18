"use client";

// Place at: frontend/app/admin/page.tsx

import { useState, useEffect, useCallback, JSX } from "react";
import { useRouter } from "next/navigation";

const API = "http://127.0.0.1:5566";

// ── Types (matching DB schema exactly) ────────────────────────────────────────
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  bio: string;
  locationBarangay: string;
  locationCity: string;
  locationProvince: string;
  role: "SUPERADMIN" | "USER";
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED";
  isEmailVerified: boolean;
  isActive: boolean;
  failedLoginAttempts: number;
  createdAt: string;
  updatedAt: string;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  priceUnit?: string;
  type: "sale" | "rent" | "service";
  status: "ACTIVE" | "INACTIVE" | "FLAGGED";
  location: string;
  sellerName: string;
  createdAt: string;
}

interface Report {
  id: number;
  type: "Listing" | "User";
  targetId: string;
  target: string;
  reporter: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeListings: number;
  pendingReports: number;
  totalSales: number;
}

type Tab = "overview" | "users" | "listings" | "reports";

// ── Icons ─────────────────────────────────────────────────────────────────────
const DashIcon    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
const UsersIcon   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const ListingIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const ReportIcon  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
const ShieldIcon  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const LogoutIcon  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;
const TrendUpIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;

// ── Badges ────────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: string }) => (
  role === "SUPERADMIN"
    ? <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-semibold px-2 py-0.5 rounded-full">SUPERADMIN</span>
    : <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">USER</span>
);

const VerifyBadge = ({ status }: { status: string }) => {
  if (status === "VERIFIED") return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-medium px-2 py-0.5 rounded-full">Verified</span>;
  if (status === "PENDING")  return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded-full">Pending</span>;
  return <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">Unverified</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "ACTIVE" || status === "RESOLVED") return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-medium px-2 py-0.5 rounded-full">{status}</span>;
  if (status === "FLAGGED" || status === "PENDING")  return <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-xs font-medium px-2 py-0.5 rounded-full">{status}</span>;
  return <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">{status}</span>;
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded-lg ${className}`} />
);

// ── Fetch helper (always sends session cookie) ────────────────────────────────
const apiFetch = (path: string, options: RequestInit = {}) =>
  fetch(`${API}${path}`, { ...options, credentials: "include" });

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab]         = useState<Tab>("overview");
  const [currentUser, setCurrentUser]     = useState<User | null>(null);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [users, setUsers]                 = useState<User[]>([]);
  const [listings, setListings]           = useState<Listing[]>([]);
  const [reports, setReports]             = useState<Report[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [userSearch, setUserSearch]       = useState("");
  const [listingSearch, setListingSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Auth check via session cookie ──
//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         const res = await apiFetch("/auth/me");
//         if (!res.ok) { router.push("/login"); return; }
//         const data = await res.json();
//         const user = data?.data?.user;
//         if (user?.role !== "SUPERADMIN") { router.push("/"); return; }
//         setCurrentUser(user);
//       } catch {
//         router.push("/login");
//       }
//     };
//     checkAuth();
//   }, [router]);
    useEffect(() => {
        // TEMP: comment out auth check for UI testing
        setCurrentUser({ id: 1, firstName: "ADMIN ACC", lastName: "SUPER ADMIN", email: "tubigluis3@email.com", phoneNumber: "09171234001", bio: "", locationBarangay: "San Nicolas", locationCity: "San Pablo City", locationProvince: "Laguna", role: "SUPERADMIN", verificationStatus: "VERIFIED", isEmailVerified: true, isActive: true, failedLoginAttempts: 0, createdAt: "2024-01-01", updatedAt: "2024-01-01" });
        }, [router]);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      // TODO: GET /admin/stats → { totalUsers, activeListings, pendingReports, totalSales }
      const res = await apiFetch("/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data.data);
    } catch (err: any) { setError(err.message); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // TODO: GET /admin/users → array of all users
      const res = await apiFetch("/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.data);
    } catch (err: any) { setError(err.message); }
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      // TODO: GET /admin/listings → array of all listings
      const res = await apiFetch("/admin/listings");
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data.data);
    } catch (err: any) { setError(err.message); }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      // TODO: GET /admin/reports → array of all reports
      const res = await apiFetch("/admin/reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.data);
    } catch (err: any) { setError(err.message); }
  }, []);

//   useEffect(() => {
//     if (!currentUser) return;
//     const load = async () => {
//       setLoading(true);
//       await Promise.all([fetchStats(), fetchUsers(), fetchListings(), fetchReports()]);
//       setLoading(false);
//     };
//     load();
//   }, [currentUser, fetchStats, fetchUsers, fetchListings, fetchReports]);
    useEffect(() => {
    if (!currentUser) return;
    // TEMP: mock data for UI testing
    setStats({ totalUsers: 1248, activeListings: 842, pendingReports: 14, totalSales: 3920 });
    setUsers([
        { id: 1, firstName: "ADMIN ACC", lastName: "SUPER ADMIN", email: "tubigluis3@email.com", phoneNumber: "09171234001", bio: "", locationBarangay: "San Nicolas", locationCity: "San Pablo City", locationProvince: "Laguna", role: "SUPERADMIN", verificationStatus: "VERIFIED", isEmailVerified: true, isActive: true, failedLoginAttempts: 0, createdAt: "2024-01-01", updatedAt: "2024-01-01" },
        { id: 2, firstName: "Maria", lastName: "Santos", email: "maria@email.com", phoneNumber: "09171234002", bio: "", locationBarangay: "BGC", locationCity: "Makati City", locationProvince: "Metro Manila", role: "USER", verificationStatus: "VERIFIED", isEmailVerified: true, isActive: true, failedLoginAttempts: 0, createdAt: "2024-02-01", updatedAt: "2024-02-01" },
        { id: 3, firstName: "Pedro", lastName: "Reyes", email: "pedro@email.com", phoneNumber: "09171234003", bio: "", locationBarangay: "Poblacion", locationCity: "San Pablo", locationProvince: "Laguna", role: "USER", verificationStatus: "PENDING", isEmailVerified: false, isActive: true, failedLoginAttempts: 2, createdAt: "2024-03-01", updatedAt: "2024-03-01" },
        { id: 4, firstName: "Ana", lastName: "Cruz", email: "ana@email.com", phoneNumber: "09171234004", bio: "", locationBarangay: "Cubao", locationCity: "Quezon City", locationProvince: "Metro Manila", role: "USER", verificationStatus: "UNVERIFIED", isEmailVerified: false, isActive: false, failedLoginAttempts: 5, createdAt: "2024-04-01", updatedAt: "2024-04-01" },
    ]);
    setListings([
        { id: "1", title: "Casio G-Shock GA-2100", sellerName: "Juan dela Cruz", price: 1800, type: "sale", status: "ACTIVE", location: "Calamba, Laguna", createdAt: "2024-05-01" },
        { id: "2", title: "Studio Unit — Makati", sellerName: "Maria Santos", price: 12000, priceUnit: "/month", type: "rent", status: "ACTIVE", location: "Makati City", createdAt: "2024-05-02" },
        { id: "3", title: "Aircon Cleaning", sellerName: "Pedro Reyes", price: 500, type: "service", status: "FLAGGED", location: "San Pablo, Laguna", createdAt: "2024-05-03" },
    ]);
    setReports([
        { id: 1, type: "Listing", targetId: "3", target: "Aircon Cleaning", reporter: "Maria Santos", reason: "Suspected scam", status: "PENDING", createdAt: "2024-05-10" },
        { id: 2, type: "User", targetId: "4", target: "Ana Cruz", reporter: "Pedro Reyes", reason: "Fake account", status: "RESOLVED", createdAt: "2024-05-08" },
    ]);
    setLoading(false);
    }, [currentUser]);

// ── Actions ───────────────────────────────────────────────────────────────
  const toggleUserActive = async (userId: number, isActive: boolean) => {
    setActionLoading(`user-${userId}`);
    try {
      // TODO: PATCH /admin/users/:id → { isActive: boolean }
      await apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      await fetchUsers();
    } catch { setError("Failed to update user."); }
    finally { setActionLoading(null); }
  };

  const removeListing = async (listingId: string) => {
    setActionLoading(`listing-${listingId}`);
    try {
      // TODO: DELETE /admin/listings/:id
      await apiFetch(`/admin/listings/${listingId}`, { method: "DELETE" });
      await fetchListings();
    } catch { setError("Failed to remove listing."); }
    finally { setActionLoading(null); }
  };

  const updateReport = async (reportId: number, status: "RESOLVED" | "DISMISSED") => {
    setActionLoading(`report-${reportId}`);
    try {
      // TODO: PATCH /admin/reports/:id → { status }
      await apiFetch(`/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchReports();
    } catch { setError("Failed to update report."); }
    finally { setActionLoading(null); }
  };

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "DELETE" });
    router.push("/login");
  };

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filteredUsers    = users.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredListings = listings.filter(l => `${l.title} ${l.sellerName}`.toLowerCase().includes(listingSearch.toLowerCase()));

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(p);

  const NAV: { label: string; tab: Tab; icon: JSX.Element }[] = [
    { label: "Overview", tab: "overview", icon: <DashIcon />    },
    { label: "Users",    tab: "users",    icon: <UsersIcon />   },
    { label: "Listings", tab: "listings", icon: <ListingIcon /> },
    { label: "Reports",  tab: "reports",  icon: <ReportIcon />  },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0">
              <ShieldIcon />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Superadmin Dashboard</h1>
              <p className="text-xs text-muted-foreground">P2P Marketplace Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Logged in as <span className="font-medium text-foreground">{currentUser.firstName} {currentUser.lastName}</span>
              </span>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-full transition-colors">
              <LogoutIcon /> Logout
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl mb-6 flex items-center justify-between">
            {error}
            <button onClick={() => setError("")} className="underline text-xs ml-3">Dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl mb-8 w-fit overflow-x-auto no-scroll">
          {NAV.map(({ label, tab, icon }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />) :
                stats ? [
                  { label: "Total Users",     value: stats.totalUsers,     color: "text-violet-500"  },
                  { label: "Active Listings", value: stats.activeListings, color: "text-emerald-500" },
                  { label: "Pending Reports", value: stats.pendingReports, color: "text-rose-500"    },
                  { label: "Total Sales",     value: stats.totalSales,     color: "text-amber-500"   },
                ].map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground"><TrendUpIcon /> Live data</div>
                  </div>
                )) : <p className="col-span-4 text-sm text-muted-foreground">Stats unavailable.</p>
              }
            </div>

            {/* Recent Users */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Recent Users</h2>
              {loading ? <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> :
                users.length === 0 ? <p className="text-sm text-muted-foreground">No users found.</p> :
                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <RoleBadge role={u.role} />
                        <VerifyBadge status={u.verificationStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>

            {/* Pending Reports */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Pending Reports</h2>
              {loading ? <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> :
                reports.filter(r => r.status === "PENDING").length === 0
                  ? <p className="text-sm text-muted-foreground">No pending reports.</p>
                  : reports.filter(r => r.status === "PENDING").map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.target}</p>
                        <p className="text-xs text-muted-foreground">{r.reason} · by {r.reporter}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => updateReport(r.id, "RESOLVED")} className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">Resolve</button>
                        <button onClick={() => updateReport(r.id, "DISMISSED")} className="text-xs text-rose-500 hover:text-rose-400 font-medium">Dismiss</button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ══ USERS ══ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                User Management {!loading && <span className="text-muted-foreground font-normal text-sm">({users.length})</span>}
              </h2>
              <input type="text" placeholder="Search by name or email..." value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors w-full sm:w-72" />
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Name", "Email", "Phone", "Location", "Role", "Verification", "Status", "Failed Logins", "Joined", "Actions"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={10} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                    )) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</td></tr>
                    ) : filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <span className="font-medium text-foreground">{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.phoneNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.locationCity}, {u.locationProvince}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3 whitespace-nowrap"><VerifyBadge status={u.verificationStatus} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={u.failedLoginAttempts > 3 ? "text-rose-500 font-medium" : "text-muted-foreground"}>{u.failedLoginAttempts}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString("en-PH")}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button disabled={actionLoading === `user-${u.id}`}
                            onClick={() => toggleUserActive(u.id, u.isActive)}
                            className={`text-xs font-medium transition-colors disabled:opacity-50 ${u.isActive ? "text-rose-500 hover:text-rose-400" : "text-emerald-600 hover:text-emerald-500"}`}>
                            {actionLoading === `user-${u.id}` ? "..." : u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ LISTINGS ══ */}
        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                Listings Management {!loading && <span className="text-muted-foreground font-normal text-sm">({listings.length})</span>}
              </h2>
              <input type="text" placeholder="Search listings..." value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                className="bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors w-full sm:w-72" />
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Title", "Seller", "Price", "Type", "Location", "Status", "Date", "Actions"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                    )) : filteredListings.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No listings found.</td></tr>
                    ) : filteredListings.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{l.title}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{l.sellerName}</td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {formatPrice(l.price)}{l.priceUnit && <span className="text-muted-foreground text-xs"> {l.priceUnit}</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            l.type === "sale"    ? "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300" :
                            l.type === "rent"    ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" :
                                                   "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                          }`}>{l.type}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{l.location}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={l.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString("en-PH")}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button disabled={actionLoading === `listing-${l.id}`}
                            onClick={() => removeListing(l.id)}
                            className="text-xs text-rose-500 hover:text-rose-400 font-medium disabled:opacity-50">
                            {actionLoading === `listing-${l.id}` ? "..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ REPORTS ══ */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Reports {!loading && <span className="text-muted-foreground font-normal text-sm">({reports.length})</span>}
            </h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Type", "Target", "Reporter", "Reason", "Status", "Date", "Actions"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? Array(4).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                    )) : reports.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No reports found.</td></tr>
                    ) : reports.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">{r.type}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.target}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.reporter}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.reason}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString("en-PH")}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <button disabled={actionLoading === `report-${r.id}`}
                                onClick={() => updateReport(r.id, "RESOLVED")}
                                className="text-xs text-emerald-600 hover:text-emerald-500 font-medium disabled:opacity-50">
                                {actionLoading === `report-${r.id}` ? "..." : "Resolve"}
                              </button>
                              <button disabled={actionLoading === `report-${r.id}`}
                                onClick={() => updateReport(r.id, "DISMISSED")}
                                className="text-xs text-rose-500 hover:text-rose-400 font-medium disabled:opacity-50">
                                Dismiss
                              </button>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
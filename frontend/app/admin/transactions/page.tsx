'use client';

import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Handshake,
  Home,
  RotateCw,
  Search,
  ShoppingBag,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ImageLink } from '@/components/image/ImageLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/string-builder';

import {
  type AdminTransactionRecord,
  getAdminTransactions,
} from './_services/admin-transactions';

// ── Types ──────────────────────────────────────────────────────────────────────
type ListingType = 'SELL' | 'RENT' | 'SERVICE';
type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type SortField =
  | 'client'
  | 'owner'
  | 'listing'
  | 'scheduleEnd'
  | 'totalPrice'
  | 'completedAt'
  | 'createdAt';
type SortDir = 'asc' | 'desc';

interface AdminTransaction extends AdminTransactionRecord {}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

const TYPE_CONFIG: Record<
  ListingType,
  { label: string; cls: string; Icon: React.ElementType }
> = {
  SELL: {
    label: 'For Sale',
    cls: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
    Icon: ShoppingBag,
  },
  RENT: {
    label: 'For Rent',
    cls: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    Icon: Home,
  },
  SERVICE: {
    label: 'Service',
    cls: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    Icon: Wrench,
  },
};

const STATUS_CONFIG: Record<TransactionStatus, string> = {
  PENDING:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  COMPLETED: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  CANCELLED: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
};

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'N/A';
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 'N/A';
  return `${s.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })} - ${e.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}`;
}

function buildScheduleUnitsLabel(tx: AdminTransaction): string {
  const units = Math.max(1, Number(tx.schedule_units || 1));
  if (tx.listing_type === 'SELL') {
    return `${units} ${units === 1 ? 'unit' : 'units'}`;
  }
  return `${units} ${units === 1 ? 'day' : 'days'}`;
}

function DealStateRow({ label, agreed }: { label: string; agreed: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {agreed ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
      )}
      <span
        className={cn(
          'text-xs',
          agreed
            ? 'text-emerald-600 dark:text-emerald-300'
            : 'text-amber-600 dark:text-amber-300',
        )}
      >
        {label}: {agreed ? 'Agreed' : 'Pending'}
      </span>
    </div>
  );
}

// ── Sort icon ──────────────────────────────────────────────────────────────────
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
  return sort.dir === 'asc' ? (
    <ChevronUp className="w-3 h-3 ml-1" />
  ) : (
    <ChevronDown className="w-3 h-3 ml-1" />
  );
}

// ── Shared select ──────────────────────────────────────────────────────────────
function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-3 pr-8 py-2 h-9 bg-transparent border border-stone-200 dark:border-[#2a2d3e] rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer dark:bg-[#13151f]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <svg
          className="w-3.5 h-3.5 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: 'createdAt',
    dir: 'desc',
  });
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const loadTransactions = useCallback(
    async (pageNumber: number) => {
      setLoadingTransactions(true);
      const nextOffset = (pageNumber - 1) * FETCH_LIMIT;

      try {
        const payload = await getAdminTransactions({
          search: debouncedSearch,
          type: typeFilter,
          status: statusFilter,
          limit: FETCH_LIMIT,
          offset: nextOffset,
        });

        const received = (payload.transactions ?? []) as AdminTransaction[];
        setTransactions(received);
        setTotalCount(payload.total);
        setCurrentPage(pageNumber);
      } catch (err) {
        const message =
          typeof err === 'string' ? err : 'Failed to load transactions';
        toast.error(message, { position: 'top-center' });
      } finally {
        setLoadingTransactions(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, typeFilter, statusFilter],
  );

  useEffect(() => {
    void loadTransactions(currentPage);
  }, [currentPage, loadTransactions]);

  // ── Sort ──────────────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    setCurrentPage(1);
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' },
    );
  }

  // ── Sort loaded chunk ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const data = [...transactions];
    data.sort((a, b) => {
      let va: string | number = 0;
      let vb: string | number = 0;
      if (sort.field === 'client') {
        va = (a.client_full_name || '').toLowerCase();
        vb = (b.client_full_name || '').toLowerCase();
      } else if (sort.field === 'owner') {
        va = (a.owner_full_name || '').toLowerCase();
        vb = (b.owner_full_name || '').toLowerCase();
      } else if (sort.field === 'listing') {
        va = (a.listing_title || '').toLowerCase();
        vb = (b.listing_title || '').toLowerCase();
      } else if (sort.field === 'scheduleEnd') {
        va = a.end_date ? new Date(a.end_date).getTime() : 0;
        vb = b.end_date ? new Date(b.end_date).getTime() : 0;
      } else if (sort.field === 'totalPrice') {
        va = Number(a.total_price) || 0;
        vb = Number(b.total_price) || 0;
      } else if (sort.field === 'completedAt') {
        va = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        vb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      } else {
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sort.dir === 'asc'
        ? Number(va) - Number(vb)
        : Number(vb) - Number(va);
    });
    return data;
  }, [transactions, sort]);

  const pendingCount = transactions.filter(
    (tx) => tx.status === 'PENDING',
  ).length;
  const confirmedCount = transactions.filter(
    (tx) => tx.status === 'CONFIRMED',
  ).length;
  const completedCount = transactions.filter(
    (tx) => tx.status === 'COMPLETED',
  ).length;
  const cancelledCount = transactions.filter(
    (tx) => tx.status === 'CANCELLED',
  ).length;

  const hasActiveFilters =
    search || typeFilter !== 'ALL' || statusFilter !== 'ALL';
  const totalPages = Math.max(1, Math.ceil(totalCount / FETCH_LIMIT));
  const paginationPages = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  // ── Sortable column header ────────────────────────────────────────────────────
  const SortableTH = ({
    label,
    field,
  }: {
    label: string;
    field: SortField;
  }) => (
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
          Transactions
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Monitor all listing transactions across selling, renting, and service listings.
        </p>
      </div> */}

      {/* ── Summary cards — clickable to filter by status ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          {
            label: 'Total',
            count: totalCount,
            status: 'ALL',
            color: 'text-stone-700 dark:text-stone-200',
            Icon: Handshake,
          },
          {
            label: 'Pending',
            count: pendingCount,
            status: 'PENDING',
            color: 'text-amber-600 dark:text-amber-400',
            Icon: Clock,
          },
          {
            label: 'Confirmed',
            count: confirmedCount,
            status: 'CONFIRMED',
            color: 'text-blue-600 dark:text-blue-400',
            Icon: Handshake,
          },
          {
            label: 'Completed',
            count: completedCount,
            status: 'COMPLETED',
            color: 'text-teal-600 dark:text-teal-400',
            Icon: CheckCircle2,
          },
          {
            label: 'Cancelled',
            count: cancelledCount,
            status: 'CANCELLED',
            color: 'text-red-600 dark:text-red-400',
            Icon: XCircle,
          },
        ].map(({ label, count, status, color, Icon }) => (
          <Card
            key={label}
            className={cn(
              'p-4 rounded-lg cursor-pointer hover:shadow-sm transition-all card-glass border border-stone-200 dark:border-[#2a2d3e]',
              statusFilter === status && 'ring-2 ring-offset-1 ring-current',
            )}
            onClick={() => {
              setCurrentPage(1);
              setStatusFilter((prev) => {
                if (status === 'ALL') return 'ALL';
                return prev === status ? 'ALL' : status;
              });
            }}
          >
            <CardContent className="text-center">
              {/* <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} /> */}
              <p className={cn('text-xl font-extrabold', color)}>{count}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search listing, client, or owner…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        {/* Filter selects */}
        <div className="flex gap-2 flex-wrap">
          <FilterSelect
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setCurrentPage(1);
            }}
            options={[
              ['ALL', 'All Types'],
              ['SELL', 'For Sale'],
              ['RENT', 'For Rent'],
              ['SERVICE', 'Service'],
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
            options={[
              ['ALL', 'All Status'],
              ['PENDING', 'Pending'],
              ['CONFIRMED', 'Confirmed'],
              ['COMPLETED', 'Completed'],
              ['CANCELLED', 'Cancelled'],
            ]}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
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
            void loadTransactions(currentPage);
          }}
          disabled={loadingTransactions}
          className="border-sky-600 text-sky-600! hover:bg-sky-600/10 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:border-sky-400 dark:text-sky-400! dark:hover:bg-sky-400/10 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/40"
        >
          <RotateCw
            className={cn(
              'w-3.5 h-3.5',
              loadingTransactions && isRefreshing && 'animate-spin',
            )}
          />{' '}
          Refresh
        </Button>
      </div>

      {/* ── Table ── */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden flex-1 min-h-0">
        <CardContent className="p-0 h-full min-h-0 flex flex-col">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <SortableTH label="Client" field="client" />
                  <SortableTH label="Listing Owner" field="owner" />
                  <SortableTH label="Listing" field="listing" />
                  <SortableTH label="Schedule" field="scheduleEnd" />
                  <SortableTH label="Total" field="totalPrice" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Agreement
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Status
                  </TableHead>
                  <SortableTH label="Completed" field="completedAt" />
                  <SortableTH label="Created" field="createdAt" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingTransactions && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                    >
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                    >
                      No transactions match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((transaction) => {
                    const typeConfig = TYPE_CONFIG[transaction.listing_type];
                    const TypeIcon = typeConfig.Icon;
                    return (
                      <TableRow
                        key={transaction.id}
                        className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                      >
                        {/* Client */}
                        <TableCell className="py-3.5 min-w-55">
                          <div className="flex items-center gap-2.5">
                            <ImageLink
                              href={`/profile?userId=${transaction.client_user_id}`}
                              newTab
                              src={transaction.client_profile_image_url}
                              type="profile"
                              label={transaction.client_full_name}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                                {transaction.client_full_name}
                              </p>
                              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                {transaction.client_location || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Owner */}
                        <TableCell className="py-3.5 min-w-55">
                          <div className="flex items-center gap-2.5">
                            <ImageLink
                              href={`/profile?userId=${transaction.owner_user_id}`}
                              newTab
                              src={transaction.owner_profile_image_url}
                              type="profile"
                              label={transaction.owner_full_name}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                                {transaction.owner_full_name}
                              </p>
                              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                {transaction.owner_location || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Listing */}
                        <TableCell className="py-3.5 min-w-65">
                          <div className="flex items-center gap-2.5">
                            <ImageLink
                              href={`/listing/${transaction.listing_id}`}
                              newTab
                              src={transaction.listing_image_url}
                              type="thumbnail"
                              label={transaction.listing_title}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                                {transaction.listing_title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md',
                                    typeConfig.cls,
                                  )}
                                >
                                  <TypeIcon className="w-2.5 h-2.5" />{' '}
                                  {typeConfig.label}
                                </span>
                                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                  {formatPrice(transaction.total_price)}{' '}
                                  {transaction.listing_price_unit}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Schedule */}
                        <TableCell className="py-3.5 min-w-57.5 whitespace-nowrap">
                          <p className="text-sm text-stone-800 dark:text-stone-100">
                            {formatDateRange(
                              transaction.start_date,
                              transaction.end_date,
                            )}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {transaction.selected_time_window || 'N/A'}
                          </p>
                        </TableCell>

                        {/* Total Price */}
                        <TableCell className="py-3.5 min-w-37.5 whitespace-nowrap">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                            {formatPrice(transaction.total_price)}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {buildScheduleUnitsLabel(transaction)}
                          </p>
                        </TableCell>

                        {/* Agreement */}
                        <TableCell className="py-3.5 min-w-45 space-y-1.5">
                          <DealStateRow
                            label="Owner"
                            agreed={Boolean(transaction.provider_agreed)}
                          />
                          <DealStateRow
                            label="Client"
                            agreed={Boolean(transaction.client_agreed)}
                          />
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'text-xs font-bold px-2 py-0.5 rounded-md',
                              STATUS_CONFIG[transaction.status],
                            )}
                          >
                            {transaction.status.charAt(0) +
                              transaction.status.slice(1).toLowerCase()}
                          </span>
                        </TableCell>

                        {/* Completed At */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(transaction.completed_at)}
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(transaction.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Separator className="dark:bg-[#2a2d3e]" />
          <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-stone-400 dark:text-stone-500">
            <span>
              Showing {filtered.length.toLocaleString()} of{' '}
              {totalCount.toLocaleString()} result{totalCount !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={loadingTransactions || currentPage <= 1}
                className="h-8 px-2.5"
              >
                Prev
              </Button>
              {paginationPages.map((page) => (
                <Button
                  key={page}
                  type="button"
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  disabled={loadingTransactions}
                  className="h-8 min-w-8 px-2"
                >
                  {page}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={loadingTransactions || currentPage >= totalPages}
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

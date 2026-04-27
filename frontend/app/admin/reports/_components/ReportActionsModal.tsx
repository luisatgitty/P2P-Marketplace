'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Flag,
  Gavel,
  ShieldX,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { ImageLink } from '@/components/image/ImageLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AdminReport, ReportActionType } from '@/types/admin';
import { formatPrice } from '@/utils/string-builder';

interface ReportActionsModalProps {
  report: AdminReport;
  onClose: () => void;
  onSubmit: (
    reportId: string,
    action: ReportActionType,
    reason: string,
  ) => Promise<void> | void;
}

// ── Action config ──────────────────────────────────────────────────────────────

interface ActionOption {
  value: ReportActionType;
  label: string;
  description: string;
  icon: React.ElementType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  group: string;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    value: 'DISMISS',
    label: 'Dismiss Report',
    description: 'No necessary action needed.',
    icon: CheckCircle2,
    severity: 'low',
    group: 'Minor Actions',
  },
  {
    value: 'BAN_LISTING',
    label: 'Shadow Ban Listing',
    description: 'Shadow ban the listing for 1 day',
    icon: ShieldX,
    severity: 'medium',
    group: 'Minor Actions',
  },
  {
    value: 'LOCK_3',
    label: 'Lockout 1st Offense',
    description: 'Temporarily restrict account access for 3 Days',
    icon: Clock,
    severity: 'high',
    group: 'Account Lockout',
  },
  {
    value: 'LOCK_7',
    label: 'Lockout 2nd Offense',
    description: 'Temporarily restrict account access for 7 Days',
    icon: Clock,
    severity: 'high',
    group: 'Account Lockout',
  },
  {
    value: 'LOCK_30',
    label: 'Lockout 3rd Offense',
    description: 'Extended account restriction for 30 Days',
    icon: Clock,
    severity: 'high',
    group: 'Account Lockout',
  },
  {
    value: 'DELETE_LISTING',
    label: 'Delete Listing',
    description: 'Permanently remove the listing, and notify the owner.',
    icon: Trash2,
    severity: 'high',
    group: 'Permanent Actions',
  },
  {
    value: 'PERMANENT_BAN',
    label: 'Ban Account',
    description: 'Irreversibly ban account from the platform',
    icon: ShieldX,
    severity: 'critical',
    group: 'Permanent Actions',
  },
];

const SEVERITY_STYLES: Record<
  ActionOption['severity'],
  {
    idle: string;
    selected: string;
    dot: string;
  }
> = {
  low: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-teal-300 dark:hover:border-teal-700',
    selected:
      'border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-950/30 ring-1 ring-teal-400/40',
    dot: 'bg-teal-500',
  },
  medium: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-amber-300 dark:hover:border-amber-700',
    selected:
      'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400/40',
    dot: 'bg-amber-500',
  },
  high: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-orange-300 dark:hover:border-orange-700',
    selected:
      'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-400/40',
    dot: 'bg-orange-500',
  },
  critical: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-red-300 dark:hover:border-red-700',
    selected:
      'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400/40',
    dot: 'bg-red-500',
  },
};

const ACTION_GROUPS = ['Minor Actions', 'Account Lockout', 'Permanent Actions'];

// ── Info pair ──────────────────────────────────────────────────────────────────

function InfoPair({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0 mt-0.75" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest leading-none mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            'text-sm text-stone-700 dark:text-stone-200 wrap-break-word',
            mono && 'font-mono',
            !value && 'italic text-stone-400 dark:text-stone-600',
          )}
        >
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2.5">
      {children}
    </p>
  );
}

function formatReportDate(value: string | null | undefined): string {
  const trimmedValue = (value ?? '').trim();
  if (!trimmedValue) return '-';

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) return trimmedValue;

  return date.toLocaleString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export default function ReportActionsModal({
  report,
  onClose,
  onSubmit,
}: ReportActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState<ReportActionType | null>(
    report.action_taken ?? null,
  );
  const [reason, setReason] = useState(report.action_reason ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(true);

  const isPending = report.status === 'PENDING';
  const isResolved = report.status !== 'PENDING';
  const isSoldListing = report.listing_status === 'SOLD';
  const visibleActionOptions = isSoldListing
    ? ACTION_OPTIONS.filter((option) => option.value !== 'BAN_LISTING')
    : ACTION_OPTIONS;
  const reasonMaxLength = 500;
  const trimmedReason = reason.trim();
  const isValidAction =
    selectedAction !== null &&
    visibleActionOptions.some((option) => option.value === selectedAction);
  const canSubmit =
    isValidAction &&
    trimmedReason.length > 0 &&
    trimmedReason.length <= reasonMaxLength;

  const selectedOpt =
    visibleActionOptions.find((a) => a.value === selectedAction) ?? null;

  async function handleSubmit() {
    if (
      !isValidAction ||
      trimmedReason.length === 0 ||
      trimmedReason.length > reasonMaxLength
    )
      return;
    setSubmitting(true);
    try {
      await onSubmit(report.id, selectedAction, trimmedReason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-lg w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="bg-[#1e2433] px-6 py-4 flex items-center justify-between shrink-0 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <Gavel className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">
                Report Resolution
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Report #{report.id.slice(0, 8).toUpperCase()} · Submitted{' '}
                {formatReportDate(report.submitted_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1',
                report.status === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : report.status === 'RESOLVED'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'bg-stone-500/20 text-stone-300 border border-stone-500/30',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-lg',
                  report.status === 'PENDING'
                    ? 'bg-amber-400'
                    : report.status === 'RESOLVED'
                      ? 'bg-teal-400'
                      : 'bg-stone-400',
                )}
              />
              {report.status}
            </span>
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
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row min-h-0">
            {/* ══ LEFT — Report details ══ */}
            <div className="lg:w-[42%] border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-[#2a2d3e] p-5 space-y-5">
              {/* Collapsible report detail toggle on mobile */}
              <button
                type="button"
                onClick={() => setDetailOpen((v) => !v)}
                className="lg:hidden w-full flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300"
              >
                Report Details
                {detailOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                )}
              </button>

              <div
                className={cn(!detailOpen && 'hidden lg:block', 'space-y-4')}
              >
                {/* Reporter */}
                <div>
                  <SectionLabel>Reporter</SectionLabel>
                  <Card className="p-0 dark:bg-[#13151f] dark:border-[#2a2d3e]">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-2.5 mb-1">
                        <ImageLink
                          href={`/profile?userId=${report.reporter_id}`}
                          newTab
                          src={report.reporter_profile_image_url}
                          type="profile"
                          label={report.reporter}
                        />

                        <div>
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                            {report.reporter}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500">
                            {report.reporter_location}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reported user */}
                <div>
                  <SectionLabel>Reported User</SectionLabel>
                  <Card className="p-0 dark:bg-[#13151f] border-red-100 dark:border-red-900/40">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-2.5 mb-1">
                        <ImageLink
                          href={`/profile?userId=${report.listing_owner_id}`}
                          newTab
                          src={report.listing_owner_profile_image_url}
                          type="profile"
                          label={report.listing_owner}
                        />
                        <div>
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                            {report.reported_name}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500">
                            {report.reported_location}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Listing */}
                {report.listing_title && (
                  <div>
                    <SectionLabel>Reported Listing</SectionLabel>
                    <Card className="p-0 dark:bg-[#13151f] dark:border-[#2a2d3e]">
                      <CardContent className="p-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ImageLink
                            href={`/listing/${report.target_id}`}
                            newTab
                            src={report.listing_image_url}
                            type="thumbnail"
                            label={report.target_name}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 line-clamp-2">
                              {report.target_name}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                              {formatPrice(report.listing_price ?? 0)}{' '}
                              {report.listing_price_unit}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Separator className="dark:bg-[#2a2d3e]" />

                {/* Report reason + description */}
                <div>
                  <SectionLabel>Report Content</SectionLabel>
                  <div className="rounded-lg bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        Description
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] shrink-0">
                        <Flag className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                          {report.reason}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                      {report.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ══ RIGHT — Action selection + reason ══ */}
            <div className="flex-1 p-5 space-y-5">
              {!isResolved && !report.action_taken ? (
                <>
                  <div>
                    <SectionLabel>
                      {isPending ? (
                        <>
                          Select Action
                          <span className="text-red-500 ml-0.5">*</span>
                        </>
                      ) : (
                        'Action Taken'
                      )}
                    </SectionLabel>

                    {isPending ? (
                      <div className="space-y-2">
                        {ACTION_GROUPS.map((group) => {
                          const groupOptions = visibleActionOptions.filter(
                            (a) => a.group === group,
                          );
                          return (
                            <div key={group}>
                              {/* Group label */}
                              <p className="text-xs font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest mb-1.5 mt-3 first:mt-0">
                                {group}
                              </p>
                              <div className="space-y-1.5">
                                {groupOptions.map((opt) => {
                                  const styles = SEVERITY_STYLES[opt.severity];
                                  const isSelected =
                                    selectedAction === opt.value;
                                  const Icon = opt.icon;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        setSelectedAction(opt.value)
                                      }
                                      className={cn(
                                        'w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all duration-150',
                                        isSelected
                                          ? styles.selected
                                          : styles.idle,
                                        'bg-white dark:bg-[#13151f]',
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                          isSelected
                                            ? 'bg-current/10'
                                            : 'bg-stone-100 dark:bg-[#252837]',
                                        )}
                                      >
                                        <Icon
                                          className={cn(
                                            'w-3.5 h-3.5 transition-colors',
                                            isSelected
                                              ? opt.severity === 'low'
                                                ? 'text-teal-600 dark:text-teal-400'
                                                : opt.severity === 'medium'
                                                  ? 'text-amber-600 dark:text-amber-400'
                                                  : opt.severity === 'high'
                                                    ? 'text-orange-600 dark:text-orange-400'
                                                    : 'text-red-600 dark:text-red-400'
                                              : 'text-stone-500 dark:text-stone-400',
                                          )}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className={cn(
                                            'text-sm font-semibold leading-none',
                                            isSelected
                                              ? opt.severity === 'low'
                                                ? 'text-teal-700 dark:text-teal-300'
                                                : opt.severity === 'medium'
                                                  ? 'text-amber-700 dark:text-amber-300'
                                                  : opt.severity === 'high'
                                                    ? 'text-orange-700 dark:text-orange-300'
                                                    : 'text-red-700 dark:text-red-300'
                                              : 'text-stone-700 dark:text-stone-200',
                                          )}
                                        >
                                          {opt.label}
                                        </p>
                                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 leading-none">
                                          {opt.description}
                                        </p>
                                      </div>
                                      <div
                                        className={cn(
                                          'w-2 h-2 rounded-full shrink-0 transition-opacity',
                                          styles.dot,
                                          isSelected
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Resolved — show selected action read-only */
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-3 rounded-lg border',
                          selectedOpt
                            ? SEVERITY_STYLES[selectedOpt.severity].selected
                            : '',
                        )}
                      >
                        {selectedOpt && (
                          <>
                            <selectedOpt.icon className="w-4 h-4 shrink-0 text-stone-500" />
                            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                              {selectedOpt.label}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator className="dark:bg-[#2a2d3e]" />

                  {/* Reason textarea */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                      Action Reason
                      {isPending && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </Label>
                    <Textarea
                      rows={isPending ? 4 : 3}
                      value={reason}
                      onChange={(e) =>
                        isPending &&
                        setReason(e.target.value.slice(0, reasonMaxLength))
                      }
                      readOnly={!isPending}
                      placeholder={
                        isPending
                          ? 'Describe the reason for this action. This will be visible to the reported user if applicable…'
                          : undefined
                      }
                      maxLength={reasonMaxLength}
                      className={cn(
                        'resize-none text-xs dark:bg-[#13151f] dark:border-[#2a2d3e] dark:text-stone-100 dark:placeholder-stone-600',
                        !isPending && 'cursor-default opacity-75',
                      )}
                    />
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {reason.length} / {reasonMaxLength}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <SectionLabel>Resolution Record</SectionLabel>
                  <Card className="p-0 dark:bg-[#13151f] border-teal-200 dark:border-teal-900/40">
                    <CardContent className="p-3.5 space-y-2.5">
                      <InfoPair
                        icon={Gavel}
                        label="Action Taken"
                        value={
                          ACTION_OPTIONS.find(
                            (a) => a.value === report.action_taken,
                          )?.label ?? report.action_taken
                        }
                      />
                      <InfoPair
                        icon={User}
                        label="Reviewed By"
                        value={report.resolved_by}
                      />
                      <InfoPair
                        icon={FileText}
                        label="Reason"
                        value={report.action_reason}
                      />
                      <InfoPair
                        icon={Clock}
                        label="Reviewed At"
                        value={formatReportDate(report.resolved_at)}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Severity warning for destructive actions */}
              {isPending &&
                selectedAction &&
                selectedOpt &&
                (selectedOpt.severity === 'high' ||
                  selectedOpt.severity === 'critical') && (
                  <div
                    className={cn(
                      'flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-xs',
                      selectedOpt.severity === 'critical'
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                        : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400',
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      {selectedOpt.severity === 'critical'
                        ? 'Permanent Ban is irreversible. The account will be permanently removed from the platform. Ensure this action is warranted.'
                        : "This action will affect the user's account. Double-check your reason before submitting."}
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-stone-200 dark:border-[#2a2d3e] px-6 py-4 flex items-center gap-2.5 bg-white dark:bg-[#1c1f2e] rounded-b-lg">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-lg dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
          >
            {isPending ? 'Cancel' : 'Close'}
          </Button>

          {isPending && (
            <div className="ml-auto flex items-center gap-2.5">
              {/* Preview of selected action */}
              {selectedOpt && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                  <selectedOpt.icon className="w-3.5 h-3.5" />
                  <span>{selectedOpt.label}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={cn(
                  'rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed gap-2',
                  selectedOpt?.severity === 'critical'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : selectedOpt?.severity === 'high'
                      ? 'bg-orange-600 hover:bg-orange-500 text-white'
                      : selectedOpt?.severity === 'medium'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-teal-700 hover:bg-teal-600 text-white',
                )}
              >
                <Gavel className="w-4 h-4" />
                {submitting ? 'Submitting…' : 'Submit Action'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

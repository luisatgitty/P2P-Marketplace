'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Info,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type OptionHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ScheduleCalendar,
  type BookingCalendarColors,
} from '@/components/ScheduleCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { encodeImageToPayload } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';
import {
  getBarangaysByCity,
  getCitiesByProvince,
  getProvinces,
  type LocationOption,
} from '@/services/locationService';
import {
  CATEGORIES,
  CONDITIONS,
  DELIVERY_OPTIONS,
  type ListingType,
  PRICE_UNITS,
} from '@/types/listings';
import { useConfirmDialog } from '@/utils/ConfirmDialogContext';
import {
  DAY_OFF_OPTIONS,
  isDayUnavailableByDaysOff,
  toISODate,
} from '@/utils/scheduleAvailability';
import { useUnsavedChanges } from '@/utils/UnsavedChangesContext';
import { useUser } from '@/utils/UserContext';
import {
  isValidPrice,
  LISTING_LIMITS,
  validateListingStep,
} from '@/utils/validation';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ListingFormData {
  // Common
  title: string;
  category: string;
  price: string;
  priceUnit: string;
  description: string;
  highlights: string[]; // → extra.features on detail page (max 8)
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images: File[];
  // Sell
  condition: string;
  deliveryMethod: string;
  // Rent
  minPeriod: string;
  availability: string;
  deposit: string;
  dayoffs: string[];
  timeWindows: { start: string; end: string }[];
  amenities: string[];
  // Service
  turnaround: string;
  serviceArea: string;
  arrangement: string;
  inclusions: string[];
}

export interface SellFormData {
  title: string;
  category: string;
  price: string;
  priceUnit: string;
  description: string;
  inclusions: string[];
  highlights: string[];
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images: File[];
  // Sell-specific
  condition: string;
  deliveryMethod: string;
}

export interface RentFormData {
  title: string;
  category: string;
  price: string;
  priceUnit: string;
  description: string;
  inclusions: string[];
  highlights: string[];
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images: File[];
  // Rent-specific
  minPeriod: string;
  availability: string;
  deposit: string;
  deliveryMethod: string;
}

export interface ServiceFormData {
  title: string;
  category: string;
  price: string;
  priceUnit: string;
  description: string;
  inclusions: string[];
  highlights: string[];
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images: File[];
  // Service-specific
  turnaround: string;
  serviceArea: string;
  arrangement: string;
}

// ─── Per-type config ────────────────────────────────────────────────────────────
export const FORM_CONFIG = {
  sell: {
    label: 'Sell an Item',
    accentCls: 'text-stone-700 dark:text-stone-300',
    accentBg: 'bg-stone-100 dark:bg-stone-800/60',
    accentBorder: 'border-stone-800 dark:border-stone-300',
    activeBg: 'bg-stone-900 dark:bg-stone-100',
    activeTxt: 'text-white dark:text-stone-900',
    btnCls:
      'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90',
    badgeDot: 'bg-stone-800 dark:bg-stone-200',
    steps: ['Basic Info', 'Item Details', 'Location & Photos'] as const,
  },
  rent: {
    label: 'Rent Out',
    accentCls: 'text-teal-700 dark:text-teal-400',
    accentBg: 'bg-teal-50 dark:bg-teal-950/40',
    accentBorder: 'border-teal-600 dark:border-teal-500',
    activeBg: 'bg-teal-700',
    activeTxt: 'text-white',
    btnCls: 'bg-teal-700 hover:bg-teal-600 text-white',
    badgeDot: 'bg-teal-600',
    steps: ['Basic Info', 'Rental Terms', 'Location & Photos'] as const,
  },
  service: {
    label: 'Offer a Service',
    accentCls: 'text-violet-700 dark:text-violet-400',
    accentBg: 'bg-violet-50 dark:bg-violet-950/40',
    accentBorder: 'border-violet-600 dark:border-violet-500',
    activeBg: 'bg-violet-700',
    activeTxt: 'text-white',
    btnCls: 'bg-violet-700 hover:bg-violet-600 text-white',
    badgeDot: 'bg-violet-600',
    steps: ['Basic Info', 'Service Details', 'Location & Photos'] as const,
  },
} as const;

// ─── Field data ─────────────────────────────────────────────────────────────────
const MAX_HIGHLIGHTS = LISTING_LIMITS.maxHighlights;
const MAX_INCLUSIONS = LISTING_LIMITS.maxInclusions;
const MAX_AMENITIES = LISTING_LIMITS.maxAmenities;
const MAX_IMAGES = LISTING_LIMITS.maxImages;

function sod(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISODate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('-');
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return null;

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  )
    return null;
  return parsed;
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toTwelveHour(time24: string): string {
  const [hourStr = '0', minStr = '00'] = time24.split(':');
  const hour = Number(hourStr);
  const minute = Number(minStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time24;

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function isDayUnavailableBySelection(
  d: Date,
  dayOff: string[],
  options?: { includePast?: boolean },
): boolean {
  return isDayUnavailableByDaysOff(d, dayOff, {
    includePast: options?.includePast ?? true,
  });
}

interface TimeWindowRange {
  id: string;
  start: string;
  end: string;
}

type UploadImagePayload = {
  name: string;
  mimeType: string;
  data: string;
};

// ─── Shared UI atoms ────────────────────────────────────────────────────────────
function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-widest">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500 mt-2 leading-relaxed">
      <Info size={10} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
      <AlertCircle size={10} className="shrink-0" /> {msg}
    </p>
  );
}

function StyledInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
  },
) {
  const { className, ...rest } = props;
  return (
    <div className="relative flex">
      <Input {...rest} className={'text-sm pr-13 peer'} />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-xs tabular-nums peer-disabled:opacity-50">
        {String(props.value).length}/{props.maxLength}
      </span>
    </div>
  );
}

function StyledSelect({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const optionElements = Children.toArray(children).filter(
    (child): child is ReactElement<OptionHTMLAttributes<HTMLOptionElement>> => {
      return (
        isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) &&
        child.type === 'option'
      );
    },
  );

  const getText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number')
      return String(node);
    if (Array.isArray(node)) return node.map(getText).join('').trim();
    if (isValidElement<{ children?: ReactNode }>(node))
      return getText(node.props.children);
    return '';
  };

  const placeholderOption = optionElements.find((optionElement) => {
    const optionValue =
      typeof optionElement.props.value === 'string'
        ? optionElement.props.value
        : getText(optionElement.props.children);
    return optionValue === '';
  });

  const placeholder = placeholderOption
    ? getText(placeholderOption.props.children)
    : 'Select';

  const items = optionElements
    .map((optionElement) => {
      const optionValue =
        typeof optionElement.props.value === 'string'
          ? optionElement.props.value
          : getText(optionElement.props.children);
      return {
        value: optionValue,
        label: optionElement.props.children,
        disabled: Boolean(optionElement.props.disabled),
      };
    })
    .filter((item) => item.value !== '');

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full rounded-lg', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={item.disabled}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function StyledTextarea({
  value,
  onChange,
  placeholder,
  rows = 5,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className={cn(
        'w-full rounded-lg border border-stone-200 dark:border-[#2a2d3e]',
        'bg-white dark:bg-[#13151f] text-stone-800 dark:text-stone-100 text-sm',
        'px-3.5 py-2.5 resize-y outline-none transition-colors',
        'focus:border-stone-400 dark:focus:border-stone-500',
        'placeholder:text-stone-400 dark:placeholder:text-stone-600',
      )}
    />
  );
}

// ─── Section card ────────────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 sm:p-6 flex flex-col gap-5">
      {title && (
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 pb-2.5 border-b border-stone-100 dark:border-[#2a2d3e]">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function SectionWithCount({
  title,
  children,
  count,
  maxCount,
  required,
}: {
  title?: string;
  children: React.ReactNode;
  count: number;
  maxCount: number;
  required?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 sm:p-6 flex flex-col gap-5">
      {title && (
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 pb-2.5 border-b border-stone-100 dark:border-[#2a2d3e]">
          {title}{' '}
          <span
            className={cn(
              'text-xs font-semibold shrink-0',
              count >= maxCount
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500',
            )}
          >
            {count}/{maxCount}
          </span>
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </h3>
      )}
      {children}
    </div>
  );
}

// ─── Radio option row (condition / delivery) ─────────────────────────────────────
function RadioOption({
  selected,
  onClick,
  label,
  hint,
  cfg,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  cfg: (typeof FORM_CONFIG)[ListingType];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg border-2 px-3 py-2 text-left transition-all',
        selected
          ? `${cfg.accentBorder} ${cfg.accentBg}`
          : 'border-stone-200 dark:border-[#2a2d3e] hover:border-stone-300 dark:hover:border-stone-600',
      )}
    >
      {/* Radio dot */}
      <div
        className={cn(
          'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
          selected
            ? `${cfg.accentBorder} ${cfg.activeBg}`
            : 'border-stone-300 dark:border-stone-600',
        )}
      >
        {selected && (
          <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-stone-900" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-semibold',
            selected ? cfg.accentCls : 'text-stone-700 dark:text-stone-200',
          )}
        >
          {label}
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">{hint}</p>
      </div>
    </button>
  );
}

// ─── Tag input ─────────────────────────────────────────────────────────
function TagInput({
  tags,
  setTags,
  maxTags,
  maxLength,
  placeholder,
}: {
  tags: string[];
  setTags: (v: string[]) => void;
  maxTags: number;
  maxLength: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const t = draft.trim();
    if (!t || tags.length >= maxTags || tags.includes(t)) {
      setDraft('');
      return;
    }
    setTags([...tags, t]);
    setDraft('');
    inputRef.current?.focus();
  };

  const remove = (i: number) => setTags(tags.filter((_, idx) => idx !== i));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
    if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tag grid — mirrors detail page 2-col CheckCircle layout */}
      {tags.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {tags.map((tag, i) => (
            <div
              key={tag}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]"
            >
              <CheckCircle2
                size={13}
                className="text-teal-500 shrink-0 flex-none"
              />
              <span className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate flex-1">
                {tag}
              </span>
              <Button
                type="button"
                onClick={() => remove(i)}
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 p-0.5 rounded text-stone-400 hover:text-red-500 transition-colors"
              >
                <X size={10} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      {tags.length < maxTags && (
        <div className="relative flex items-center gap-3">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            maxLength={maxLength}
            placeholder={placeholder}
            className={'text-sm peer pr-13'}
          />
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-22 flex items-center justify-center pr-3 text-xs tabular-nums peer-disabled:opacity-50">
            {draft.length}/{maxLength}
          </span>
          <Button
            type="button"
            variant={'outline'}
            onClick={add}
            disabled={!draft.trim()}
          >
            <Plus size={14} /> Add
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Image upload zone ────────────────────────────────────────────────────────────
function ImageUploadZone({
  images,
  setImages,
  maxImages,
}: {
  images: { file: File; preview: string }[];
  setImages: React.Dispatch<
    React.SetStateAction<{ file: File; preview: string }[]>
  >;
  maxImages: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isFull = images.length >= maxImages;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files)
      .slice(0, maxImages - images.length)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...added].slice(0, maxImages));
  };

  const remove = (i: number) =>
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });

  return (
    <div className="flex flex-col gap-3">
      {!isFull && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            'w-full rounded-lg border-2 border-dashed border-stone-200 dark:border-[#2a2d3e]',
            'bg-stone-50 dark:bg-[#13151f] text-stone-400',
            'hover:border-stone-400 dark:hover:border-stone-500 transition-colors',
            'p-8 flex flex-col items-center gap-3 cursor-pointer',
          )}
        >
          <ImagePlus size={28} />
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
              Click or drag photos here
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              JPG, PNG, WEBP · Max 5 MB each · Up to {LISTING_LIMITS.maxImages}{' '}
              photos
            </p>
          </div>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div
              key={img.preview}
              className="relative group aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-[#13151f]"
            >
              <img
                src={img.preview}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wider">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {!isFull && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] flex items-center justify-center text-stone-400 hover:border-stone-400 transition-colors"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────────
function StepIndicator({
  steps,
  current,
  cfg,
}: {
  steps: readonly string[];
  current: number;
  cfg: (typeof FORM_CONFIG)[ListingType];
}) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200',
                i < current
                  ? `${cfg.activeBg} border-transparent ${cfg.activeTxt}`
                  : i === current
                    ? `bg-white dark:bg-[#1c1f2e] ${cfg.accentBorder} ${cfg.accentCls}`
                    : 'bg-stone-100 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-400 dark:text-stone-600',
              )}
            >
              {i < current ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold whitespace-nowrap hidden sm:block',
                i === current
                  ? cfg.accentCls
                  : 'text-stone-400 dark:text-stone-600',
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-1.5 mb-5 sm:mb-3 rounded-full transition-all duration-300',
                i < current ? cfg.badgeDot : 'bg-stone-200 dark:bg-[#2a2d3e]',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN FORM
// ═══════════════════════════════════════════════════════════════════════════════
interface ListingFormProps {
  type: ListingType;
  initialData?: Partial<ListingFormData>;
  isEdit?: boolean;
  listingId?: string;
}

export default function ListingForm({
  type,
  initialData,
  isEdit = false,
  listingId,
}: ListingFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const { openDialog } = useConfirmDialog();
  const cfg = FORM_CONFIG[type];
  const initialAvailableDate = parseISODate(initialData?.availability ?? '');
  const now = new Date();

  const [step, setStep] = useState(0);
  const [submitting, setSub] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChangesLocal] = useState(false);

  // Common
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [price, setPrice] = useState(initialData?.price ?? '');
  const [priceUnit, setPriceUnit] = useState(
    initialData?.priceUnit ?? PRICE_UNITS[type][0],
  );
  const [description, setDesc] = useState(initialData?.description ?? '');
  const [highlights, setHL] = useState<string[]>(initialData?.highlights ?? []);
  // Location
  const [locationCity, setCity] = useState(initialData?.locationCity ?? '');
  const [locationProv, setProv] = useState(initialData?.locationProv ?? '');
  const [locationBrgy, setBrgy] = useState(initialData?.locationBrgy ?? '');
  // Sell
  const [condition, setCond] = useState(initialData?.condition ?? '');
  const [deliveryMethod, setDeliv] = useState(
    initialData?.deliveryMethod ?? '',
  );
  // Rent
  const [minPeriod, setMinPer] = useState(initialData?.minPeriod ?? '');
  const [availability, setAvail] = useState(initialData?.availability ?? '');
  const [deposit, setDep] = useState(initialData?.deposit ?? '');
  const [dayoff, setDayOff] = useState<string[]>(initialData?.dayoffs ?? []);
  const [calendarYear, setCalendarYear] = useState(
    initialAvailableDate?.getFullYear() ?? now.getFullYear(),
  );
  const [calendarMonth, setCalendarMonth] = useState(
    initialAvailableDate?.getMonth() ?? now.getMonth(),
  );
  const [calendarHoverDate, setCalendarHoverDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timeWindows, setTimeWindows] = useState<TimeWindowRange[]>(
    (initialData?.timeWindows ?? []).map((slot, idx) => ({
      id: `${slot.start}-${slot.end}-${idx}`,
      start: slot.start,
      end: slot.end,
    })),
  );
  const [timeWindowError, setTimeWindowError] = useState('');
  const [amenities, setAmen] = useState<string[]>(initialData?.amenities ?? []);
  // Service
  const [turnaround, setTA] = useState(initialData?.turnaround ?? '');
  const [serviceArea, setSA] = useState(initialData?.serviceArea ?? '');
  const [arrangement, setArrangement] = useState(
    initialData?.arrangement ?? '',
  );
  const [inclusions, setIncl] = useState<string[]>(
    initialData?.inclusions ?? [],
  );
  // Images
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  // Location options
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);
  const [selectedProvCode, setSelectedProvCode] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const isGuardBypassRef = useRef(false);
  const isGuardDialogOpenRef = useRef(false);

  const pHolderIncludes = "Add what's included with your listing...";
  const pHolderHighlights = 'Add what makes your listing stand out...';

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = !!(
      title ||
      category ||
      price ||
      description ||
      highlights.length > 0 ||
      locationCity ||
      locationProv ||
      locationBrgy ||
      condition ||
      deliveryMethod ||
      minPeriod ||
      availability ||
      deposit ||
      dayoff.length > 0 ||
      turnaround ||
      serviceArea ||
      arrangement ||
      inclusions.length > 0 ||
      images.length > 0 ||
      amenities.length > 0 ||
      timeWindows.length > 0
    );
    setHasUnsavedChangesLocal(hasChanges);
    setHasUnsavedChanges(hasChanges);
  }, [
    title,
    category,
    price,
    description,
    highlights,
    locationCity,
    locationProv,
    locationBrgy,
    condition,
    deliveryMethod,
    minPeriod,
    availability,
    deposit,
    dayoff,
    turnaround,
    serviceArea,
    arrangement,
    inclusions,
    images,
    amenities,
    timeWindows,
    setHasUnsavedChanges,
  ]);

  // Warn before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Guard browser back/forward and link navigation while editing.
  useEffect(() => {
    if (!hasUnsavedChanges) {
      isGuardDialogOpenRef.current = false;
      isGuardBypassRef.current = false;
      return;
    }

    window.history.pushState(
      { listingFormGuard: true },
      '',
      window.location.href,
    );

    const openUnsavedChangesDialog = (
      onConfirmLeave: () => void,
      onCancelLeave: () => void,
    ) => {
      if (isGuardDialogOpenRef.current) return;
      isGuardDialogOpenRef.current = true;

      openDialog({
        title: 'Discard Changes?',
        message:
          'Are you sure you want to leave this page? Your unsaved changes will be lost.',
        confirmText: 'Discard',
        cancelText: 'Stay',
        isDangerous: true,
        onConfirm: () => {
          isGuardDialogOpenRef.current = false;
          setHasUnsavedChanges(false);
          onConfirmLeave();
        },
        onCancel: () => {
          isGuardDialogOpenRef.current = false;
          onCancelLeave();
        },
      });
    };

    const handlePopState = () => {
      if (isGuardBypassRef.current) {
        isGuardBypassRef.current = false;
        return;
      }

      openUnsavedChangesDialog(
        () => {
          isGuardBypassRef.current = true;
          window.history.back();
        },
        () => {
          isGuardBypassRef.current = true;
          window.history.forward();
        },
      );
    };

    const handleDocumentNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank') return;
      if (anchor.hasAttribute('download')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#')) return;

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.href === current.href) return;

      event.preventDefault();

      openUnsavedChangesDialog(
        () => {
          isGuardBypassRef.current = true;

          if (destination.origin === current.origin) {
            const nextPath = `${destination.pathname}${destination.search}${destination.hash}`;
            router.push(nextPath);
            return;
          }

          window.location.assign(destination.href);
        },
        () => {},
      );
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentNavigation, true);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentNavigation, true);
    };
  }, [hasUnsavedChanges, openDialog, router, setHasUnsavedChanges]);

  // Cleanup unsaved changes on unmount
  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  // Default location from user profile for create flow only.
  useEffect(() => {
    if (isEdit) return;
    if (
      initialData?.locationProv ||
      initialData?.locationCity ||
      initialData?.locationBrgy
    )
      return;
    if (!user) return;

    if (user.locationProv) setProv(user.locationProv);
    if (user.locationCity) setCity(user.locationCity);
    if (user.locationBrgy) setBrgy(user.locationBrgy);
    return;
  }, [
    isEdit,
    initialData?.locationProv,
    initialData?.locationCity,
    initialData?.locationBrgy,
    user,
  ]);

  useEffect(() => {
    let mounted = true;
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const data = await getProvinces();
        if (!mounted) return;
        setProvinces(data);
      } finally {
        if (mounted) setLoadingProvinces(false);
      }
    };

    void loadProvinces();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!locationProv || provinces.length === 0) return;
    const matched = provinces.find((p) => p.name === locationProv);
    if (matched && matched.code !== selectedProvCode) {
      setSelectedProvCode(matched.code);
    }
    return;
  }, [locationProv, provinces, selectedProvCode]);

  useEffect(() => {
    if (!selectedProvCode) {
      setCities([]);
      setSelectedCityCode('');
      return;
    }

    let mounted = true;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const data = await getCitiesByProvince(selectedProvCode);
        if (!mounted) return;
        setCities(data);

        const selectedProvince = provinces.find(
          (p) => p.code === selectedProvCode,
        );
        if (selectedProvince) {
          setProv(selectedProvince.name);
        }

        const matchedCity = data.find((x) => x.name === locationCity);
        setSelectedCityCode(matchedCity?.code ?? '');
      } finally {
        if (mounted) setLoadingCities(false);
      }
    };

    void loadCities();
    return () => {
      mounted = false;
    };
  }, [selectedProvCode, provinces, locationCity]);

  useEffect(() => {
    if (!selectedCityCode) {
      setBarangays([]);
      return;
    }

    let mounted = true;
    const loadBarangays = async () => {
      setLoadingBarangays(true);
      try {
        const data = await getBarangaysByCity(selectedCityCode);
        if (!mounted) return;
        setBarangays(data);

        const selectedCity = cities.find(
          (city) => city.code === selectedCityCode,
        );
        if (selectedCity) {
          setCity(selectedCity.name);
        }
      } finally {
        if (mounted) setLoadingBarangays(false);
      }
    };

    void loadBarangays();
    return () => {
      mounted = false;
    };
  }, [selectedCityCode, cities]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (s: number) => {
    const e = validateListingStep(
      {
        type,
        title,
        category,
        price,
        priceUnit,
        description,
        locationCity,
        locationProv,
        locationBrgy,
        condition,
        deliveryMethod,
        minPeriod,
        availability,
        deposit,
        amenities,
        turnaround,
        serviceArea,
        arrangement,
        inclusions,
        highlights,
        imageCount: images.length,
        timeWindows: timeWindows.map((slot) => ({
          start: slot.start,
          end: slot.end,
        })),
      },
      s,
      isEdit,
    );
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate(step)) setStep((s) => s + 1);
  };

  const back = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const discardProgress = () => {
    openDialog({
      title: 'Discard Changes?',
      message:
        'Are you sure you want to discard your changes? This action cannot be undone.',
      confirmText: 'Discard',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: () => {
        setHasUnsavedChanges(false);
        router.back();
      },
      onCancel: () => {},
    });
  };

  const handleNavigateBack = () => {
    if (!hasUnsavedChanges) {
      router.push(isEdit ? `/listing/${listingId}` : '/create');
      return;
    }

    openDialog({
      title: 'Discard Changes?',
      message:
        'Are you sure you want to discard your changes? This action cannot be undone.',
      confirmText: 'Discard',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: () => {
        setHasUnsavedChanges(false);
        router.push(isEdit ? `/listing/${listingId}` : '/create');
      },
      onCancel: () => {},
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(2)) return;

    let compressedImages: UploadImagePayload[] = [];
    try {
      compressedImages = await Promise.all(
        images.map((img) =>
          encodeImageToPayload(img.file, 'listing', 'listingImage'),
        ),
      );
    } catch {
      setErrors((prev) => ({
        ...prev,
        submit: 'Failed to process one or more images.',
      }));
      return;
    }

    const commonData = {
      type,
      title: title.trim(),
      category,
      price: Math.round(Number(price)),
      priceUnit,
      description: description.trim(),
      highlights,
      inclusions,
      amenities,
      images: compressedImages,
      locationCity: locationCity.trim(),
      locationProv,
      locationBrgy: locationBrgy.trim(),
    };

    const typeSpecific: {
      sellData?: { condition: string; deliveryMethod: string };
      rentData?: {
        minPeriod: string;
        availability: string;
        deposit: string;
        deliveryMethod: string;
        daysOff: string;
      };
      serviceData?: {
        availability: string;
        turnaround: string;
        serviceArea: string;
        arrangement: string;
        daysOff: string;
      };
    } = {};

    if (type === 'sell') {
      typeSpecific.sellData = {
        condition,
        deliveryMethod,
      };
    }

    if (type === 'rent') {
      typeSpecific.rentData = {
        minPeriod,
        availability,
        deposit,
        deliveryMethod,
        daysOff: dayoff.join(','),
      };
    }

    if (type === 'service') {
      typeSpecific.serviceData = {
        availability,
        turnaround,
        serviceArea,
        arrangement,
        daysOff: dayoff.join(','),
      };
    }

    const timeWindowsPayload = timeWindows.map((slot) => ({
      startTime: slot.start,
      endTime: slot.end,
    }));

    setSub(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const endpoint = isEdit
        ? `${process.env.NEXT_PUBLIC_API_URL}/listing/${listingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/listing`;

      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...commonData,
          timeWindows: timeWindowsPayload,
          ...typeSpecific,
        }),
      });

      const parsedJson = await response.json();
      if (!response.ok) {
        throw new Error(
          parsedJson?.data?.message ||
            (isEdit
              ? 'Failed to update listing.'
              : 'Failed to create listing.'),
        );
      }

      setHasUnsavedChanges(false);
      const savedListingId = parsedJson?.data?.listingId;
      router.push(`/listing/${savedListingId ?? listingId ?? '1'}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? 'Failed to update listing.'
            : 'Failed to create listing.';
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSub(false);
    }
  };

  const toggleDayOff = (a: string) =>
    setDayOff((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  const selectedAvailabilityDate = parseISODate(availability);

  useEffect(() => {
    const parsed = parseISODate(availability);
    if (!parsed) return;
    setCalendarYear(parsed.getFullYear());
    setCalendarMonth(parsed.getMonth());
  }, [availability]);

  useEffect(() => {
    if (!selectedAvailabilityDate) return;
    if (
      isDayUnavailableBySelection(selectedAvailabilityDate, dayoff, {
        includePast: !isEdit,
      })
    ) {
      setAvail('');
    }
  }, [dayoff, isEdit, selectedAvailabilityDate]);

  const prevAvailabilityMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
      return;
    }
    setCalendarMonth((m) => m - 1);
  };

  const nextAvailabilityMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
      return;
    }
    setCalendarMonth((m) => m + 1);
  };

  const addTimeWindow = () => {
    setTimeWindowError('');
    if (!startTime || !endTime) {
      setTimeWindowError('Please set both start and end time.');
      return;
    }
    if (startTime >= endTime) {
      setTimeWindowError('End time must be later than start time.');
      return;
    }
    if (timeWindows.length >= LISTING_LIMITS.maxTimeWindows) {
      setTimeWindowError(
        `You can add up to ${LISTING_LIMITS.maxTimeWindows} window times only.`,
      );
      return;
    }

    const duplicate = timeWindows.some(
      (slot) => slot.start === startTime && slot.end === endTime,
    );
    if (duplicate) {
      setTimeWindowError('This time window already exists.');
      return;
    }

    setTimeWindows((prev) => [
      ...prev,
      {
        id: `${startTime}-${endTime}-${Date.now()}`,
        start: startTime,
        end: endTime,
      },
    ]);
  };

  const removeTimeWindow = (id: string) => {
    setTimeWindows((prev) => prev.filter((slot) => slot.id !== id));
  };

  const renderAvailabilityScheduleSection = (
    calendarColors: BookingCalendarColors,
  ) => (
    <Section title="Availability & Schedule">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-[#2a2d3e] dark:bg-[#13151f]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                Available From
                {<span className="text-red-500 ml-0.5">*</span>}
              </p>
              {availability && (
                <button
                  type="button"
                  onClick={() => setAvail('')}
                  className="text-sm text-stone-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                >
                  Clear date
                </button>
              )}
            </div>

            <ScheduleCalendar
              viewYear={calendarYear}
              viewMonth={calendarMonth}
              onPrevMonth={prevAvailabilityMonth}
              onNextMonth={nextAvailabilityMonth}
              isUnavailable={(d) =>
                isDayUnavailableBySelection(d, dayoff, {
                  includePast: !isEdit,
                })
              }
              startDate={selectedAvailabilityDate}
              endDate={null}
              hoverDate={calendarHoverDate}
              onSelect={(d) => {
                setAvail(toISODate(sod(d)));
                setCalendarHoverDate(null);
              }}
              onHover={setCalendarHoverDate}
              singleSelect
              colors={calendarColors}
            />

            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              {selectedAvailabilityDate
                ? `Selected: ${fmtDateShort(selectedAvailabilityDate)}`
                : 'Pick the first date this listing can be booked.'}
            </p>
            <ErrMsg msg={errors.availability} />
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-[#2a2d3e] dark:bg-[#13151f]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Days Off
            </p>
            <div className="flex flex-wrap gap-2 sm:flex-col">
              {DAY_OFF_OPTIONS.map((a) => (
                <Button
                  variant={'ghost'}
                  key={a}
                  type="button"
                  onClick={() => toggleDayOff(a)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition-all',
                    dayoff.includes(a)
                      ? `${cfg.accentBorder} ${cfg.accentBg} ${cfg.accentCls}`
                      : 'border-stone-200 text-stone-500 hover:border-stone-300 dark:border-[#2a2d3e] dark:text-stone-400 dark:hover:border-stone-600',
                  )}
                >
                  {dayoff.includes(a) ? '✓ ' : ''}
                  {a}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-[#2a2d3e] dark:bg-[#13151f]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Time Window{' '}
            <span
              className={cn(
                'text-xs font-semibold shrink-0',
                timeWindows.length >= LISTING_LIMITS.maxTimeWindows
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-stone-400 dark:text-stone-500',
              )}
            >
              {timeWindows.length}/{LISTING_LIMITS.maxTimeWindows}
            </span>
          </p>

          <div className="flex-row sm:flex">
            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
              <div>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-sm"
                />
              </div>
              <span className="pt-2 sm:pb-2 text-center text-sm font-semibold text-stone-400">
                to
              </span>
              <div>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              type="button"
              variant={'outline'}
              onClick={addTimeWindow}
              disabled={timeWindows.length >= LISTING_LIMITS.maxTimeWindows}
              className="w-full mt-3 sm:mt-0 sm:w-auto"
            >
              <Plus size={14} /> Add
            </Button>
          </div>

          <ErrMsg msg={timeWindowError} />
          <ErrMsg msg={errors.timeWindows} />

          {timeWindows.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {timeWindows.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-[#2a2d3e] dark:bg-[#1c1f2e]"
                >
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">
                      {toTwelveHour(slot.start)} - {''}
                    </span>
                    <span className="font-semibold text-stone-700 dark:text-stone-200 whitespace-nowrap">
                      {toTwelveHour(slot.end)}
                    </span>
                  </div>
                  <Button
                    variant={'ghost'}
                    size={'xs'}
                    type="button"
                    onClick={() => removeTimeWindow(slot.id)}
                    className="rounded-lg text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                    aria-label="Remove window time"
                  >
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
              Leave the window time empty if you are available the whole day.
            </p>
          )}
        </div>
      </div>
    </Section>
  );

  // ── Step 0 — Basic Info ──────────────────────────────────────────────────────
  const renderS0 = () => (
    <>
      <Section>
        {/* Listing Title */}
        <div>
          <FieldLabel required>Listing Title</FieldLabel>
          <StyledInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={LISTING_LIMITS.titleMinLength}
            maxLength={LISTING_LIMITS.titleMaxLength}
            placeholder={
              type === 'sell'
                ? 'e.g. MacBook Pro M2 2023 — Space Gray 16"'
                : type === 'rent'
                  ? 'e.g. Studio Unit for Rent — Fully Furnished'
                  : 'e.g. Professional Aircon Cleaning & Repair'
            }
          />
          <ErrMsg msg={errors.title} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <FieldLabel required>Category</FieldLabel>
            <StyledSelect value={category} onChange={setCategory}>
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </StyledSelect>
            <ErrMsg msg={errors.category} />
          </div>

          <div>
            <FieldLabel required>Price</FieldLabel>
            <div className="flex gap-4">
              {/* Price */}
              <div className="flex rounded-lg shadow-xs">
                <span className="border-input bg-background text-muted-foreground font-bold inline-flex items-center rounded-l-lg border px-3 text-sm">
                  ₱
                </span>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (!nextValue) {
                      setPrice('');
                      return;
                    }

                    if (!isValidPrice(nextValue)) return;
                    setPrice(nextValue);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === '-' ||
                      e.key === '+' ||
                      e.key === 'e' ||
                      e.key === 'E' ||
                      e.key === '.'
                    ) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="0"
                  min={LISTING_LIMITS.priceMinValue}
                  max={LISTING_LIMITS.priceMaxValue}
                  className="-ms-px text-sm rounded-l-none shadow-none h-full"
                />
              </div>

              {/* Price Unit */}
              <StyledSelect
                value={priceUnit}
                onChange={setPriceUnit}
                className="w-36 shrink-0"
              >
                {PRICE_UNITS[type].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </StyledSelect>
            </div>
            <ErrMsg msg={errors.priceUnit} />
            <ErrMsg msg={errors.price} />
          </div>
        </div>
      </Section>

      {/* Description */}
      <Section title="About This Listing">
        <div>
          <FieldLabel required>
            {type === 'service'
              ? 'Describe your service'
              : 'Describe the item / property'}
          </FieldLabel>
          <StyledTextarea
            value={description}
            onChange={(nextValue) => {
              if (nextValue.length > LISTING_LIMITS.descriptionMaxLength)
                return;
              setDesc(nextValue);
            }}
            placeholder={
              type === 'sell'
                ? 'Include brand, model, specs, usage history, reason for selling, and any known issues...'
                : type === 'rent'
                  ? "Describe the property — features, nearby landmarks, house rules, and what's included..."
                  : 'Describe your service — experience, what clients can expect, tools used, process...'
            }
            rows={6}
            maxLength={LISTING_LIMITS.descriptionMaxLength}
          />
          <div className="flex justify-between mt-1.5">
            <ErrMsg msg={errors.description} />
            <span className="text-xs text-stone-400 ml-auto">
              {description.length}/{LISTING_LIMITS.descriptionMaxLength}
            </span>
          </div>
          <FieldHint>
            Detailed descriptions get more inquiries and build buyer trust.
          </FieldHint>
        </div>
      </Section>
    </>
  );

  // ── Step 1 — Type-specific ───────────────────────────────────────────────────
  const renderS1 = () => {
    if (type === 'sell')
      return (
        <>
          {/* Condition */}
          <Section title="Listing Information">
            <div>
              <FieldLabel required>Item condition</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CONDITIONS.map((c) => (
                  <RadioOption
                    key={c.value}
                    selected={condition === c.value}
                    onClick={() => setCond(c.value)}
                    label={c.value}
                    hint={c.hint}
                    cfg={cfg}
                  />
                ))}
              </div>
              <ErrMsg msg={errors.condition} />
            </div>
            <div>
              <FieldLabel required>Meet Up & Delivery</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DELIVERY_OPTIONS.map((d) => (
                  <RadioOption
                    key={d.value}
                    selected={deliveryMethod === d.value}
                    onClick={() => setDeliv(d.value)}
                    label={d.value}
                    hint={d.desc}
                    cfg={cfg}
                  />
                ))}
              </div>
              <ErrMsg msg={errors.deliveryMethod} />
            </div>
          </Section>

          {/* What's included */}
          <SectionWithCount
            title="What's Included"
            count={inclusions.length}
            maxCount={MAX_INCLUSIONS}
            required
          >
            <div className="relative">
              <TagInput
                tags={inclusions}
                setTags={setIncl}
                maxTags={MAX_INCLUSIONS}
                maxLength={LISTING_LIMITS.tagMaxLength}
                placeholder={pHolderIncludes}
              />
              <ErrMsg msg={errors.inclusions} />
            </div>
          </SectionWithCount>

          {/* Highlights */}
          <SectionWithCount
            title="Highlights"
            count={highlights.length}
            maxCount={MAX_HIGHLIGHTS}
          >
            <div>
              <TagInput
                tags={highlights}
                setTags={setHL}
                maxTags={MAX_HIGHLIGHTS}
                maxLength={LISTING_LIMITS.tagMaxLength}
                placeholder={pHolderHighlights}
              />
              <ErrMsg msg={errors.highlights} />
            </div>
          </SectionWithCount>
        </>
      );

    if (type === 'rent') {
      const rentCalColors: BookingCalendarColors = {
        solid: 'bg-teal-600',
        rangeFill: 'bg-teal-100 dark:bg-teal-900/25',
        ringToday: 'ring-teal-500 dark:ring-teal-500',
        hoverBg:
          'hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-700 dark:hover:text-teal-300',
      };

      return (
        <>
          <Section title="Rental Terms">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <FieldLabel required>Minimum Rental Period</FieldLabel>
                  <Input
                    type="number"
                    value={minPeriod}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (!nextValue) {
                        setMinPer('');
                        return;
                      }

                      if (
                        !isValidPrice(
                          nextValue,
                          LISTING_LIMITS.minPeriodMinLength,
                          LISTING_LIMITS.minPeriodMaxLength,
                        )
                      )
                        return;
                      setMinPer(nextValue);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === '-' ||
                        e.key === '+' ||
                        e.key === 'e' ||
                        e.key === 'E' ||
                        e.key === '.'
                      ) {
                        e.preventDefault();
                      }
                    }}
                    minLength={LISTING_LIMITS.minPeriodMinLength}
                    maxLength={LISTING_LIMITS.minPeriodMaxLength}
                    placeholder="e.g. 3 months, 1 week"
                    className="text-sm"
                  />
                  <ErrMsg msg={errors.minPeriod} />
                </div>
                {/* Price Unit */}
                <div>
                  <FieldLabel>Period Unit</FieldLabel>
                  <StyledSelect
                    value={priceUnit}
                    onChange={setPriceUnit}
                    disabled
                    className="w-28 shrink-0"
                  >
                    {PRICE_UNITS[type].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </StyledSelect>
                </div>
              </div>

              <div>
                <FieldLabel>Deposit / Advance Requirements</FieldLabel>
                <StyledInput
                  value={deposit}
                  onChange={(e) => setDep(e.target.value)}
                  maxLength={LISTING_LIMITS.depositMaxLength}
                  placeholder="e.g. 2 months deposit + 1 month advance"
                />
                <ErrMsg msg={errors.deposit} />
              </div>
            </div>
            <div>
              <FieldLabel required>Meet-up / Viewing Arrangement</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DELIVERY_OPTIONS.map((d) => (
                  <RadioOption
                    key={d.value}
                    selected={deliveryMethod === d.value}
                    onClick={() => setDeliv(d.value)}
                    label={d.value}
                    hint={d.desc}
                    cfg={cfg}
                  />
                ))}
              </div>
              <ErrMsg msg={errors.deliveryMethod} />
            </div>
          </Section>

          {renderAvailabilityScheduleSection(rentCalColors)}

          {/* Amenities & Features */}
          <SectionWithCount
            title="Amenities & Features"
            count={amenities.length}
            maxCount={MAX_AMENITIES}
            required
          >
            <div>
              <TagInput
                tags={amenities}
                setTags={setAmen}
                maxTags={MAX_AMENITIES}
                maxLength={LISTING_LIMITS.tagMaxLength}
                placeholder={pHolderIncludes}
              />
              <ErrMsg msg={errors.amenities} />
            </div>
          </SectionWithCount>

          {/* Highlights */}
          <SectionWithCount
            title="Highlights"
            count={highlights.length}
            maxCount={MAX_HIGHLIGHTS}
          >
            <div>
              <TagInput
                tags={highlights}
                setTags={setHL}
                maxTags={MAX_HIGHLIGHTS}
                maxLength={LISTING_LIMITS.tagMaxLength}
                placeholder={pHolderHighlights}
              />
              <ErrMsg msg={errors.highlights} />
            </div>
          </SectionWithCount>
        </>
      );
    }

    // service
    return (
      <>
        <Section title="Service Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Turnaround / Duration</FieldLabel>
              <StyledInput
                value={turnaround}
                onChange={(e) => setTA(e.target.value)}
                minLength={LISTING_LIMITS.turnaroundMinLength}
                maxLength={LISTING_LIMITS.turnaroundMaxLength}
                placeholder="e.g. Same-day, 1–3 business days"
              />
              <ErrMsg msg={errors.turnaround} />
            </div>
            <div>
              <FieldLabel>Arrangement</FieldLabel>
              <StyledInput
                value={arrangement}
                onChange={(e) => setArrangement(e.target.value)}
                maxLength={LISTING_LIMITS.arrangementMaxLength}
                placeholder="e.g. Onsite, Remote, Home-Visit"
              />
              <ErrMsg msg={errors.arrangement} />
            </div>
          </div>
          <div>
            <FieldLabel required>Service Area</FieldLabel>
            <StyledInput
              value={serviceArea}
              onChange={(e) => setSA(e.target.value)}
              minLength={LISTING_LIMITS.serviceAreaMinLength}
              maxLength={LISTING_LIMITS.serviceAreaMaxLength}
              placeholder="e.g. Around Laguna, Batangas, Manila"
            />
            <ErrMsg msg={errors.serviceArea} />
          </div>
        </Section>

        {renderAvailabilityScheduleSection({
          solid: 'bg-violet-600',
          rangeFill: 'bg-violet-100 dark:bg-violet-900/25',
          ringToday: 'ring-violet-500 dark:ring-violet-500',
          hoverBg:
            'hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-700 dark:hover:text-violet-300',
        })}

        {/* What's included */}
        <SectionWithCount
          title="What's Included"
          count={inclusions.length}
          maxCount={MAX_INCLUSIONS}
          required
        >
          <div>
            <TagInput
              tags={inclusions}
              setTags={setIncl}
              maxTags={MAX_INCLUSIONS}
              maxLength={LISTING_LIMITS.tagMaxLength}
              placeholder={pHolderIncludes}
            />
            <ErrMsg msg={errors.inclusions} />
          </div>
        </SectionWithCount>

        {/* Highlights */}
        <SectionWithCount
          title="Highlights"
          count={highlights.length}
          maxCount={MAX_HIGHLIGHTS}
        >
          <div>
            <TagInput
              tags={highlights}
              setTags={setHL}
              maxTags={MAX_HIGHLIGHTS}
              maxLength={LISTING_LIMITS.tagMaxLength}
              placeholder={pHolderHighlights}
            />
            <ErrMsg msg={errors.highlights} />
          </div>
        </SectionWithCount>
      </>
    );
  };

  // ── Step 2 — Location & Photos ───────────────────────────────────────────────
  const renderS2 = () => (
    <>
      <Section title="Pickup / Service Location">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel required>Province / Region</FieldLabel>
            <StyledSelect
              value={selectedProvCode}
              onChange={(code) => {
                const selected = provinces.find((p) => p.code === code);
                setSelectedProvCode(code);
                setProv(selected?.name ?? '');
                setSelectedCityCode('');
                setCity('');
                setBrgy('');
              }}
              disabled={loadingProvinces}
            >
              <option value="">
                {loadingProvinces ? 'Loading provinces...' : 'Select province'}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </StyledSelect>
            <ErrMsg msg={errors.locationProv} />
          </div>
          <div>
            <FieldLabel required>City / Municipality</FieldLabel>
            <StyledSelect
              value={selectedCityCode}
              onChange={(code) => {
                const selected = cities.find((city) => city.code === code);
                setSelectedCityCode(code);
                setCity(selected?.name ?? '');
                setBrgy('');
              }}
              disabled={!selectedProvCode || loadingCities}
            >
              <option value="">
                {!selectedProvCode
                  ? 'Select province first'
                  : loadingCities
                    ? 'Loading cities/municipalities...'
                    : 'Select city/municipality'}
              </option>
              {cities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </StyledSelect>
            <ErrMsg msg={errors.locationCity} />
          </div>
          <div>
            <FieldLabel>
              Barangay{' '}
              <span className="text-stone-400 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </FieldLabel>
            <StyledSelect
              value={locationBrgy}
              onChange={setBrgy}
              disabled={!selectedCityCode || loadingBarangays}
            >
              <option value="">
                {!selectedCityCode
                  ? 'Select city first'
                  : loadingBarangays
                    ? 'Loading barangays...'
                    : 'Select barangay (optional)'}
              </option>
              {barangays.map((brgy) => (
                <option key={brgy.code} value={brgy.name}>
                  {brgy.name}
                </option>
              ))}
            </StyledSelect>
            <ErrMsg msg={errors.locationBrgy} />
          </div>
        </div>
      </Section>

      <SectionWithCount
        title="Photos"
        count={images.length}
        maxCount={MAX_IMAGES}
        required
      >
        <ImageUploadZone
          images={images}
          setImages={setImages}
          maxImages={MAX_IMAGES}
        />
        <ErrMsg msg={errors.images} />
        <FieldHint>
          The first photo is your primary listing image shown in search results.
        </FieldHint>
      </SectionWithCount>
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">
      {/* Header */}
      <div className="bg-[#1e2433] border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">
            {isEdit ? 'Edit Listing' : 'Post a Listing'} · {cfg.label}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {isEdit
              ? 'Update your listing details'
              : `List something to ${type === 'sell' ? 'sell' : type === 'rent' ? 'rent out' : 'offer'}`}
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            {isEdit
              ? "Make changes below and save when you're done."
              : "The more detail you provide, the more inquiries you'll receive."}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Step indicator */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-5">
          <StepIndicator steps={cfg.steps} current={step} cfg={cfg} />
        </div>

        {/* Form */}
        <form onSubmit={submit} noValidate>
          <div className="flex flex-col gap-4">
            {step === 0 && renderS0()}
            {step === 1 && renderS1()}
            {step === 2 && renderS2()}
          </div>

          <ErrMsg msg={errors.submit} />

          {/* Nav */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-stone-200 dark:border-[#2a2d3e]">
            <div className="flex items-center gap-4">
              {step > 0 ? (
                <Button variant={'ghost'} type="button" onClick={back}>
                  <ChevronLeft size={16} /> Back
                </Button>
              ) : (
                <Button
                  variant={'ghost'}
                  type="button"
                  onClick={handleNavigateBack}
                >
                  <ChevronLeft size={16} />{' '}
                  {isEdit ? 'Back to listing' : 'Change type'}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {hasUnsavedChanges && (
                <Button
                  variant={'destructive'}
                  type="button"
                  onClick={discardProgress}
                  className="hover:bg-red-600 dark:hover:bg-red-600 font-bold"
                >
                  <X size={14} /> Discard
                </Button>
              )}

              {step < 2 ? (
                <Button type="button" onClick={next} className="font-bold">
                  Continue <ChevronRight size={15} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{' '}
                      {isEdit ? 'Saving...' : 'Publishing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />{' '}
                      {isEdit ? 'Save Changes' : 'Publish Listing'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

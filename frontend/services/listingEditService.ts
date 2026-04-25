import { ListingFormData } from '@/components/listing-form';

export type ListingEditData = Partial<ListingFormData> & {
  type: 'sell' | 'rent' | 'service';
};

type ListingEditApiData = Omit<ListingEditData, 'timeWindows'> & {
  minPeriod?: string | number;
  availability?: string;
  timeWindows?: Array<{
    startTime?: string;
    endTime?: string;
    start?: string;
    end?: string;
  }>;
};

export async function getListingEditById(id: string): Promise<ListingEditData> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/edit`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      },
    );

    const parsedJson = await response.json();
    if (!response.ok) {
      throw new Error(
        parsedJson?.data?.message || 'Failed to fetch listing edit data.',
      );
    }

    const raw = parsedJson.data as ListingEditApiData;

    function normalizeTimeValue(value?: string): string {
      const trimmed = (value ?? '').trim();
      if (!trimmed) return '';
      return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
    }
    const normalizedTimeWindows = (raw.timeWindows ?? [])
      .map((slot) => {
        const start = normalizeTimeValue(slot.start ?? slot.startTime);
        const end = normalizeTimeValue(slot.end ?? slot.endTime);

        if (!start || !end) return null;
        return { start, end };
      })
      .filter((slot): slot is { start: string; end: string } => slot !== null);

    const normalizedMinPeriod = (() => {
      if (typeof raw.minPeriod === 'number') return String(raw.minPeriod);
      if (typeof raw.minPeriod !== 'string') return '';

      const trimmed = raw.minPeriod.trim();
      if (!trimmed) return '';
      const digits = trimmed.match(/^\d+/)?.[0] ?? '';
      return digits;
    })();

    const normalizedAvailability = (() => {
      const value = (raw.availability ?? '').trim();
      if (!value) return '';
      return value.length >= 10 ? value.slice(0, 10) : value;
    })();

    return {
      ...raw,
      minPeriod: normalizedMinPeriod,
      availability: normalizedAvailability,
      timeWindows: normalizedTimeWindows,
    } as ListingEditData;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch listing edit data.';
    throw new Error(message);
  }
}

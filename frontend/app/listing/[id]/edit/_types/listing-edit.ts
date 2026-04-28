import type { ListingFormData } from '@/components/ListingForm';
import { ListingType } from '@/types/listings';

export type ListingEditData = Partial<ListingFormData> & {
  type: ListingType;
};

export type ListingEditApiData = Omit<ListingEditData, 'timeWindows'> & {
  minPeriod?: string | number;
  availability?: string;
  timeWindows?: Array<{
    startTime?: string;
    endTime?: string;
    start?: string;
    end?: string;
  }>;
};

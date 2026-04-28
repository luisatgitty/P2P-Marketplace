// TODO: Provide a more comprehensive type definition for listing details
export interface ExtraDetail {
  description: string;
  condition: string; // e.g., "Brand New"|"Like New"|"Good"|"Fair"|"For Parts"
  images: string[];
  features: string[];
  transactionCount: number;
  reviewCount: number;
  // Common
  deliveryMethod: string; // e.g., "Pickup", "Delivery", "Shipping"
  // Rent-specific
  minPeriod?: string;
  available_from?: string;
  availability?: string;
  deposit?: string;
  amenities?: string[];
  daysOff?: string[]; // e.g., ["Monday", "Tuesday"]
  timeWindows?: { startTime: string; endTime: string }[];
  // Service-specific
  turnaround?: string;
  serviceArea?: string;
  arrangement?: string;
  inclusions?: string[];
}

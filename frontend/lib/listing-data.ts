// ─── Types ─────────────────────────────────────────────────────────────────────
export type ListingType = "sell" | "rent" | "service";

export interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
}

export interface ListingDetail {
  id: string;
  title: string;
  price: number;
  priceUnit?: string;
  type: ListingType;
  category: string;
  condition?: string;
  location: string;
  locationFull: string;
  postedAt: string;
  views: number;
  images: string[];
  description: string;
  specs: { label: string; value: string }[];
  // sell-specific
  deliveryMethod?: string;
  // rent-specific
  minRentalPeriod?: string;
  availability?: string;
  deposit?: string;
  // service-specific
  includes?: string[];
  turnaround?: string;
  serviceArea?: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    memberSince: string;
    verified: boolean;
    isPro?: boolean;
    responseTime?: string;
    totalListings?: number;
  };
  reviews: Review[];
}

// ─── Per-type UI config ─────────────────────────────────────────────────────────
export const TYPE_CONFIG: Record<
  ListingType,
  {
    label: string;
    badgeCls: string;
    accentCls: string;
    accentBg: string;
    accentBorder: string;
    accentText: string;
    accentBtnCls: string;
    icon: string;
  }
> = {
  sell: {
    label:        "For Sale",
    badgeCls:     "bg-blue-600 text-white",
    accentCls:    "text-blue-600 dark:text-blue-400",
    accentBg:     "bg-blue-50 dark:bg-blue-950/40",
    accentBorder: "border-blue-200 dark:border-blue-800",
    accentText:   "text-blue-700 dark:text-blue-300",
    accentBtnCls: "bg-blue-600 hover:bg-blue-700 text-white",
    icon:         "🏷️",
  },
  rent: {
    label:        "For Rent",
    badgeCls:     "bg-emerald-600 text-white",
    accentCls:    "text-emerald-600 dark:text-emerald-400",
    accentBg:     "bg-emerald-50 dark:bg-emerald-950/40",
    accentBorder: "border-emerald-200 dark:border-emerald-800",
    accentText:   "text-emerald-700 dark:text-emerald-300",
    accentBtnCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
    icon:         "🏡",
  },
  service: {
    label:        "Service",
    badgeCls:     "bg-violet-600 text-white",
    accentCls:    "text-violet-600 dark:text-violet-400",
    accentBg:     "bg-violet-50 dark:bg-violet-950/40",
    accentBorder: "border-violet-200 dark:border-violet-800",
    accentText:   "text-violet-700 dark:text-violet-300",
    accentBtnCls: "bg-violet-600 hover:bg-violet-700 text-white",
    icon:         "⚙️",
  },
};

// ─── Shared lorem snippets ──────────────────────────────────────────────────────
const LOREM_SHORT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";
const LOREM_LONG  = `${LOREM_SHORT} Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione sequi nesciunt.`;

const REVIEWS: Review[] = [
  { id: "r1", author: "Miguel Santos",   rating: 5, date: "March 2, 2026",    comment: "Exactly as described — smooth transaction, item was well-packed and seller was very responsive. Highly recommend!",                 verified: true  },
  { id: "r2", author: "Andrea Flores",  rating: 4, date: "Feb 18, 2026",    comment: "Good condition overall. Minor scuff not visible in photos but seller mentioned it beforehand. Fair price for the quality.",              verified: true  },
  { id: "r3", author: "Renz Castillo",  rating: 5, date: "Jan 30, 2026",    comment: "Super accommodating seller, met up at a safe spot. Item works perfectly. Would transact again.",                                       verified: false },
];

// ─── Mock listings ──────────────────────────────────────────────────────────────
export const MOCK_LISTINGS: Record<string, ListingDetail> = {
  // ── SELL ──────────────────────────────────────────────────────────────────────
  "4": {
    id: "4", type: "sell", title: "MacBook Pro M2 2023 — Space Gray 16\"",
    price: 68000, category: "Electronics", condition: "Like New",
    location: "Quezon City", locationFull: "Bgry. Batasan Hills, Quezon City, Metro Manila",
    postedAt: "March 7, 2026", views: 342,
    images: [
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
      "https://images.unsplash.com/photo-1611186871525-35c0d1b7b389?w=800&q=80",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
    ],
    description: LOREM_LONG,
    deliveryMethod: "Meet-up / Shipping",
    specs: [
      { label: "Chip",          value: "Apple M2 Pro (12-core CPU)"    },
      { label: "RAM",           value: "16 GB Unified Memory"           },
      { label: "Storage",       value: "512 GB SSD"                     },
      { label: "Display",       value: "16.2\" Liquid Retina XDR"       },
      { label: "Battery",       value: "~95% cycle count"               },
      { label: "Color",         value: "Space Gray"                     },
      { label: "OS",            value: "macOS Sonoma 14.3"              },
      { label: "Accessories",   value: "Original box, charger, sleeve"  },
    ],
    seller: { id: "s4", name: "Ana Reyes",     rating: 4.8, reviewCount: 27, memberSince: "Jan 2023", verified: true,  isPro: false, responseTime: "~1 hr",   totalListings: 8  },
    reviews: REVIEWS,
  },

  // ── RENT ──────────────────────────────────────────────────────────────────────
  "2": {
    id: "2", type: "rent", title: "Studio Unit — Makati CBD (Fully Furnished)",
    price: 22000, priceUnit: "/ month", category: "Real Estate", condition: "New",
    location: "Makati City", locationFull: "Legazpi Village, Makati City, Metro Manila",
    postedAt: "March 10, 2026", views: 218,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    ],
    description: LOREM_LONG,
    minRentalPeriod: "3 months minimum",
    availability: "Available from April 1, 2026",
    deposit: "2 months deposit + 1 month advance",
    specs: [
      { label: "Unit Size",     value: "32 sqm"                        },
      { label: "Floor",         value: "18th Floor"                    },
      { label: "Furnished",     value: "Fully furnished"               },
      { label: "Amenities",     value: "Pool, Gym, 24/7 Security"      },
      { label: "Parking",       value: "1 slot available (+₱3,000)"    },
      { label: "Pets",          value: "Not allowed"                   },
      { label: "Utilities",     value: "Meralco & MAYNILAD for tenant" },
      { label: "Internet",      value: "Ready for connection"          },
    ],
    seller: { id: "s2", name: "Maria Santos",  rating: 4.7, reviewCount: 14, memberSince: "Jun 2021", verified: true,  isPro: true,  responseTime: "~30 min", totalListings: 5  },
    reviews: REVIEWS,
  },

  // ── SERVICE ───────────────────────────────────────────────────────────────────
  "3": {
    id: "3", type: "service", title: "Aircon Deep Cleaning & Repair Service",
    price: 500, priceUnit: "/ unit", category: "Home Services", condition: "New",
    location: "San Pablo, Laguna", locationFull: "San Pablo City, Laguna — covers Laguna & nearby provinces",
    postedAt: "March 9, 2026", views: 189,
    images: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    ],
    description: LOREM_LONG,
    includes: ["Coil cleaning (evaporator & condenser)", "Drain pan & drainline flush", "Filter washing & drying", "Electrical connections check", "Gas level inspection", "Post-service test run & report"],
    turnaround: "Same-day or next-day (by appointment)",
    serviceArea: "Laguna, Batangas, Cavite, South Metro Manila",
    specs: [
      { label: "Unit Types",    value: "Window, Split, Cassette, Floor" },
      { label: "Brands",        value: "All brands accepted"            },
      { label: "Tools",         value: "HVAC-grade equipment"           },
      { label: "Team",          value: "2 certified technicians"        },
      { label: "Warranty",      value: "7-day workmanship warranty"     },
      { label: "Payment",       value: "Cash, GCash, Maya"              },
    ],
    seller: { id: "s3", name: "Pedro Reyes",   rating: 5.0, reviewCount: 63, memberSince: "Mar 2020", verified: true,  isPro: true,  responseTime: "~15 min", totalListings: 3  },
    reviews: REVIEWS,
  },
};

// Fallback for any unknown id — uses sell type
export function getListingById(id: string): ListingDetail {
  return MOCK_LISTINGS[id] ?? MOCK_LISTINGS["4"];
}

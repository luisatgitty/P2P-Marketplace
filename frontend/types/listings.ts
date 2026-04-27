// TODO: Resolve this later
export type ListingType = 'sell' | 'rent' | 'service';
export type ListingTypeU = 'SELL' | 'RENT' | 'SERVICE';

export const CATEGORIES = [
  'Agriculture & Gardening',
  'Education',
  'Electronics & Gadgets',
  'Events',
  'Fashion & Beauty',
  'Food',
  'Health & Wellness',
  'Hobbies & Collectibles',
  'Home & Living',
  'IT & Digital',
  'Logistics',
  'Maintenance & Repair',
  'Office Supplies',
  'Pet',
  'Professional',
  'Space & Property',
  'Sports & Outdoors',
  'Tools & Equipment',
  'Vehicles',
];

export const PRICE_UNITS: Record<ListingType, string[]> = {
  sell: ['Fixed Price', 'Starting Price', 'Negotiable', 'Contact for Price'],
  rent: [
    '/ minute',
    '/ hour',
    '/ day',
    '/ night',
    '/ week',
    '/ month',
    '/ year',
  ],
  service: [
    '/ hour',
    '/ session',
    '/ project',
    '/ package',
    '/ unit',
    '/ sq m',
    '/ km',
    '/ head',
    'Quote Required',
  ],
};

export const CONDITIONS = [
  { value: 'New', hint: 'Unopened, original box' },
  { value: 'Like New', hint: 'Minimal use, no flaws' },
  { value: 'Well Used', hint: 'Visible signs of use' },
  { value: 'Heavily Used', hint: 'Major wear and tear' },
  { value: 'Defective', hint: 'Has specific flaws' },
  { value: 'Not Working', hint: 'For parts or repair' },
];

export const DELIVERY_OPTIONS = [
  { value: 'Meet-up only', desc: 'Meet in person' },
  { value: 'Delivery available', desc: 'Arrange shipping / courier' },
  { value: 'Meet-up or Delivery', desc: 'Either option works' },
];

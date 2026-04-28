export type ListingTab = 'all' | 'active' | 'sold' | 'booked';
export type ProfileTab = 'listings' | 'bookmarks' | 'reviews';
export type ReviewTab = 'received' | 'personal';

export interface ProfileForm {
  firstName: string;
  lastName: string;
  bio: string;
  phone: string;
  locationProv: string;
  locationCity: string;
  locationBrgy: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type EditableProfileSnapshot = Pick<
  ProfileForm,
  | 'firstName'
  | 'lastName'
  | 'bio'
  | 'phone'
  | 'locationProv'
  | 'locationCity'
  | 'locationBrgy'
>;

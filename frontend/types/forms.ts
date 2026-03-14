export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  locationBrgy?: string;
  locationCity?: string;
  locationProv?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  role: string;
  status: string;
}

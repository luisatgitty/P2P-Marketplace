import type { SignupForm } from '@/types/forms';
import {
  CATEGORIES,
  CONDITIONS,
  DELIVERY_OPTIONS,
  type ListingType,
  PRICE_UNITS,
} from '@/types/listings';

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_EDIT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function limitMessageInputLength(value: string): string {
  if (value.length <= MESSAGE_MAX_LENGTH) return value;
  return value.slice(0, MESSAGE_MAX_LENGTH);
}

export const AUTH_LIMITS = {
  nameMinLength: 2,
  nameMaxLength: 50,
  emailMinLength: 5,
  emailMaxLength: 254,
  emailLocalMaxLength: 64,
  emailDomainMaxLength: 255,
  passwordMinLength: 8,
  passwordMaxLength: 72,
  otpLength: 6,
  phoneLength: 11,
  profileBioMaxLength: 200,
} as const;

export const LISTING_LIMITS = {
  titleMinLength: 5,
  titleMaxLength: 80,
  categoryMinLength: 2,
  categoryMaxLength: 80,
  descriptionMinLength: 20,
  descriptionMaxLength: 2000,
  locationMinLength: 2,
  locationMaxLength: 100,
  priceMinValue: 1,
  priceMaxValue: 100000000,
  minPeriodMinLength: 1,
  minPeriodMaxLength: 99,
  depositMaxLength: 60,
  turnaroundMinLength: 2,
  turnaroundMaxLength: 60,
  serviceAreaMinLength: 2,
  serviceAreaMaxLength: 60,
  arrangementMaxLength: 60,
  tagMinLength: 2,
  tagMaxLength: 60,
  maxHighlights: 10,
  maxInclusions: 10,
  maxAmenities: 10,
  maxImages: 8,
  maxTimeWindows: 8,
} as const;

export const VERIFICATION_LIMITS = {
  minimumAge: 18,
  idTypeMinLength: 3,
  idTypeMaxLength: 20,
  idNumberMinLength: 4,
  idNumberMaxLength: 50,
  mobileNumberLength: 11,
  userAgentMaxLength: 1024,
  ipAddressMinLength: 7,
  ipAddressMaxLength: 45,
  hardwareInfoMinLength: 200,
  hardwareInfoMaxLength: 350,
} as const;

export const VERIFICATION_ID_TYPES = [
  'philsys',
  'postal',
  'drivers',
  'prc',
  'passport',
  'sss',
  'gsis',
  'hdmf',
  'voters',
  'acr',
] as const;

export interface ListingValidationInput {
  type: ListingType;
  title: string;
  category: string;
  price: string;
  priceUnit: string;
  description: string;
  locationCity: string;
  locationProv: string;
  locationBrgy?: string;
  condition?: string;
  deliveryMethod?: string;
  minPeriod?: string;
  availability?: string;
  deposit?: string;
  amenities?: string[];
  turnaround?: string;
  serviceArea?: string;
  arrangement?: string;
  inclusions?: string[];
  highlights?: string[];
  imageCount: number;
  timeWindows?: Array<{ start: string; end: string }>;
}

const CONDITION_SET = new Set(CONDITIONS.map((item) => item.value));
const DELIVERY_OPTION_SET = new Set(DELIVERY_OPTIONS.map((item) => item.value));

function validateTagItems(items: string[], fieldLabel: string): string | null {
  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) {
      return `${fieldLabel} entries must not be empty`;
    }
    if (item.length < LISTING_LIMITS.tagMinLength) {
      return `${fieldLabel} entries must be at least ${LISTING_LIMITS.tagMinLength} characters`;
    }
    if (item.length > LISTING_LIMITS.tagMaxLength) {
      return `${fieldLabel} entries must not exceed ${LISTING_LIMITS.tagMaxLength} characters`;
    }
  }
  return null;
}

function isValidISODate(dateValue: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;
  const [yearStr, monthStr, dayStr] = dateValue.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return false;
  }
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function isValidTime24(timeValue: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(timeValue);
}

export function validateListingStep(
  input: ListingValidationInput,
  step: number,
  isEdit = false,
): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = input.title.trim();
  const category = input.category.trim();
  const priceUnit = input.priceUnit.trim();
  const description = input.description.trim();
  const city = input.locationCity.trim();
  const province = input.locationProv.trim();
  const barangay = (input.locationBrgy ?? '').trim();

  if (step === 0) {
    if (!title) {
      errors.title = 'Title is required.';
    } else if (title.length < LISTING_LIMITS.titleMinLength) {
      errors.title = `Title must be at least ${LISTING_LIMITS.titleMinLength} characters.`;
    } else if (title.length > LISTING_LIMITS.titleMaxLength) {
      errors.title = `Title must not exceed ${LISTING_LIMITS.titleMaxLength} characters.`;
    }

    if (!category) {
      errors.category = 'Please select a category.';
    } else if (!CATEGORIES.includes(category)) {
      errors.category = 'Invalid category selected.';
    }

    const parsedPrice = Number(input.price);
    if (!input.price || !Number.isFinite(parsedPrice)) {
      errors.price = 'Enter a valid price.';
    } else if (parsedPrice < LISTING_LIMITS.priceMinValue) {
      errors.price = `Price must be at least ${LISTING_LIMITS.priceMinValue}.`;
    } else if (parsedPrice > LISTING_LIMITS.priceMaxValue) {
      errors.price = `Price must not exceed ${LISTING_LIMITS.priceMaxValue}.`;
    }

    if (!priceUnit) {
      errors.priceUnit = 'Please select a price unit.';
    } else if (!PRICE_UNITS[input.type].includes(priceUnit)) {
      errors.priceUnit = 'Invalid price unit selected.';
    }

    if (!description) {
      errors.description = 'Description is required.';
    } else if (description.length < LISTING_LIMITS.descriptionMinLength) {
      errors.description = `Description must be at least ${LISTING_LIMITS.descriptionMinLength} characters.`;
    } else if (description.length > LISTING_LIMITS.descriptionMaxLength) {
      errors.description = `Description must not exceed ${LISTING_LIMITS.descriptionMaxLength} characters.`;
    }
  }

  if (step === 1) {
    const highlights = input.highlights ?? [];
    if (highlights.length > LISTING_LIMITS.maxHighlights) {
      errors.highlights = `You can only add up to ${LISTING_LIMITS.maxHighlights} highlights.`;
    } else {
      const tagError = validateTagItems(highlights, 'Highlight');
      if (tagError) errors.highlights = tagError;
    }

    if (input.type === 'sell') {
      if (!input.condition?.trim()) {
        errors.condition = 'Please select a condition.';
      } else if (!CONDITION_SET.has(input.condition)) {
        errors.condition = 'Invalid condition selected.';
      }
      if (!input.deliveryMethod?.trim()) {
        errors.deliveryMethod = 'Please choose a delivery option.';
      } else if (!DELIVERY_OPTION_SET.has(input.deliveryMethod)) {
        errors.deliveryMethod = 'Invalid delivery option selected.';
      }

      const inclusions = input.inclusions ?? [];
      if (inclusions.length === 0) {
        errors.inclusions = 'Please add at least one inclusion item.';
      } else if (inclusions.length > LISTING_LIMITS.maxInclusions) {
        errors.inclusions = `You can only add up to ${LISTING_LIMITS.maxInclusions} inclusion items.`;
      } else {
        const tagError = validateTagItems(inclusions, 'Inclusion');
        if (tagError) errors.inclusions = tagError;
      }
    }

    if (input.type === 'rent') {
      const minPeriod = (input.minPeriod ?? '').trim();
      if (!minPeriod) {
        errors.minPeriod = 'Minimum rental period is required.';
      } else if (minPeriod.length < LISTING_LIMITS.minPeriodMinLength) {
        errors.minPeriod = `Minimum rental period must be at least ${LISTING_LIMITS.minPeriodMinLength} character.`;
      } else if (minPeriod.length > LISTING_LIMITS.minPeriodMaxLength) {
        errors.minPeriod = `Minimum rental period must not exceed ${LISTING_LIMITS.minPeriodMaxLength} characters.`;
      }

      if (!input.deliveryMethod?.trim()) {
        errors.deliveryMethod = 'Please choose a delivery option.';
      } else if (!DELIVERY_OPTION_SET.has(input.deliveryMethod.trim())) {
        errors.deliveryMethod = 'Invalid delivery option selected.';
      }

      const availability = (input.availability ?? '').trim();
      if (!isEdit) {
        if (!availability || !isValidISODate(availability)) {
          errors.availability =
            'Please select a valid starting availability date.';
        }
      } else if (availability && !isValidISODate(availability)) {
        errors.availability =
          'Please select a valid starting availability date.';
      }

      const deposit = (input.deposit ?? '').trim();
      if (deposit.length > LISTING_LIMITS.depositMaxLength) {
        errors.deposit = `Deposit details must not exceed ${LISTING_LIMITS.depositMaxLength} characters.`;
      }

      const amenities = input.amenities ?? [];
      if (amenities.length === 0) {
        errors.amenities = 'Please add at least one amenity.';
      } else if (amenities.length > LISTING_LIMITS.maxAmenities) {
        errors.amenities = `You can only add up to ${LISTING_LIMITS.maxAmenities} amenities.`;
      } else {
        const tagError = validateTagItems(amenities, 'Amenity');
        if (tagError) errors.amenities = tagError;
      }
    }

    if (input.type === 'service') {
      const turnaround = (input.turnaround ?? '').trim();
      if (!turnaround) {
        errors.turnaround = 'Turnaround time is required.';
      } else if (turnaround.length < LISTING_LIMITS.turnaroundMinLength) {
        errors.turnaround = `Turnaround must be at least ${LISTING_LIMITS.turnaroundMinLength} characters.`;
      } else if (turnaround.length > LISTING_LIMITS.turnaroundMaxLength) {
        errors.turnaround = `Turnaround must not exceed ${LISTING_LIMITS.turnaroundMaxLength} characters.`;
      }

      const serviceArea = (input.serviceArea ?? '').trim();
      if (!serviceArea) {
        errors.serviceArea = 'Service area is required.';
      } else if (serviceArea.length < LISTING_LIMITS.serviceAreaMinLength) {
        errors.serviceArea = `Service area must be at least ${LISTING_LIMITS.serviceAreaMinLength} characters.`;
      } else if (serviceArea.length > LISTING_LIMITS.serviceAreaMaxLength) {
        errors.serviceArea = `Service area must not exceed ${LISTING_LIMITS.serviceAreaMaxLength} characters.`;
      }

      const arrangement = (input.arrangement ?? '').trim();
      if (arrangement.length > LISTING_LIMITS.arrangementMaxLength) {
        errors.arrangement = `Arrangement must not exceed ${LISTING_LIMITS.arrangementMaxLength} characters.`;
      }

      const availability = (input.availability ?? '').trim();
      if (!isEdit) {
        if (!availability || !isValidISODate(availability)) {
          errors.availability =
            'Please select a valid starting availability date.';
        }
      } else if (availability && !isValidISODate(availability)) {
        errors.availability =
          'Please select a valid starting availability date.';
      }

      const inclusions = input.inclusions ?? [];
      if (inclusions.length === 0) {
        errors.inclusions = 'Please add at least one inclusion item.';
      } else if (inclusions.length > LISTING_LIMITS.maxInclusions) {
        errors.inclusions = `You can only add up to ${LISTING_LIMITS.maxInclusions} inclusion items.`;
      } else {
        const tagError = validateTagItems(inclusions, 'Inclusion');
        if (tagError) errors.inclusions = tagError;
      }
    }

    const timeWindows = input.timeWindows ?? [];
    if (timeWindows.length > LISTING_LIMITS.maxTimeWindows) {
      errors.timeWindows = `You can add up to ${LISTING_LIMITS.maxTimeWindows} window times only.`;
    } else {
      for (const slot of timeWindows) {
        if (!isValidTime24(slot.start) || !isValidTime24(slot.end)) {
          errors.timeWindows = 'Time windows must use HH:MM 24-hour format.';
          break;
        }
        if (slot.start >= slot.end) {
          errors.timeWindows =
            'Each time window must have an end time later than start time.';
          break;
        }
      }
    }
  }

  if (step === 2) {
    if (!city) {
      errors.locationCity = 'City / Municipality is required.';
    } else if (city.length < LISTING_LIMITS.locationMinLength) {
      errors.locationCity = `City / Municipality must be at least ${LISTING_LIMITS.locationMinLength} characters.`;
    } else if (city.length > LISTING_LIMITS.locationMaxLength) {
      errors.locationCity = `City / Municipality must not exceed ${LISTING_LIMITS.locationMaxLength} characters.`;
    }

    if (!province) {
      errors.locationProv = 'Province is required.';
    } else if (province.length < LISTING_LIMITS.locationMinLength) {
      errors.locationProv = `Province must be at least ${LISTING_LIMITS.locationMinLength} characters.`;
    } else if (province.length > LISTING_LIMITS.locationMaxLength) {
      errors.locationProv = `Province must not exceed ${LISTING_LIMITS.locationMaxLength} characters.`;
    }

    if (barangay.length > LISTING_LIMITS.locationMaxLength) {
      errors.locationBrgy = `Barangay must not exceed ${LISTING_LIMITS.locationMaxLength} characters.`;
    }

    if (!isEdit && input.imageCount === 0) {
      errors.images = 'At least one photo is required.';
    }
    if (input.imageCount > LISTING_LIMITS.maxImages) {
      errors.images = `You can upload up to ${LISTING_LIMITS.maxImages} photos only.`;
    }
  }

  return errors;
}

export function isValidEmail(email: string): string | null {
  const normalizedEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!normalizedEmail) return 'Email is required';
  if (normalizedEmail.length < AUTH_LIMITS.emailMinLength) {
    return `Email must be at least ${AUTH_LIMITS.emailMinLength} characters`;
  }
  if (normalizedEmail.length > AUTH_LIMITS.emailMaxLength) {
    return `Email must not exceed ${AUTH_LIMITS.emailMaxLength} characters`;
  }

  const parts = normalizedEmail.split('@');
  if (parts.length !== 2) return 'Invalid email format';
  if (parts[0].length > AUTH_LIMITS.emailLocalMaxLength) {
    return `Email local part must not exceed ${AUTH_LIMITS.emailLocalMaxLength} characters`;
  }
  if (parts[1].length > AUTH_LIMITS.emailDomainMaxLength) {
    return `Email domain part must not exceed ${AUTH_LIMITS.emailDomainMaxLength} characters`;
  }

  if (!emailRegex.test(normalizedEmail)) return 'Invalid email format';
  return null;
}

export function isValidPassword(
  password: string,
  confirmPassword?: string,
): string | null {
  if (!password) return 'Password is required';
  if (password.length < AUTH_LIMITS.passwordMinLength) {
    return `Password must be at least ${AUTH_LIMITS.passwordMinLength} characters`;
  }
  if (password.length > AUTH_LIMITS.passwordMaxLength) {
    return `Password must not exceed ${AUTH_LIMITS.passwordMaxLength} characters`;
  }
  if (typeof confirmPassword === 'string' && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  // NOTE: Disabled password complexity validation during development
  // if (password.length < AUTH_LIMITS.passwordMinLength) return "Password must be at least 8 characters";
  // if (password.length > AUTH_LIMITS.passwordMaxLength) return "Password must not exceed 72 characters";
  // if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  // if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  // if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  // if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~]/.test(password))
  //   return "Password must contain at least one special character";
  return null;
}

export function isValidName(name: string, field: string): string | null {
  if (!name) return `${field} is required`;
  if (name.length < AUTH_LIMITS.nameMinLength) {
    return `${field} must be at least ${AUTH_LIMITS.nameMinLength} characters`;
  }
  if (name.length > AUTH_LIMITS.nameMaxLength) {
    return `${field} must not exceed ${AUTH_LIMITS.nameMaxLength} characters`;
  }
  if (!/^[a-zA-Z\s\-']+$/.test(name))
    return `${field} must contain letters only`;
  return null;
}

export function isValidPrice(
  value: string,
  min?: number,
  max?: number,
): boolean {
  const nextNumber = Number(value);
  min = min ?? LISTING_LIMITS.priceMinValue;
  max = max ?? LISTING_LIMITS.priceMaxValue;

  if (!Number.isFinite(nextNumber)) return false;
  if (nextNumber > max) return false;
  if (nextNumber < min) return false;
  return true;
}

export function validateSignupForm(form: SignupForm) {
  if (!form) return 'Form data is required';

  const firstNameError = isValidName(form.firstName, 'First name');
  if (firstNameError) return firstNameError;

  const lastNameError = isValidName(form.lastName, 'Last name');
  if (lastNameError) return lastNameError;

  const emailError = isValidEmail(form.email);
  if (emailError) return emailError;

  const passwordError = isValidPassword(form.password, form.confirmPassword);
  if (passwordError) return passwordError;
}

export function validateLoginForm(form: {
  email: string;
  password: string;
}): string | null {
  const emailError = isValidEmail(form.email);
  if (emailError) return emailError;

  const passwordError = isValidPassword(form.password);
  if (passwordError) return passwordError;

  return null;
}

export function validateForgotPasswordInput(email: string): string | null {
  return isValidEmail(email);
}

export function validateResetPasswordInput(
  password: string,
  confirmPassword: string,
): string | null {
  return isValidPassword(password, confirmPassword);
}

export function validateOtpCode(otpCode: string): string | null {
  if (!otpCode) return 'OTP is required';
  if (!/^\d+$/.test(otpCode)) return 'OTP must contain numbers only';
  if (otpCode.length !== AUTH_LIMITS.otpLength) {
    return `OTP must be ${AUTH_LIMITS.otpLength} digits`;
  }
  return null;
}

export function validateImageURL(url: string): string {
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return apiBase ? `${apiBase}${normalized}` : normalized;
  }

  return url;
}

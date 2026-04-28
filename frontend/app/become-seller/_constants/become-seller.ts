import { getDeviceInfo } from '@/utils/device';
import { IdType } from "../_types/become-seller";

export const RESEND_SECONDS = 45;
export const DEVICE = getDeviceInfo();
// NOTE: Temporary override to bypass device check during development.
DEVICE.isMobile = true;

export const ID_OPTIONS: { value: IdType; label: string }[] = [
  { value: '', label: 'Select an ID type…' },
  { value: 'philsys', label: 'National ID' },
  { value: 'postal', label: 'Postal ID' },
  { value: 'drivers', label: "Driver's License" },
  { value: 'prc', label: 'PRC ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'sss', label: 'UMID / SSS ID' },
  { value: 'gsis', label: 'GSIS ID' },
  { value: 'hdmf', label: 'HDMF ID' },
  { value: 'voters', label: "Voter's ID" },
  { value: 'acr', label: 'ACR (Foreigners)' },
];

export const VERIF_LIMITS = {
  totalSteps: 3,
  otpLength: 6,
  minimumAge: 18,
  idTypeMinLength: 3,
  idTypeMaxLength: 20,
  idNumberMinLength: 4,
  idNumberMaxLength: 50,
  mobileNumberLength: 10,
  userAgentMaxLength: 1024,
  ipAddressMinLength: 7,
  ipAddressMaxLength: 45,
  hardwareInfoMinLength: 200,
  hardwareInfoMaxLength: 350,
} as const;
